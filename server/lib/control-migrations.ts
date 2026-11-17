import crypto from "node:crypto";
import type { ControlDatabase } from "./control-center.js";

/** Explicit operator command only. Never called by request or server startup. */
export async function applyControlMigration(
  database: ControlDatabase,
  sql: string,
) {
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");
  return database.transaction(async (tx) => {
    await tx.execute(
      "SELECT pg_advisory_xact_lock(hashtext('staywise-control-migrations'))",
    );
    await tx.execute(
      "CREATE TABLE IF NOT EXISTS control_schema_migrations(version TEXT PRIMARY KEY,sha256 TEXT NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const previous = await tx.queryOne<{ sha256: string }>(
      "SELECT sha256 FROM control_schema_migrations WHERE version=$1",
      ["005"],
    );
    if (previous) {
      if (previous.sha256 !== checksum)
        throw new Error("Migration checksum mismatch");
      return { applied: false, version: "005" };
    }
    const base = await tx.queryOne<{ table_name: string | null }>(
      "SELECT to_regclass('organizations') AS table_name",
    );
    if (!base?.table_name)
      throw new Error("Existing reviewed base schema required");
    await tx.execute(sql);
    await tx.execute(
      "INSERT INTO control_schema_migrations(version,sha256) VALUES($1,$2)",
      ["005", checksum],
    );
    return { applied: true, version: "005" };
  });
}
