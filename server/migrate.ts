import 'dotenv/config';
import fs from 'node:fs/promises';
import { db, SCHEMA_STATEMENTS, closePoolIfInitialized } from './db.js';
import { applyApplicationMigrations } from './lib/application-migrations.js';

async function main() {
  if (process.env.STAYWISE_DB_ACTION !== 'reviewed') {
    throw new Error('Review target database, SQL and backup; STAYWISE_DB_ACTION=reviewed is required.');
  }
  const files = ['001_rate_limits.sql', '002_platform_crm.sql', '003_security_invitations.sql', '004_private_media.sql'];
  const migrations = await Promise.all(files.map(async file => ({
    version: file.slice(0, 3),
    sql: await fs.readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8'),
  })));
  await applyApplicationMigrations(db, SCHEMA_STATEMENTS, migrations);
  console.log('[STAYWISE] Application schema base + 001–004 applied/verified. No demo data. Control 005 is a separate reviewed action.');
}

main().catch(() => {
  console.error('[STAYWISE] Migration failed. Review target, migration history and backup; no credentials logged. STAYWISE_DB_ACTION=reviewed required.');
  process.exitCode = 1;
}).finally(() => closePoolIfInitialized());
