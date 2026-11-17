import "dotenv/config";
import crypto from "node:crypto";
import { db, getPool } from "../server/db.js";
import {
  auditControl,
  requiredReason,
  roles,
} from "../server/lib/control-center.js";

// DBA/operator procedure, not an HTTP grant endpoint or an email allowlist.
async function main() {
  const [userId, role, status, reason, ...extra] = process.argv.slice(2);
  if (
    process.env.STAYWISE_CONTROL_DB_ACTION !== "reviewed" ||
    extra.length ||
    !userId ||
    !roles.includes(role) ||
    !["Active", "Suspended"].includes(status)
  )
    throw new Error(
      'Review target then use: user-id ROLE Active|Suspended "reason"',
    );
  requiredReason(reason);
  await db.transaction(async (tx) => {
    await tx.execute(
      "SELECT pg_advisory_xact_lock(hashtext('staywise-admin-grants'))",
    );
    const user = await tx.queryOne<any>(
      "SELECT id,neon_auth_id FROM users WHERE id=$1",
      [userId],
    );
    if (!user?.neon_auth_id) throw new Error("Existing linked user required");
    const before = await tx.queryOne<any>(
      "SELECT user_id,role,status FROM admin_profiles WHERE user_id=$1 FOR UPDATE",
      [userId],
    );
    const active = await tx.queryOne<any>(
      "SELECT count(*)::int AS count FROM admin_profiles WHERE role='SUPER_ADMIN' AND status='Active'",
    );
    if (!active?.count && (role !== "SUPER_ADMIN" || status !== "Active"))
      throw new Error("First grant must be an active SUPER_ADMIN");
    if (
      before?.role === "SUPER_ADMIN" &&
      before.status === "Active" &&
      active.count === 1 &&
      (role !== "SUPER_ADMIN" || status !== "Active")
    )
      throw new Error("Cannot remove last active SUPER_ADMIN");
    await tx.execute(
      `INSERT INTO admin_profiles(user_id,role,status) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET role=$2,status=$3,version=admin_profiles.version+1,revoked_before=$4`,
      [userId, role, status, Math.floor(Date.now() / 1000)],
    );
    await tx.execute(
      "UPDATE admin_sessions SET revoked=true WHERE user_id=$1",
      [userId],
    );
    await auditControl(
      tx,
      null,
      crypto.randomUUID(),
      "operator.administrator.grant",
      "administrator",
      userId,
      reason,
      {
        before: before || null,
        after: { role, status },
        scope: "global internal",
        provenance: "DBA reviewed CLI, not web identity",
      },
    );
  });
  console.log("Explicit internal grant updated; sign in again.");
}
main()
  .catch(() => {
    console.error(
      "Control bootstrap failed; check reviewed target, linked user and last-super-admin policy.",
    );
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
