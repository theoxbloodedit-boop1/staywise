import "dotenv/config";
import { applyControlMigration } from "../server/lib/control-migrations.js";
import fs from "node:fs/promises";
import { db, closePoolIfInitialized } from "../server/db.js";

// Does NOT initialize the application schema or seed customer records.
async function main() {
  if (process.env.STAYWISE_CONTROL_DB_ACTION !== "reviewed")
    throw new Error(
      "Explicit STAYWISE_CONTROL_DB_ACTION=reviewed required. Review target, backup and SQL first.",
    );
  const sql = await fs.readFile(
    new URL("../db/migrations/005_control_center.sql", import.meta.url),
    "utf8",
  );
  await applyControlMigration(db, sql);
  console.log("Control Center migration 005 verified/applied.");
}
main()
  .catch(() => {
    console.error(
      "Control migration failed; no credentials or SQL parameters logged.",
    );
    process.exitCode = 1;
  })
  .finally(() => closePoolIfInitialized());
