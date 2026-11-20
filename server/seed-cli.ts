import 'dotenv/config';
import { db, closePoolIfInitialized } from './db.js';
import { seedIfEmpty } from './seed-data.js';

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.STAYWISE_DEMO_SEED !== 'local-disposable-only') {
    throw new Error('Demo seed requires an explicit local disposable database; hosted environments are forbidden.');
  }
  const target = new URL(process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
    throw new Error('Demo seeding is restricted to a local disposable PostgreSQL host.');
  }
  console.log('[STAYWISE] Seeding local disposable database. Install migrations first.');
  await db.transaction(async (tx) => {
    await seedIfEmpty(tx);
  });
  console.log('[STAYWISE] Database seeded successfully.');
}

main().catch(() => {
  console.error('[STAYWISE] Seed refused or failed. Requires explicit local disposable target; no credentials logged.');
  process.exitCode = 1;
}).finally(() => closePoolIfInitialized());
