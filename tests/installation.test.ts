import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { SCHEMA_STATEMENTS } from '../server/db.js';
import { applyApplicationMigrations } from '../server/lib/application-migrations.js';
import { applyControlMigration } from '../server/lib/control-migrations.js';
import { createTestDatabase } from './helpers/harness.js';
import { encodeEvidenceRequest, MAX_EVIDENCE_REQUEST_BYTES } from '../src/lib/evidence-upload.js';

test('fresh installation installs base + 001–005 without demo tenants, is repeatable and rejects checksum drift', async () => {
  const { engine, executor, wrap } = await createTestDatabase('memory://staywise_test');
  const database = { ...executor, transaction: <T>(fn: (tx: typeof executor) => Promise<T>) => engine.transaction(tx => fn({ ...wrap(tx), execute: async (sql: string, params: any[] = []) => {
    if (!params.length) { await tx.exec(sql); return 0; }
    return wrap(tx).execute(sql, params);
  } })) };
  try {
    const files = ['001_rate_limits.sql', '002_platform_crm.sql', '003_security_invitations.sql', '004_private_media.sql'];
    const migrations = await Promise.all(files.map(async file => ({ version: file.slice(0, 3), sql: await fs.readFile(`db/migrations/${file}`, 'utf8') })));
    await applyApplicationMigrations(database, SCHEMA_STATEMENTS, migrations);
    await applyApplicationMigrations(database, SCHEMA_STATEMENTS, migrations);
    for (const table of ['organizations', 'organization_invitations', 'media_assets', 'reservations', 'properties']) {
      assert.equal((await executor.queryOne<{ c: number }>(`SELECT COUNT(*)::int c FROM ${table}`))?.c, 0);
    }
    assert.equal((await executor.queryOne<{ c: number }>('SELECT COUNT(*)::int c FROM application_schema_migrations'))?.c, 5);
    await assert.rejects(applyApplicationMigrations(database, SCHEMA_STATEMENTS, [{ ...migrations[0], sql: migrations[0].sql + '\n-- drift' }]), /checksum/);
    const control = await fs.readFile('db/migrations/005_control_center.sql', 'utf8');
    await applyControlMigration(database, control);
    assert.equal((await executor.queryOne<{ c: number }>('SELECT COUNT(*)::int c FROM control_schema_migrations'))?.c, 1);
  } finally { await engine.close(); }
});

test('failed application migration rolls back DDL and its ledger', async () => {
  const { engine, executor, wrap } = await createTestDatabase('memory://staywise_test');
  const database = { ...executor, transaction: <T>(fn: (tx: typeof executor) => Promise<T>) => engine.transaction(tx => fn({ ...wrap(tx), execute: async (sql: string, params: any[] = []) => {
    if (!params.length) { await tx.exec(sql); return 0; }
    return wrap(tx).execute(sql, params);
  } })) };
  try {
    await assert.rejects(applyApplicationMigrations(database, ['CREATE TABLE install_probe(id TEXT)'], [{ version: 'broken', sql: 'SELECT * FROM nonexistent_install_table' }]));
    assert.equal((await executor.queryOne<{ t: string | null }>("SELECT to_regclass('install_probe')::text t"))?.t, null);
    assert.equal((await executor.queryOne<{ t: string | null }>("SELECT to_regclass('application_schema_migrations')::text t"))?.t, null);
  } finally { await engine.close(); }
});

test('photo request preflight counts complete UTF-8 JSON and rejects oversized bodies', () => {
  assert.equal(encodeEvidenceRequest({ filename: 'photo', dataUrl: 'small' }), JSON.stringify({ filename: 'photo', dataUrl: 'small' }));
  assert.throws(() => encodeEvidenceRequest({ dataUrl: 'a'.repeat(MAX_EVIDENCE_REQUEST_BYTES) }), /Photo too large/);
  assert.throws(() => encodeEvidenceRequest({ filename: 'é'.repeat(MAX_EVIDENCE_REQUEST_BYTES / 2) }), /Photo too large/);
});

test('API readiness cannot initialize schema or seed demonstration records', async () => {
  const source = await fs.readFile('server/db.ts', 'utf8');
  const readiness = source.slice(source.indexOf('export async function ensureDbReady'));
  assert.doesNotMatch(readiness, /initSchema\(|seedIfEmpty\(/);
  assert.doesNotMatch(source, /import.*seed-data/);
});
