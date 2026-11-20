import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { CONTROL_SCHEMA_REVIEW_SQL, compareControlSchema, type SchemaReviewRow } from '../server/lib/control-schema-review.js';

test('catalog comparison detects drift without changing schema or repairing ledger', async () => {
  const engine = new PGlite();
  try {
    await engine.exec(await fs.readFile('db/schema.sql', 'utf8'));
    await engine.exec(await fs.readFile('db/migrations/005_control_center.sql', 'utf8'));
    const expected = (await engine.query<SchemaReviewRow>(CONTROL_SCHEMA_REVIEW_SQL)).rows;
    assert.equal(compareControlSchema(expected, expected).matches, true);
    const counts = (await engine.query<{ n: number }>('SELECT count(*)::int AS n FROM admin_profiles')).rows;
    assert.equal(counts[0].n, 0);
    await engine.exec('ALTER TABLE admin_audit_logs DISABLE TRIGGER admin_audit_immutable');
    await engine.exec("DELETE FROM admin_role_permissions WHERE role='SUPPORT' AND permission='users.read'");
    await engine.exec('ALTER TABLE admin_profiles ALTER COLUMN status DROP NOT NULL');
    const actual = (await engine.query<SchemaReviewRow>(CONTROL_SCHEMA_REVIEW_SQL)).rows;
    const result = compareControlSchema(expected, actual);
    assert.equal(result.matches, false);
    assert.ok(result.changed.includes('trigger:admin_audit_logs.admin_audit_immutable'));
    assert.ok(result.changed.includes('column:admin_profiles.status'));
    assert.ok(result.missing.includes('permission:SUPPORT:users.read'));
    assert.equal((await engine.query<{ ledger: string | null }>("SELECT to_regclass('public.control_schema_migrations') AS ledger")).rows[0].ledger, null);
  } finally { await engine.close(); }
});

test('schema comparison rejects duplicates and extra permissions instead of hiding drift', () => {
  const row = { kind: 'permission', name: 'SUPPORT:users.read', definition: 'present' };
  assert.throws(() => compareControlSchema([row], [row, row]), /Duplicate/);
  assert.throws(() => compareControlSchema([row, row], [row]), /Duplicate/);
  const result = compareControlSchema([], [row]);
  assert.equal(result.matches, false);
  assert.deepEqual(result.unexpected, ['permission:SUPPORT:users.read']);
});
