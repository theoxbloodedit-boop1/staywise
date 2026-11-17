import { getNeonAuthBaseUrl } from "../security.js";
import { PLANS, parsePlanTier } from "../../src/lib/plans.js";
import crypto from "node:crypto";
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  auditControl,
  controlPrincipal,
  ControlError,
  directory,
  directorySpecs,
  pageQuery,
  requiredReason,
  type ControlDatabase,
  type ControlPrincipal,
  type DirectoryKey,
} from "../lib/control-center.js";

export function createControlCenterRouter(database: ControlDatabase) {
  const router = Router();
  const safe =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res)).catch(next);
    };
  const fresh = (req: Request, res: Response, next: NextFunction) => {
    const at = actor(req).authenticatedAt;
    const age = at ? Math.floor(Date.now() / 1000) - at : Infinity;
    if (age < 0 || age > 300)
      return next(
        new ControlError(
          403,
          "Recent provider reauthentication (verified auth_time within 5 minutes) required",
        ),
      );
    next();
  };
  const actor = (req: Request) => (req as any).control as ControlPrincipal;
  const requestId = (req: Request) => String((req as any).controlRequestId);
  const permit = (permission: string) =>
    safe(async (req, res) => {
      if (!actor(req).permissions.includes(permission)) {
        await auditControl(
          database,
          actor(req).userId,
          requestId(req),
          "permission.denied",
          "permission",
          permission,
          null,
          {},
          null,
          "denied",
        );
        throw new ControlError(403, "Permission denied");
      }
    });
  // Middleware wrapper: successful checks must next(), unlike endpoint handlers.
  const allowed =
    (permission: string) =>
    (req: Request, res: Response, next: NextFunction) => {
      if (actor(req).permissions.includes(permission)) return next();
      return permit(permission)(req, res, next);
    };
  router.use((req, res, next) => {
    (req as any).controlRequestId = crypto.randomUUID();
    res.setHeader("X-Request-ID", requestId(req));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
  // Public issuer configuration only; no internal identity or business data.
  router.get("/config", (_req, res) =>
    res.json({ neonAuthUrl: getNeonAuthBaseUrl() }),
  );
  router.use((req, res, next) => {
    controlPrincipal(database, req)
      .then((p) => {
        (req as any).control = p;
        next();
      })
      .catch(async (err) => {
        if (err instanceof ControlError && [401, 403].includes(err.status)) {
          try {
            await auditControl(
              database,
              null,
              requestId(req),
              "authentication.denied",
              "control-center",
              null,
              null,
              {},
              null,
              "denied",
            );
          } catch {
            /* unprovisioned schema fails closed */
          }
        }
        next(err);
      });
  });
  router.get(
    "/session",
    safe(async (req, res) =>
      res.json({
        userId: actor(req).userId,
        role: actor(req).role,
        permissions: actor(req).permissions,
        scope: "explicit global internal access",
        sessionMaximumMinutes: 30,
      }),
    ),
  );
  router.post(
    "/logout",
    safe(async (req, res) => {
      await database.transaction(async (tx) => {
        await tx.execute(
          "UPDATE admin_sessions SET revoked=true WHERE token_hash=$1",
          [actor(req).tokenHash],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "session.logout",
          "session",
          null,
        );
      });
      res.json({ revoked: true });
    }),
  );
  router.get(
    "/overview",
    allowed("overview.read"),
    safe(async (req, res) => {
      const days = Number(req.query.days || 30);
      if (![1, 7, 30, 90, 365].includes(days))
        throw new ControlError(422, "Unsupported period");
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const counts = await database.queryOne(
        `SELECT (SELECT count(*)::int FROM organizations) AS organizations,
     (SELECT count(*)::int FROM organizations WHERE account_status='Active') AS active_organizations,
     (SELECT count(*)::int FROM organizations WHERE created_at >= $1) AS new_organizations,
     (SELECT count(*)::int FROM users) AS registered_users,
     (SELECT count(*)::int FROM properties) AS properties,
     (SELECT count(*)::int FROM properties WHERE archived=0) AS active_properties,
     (SELECT count(*)::int FROM cleaning_tasks WHERE created_at >= $1) AS cleaning_tasks_created,
     (SELECT count(*)::int FROM incidents WHERE priority='Critical' AND status NOT IN ('Resolved','Closed')) AS open_critical_incidents,
     (SELECT count(*)::int FROM admin_support_tickets WHERE status NOT IN ('Resolved','Closed')) AS open_internal_tickets`,
        [since],
      );
      const growth = await database.query(
        `SELECT left(created_at,10) AS day,count(*)::int AS count FROM organizations WHERE created_at >= $1 GROUP BY left(created_at,10) ORDER BY day`,
        [since],
      );
      const plans = await database.query(
        "SELECT plan_tier,count(*)::int AS count FROM organizations GROUP BY plan_tier",
      );
      res.json({
        counts,
        growth,
        plans,
        period: { days, since },
        freshness: new Date().toISOString(),
        unavailable: [
          "MRR",
          "ARR",
          "Active users",
          "Churn",
          "Trial conversion",
          "Collected revenue",
        ],
        currency: null,
        source: "Database aggregates; task counts are not certified turnovers",
      });
    }),
  );
  for (const key of Object.keys(directorySpecs) as DirectoryKey[])
    router.get(
      "/" + key,
      allowed(directorySpecs[key].permission),
      safe(async (req, res) => res.json(await directory(database, key, req))),
    );
  router.get(
    "/analytics",
    allowed("overview.read"),
    safe(async (_req, res) => {
      const rows =
        await database.query(`SELECT 'Properties' AS feature,count(DISTINCT organization_id)::int AS organizations,count(*)::int AS records FROM properties
     UNION ALL SELECT 'Reservations',count(DISTINCT organization_id)::int,count(*)::int FROM reservations
     UNION ALL SELECT 'Cleaning tasks',count(DISTINCT organization_id)::int,count(*)::int FROM cleaning_tasks
     UNION ALL SELECT 'Inspections',count(DISTINCT organization_id)::int,count(*)::int FROM inspections
     UNION ALL SELECT 'Incidents',count(DISTINCT organization_id)::int,count(*)::int FROM incidents
     UNION ALL SELECT 'Guidebooks',count(DISTINCT organization_id)::int,count(*)::int FROM guidebooks`);
      res.json({
        rows,
        source:
          "All-time persisted record presence, not tracked feature usage or completion events",
        activeUsers: null,
        retention: null,
        instrumentation:
          "Privacy-conscious product event instrumentation not yet installed",
      });
    }),
  );
  router.get(
    "/revenue",
    allowed("billing.read"),
    safe(async (_req, res) => {
      const records = await database.queryOne<any>(
        "SELECT count(*)::int AS count FROM payment_records",
      );
      res.json({
        provider: "Not connected",
        currency: null,
        MRR: null,
        ARR: null,
        collectedRevenue: null,
        outstanding: null,
        refunds: null,
        legacyPaymentRecordCount: records?.count || 0,
        source:
          "Legacy payment_records include a default Paid status, which is NOT accepted as payment-provider evidence. No amounts are represented as collected money.",
      });
    }),
  );
  router.patch(
    "/organizations/:id/plan",
    allowed("billing.write"),
    fresh,
    safe(async (req, res) => {
      const plan = parsePlanTier(req.body.plan);
      const reason = requiredReason(req.body.reason);
      if (
        !plan ||
        req.body.confirm !== req.params.id ||
        !Number.isInteger(req.body.version)
      )
        throw new ControlError(
          422,
          "Valid plan, version and exact ID confirmation required",
        );
      const spec = PLANS[plan];
      await database.transaction(async (tx) => {
        const row = await tx.queryOne<any>(
          "SELECT plan_tier,property_limit,ai_monthly_allowance,control_version FROM organizations WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!row) throw new ControlError(404, "Organization not found");
        if (row.control_version !== req.body.version)
          throw new ControlError(409, "Organization changed; reload");
        const properties = await tx.queryOne<any>(
          "SELECT count(*)::int AS count FROM properties WHERE organization_id=$1 AND archived=0",
          [req.params.id],
        );
        if (properties.count > spec.propertyLimit)
          throw new ControlError(
            409,
            "Current property count exceeds selected plan; no properties were archived",
          );
        await tx.execute(
          "UPDATE organizations SET plan_tier=$2,property_limit=$3,ai_monthly_allowance=$4,control_version=control_version+1 WHERE id=$1",
          [
            req.params.id,
            spec.tier,
            spec.propertyLimit,
            spec.aiMonthlyAllowance,
          ],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "organization.entitlements.changed",
          "organization",
          String(req.params.id),
          reason,
          {
            before: row,
            after: {
              plan: spec.tier,
              propertyLimit: spec.propertyLimit,
              aiAllowance: spec.aiMonthlyAllowance,
            },
            payment: "No payment operation performed",
          },
          String(req.params.id),
        );
      });
      res.json({ updated: true, paymentOperationPerformed: false });
    }),
  );
  router.get(
    "/organizations/:id",
    allowed("organizations.read"),
    safe(async (req, res) => {
      const row = await database.queryOne(
        `SELECT id,name,default_country,plan_tier,property_limit,ai_monthly_allowance,account_status,control_version,created_at FROM organizations WHERE id=$1`,
        [req.params.id],
      );
      if (!row) throw new ControlError(404, "Organization not found");
      res.json({
        organization: row,
        scope: "global internal read",
        billing: "Entitlements only; provider not connected",
      });
    }),
  );
  router.patch(
    "/organizations/:id/status",
    allowed("organizations.write"),
    fresh,
    safe(async (req, res) => {
      const reason = requiredReason(req.body.reason);
      if (
        !["Active", "Suspended"].includes(req.body.status) ||
        req.body.confirm !== req.params.id ||
        !Number.isInteger(req.body.version)
      )
        throw new ControlError(
          422,
          "Status, version and exact ID confirmation required",
        );
      const organization = await database.transaction(async (tx) => {
        const before = await tx.queryOne<any>(
          "SELECT id,account_status,control_version FROM organizations WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!before) throw new ControlError(404, "Organization not found");
        if (before.control_version !== req.body.version)
          throw new ControlError(
            409,
            "Record changed; reload before trying again",
          );
        const after = await tx.queryOne(
          `UPDATE organizations SET account_status=$2,control_version=control_version+1 WHERE id=$1 RETURNING id,account_status,control_version`,
          [req.params.id, req.body.status],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "organization.status.changed",
          "organization",
          String(req.params.id),
          reason,
          { before, after },
          String(req.params.id),
        );
        return after;
      });
      res.json(organization);
    }),
  );
  router.get(
    "/users/:id",
    allowed("users.read"),
    safe(async (req, res) => {
      const user = await database.queryOne(
        "SELECT id,name,email,account_status,control_version,created_at FROM users WHERE id=$1",
        [req.params.id],
      );
      if (!user) throw new ControlError(404, "User not found");
      const memberships = await database.query(
        "SELECT organization_id,role,status FROM organization_memberships WHERE user_id=$1 ORDER BY created_at LIMIT 100",
        [req.params.id],
      );
      res.json({ user, memberships });
    }),
  );
  router.patch(
    "/users/:id/status",
    allowed("users.write"),
    fresh,
    safe(async (req, res) => {
      const reason = requiredReason(req.body.reason);
      if (
        !["Active", "Suspended"].includes(req.body.status) ||
        req.body.confirm !== req.params.id ||
        !Number.isInteger(req.body.version)
      )
        throw new ControlError(
          422,
          "Status, version and exact ID confirmation required",
        );
      await database.transaction(async (tx) => {
        // Customer controls cannot be used to bypass the internal administrator grant process.
        const row = await tx.queryOne<any>(
          "SELECT id,account_status,control_version FROM users WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!row) throw new ControlError(404, "User not found");
        if (
          await tx.queryOne(
            "SELECT user_id FROM admin_profiles WHERE user_id=$1",
            [req.params.id],
          )
        )
          throw new ControlError(
            403,
            "Internal accounts require the reviewed administrator procedure",
          );
        if (row.control_version !== req.body.version)
          throw new ControlError(409, "Record changed; reload");
        await tx.execute(
          "UPDATE users SET account_status=$2,control_revoked_before=$3,control_version=control_version+1 WHERE id=$1",
          [req.params.id, req.body.status, Math.floor(Date.now() / 1000)],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "customer.status.changed",
          "user",
          String(req.params.id),
          reason,
          { before: row.account_status, after: req.body.status },
        );
      });
      res.json({
        updated: true,
        providerSessionsRevoked: false,
        applicationAccessRevoked: true,
      });
    }),
  );
  router.post(
    "/support",
    allowed("support.write"),
    safe(async (req, res) => {
      const { organization_id, subject, category, priority } = req.body;
      const categories = [
        "Account",
        "Authentication",
        "Billing",
        "Welcome Books",
        "Guest Access",
        "Reservations",
        "Cleaning",
        "Inspections",
        "Incidents",
        "Technical Issue",
        "Feature Request",
        "Other",
      ];
      if (
        typeof subject !== "string" ||
        subject.trim().length < 3 ||
        subject.length > 200 ||
        !categories.includes(category) ||
        !["Low", "Normal", "High", "Urgent"].includes(priority) ||
        typeof organization_id !== "string"
      )
        throw new ControlError(422, "Invalid ticket");
      const key = req.header("Idempotency-Key");
      if (!key || !/^[a-zA-Z0-9-]{16,80}$/.test(key))
        throw new ControlError(
          422,
          "Idempotency-Key required (16–80 letters, digits or hyphens)",
        );
      const id =
        "case-" +
        crypto
          .createHash("sha256")
          .update(actor(req).userId + ":" + key)
          .digest("hex");
      const ticket = await database.transaction(async (tx) => {
        const flag = await tx.queryOne<any>(
          "SELECT enabled FROM admin_feature_flags WHERE name='control_support_creation' AND scope IN ('global',$1) ORDER BY CASE WHEN scope=$1 THEN 0 ELSE 1 END LIMIT 1",
          [organization_id],
        );
        if (flag?.enabled === false)
          throw new ControlError(
            403,
            "Support case creation disabled for this scope",
          );
        if (
          !(await tx.queryOne("SELECT id FROM organizations WHERE id=$1", [
            organization_id,
          ]))
        )
          throw new ControlError(422, "Unknown organization");
        const inserted = await tx.execute(
          `INSERT INTO admin_support_tickets(id,organization_id,subject,category,priority) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [id, organization_id, subject.trim(), category, priority],
        );
        const row = await tx.queryOne<any>(
          "SELECT id,organization_id,subject,category,priority,status,version FROM admin_support_tickets WHERE id=$1",
          [id],
        );
        if (
          row.organization_id !== organization_id ||
          row.subject !== subject.trim() ||
          row.category !== category ||
          row.priority !== priority
        )
          throw new ControlError(
            409,
            "Idempotency key reused for different content",
          );
        if (inserted)
          await auditControl(
            tx,
            actor(req).userId,
            requestId(req),
            "support.created",
            "ticket",
            id,
            null,
            {},
            organization_id,
          );
        return row;
      });
      res.status(201).json(ticket);
    }),
  );
  router.get(
    "/support/:id",
    allowed("support.read"),
    safe(async (req, res) => {
      const ticket = await database.queryOne(
        "SELECT id,organization_id,subject,category,priority,status,assigned_admin_id,resolution_reason,version,created_at,updated_at,resolved_at FROM admin_support_tickets WHERE id=$1",
        [req.params.id],
      );
      if (!ticket) throw new ControlError(404, "Ticket not found");
      const notes = await database.query(
        "SELECT id,author_id,body,visibility,created_at FROM admin_support_notes WHERE ticket_id=$1 ORDER BY created_at LIMIT 100",
        [req.params.id],
      );
      res.json({
        ticket,
        notes,
        customerReplyDelivery: "Not connected; notes are internal only",
      });
    }),
  );
  router.patch(
    "/support/:id",
    allowed("support.write"),
    safe(async (req, res) => {
      const reason = requiredReason(req.body.reason),
        version = req.body.version;
      if (!Number.isInteger(version))
        throw new ControlError(422, "Version required");
      const transitions: Record<string, string[]> = {
        Open: ["In Progress", "Escalated", "Closed"],
        "In Progress": ["Waiting for Customer", "Escalated", "Resolved"],
        "Waiting for Customer": ["In Progress", "Escalated", "Resolved"],
        Escalated: ["In Progress", "Resolved"],
        Resolved: ["In Progress", "Closed"],
        Closed: ["Open"],
      };
      await database.transaction(async (tx) => {
        const row = await tx.queryOne<any>(
          "SELECT id,status,version,organization_id FROM admin_support_tickets WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!row) throw new ControlError(404, "Ticket not found");
        if (row.version !== version)
          throw new ControlError(409, "Ticket changed; reload");
        if (!transitions[row.status]?.includes(req.body.status))
          throw new ControlError(422, "Invalid ticket transition");
        await tx.execute(
          `UPDATE admin_support_tickets SET status=$2,resolution_reason=$3,version=version+1,updated_at=now(),resolved_at=CASE WHEN $2 IN ('Resolved','Closed') THEN now() ELSE NULL END WHERE id=$1`,
          [req.params.id, req.body.status, reason],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "support.transition",
          "ticket",
          String(req.params.id),
          reason,
          { from: row.status, to: req.body.status },
          row.organization_id,
        );
      });
      res.json({ updated: true });
    }),
  );
  router.post(
    "/support/:id/notes",
    allowed("support.write"),
    safe(async (req, res) => {
      if (
        typeof req.body.body !== "string" ||
        !req.body.body.trim() ||
        req.body.body.length > 4000
      )
        throw new ControlError(422, "Note must contain 1–4000 characters");
      await database.transaction(async (tx) => {
        const row = await tx.queryOne<any>(
          "SELECT organization_id FROM admin_support_tickets WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!row) throw new ControlError(404, "Ticket not found");
        await tx.execute(
          "INSERT INTO admin_support_notes(id,ticket_id,author_id,body) VALUES($1,$2,$3,$4)",
          [
            crypto.randomUUID(),
            req.params.id,
            actor(req).userId,
            req.body.body.trim(),
          ],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "support.note.added",
          "ticket",
          String(req.params.id),
          null,
          {},
          row.organization_id,
        );
      });
      res.status(201).json({ created: true, visibility: "internal" });
    }),
  );
  router.post(
    "/security/revoke",
    allowed("security.write"),
    fresh,
    safe(async (req, res) => {
      const reason = requiredReason(req.body.reason);
      if (
        typeof req.body.user_id !== "string" ||
        req.body.confirm !== req.body.user_id
      )
        throw new ControlError(422, "Exact user ID confirmation required");
      await database.transaction(async (tx) => {
        const row = await tx.queryOne(
          "SELECT user_id FROM admin_profiles WHERE user_id=$1 FOR UPDATE",
          [req.body.user_id],
        );
        if (!row) throw new ControlError(404, "Administrator not found");
        await tx.execute(
          "UPDATE admin_profiles SET revoked_before=$2,version=version+1 WHERE user_id=$1",
          [req.body.user_id, Math.floor(Date.now() / 1000)],
        );
        await tx.execute(
          "UPDATE admin_sessions SET revoked=true WHERE user_id=$1",
          [req.body.user_id],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "administrator.sessions.revoked",
          "administrator",
          req.body.user_id,
          reason,
        );
      });
      res.json({ revoked: true });
    }),
  );
  router.post(
    "/communications",
    allowed("communications.write"),
    safe(async (req, res) => {
      const { organization_id, title, body } = req.body;
      if (
        typeof organization_id !== "string" ||
        typeof title !== "string" ||
        title.trim().length < 3 ||
        title.length > 160 ||
        typeof body !== "string" ||
        !body.trim() ||
        body.length > 4000
      )
        throw new ControlError(422, "Invalid announcement");
      const id = crypto.randomUUID();
      await database.transaction(async (tx) => {
        if (
          !(await tx.queryOne("SELECT id FROM organizations WHERE id=$1", [
            organization_id,
          ]))
        )
          throw new ControlError(422, "Unknown audience organization");
        await tx.execute(
          "INSERT INTO admin_announcements(id,organization_id,title,body,author_id) VALUES($1,$2,$3,$4,$5)",
          [id, organization_id, title.trim(), body.trim(), actor(req).userId],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "announcement.drafted",
          "announcement",
          id,
          null,
          {},
          organization_id,
        );
      });
      res.status(201).json({ id, status: "Draft" });
    }),
  );
  router.get(
    "/communications/:id",
    allowed("communications.read"),
    safe(async (req, res) => {
      const row = await database.queryOne(
        "SELECT id,organization_id,title,body,author_id,approved_by,status,version,created_at,published_at FROM admin_announcements WHERE id=$1",
        [req.params.id],
      );
      if (!row) throw new ControlError(404, "Announcement not found");
      res.json(row);
    }),
  );
  router.post(
    "/communications/:id/:action",
    allowed("communications.publish"),
    fresh,
    safe(async (req, res) => {
      const action = req.params.action;
      if (!["approve", "publish"].includes(String(action)))
        throw new ControlError(404, "Unknown action");
      const reason = requiredReason(req.body.reason);
      if (
        !Number.isInteger(req.body.version) ||
        req.body.confirm !== req.params.id
      )
        throw new ControlError(
          422,
          "Version and exact ID confirmation required",
        );
      await database.transaction(async (tx) => {
        const row = await tx.queryOne<any>(
          "SELECT id,organization_id,title,body,status,author_id,version FROM admin_announcements WHERE id=$1 FOR UPDATE",
          [req.params.id],
        );
        if (!row) throw new ControlError(404, "Announcement not found");
        if (row.version !== req.body.version)
          throw new ControlError(409, "Announcement changed; reload");
        if (action === "approve") {
          if (row.status !== "Draft" || row.author_id === actor(req).userId)
            throw new ControlError(
              403,
              "A different administrator must approve a draft",
            );
          await tx.execute(
            "UPDATE admin_announcements SET status='Approved',approved_by=$2,version=version+1 WHERE id=$1",
            [req.params.id, actor(req).userId],
          );
        } else {
          if (row.status !== "Approved")
            throw new ControlError(
              409,
              "Only approved announcements can publish",
            );
          // Exactly one deterministic in-app inbox record in this same transaction. No email claim.
          await tx.execute(
            `INSERT INTO notifications(id,organization_id,channel,recipient_role,recipient_name,title,body,delivery_status,created_at) VALUES($1,$2,'In-app','Workspace','Organization team',$3,$4,'Available',$5)`,
            [
              "announcement-" + row.id,
              row.organization_id,
              row.title,
              row.body,
              new Date().toISOString(),
            ],
          );
          await tx.execute(
            "UPDATE admin_announcements SET status='Published',published_at=now(),version=version+1 WHERE id=$1",
            [req.params.id],
          );
        }
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "announcement." + action,
          "announcement",
          String(req.params.id),
          reason,
          {
            channel: "in-app",
            delivery: "Stored inbox availability only; not proof of read",
          },
          row.organization_id,
        );
      });
      res.json({ updated: true, emailSent: false });
    }),
  );
  router.put(
    "/settings/flags",
    allowed("settings.write"),
    fresh,
    safe(async (req, res) => {
      const reason = requiredReason(req.body.reason),
        scope = req.body.scope;
      if (
        req.body.name !== "control_support_creation" ||
        typeof scope !== "string" ||
        scope.length > 150 ||
        !scope ||
        typeof req.body.enabled !== "boolean" ||
        req.body.confirm !== scope ||
        !Number.isInteger(req.body.version)
      )
        throw new ControlError(422, "Invalid scoped flag confirmation");
      await database.transaction(async (tx) => {
        await tx.execute(
          "SELECT pg_advisory_xact_lock(hashtext('control-flag:'||$1))",
          [scope],
        );
        if (
          scope !== "global" &&
          !(await tx.queryOne("SELECT id FROM organizations WHERE id=$1", [
            scope,
          ]))
        )
          throw new ControlError(422, "Unknown organization scope");
        const before = await tx.queryOne<any>(
          "SELECT enabled,version FROM admin_feature_flags WHERE name=$1 AND scope=$2 FOR UPDATE",
          [req.body.name, scope],
        );
        if ((before?.version || 0) !== req.body.version)
          throw new ControlError(409, "Flag changed; reload");
        await tx.execute(
          `INSERT INTO admin_feature_flags(name,scope,enabled) VALUES($1,$2,$3) ON CONFLICT(name,scope) DO UPDATE SET enabled=$3,version=admin_feature_flags.version+1,updated_at=now()`,
          [req.body.name, scope, req.body.enabled],
        );
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "feature-flag.changed",
          "flag",
          req.body.name,
          reason,
          { scope, before: before || null, enabled: req.body.enabled },
          scope === "global" ? null : scope,
        );
      });
      res.json({ updated: true });
    }),
  );
  router.get(
    "/settings",
    allowed("settings.read"),
    safe(async (_req, res) => {
      const profiles = await database.query(
        "SELECT user_id,role,status,version,created_at FROM admin_profiles ORDER BY created_at LIMIT 100",
      );
      const permissions = await database.query(
        "SELECT role,permission FROM admin_role_permissions ORDER BY role,permission",
      );
      const flags = await database.query(
        "SELECT name,scope,enabled,version,updated_at FROM admin_feature_flags ORDER BY scope LIMIT 100",
      );
      res.json({
        profiles,
        permissions,
        flags,
        policy:
          "Explicit global internal scope. No automatic email grants. Grants and permission changes require the reviewed operator procedure; provider MFA/reauthentication not verified.",
      });
    }),
  );
  router.get(
    "/system",
    allowed("system.read"),
    safe(async (_req, res) => {
      const start = performance.now();
      await database.queryOne("SELECT 1 AS ok");
      res.json({
        database: {
          status: "reachable",
          latencyMs: Math.round(performance.now() - start),
          checkedAt: new Date().toISOString(),
        },
        authProvider: "Not checked",
        storage: "Not checked",
        backgroundJobs: "Not connected",
        paymentProvider: "Not connected",
      });
    }),
  );
  router.get(
    "/reports/:dataset",
    allowed("reports.read"),
    safe(async (req, res) => {
      const key = req.params.dataset as DirectoryKey;
      if (!Object.prototype.hasOwnProperty.call(directorySpecs, key))
        throw new ControlError(404, "Unknown report");
      if (!actor(req).permissions.includes(directorySpecs[key].permission))
        throw new ControlError(403, "Dataset permission denied");
      pageQuery(req);
      const format = req.query.format || "json";
      if (!["json", "csv"].includes(String(format)))
        throw new ControlError(422, "Unsupported format");
      const data = await database.transaction(async (tx) => {
        const result = await directory(tx, key, req);
        await auditControl(
          tx,
          actor(req).userId,
          requestId(req),
          "report.exported",
          "report",
          key,
          null,
          { page: result.page, limit: result.limit, count: result.rows.length },
        );
        return result;
      });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="staywise-${key}.${format}"`,
      );
      if (format === "json") return res.json(data);
      const rows = data.rows as Record<string, unknown>[];
      const columns = rows.length ? Object.keys(rows[0]) : [];
      const cell = (v: unknown) => {
        let s = String(v ?? "");
        if (/^[\s]*[=+@\-\t\r\n]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
      };
      res
        .type("text/csv")
        .send(
          [
            columns.map(cell).join(","),
            ...rows.map((row) => columns.map((c) => cell(row[c])).join(",")),
          ].join("\r\n"),
        );
    }),
  );
  router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ControlError)
      return res.status(err.status).json({ error: err.code });
    // No SQL, stack, raw bodies or secrets to clients.
    res.status(503).json({
      error:
        "Control Center unavailable. Verify controlled migrations and database connectivity.",
    });
  });
  return router;
}
