import 'dotenv/config';
import { db, getPool, initSchema } from './db.js';
import { seedIfEmpty } from './seed-data.js';

async function main() {
  console.log('[STAYWISE] Running PostgreSQL migration + seed...');
  await initSchema();
  await db.transaction(async (tx) => {
    await seedIfEmpty(tx);
  });
  console.log('[STAYWISE] Database seeded successfully.');
  await getPool().end();
}

main().catch((err) => {
  console.error('[STAYWISE] Seed failed:', err);
  process.exit(1);
});
