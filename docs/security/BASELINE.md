# Execution baseline — 2026-11-16

Reference: e1e7e0ebd909e983e0d1aecbcecde850312cf45b.
Branch: arena/195fd2dd-staywise (fixed Arena session branch; no second branch created).
Initial Git tree clean. No production connection or migration used.

Executed before code corrections:
- npm ci: success, peer warning in Neon/Better Auth dependencies.
- npm test: 7 passed, 0 failed.
- npm run typecheck: passed.
- npm run build: passed; Rollup warnings about third-party Zod annotations.
- npm audit --json: exit 1, four HIGH dependency entries in the Blob/OIDC/CLI/Zod chain, rooted in GHSA-mrhx-c7xc-m3w5. No force fix applied.

Build regenerates tracked server/generated-shell.ts; baseline generated changes were discarded, not committed.

## Test infrastructure
Only the exact target `memory://staywise_test` is accepted by tests/helpers/harness.ts.
PGlite is a dev-only embedded PostgreSQL engine, chosen because no PostgreSQL binary,
Docker or dedicated network test URL is available. It never reads DATABASE_URL.
This is NOT a substitute for independent server connections, Neon transport tests,
provider verification, backup/restore, browser tests or staging.

## Role policy for implementation
- Organization Owner/Admin: organization-wide operations, as allowed by endpoint.
- Property Manager: organization-wide unless an explicit restriction is configured.
- Concierge, Cleaning Staff, Maintenance Technician, Inspector: assigned properties only;
  action permissions still apply. No wildcard for field roles.
- Guest: stay-specific routes only.
- Platform Super Admin: explicitly privileged; ordinary APIs remain scoped to active organization;
  global access only through designated platform routes.
- Unknown role or malformed assignments: denied, never wildcard fallback.
