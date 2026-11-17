import crypto from "node:crypto";
import type { Request } from "express";
import type { DbExecutor } from "../db.js";
import { verifyNeonAuthJwt } from "../security.js";

export type ControlDatabase = DbExecutor & {
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
};
export class ControlError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export interface ControlPrincipal {
  userId: string;
  role: string;
  permissions: string[];
  tokenHash: string;
  authenticatedAt?: number;
}
export const roles = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT",
  "BILLING_ADMIN",
  "READ_ONLY_ANALYST",
];
export const digest = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
export function redactAuditText(value: string | null): string | null {
  if (!value) return value;
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[REDACTED TOKEN]",
    )
    .replace(
      /\b(password|secret|token|pin|access[_ -]?code|wifi[_ -]?password)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    );
}

export async function auditControl(
  tx: DbExecutor,
  actor: string | null,
  requestId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  reason: string | null = null,
  changes: unknown = {},
  organizationId: string | null = null,
  result = "success",
) {
  // Callers pass explicit, allowlisted changes only. Never pass request bodies.
  await tx.execute(
    `INSERT INTO admin_audit_logs (id,administrator_id,request_id,action,target_type,target_id,reason,changes_json,organization_id,result) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      crypto.randomUUID(),
      actor,
      requestId,
      action,
      targetType,
      targetId,
      redactAuditText(reason),
      JSON.stringify(changes),
      organizationId,
      result,
    ],
  );
}
export function requiredReason(value: unknown) {
  if (
    typeof value !== "string" ||
    value.trim().length < 10 ||
    value.length > 500
  )
    throw new ControlError(
      422,
      "Reason must contain 10–500 characters; do not include secrets.",
    );
  return value.trim();
}
export function pageQuery(req: Request) {
  const page = Number(req.query.page || 1),
    limit = Number(req.query.limit || 25);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new ControlError(422, "Invalid pagination");
  const q = String(req.query.q || "").trim();
  if (q.length > 150) throw new ControlError(422, "Search too long");
  return { page, limit, offset: (page - 1) * limit, q };
}
export async function controlPrincipal(
  database: ControlDatabase,
  req: Request,
): Promise<ControlPrincipal> {
  const authorization = req.headers.authorization;
  const token =
    typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;
  const identity = await verifyNeonAuthJwt(token);
  if (
    !identity?.emailVerified ||
    !identity.issuedAt ||
    !identity.expiresAt ||
    !token
  )
    throw new ControlError(401, "Verified identity required");
  const requestId = String(
    (req as any).controlRequestId || crypto.randomUUID(),
  );
  const tokenHash = digest(token),
    now = Math.floor(Date.now() / 1000);
  if (identity.issuedAt > now + 30)
    throw new ControlError(401, "Invalid future-issued administrative token");
  return database.transaction(async (tx) => {
    const profile = await tx.queryOne<any>(
      `SELECT a.user_id,a.role,a.status,a.revoked_before FROM admin_profiles a JOIN users u ON u.id=a.user_id WHERE u.neon_auth_id=$1 AND u.account_status='Active' FOR SHARE OF a`,
      [identity.sub],
    );
    if (
      !profile ||
      profile.status !== "Active" ||
      !roles.includes(profile.role) ||
      identity.issuedAt! <= Number(profile.revoked_before)
    )
      throw new ControlError(403, "Internal administrator access required");
    if (now - identity.issuedAt! >= 1800)
      throw new ControlError(
        401,
        "Administrative session expired; sign in again",
      );
    // User-keyed, atomic shared limiter. No forwarded client-IP claims are trusted here.
    const bucket = await tx.queryOne<any>(
      `INSERT INTO rate_limit_buckets(bucket_key,hit_count,window_start) VALUES($1,1,$2)
      ON CONFLICT(bucket_key) DO UPDATE SET hit_count=CASE WHEN rate_limit_buckets.window_start<$2-60 THEN 1 ELSE rate_limit_buckets.hit_count+1 END,
      window_start=CASE WHEN rate_limit_buckets.window_start<$2-60 THEN $2 ELSE rate_limit_buckets.window_start END RETURNING hit_count`,
      ["control:" + profile.user_id, now],
    );
    if (bucket.hit_count > 180)
      throw new ControlError(429, "Administrative rate limit exceeded");
    const inserted = await tx.execute(
      `INSERT INTO admin_sessions(token_hash,user_id,issued_at,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [
        tokenHash,
        profile.user_id,
        identity.issuedAt,
        Math.min(identity.expiresAt!, identity.issuedAt! + 1800),
      ],
    );
    const session = await tx.queryOne<any>(
      "SELECT revoked,expires_at FROM admin_sessions WHERE token_hash=$1 AND user_id=$2",
      [tokenHash, profile.user_id],
    );
    if (!session || session.revoked || Number(session.expires_at) <= now)
      throw new ControlError(401, "Administrative session revoked or expired");
    if (inserted)
      await auditControl(
        tx,
        profile.user_id,
        requestId,
        "session.started",
        "session",
        null,
      );
    const permissions = await tx.query<{ permission: string }>(
      "SELECT permission FROM admin_role_permissions WHERE role=$1",
      [profile.role],
    );
    return {
      userId: profile.user_id,
      role: profile.role,
      permissions: permissions.map((p) => p.permission),
      tokenHash,
      authenticatedAt: identity.authenticationTime,
    };
  });
}

export const directorySpecs = {
  organizations: {
    permission: "organizations.read",
    from: "organizations o",
    fields:
      "o.id,o.name,o.default_country,o.plan_tier,o.account_status,o.control_version,o.created_at,(SELECT count(*)::int FROM organization_memberships m WHERE m.organization_id=o.id) AS member_count,(SELECT count(*)::int FROM properties p WHERE p.organization_id=o.id AND p.archived=0) AS property_count",
    search: "o.name",
    scope: "o.id",
    order: "o.created_at",
  },
  users: {
    permission: "users.read",
    from: "users u",
    fields:
      "u.id,u.name,u.email,u.account_status,u.control_version,u.created_at",
    search: "u.name || ' ' || u.email",
    scope: "u.id",
    order: "u.created_at",
  },
  properties: {
    permission: "properties.read",
    from: "properties p JOIN organizations o ON o.id=p.organization_id",
    fields:
      "p.id,p.name,p.organization_id,o.name AS organization_name,p.city,p.state,p.country,p.archived,p.readiness_status AS recorded_status,p.created_at",
    search: "p.name",
    scope: "p.organization_id",
    order: "p.created_at",
  },
  reservations: {
    permission: "operations.read",
    from: "reservations r JOIN organizations o ON o.id=r.organization_id",
    fields:
      "r.id,r.organization_id,o.name AS organization_name,r.property_id,r.status,r.check_in_date,r.check_out_date,r.created_at",
    search: "o.name",
    scope: "r.organization_id",
    order: "r.created_at",
  },
  turnovers: {
    permission: "operations.read",
    from: "cleaning_tasks t JOIN organizations o ON o.id=t.organization_id",
    fields:
      "t.id,t.organization_id,o.name AS organization_name,t.property_id,t.assigned_name,t.status,t.due_date,t.updated_at,t.created_at",
    search: "o.name",
    scope: "t.organization_id",
    order: "t.created_at",
  },
  incidents: {
    permission: "operations.read",
    from: "incidents i JOIN organizations o ON o.id=i.organization_id",
    fields:
      "i.id,i.organization_id,o.name AS organization_name,i.property_id,i.category,i.priority,i.status,i.created_at",
    search: "o.name",
    scope: "i.organization_id",
    order: "i.created_at",
  },
  subscriptions: {
    permission: "billing.read",
    from: "organizations o",
    fields:
      "o.id,o.name,o.plan_tier,o.property_limit,o.ai_monthly_allowance,o.account_status,o.created_at",
    search: "o.name",
    scope: "o.id",
    order: "o.created_at",
  },
  support: {
    permission: "support.read",
    from: "admin_support_tickets t JOIN organizations o ON o.id=t.organization_id",
    fields:
      "t.id,t.organization_id,o.name AS organization_name,t.subject,t.category,t.priority,t.status,t.assigned_admin_id,t.version,t.created_at,t.updated_at,t.resolved_at",
    search: "t.subject || ' ' || o.name",
    scope: "t.organization_id",
    order: "t.created_at",
  },
  communications: {
    permission: "communications.read",
    from: "admin_announcements a",
    fields:
      "a.id,a.organization_id,a.title,a.author_id,a.approved_by,a.status,a.version,a.created_at,a.published_at",
    search: "a.title",
    scope: "a.organization_id",
    order: "a.created_at",
  },
  audit: {
    permission: "audit.read",
    from: "admin_audit_logs a",
    fields:
      "a.id,a.administrator_id,a.action,a.target_type,a.target_id,a.organization_id,a.request_id,a.result,a.created_at",
    search: "a.action",
    scope: "a.organization_id",
    order: "a.created_at",
  },
  security: {
    permission: "security.read",
    from: "admin_sessions s",
    fields: "s.user_id,s.issued_at,s.expires_at,s.revoked,s.created_at",
    search: "s.user_id",
    scope: "s.user_id",
    order: "s.created_at",
  },
} as const;
export type DirectoryKey = keyof typeof directorySpecs;
export async function directory(
  database: DbExecutor,
  key: DirectoryKey,
  req: Request,
) {
  const spec = directorySpecs[key],
    { page, limit, offset, q } = pageQuery(req);
  const org = String(req.query.organization_id || "");
  if (org.length > 150) throw new ControlError(422, "Invalid scope");
  const status = String(req.query.status || "");
  if (status.length > 80) throw new ControlError(422, "Invalid status");
  const start = String(req.query.start || ""),
    end = String(req.query.end || "");
  for (const date of [start, end])
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new ControlError(422, "Invalid date");
  if (start && end && start > end)
    throw new ControlError(422, "Invalid date range");
  const direction = req.query.sort === "asc" ? "ASC" : "DESC";
  const statusColumn = (
    {
      organizations: "o.account_status",
      users: "u.account_status",
      support: "t.status",
      reservations: "r.status",
      turnovers: "t.status",
      incidents: "i.status",
      communications: "a.status",
      subscriptions: "o.account_status",
    } as Record<string, string>
  )[key];
  if (status && !statusColumn)
    throw new ControlError(422, "Status filter not supported for this dataset");
  const where = `WHERE (${spec.search} ILIKE $1 OR ${key === "security" ? "s.user_id" : key === "users" ? "u.id" : key === "properties" ? "p.id" : key === "reservations" ? "r.id" : key === "incidents" ? "i.id" : key === "audit" || key === "communications" ? "a.id" : key === "support" || key === "turnovers" ? "t.id" : "o.id"} ILIKE $1) AND ($2='' OR ${key === "users" ? "EXISTS (SELECT 1 FROM organization_memberships m WHERE m.user_id=u.id AND m.organization_id=$2)" : spec.scope + "=$2"}) AND ($3='' OR ${spec.order}::text >= $3) AND ($4='' OR ${spec.order}::text < $4) ${statusColumn ? `AND ($5='' OR ${statusColumn}=$5)` : ""}`;
  const params = [
    `%${q.replace(/[%_\\]/g, "\\$&")}%`,
    org,
    start,
    end ? new Date(Date.parse(end) + 86400000).toISOString().slice(0, 10) : "",
  ];
  if (statusColumn) params.push(status);
  const tie =
    key === "security"
      ? "s.token_hash"
      : key === "users"
        ? "u.id"
        : key === "properties"
          ? "p.id"
          : key === "reservations"
            ? "r.id"
            : key === "incidents"
              ? "i.id"
              : ["audit", "communications"].includes(key)
                ? "a.id"
                : ["support", "turnovers"].includes(key)
                  ? "t.id"
                  : "o.id";
  const rows = await database.query(
    `SELECT ${spec.fields} FROM ${spec.from} ${where} ORDER BY ${spec.order} ${direction}, ${tie} ${direction} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  const total = await database.queryOne<any>(
    `SELECT count(*)::int AS count FROM ${spec.from} ${where}`,
    params,
  );
  return {
    rows,
    total: total?.count || 0,
    page,
    limit,
    source:
      key === "subscriptions"
        ? "Organization entitlements only; payment provider not connected"
        : key === "turnovers"
          ? "Cleaning task records, not certified turnover lifecycle"
          : key === "properties"
            ? "Legacy server status; readiness certification unavailable"
            : "Recorded database rows",
  };
}
