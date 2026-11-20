import crypto from 'node:crypto';
import type { DbExecutor } from '../db.js';

type Database = DbExecutor & { transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> };
export interface ApplicationMigration { version: string; sql: string }

/** Explicit operator only. All base DDL and ordered additions commit together. No seed. */
export async function applyApplicationMigrations(database: Database, base: readonly string[], migrations: ApplicationMigration[]) {
  return database.transaction(async tx => {
    await tx.execute("SELECT pg_advisory_xact_lock(hashtext('staywise-application-migrations'))");
    await tx.execute('CREATE TABLE IF NOT EXISTS application_schema_migrations(version TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    for (const migration of [{ version: 'base', sql: base.join(';\n') }, ...migrations]) {
      const checksum = crypto.createHash('sha256').update(migration.sql).digest('hex');
      const previous = await tx.queryOne<{ sha256: string }>('SELECT sha256 FROM application_schema_migrations WHERE version=$1', [migration.version]);
      if (previous) {
        if (previous.sha256 !== checksum) throw new Error('Application migration checksum mismatch');
        continue;
      }
      await tx.execute(migration.sql);
      await tx.execute('INSERT INTO application_schema_migrations(version,sha256) VALUES($1,$2)', [migration.version, checksum]);
    }
  });
}
