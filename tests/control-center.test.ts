import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import express from "express";
import { SCHEMA_STATEMENTS } from "../server/db.js";
import { createControlCenterRouter } from "../server/routes/controlCenter.js";
import { createTestDatabase } from "./helpers/harness.js";
import { createJwtFixture } from "./helpers/jwt.js";
import { applyControlMigration } from "../server/lib/control-migrations.js";
import { digest, redactAuditText } from "../server/lib/control-center.js";

// Dedicated local PostgreSQL; no application DB env/production connection used.
test("Control Center: signed identity, explicit roles, safe directories, support transactions, exports and revocation", async () => {
  const { engine, executor, wrap } = await createTestDatabase(
    "memory://staywise_test",
  );
  const database = {
    ...executor,
    transaction: <T>(fn: any): Promise<T> =>
      engine.transaction((tx) => fn(wrap(tx as any))),
  };
  const jwt = await createJwtFixture();
  const names = [
    "NEON_AUTH_BASE_URL",
    "NEON_AUTH_JWKS_URL",
    "NEON_AUTH_AUDIENCE",
  ] as const;
  const old = names.map((n) => process.env[n]);
  process.env.NEON_AUTH_BASE_URL = jwt.issuer;
  process.env.NEON_AUTH_JWKS_URL = jwt.issuer + "/jwks";
  process.env.NEON_AUTH_AUDIENCE = "staywise-test";
  const app = express();
  app.use(express.json());
  app.use("/control", createControlCenterRouter(database));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No server");
  const base = `http://127.0.0.1:${address.port}/control`;
  const tokens: Record<string, string> = {};
  const request = (
    path: string,
    who = "super",
    method = "GET",
    body?: unknown,
    key?: string,
  ) =>
    fetch(base + path, {
      method,
      headers: {
        ...(who ? { Authorization: "Bearer " + tokens[who] } : {}),
        "Content-Type": "application/json",
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  try {
    for (const statement of SCHEMA_STATEMENTS) await engine.exec(statement);
    await engine.exec(
      await fs.readFile(
        new URL("../db/migrations/005_control_center.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const id of ["a", "b"])
      await executor.execute(
        "INSERT INTO organizations(id,name,slug,contact_email,contact_phone,created_at) VALUES($1,$2,$1,'test@example.test','','2026-01-01')",
        [id, id === "a" ? "=FORMULA" : "Organization B"],
      );
    for (const [id, role] of [
      ["super", "SUPER_ADMIN"],
      ["admin", "ADMIN"],
      ["support", "SUPPORT"],
      ["billing", "BILLING_ADMIN"],
      ["analyst", "READ_ONLY_ANALYST"],
      ["customer", ""],
      ["founder", ""],
    ]) {
      await executor.execute(
        "INSERT INTO users(id,neon_auth_id,name,email,avatar_initials,created_at) VALUES($1,$1,$1,$2,'TE','2026-01-01')",
        [
          id,
          id === "founder" ? "theoxbloodedit@gmail.com" : id + "@example.test",
        ],
      );
      tokens[id] = await jwt.sign(
        {
          auth_time: Math.floor(Date.now() / 1000),
          email:
            id === "founder"
              ? "theoxbloodedit@gmail.com"
              : id + "@example.test",
        },
        id,
      );
      if (role)
        await executor.execute(
          "INSERT INTO admin_profiles(user_id,role) VALUES($1,$2)",
          [id, role],
        );
    }
    await executor.execute(
      "INSERT INTO organization_memberships(id,organization_id,user_id,role,created_at) VALUES ('membership','a','customer','Organization Owner','2026-01-01')",
    );
    await executor.execute(
      "INSERT INTO properties(id,organization_id,slug,name,address_line,city,state,postal_code,cover_image,description,created_at) VALUES('property-b','b','property-b','Safe listing','','Test','','','','','2026-01-01')",
    );
    await executor.execute(
      "INSERT INTO reservations(id,organization_id,property_id,guest_name,guest_email,guest_phone,check_in_date,check_out_date,access_code,created_at) VALUES('res','b','property-b','PRIVATE GUEST','private@example.test','private','2026-12-01','2026-12-04','SECRET-DOOR-CODE','2026-01-01')",
    );
    assert.equal((await request("/overview", "")).status, 401);
    assert.equal((await request("/overview", "customer")).status, 403);
    assert.equal((await request("/overview", "founder")).status, 403); // Email never grants privilege.
    assert.equal((await request("/security", "billing")).status, 403);
    assert.equal((await request("/settings", "support")).status, 403);
    assert.equal((await request("/overview", "super")).status, 200);
    const overview = (await (await request("/overview")).json()) as any;
    assert.equal(overview.counts.organizations, 2);
    assert.ok(overview.unavailable.includes("MRR"));
    assert.equal(overview.currency, null);
    const directories = (await (
      await request("/organizations?limit=1")
    ).json()) as any;
    assert.equal(directories.rows.length, 1);
    assert.equal(directories.total, 2);
    const page2 = (await (
      await request("/organizations?limit=1&page=2")
    ).json()) as any;
    assert.notEqual(page2.rows[0].id, directories.rows[0].id);
    assert.equal((await request("/organizations?limit=1000")).status, 422);
    const reservations = await (await request("/reservations")).text();
    assert.ok(!reservations.includes("SECRET-DOOR-CODE"));
    assert.ok(!reservations.includes("PRIVATE GUEST"));
    assert.ok(!reservations.includes("private@example.test"));
    const scoped = (await (
      await request("/properties?organization_id=a")
    ).json()) as any;
    assert.equal(scoped.total, 0);
    const users = (await (
      await request("/users?organization_id=a")
    ).json()) as any;
    assert.deepEqual(
      users.rows.map((r: any) => r.id),
      ["customer"],
    );
    assert.equal((await request("/reports/security", "support")).status, 403);
    assert.equal((await request("/reports/security", "analyst")).status, 403); // Dataset permission also required.
    const csv = await request("/reports/organizations?format=csv");
    assert.equal(csv.status, 200);
    assert.equal(csv.headers.get("cache-control"), "private, no-store");
    assert.match(await csv.text(), /'=FORMULA/);
    assert.equal(
      (
        await request("/organizations/a/status", "analyst", "PATCH", {
          status: "Suspended",
          version: 1,
          confirm: "a",
          reason: "Reviewed customer account",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/organizations/a/status", "admin", "PATCH", {
          status: "Suspended",
          version: 1,
          confirm: "a",
          reason: "Reviewed customer account",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await executor.queryOne<any>(
          "SELECT account_status FROM organizations WHERE id=$1",
          ["a"],
        )
      )?.account_status,
      "Suspended",
    );
    assert.equal(
      (
        await request("/organizations/a/status", "admin", "PATCH", {
          status: "Active",
          version: 1,
          confirm: "a",
          reason: "Reviewed customer account",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/organizations/b/plan", "billing", "PATCH", {
          plan: "Starter",
          version: 1,
          confirm: "b",
          reason: "Customer confirmed Early Access plan",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await executor.queryOne<any>(
          "SELECT property_limit FROM organizations WHERE id='b'",
        )
      )?.property_limit,
      5,
    );
    assert.equal(
      (
        await request("/organizations/b/plan", "support", "PATCH", {
          plan: "Portfolio",
          version: 2,
          confirm: "b",
          reason: "Customer confirmed Early Access plan",
        })
      ).status,
      403,
    );
    const staleToken = await jwt.sign({}, "super");
    const currentToken = tokens.super;
    tokens.super = staleToken;
    assert.equal(
      (
        await request("/organizations/b/status", "super", "PATCH", {
          status: "Suspended",
          version: 2,
          confirm: "b",
          reason: "Reviewed account suspension request",
        })
      ).status,
      403,
    );
    tokens.super = currentToken;
    assert.equal((await request("/analytics")).status, 200);
    const revenue = (await (
      await request("/revenue", "billing")
    ).json()) as any;
    assert.equal(revenue.MRR, null);
    assert.equal(revenue.provider, "Not connected");
    // Audit failure must roll back the mutation.
    const saved = await executor.queryOne<any>(
      "SELECT control_version FROM organizations WHERE id='a'",
    );
    await engine.exec(
      "CREATE FUNCTION fail_control_status_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='organization.status.changed' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_control_audit BEFORE INSERT ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION fail_control_status_audit()",
    );
    assert.equal(
      (
        await request("/organizations/a/status", "admin", "PATCH", {
          status: "Active",
          version: saved.control_version,
          confirm: "a",
          reason: "Reviewed customer account",
        })
      ).status,
      503,
    );
    assert.equal(
      (
        await executor.queryOne<any>(
          "SELECT account_status FROM organizations WHERE id='a'",
        )
      )?.account_status,
      "Suspended",
    );
    await engine.exec(
      "DROP TRIGGER fail_control_audit ON admin_audit_logs; DROP FUNCTION fail_control_status_audit()",
    );
    const body = {
      organization_id: "b",
      subject: "Review guest portal configuration",
      category: "Guest Access",
      priority: "Normal",
    };
    assert.equal(
      (await request("/support", "support", "POST", body)).status,
      422,
    );
    const create = await request(
      "/support",
      "support",
      "POST",
      body,
      "test-idempotent-12345",
    );
    assert.equal(create.status, 201);
    const ticket = (await create.json()) as any;
    assert.equal(
      (
        await request(
          "/support",
          "support",
          "POST",
          body,
          "test-idempotent-12345",
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await executor.queryOne<any>(
          "SELECT count(*)::int AS count FROM admin_support_tickets",
        )
      )?.count,
      1,
    );
    assert.equal(
      (
        await request(
          "/support",
          "support",
          "POST",
          { ...body, subject: "Different subject" },
          "test-idempotent-12345",
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/support/" + ticket.id, "support", "PATCH", {
          status: "Resolved",
          version: 1,
          reason: "Resolution details recorded",
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await request("/support/" + ticket.id, "support", "PATCH", {
          status: "In Progress",
          version: 1,
          reason: "Investigating the customer issue",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/support/" + ticket.id, "support", "PATCH", {
          status: "Resolved",
          version: 1,
          reason: "Resolution details recorded",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/support/" + ticket.id + "/notes", "support", "POST", {
          body: "Internal triage complete. No credentials included.",
        })
      ).status,
      201,
    );
    const detail = (await (
      await request("/support/" + ticket.id, "support")
    ).json()) as any;
    assert.equal(detail.notes[0].visibility, "internal");
    assert.equal(
      (
        await request("/users/customer/status", "admin", "PATCH", {
          status: "Suspended",
          version: 1,
          confirm: "customer",
          reason: "Verified account suspension request",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/users/super/status", "admin", "PATCH", {
          status: "Suspended",
          version: 1,
          confirm: "super",
          reason: "Verified account suspension request",
        })
      ).status,
      403,
    );
    // Communications are draft/approval/in-app availability, never fabricated delivery.
    const draft = await request("/communications", "admin", "POST", {
      organization_id: "b",
      title: "Scheduled maintenance notice",
      body: "Please review the maintenance window with your team.",
    });
    assert.equal(draft.status, 201);
    const announcement = (await draft.json()) as any;
    assert.equal(
      (
        await request(
          "/communications/" + announcement.id + "/approve",
          "admin",
          "POST",
          {
            version: 1,
            confirm: announcement.id,
            reason: "Reviewed maintenance communication",
          },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          "/communications/" + announcement.id + "/publish",
          "super",
          "POST",
          {
            version: 1,
            confirm: announcement.id,
            reason: "Reviewed maintenance communication",
          },
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          "/communications/" + announcement.id + "/approve",
          "super",
          "POST",
          {
            version: 1,
            confirm: announcement.id,
            reason: "Reviewed maintenance communication",
          },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/communications/" + announcement.id + "/publish",
          "super",
          "POST",
          {
            version: 2,
            confirm: announcement.id,
            reason: "Reviewed maintenance communication",
          },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/communications/" + announcement.id + "/publish",
          "super",
          "POST",
          {
            version: 2,
            confirm: announcement.id,
            reason: "Reviewed maintenance communication",
          },
        )
      ).status,
      409,
    );
    const notification = await executor.queryOne<any>(
      "SELECT delivery_status,channel FROM notifications WHERE id=$1",
      ["announcement-" + announcement.id],
    );
    assert.equal(notification.delivery_status, "Available");
    assert.equal(notification.channel, "In-app");
    const flagBody = {
      name: "control_support_creation",
      scope: "b",
      enabled: false,
      version: 0,
      confirm: "b",
      reason: "Disable support creation during internal review",
    };
    assert.equal(
      (await request("/settings/flags", "billing", "PUT", flagBody)).status,
      403,
    );
    assert.equal(
      (await request("/settings/flags", "super", "PUT", flagBody)).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/support",
          "support",
          "POST",
          body,
          "blocked-support-123456",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/settings/flags", "super", "PUT", {
          ...flagBody,
          enabled: true,
          version: 1,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/support",
          "support",
          "POST",
          body,
          "restored-support-123456",
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await request("/settings/flags", "super", "PUT", {
          ...flagBody,
          enabled: false,
          version: 1,
        })
      ).status,
      409,
    );
    // Server-side matrix is read on every request: removing permission takes effect immediately.
    await executor.execute(
      "DELETE FROM admin_role_permissions WHERE role='BILLING_ADMIN' AND permission='billing.read'",
    );
    assert.equal((await request("/subscriptions", "billing")).status, 403);
    await executor.execute(
      "UPDATE admin_profiles SET status='Suspended' WHERE user_id='support'",
    );
    assert.equal((await request("/support", "support")).status, 403);
    assert.equal(
      (
        await request("/security/revoke", "super", "POST", {
          user_id: "admin",
          confirm: "admin",
          reason: "Verified administrator session revocation",
        })
      ).status,
      200,
    );
    assert.equal((await request("/organizations", "admin")).status, 403);
    assert.equal((await request("/logout", "analyst", "POST")).status, 200);
    assert.equal((await request("/overview", "analyst")).status, 401);
    assert.ok(
      await executor.queryOne(
        "SELECT token_hash FROM admin_sessions WHERE token_hash=$1",
        [digest(tokens.super)],
      ),
    );
    const futureIssued = await jwt.sign({ iat: Math.floor(Date.now() / 1000) + 120 }, 'super');
    const beforeFutureTest = tokens.super;
    tokens.super = futureIssued;
    assert.equal((await request('/overview')).status, 401);
    tokens.super = beforeFutureTest;
    assert.equal((await request('/organizations?start=2026-02-30')).status, 422);
    assert.equal((await request('/organizations?start=2026-03-01&end=2026-01-01')).status, 422);
    const filteredStatus = await (await request('/organizations?status=Suspended')).json() as any;
    assert.ok(filteredStatus.rows.every((row:any)=>row.account_status==='Suspended'));
    const literalSearch = await (await request('/organizations?q='+encodeURIComponent("' OR 1=1 --"))).json() as any;
    assert.equal(literalSearch.total, 0);
    const expired = await jwt.sign(
      { iat: Math.floor(Date.now() / 1000) - 1900 },
      "super",
    );
    const previous = tokens.super;
    tokens.super = expired;
    assert.equal((await request("/overview")).status, 401);
    tokens.super = previous;
    const audits = await executor.query<any>("SELECT * FROM admin_audit_logs");
    assert.ok(audits.some((r) => r.action === "report.exported"));
    assert.ok(audits.some((r) => r.action === "permission.denied"));
    assert.ok(audits.some((r) => r.action === "authentication.denied"));
    assert.ok(!JSON.stringify(audits).includes(tokens.super));
    assert.ok(!JSON.stringify(audits).includes("SECRET-DOOR-CODE"));
    await assert.rejects(executor.execute("DELETE FROM admin_audit_logs"));
    await assert.rejects(
      executor.execute("UPDATE admin_audit_logs SET reason='changed'"),
    );
  } finally {
    await new Promise<void>((r) => {
      server.close(() => r());
      server.closeAllConnections();
    });
    await jwt.close();
    await engine.close();
    names.forEach((n, i) =>
      old[i] === undefined ? delete process.env[n] : (process.env[n] = old[i]),
    );
  }
});

test("Control migration is explicit, additive, transactional, replay-safe and checksum-locked", async () => {
  const { engine, executor, wrap } = await createTestDatabase(
    "memory://staywise_test",
  );
  const database = {
    ...executor,
    transaction: <T>(fn: any): Promise<T> =>
      engine.transaction((tx) =>
        fn({
          ...wrap(tx as any),
          execute: async (sql: string, params: any[] = []) => {
            if (!params.length && sql.includes(";")) {
              await tx.exec(sql);
              return 0;
            }
            return wrap(tx as any).execute(sql, params);
          },
        }),
      ),
  };
  try {
    for (const statement of SCHEMA_STATEMENTS) await engine.exec(statement);
    const sql = await fs.readFile(
      new URL("../db/migrations/005_control_center.sql", import.meta.url),
      "utf8",
    );
    assert.equal((await applyControlMigration(database, sql)).applied, true);
    assert.equal((await applyControlMigration(database, sql)).applied, false);
    await assert.rejects(
      applyControlMigration(database, sql + "\n-- changed checksum"),
    );
    assert.equal(
      (
        await executor.queryOne<any>(
          "SELECT count(*)::int AS count FROM admin_profiles",
        )
      )?.count,
      0,
    );
    assert.equal(
      (
        await executor.queryOne<any>(
          "SELECT count(*)::int AS count FROM control_schema_migrations",
        )
      )?.count,
      1,
    );
  } finally {
    await engine.close();
  }
});

test("Administrative audit text redacts common credential formats", () => {
  const result = redactAuditText(
    "Reviewed password=example-secret token=example-token Bearer credential-value",
  );
  assert.ok(!result?.includes("example-secret"));
  assert.ok(!result?.includes("example-token"));
  assert.ok(!result?.includes("credential-value"));
  assert.match(result || "", /REDACTED/);
});
