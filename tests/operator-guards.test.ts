import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
test('operator tools reject unreviewed actions without opening a pool or loading workspace env', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'staywise-guard-'));
  const env = { ...process.env };
  for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'STAYWISE_CONTROL_DB_ACTION', 'DOTENV_CONFIG_PATH']) delete env[name];
  const loader = path.resolve('node_modules/tsx/dist/loader.mjs');
  try {
    for (const script of ['control-migrate.ts', 'control-bootstrap.ts']) {
      try {
        await run(process.execPath, ['--import', loader, path.resolve('scripts', script)], { cwd, env, timeout: 15000 });
        assert.fail(`${script} must reject an unreviewed operation`);
      } catch (error) {
        const failure = error as { code: number; stderr: string };
        assert.equal(failure.code, 1);
        assert.match(failure.stderr, /Control (migration|bootstrap) failed/);
        assert.doesNotMatch(failure.stderr, /DATABASE_URL is not configured|ECONNREFUSED|postgresql:\/\//);
      }
    }
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('application migration and demo seed refuse unattended database changes', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'staywise-install-guard-'));
  const env = { ...process.env };
  for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'STAYWISE_DB_ACTION', 'STAYWISE_DEMO_SEED', 'DOTENV_CONFIG_PATH']) delete env[name];
  const loader = path.resolve('node_modules/tsx/dist/loader.mjs');
  try {
    for (const script of ['migrate.ts', 'seed-cli.ts']) {
      await assert.rejects(run(process.execPath, ['--import', loader, path.resolve('server', script)], { cwd, env, timeout: 15000 }), (error: any) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /Migration failed|Seed refused or failed/);
        assert.doesNotMatch(error.stderr, /DATABASE_URL is not configured|ECONNREFUSED|postgresql:\/\//);
        return true;
      });
    }
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
