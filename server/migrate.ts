import 'dotenv/config';
import { getPool, initSchema } from './db.js';

async function main() {
  console.log('[STAYWISE] Running PostgreSQL schema migration...');
  await initSchema();
  console.log('[STAYWISE] Schema migration complete.');
  await getPool().end();
}

main().catch((err) => {
  console.error('[STAYWISE] Migration failed:', err);
  process.exit(1);
});
