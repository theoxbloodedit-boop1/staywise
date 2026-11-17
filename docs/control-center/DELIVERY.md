# STAYWISE Control Center — implementation increment, 2026-11-16

**Verdict: NOT READY FOR PRODUCTION. Full master mandate remains incomplete.**
This is a working vertical implementation, not a completed enterprise control plane.
No deployment, push, production database connection, remote migration, real internal
grant, customer modification or external-provider operation was performed in this task.

## A. Architecture / discovery (phase 0)

Verified package versions: React 18.3.1, TypeScript ^5.7.2, Tailwind ^3.4.17,
Vite 6.x, Express ^4.21.2, @neondatabase/serverless ^1.2.1, @neon/neon-js ^0.10.2.
Existing Express app runs through Vercel api/index.ts; Neon JWT verification is already
issuer/audience/signature constrained. Existing custom React navigation is preserved.
No new dependencies added. No second user store or subscription ledger created.

Existing sources reused:
- organizations: account state, plan entitlements and quotas.
- users/neon_auth_id: identity association; organization_memberships stays customer RBAC.
- properties/reservations/cleaning_tasks/inspections/incidents/guidebooks: operations.
- payment_records: legacy records only, NOT a trustworthy paid-money ledger (default Paid).
- support_requests: property/guest support, not a generic business support ticket.
- notifications: existing in-app workspace inbox rows.
- rate_limit_buckets: atomic database-backed internal request budget.

New admin_support_tickets are internal B2B cases. They do not copy the guest support
store; optional source_request_id references it. No fake customers/payments/seed events.
Existing totals may include previously seeded sample records: there is no reliable
sample-vs-customer classification in the old schema. Counts are database totals, NOT
assertions about paying customers or genuine customer activity.

Dependency map:
- Existing verified Neon sub -> existing users -> explicit admin_profiles -> database
  role/permissions -> dedicated API -> admin UI.
- Reviewed migration 005 -> grant bootstrap -> configured provider issuer/audience -> login.
- Recent sensitive mutations additionally require signed auth_time <=5 minutes.
- Payment analytics -> verified payment provider/ledger/webhooks (not integrated).
- DAU/retention/acquisition -> operation-event instrumentation/attribution (not installed).
- Customer-visible support replies/attachments -> secure delivery/access workflows (remaining).
- Authoritative turnover certification -> earlier operational integrity work (remaining).

### Permission matrix

All internal profiles explicitly authorize global internal scope. They are NOT customer
memberships. No organization header or frontend role grants internal access.

| Permission group | SUPER_ADMIN | ADMIN | SUPPORT | BILLING_ADMIN | READ_ONLY_ANALYST |
|---|---|---|---|---|---|
| Overview, properties, operations, record analytics | yes | yes | no | no | yes |
| Organization/customer directory | yes | yes | yes | org only | yes |
| Organization/customer account status | yes | yes | no | no | no |
| Plan entitlements read | yes | yes | no | yes | yes |
| Plan entitlements change | yes | no | no | yes | no |
| Internal support read/write | yes | yes | yes | no | no |
| Communications draft/read/approve/publish | yes | yes | no | no | no |
| Security sessions/revocation | yes | no | no | no | no |
| Settings/feature flag change | yes | no | no | no | no |
| Reports | yes | yes | no | no | yes |
| Admin audit | yes | no | no | no | no |

Every report also checks the dataset permission: reports.read cannot bypass a forbidden
security/users/billing dataset. Matrix rows are stored in admin_role_permissions and
read every request. Editing permissions through the web is NOT implemented; changes
require a reviewed DBA procedure with audit discipline. This is a remaining requirement,
not an assertion that arbitrary direct SQL edits are audited automatically.

The previous email helper remains only for compatibility tests; it is no longer used by
session actor or auth-context authorization. Legacy platform CRM now also requires an
explicit SUPER_ADMIN profile. A customer Platform Super Admin role alone is insufficient.
Legacy privileged writes additionally require recent auth_time. Existing founder access
will be denied until the explicit grant procedure is performed. This is an activation gate.

### Authentication / sessions

Existing Neon login/logout/reset flows reused, not reimplemented. /app/control-center
has a protected entry screen linking to the existing /auth page. After sign-in return to
the control URL. There is no impersonation and no admin password database.

- Verified email plus exact signed sub lookup. Internal grant/profile status reread.
- Database session registry stores SHA256 token fingerprint, never raw JWT.
- Token expiry and at most 30 minutes from token iat; logout revokes that fingerprint.
- Administrator revocation blocks all tokens issued at/before revoked_before and marks
  existing sessions revoked. Role suspension checked on each request.
- Important limitation: this is a per-token bound. A provider refresh may issue another
  JWT. A true absolute sign-in lifetime/MFA contract is NOT verified with real Neon.
- Organization/customer status changes, entitlements, admin revocation, announcement
  approval/publication and flags require signed auth_time within five minutes. Missing,
  future or stale claim denies the action. No fallback to iat pretending reauthentication.
- Actual provider auth_time/MFA/recovery/provider-wide session revocation NOT tested.
  No MFA security guarantee is made. Provider contract verification blocks activation.
- Database user-keyed 180/minute shared internal limiter. Unauthenticated requests also
  encounter the existing global process limiter; distributed unauthenticated login
  protection and operational alerting remain unfinished.

New customer suspension/cutoff is enforced by both resolveSessionActor and auth context.
It blocks application account access, not a claim of provider-side token revocation.
Internal profiles cannot be suspended through customer controls; reviewed operator
procedure protects the last active SUPER_ADMIN. Organization suspension uses existing
staff/API account-status enforcement. Guest-code behavior is not silently changed;
guest access policy is still a separate unresolved dependency.

### Database changes

005_control_center.sql creates:
- admin_profiles, admin_role_permissions, admin_sessions.
- append-only admin_audit_logs with UPDATE/DELETE-rejecting database trigger.
- admin_support_tickets, admin_support_notes (internal visibility only).
- admin_announcements with different-author approval constraint.
- admin_feature_flags constrained to supported control_support_creation flag.
- organizations.control_version; users.account_status/control_revoked_before/control_version.

Foreign keys, status constraints, key indexes and CAS versions included. New control API
skips existing request-time schema initializer and never applies 005 or seeds customers.
The pre-existing initializer for other APIs remains a wider deployment blocker.

Audit entries include actor (or null for anonymous denial/DBA procedure), target, request
ID, timestamp, result, reason and explicit allowlisted changes. Common credential-shaped
reason text is redacted; free-form notes must not contain secrets. Automated redaction
cannot promise to recognize every possible secret string. Notes are not copied to audit.
DBA grants record provenance rather than falsely attributing a web identity. Database
owners can bypass triggers: append-only is an application control, not tamper-proof WORM.

## B. Implemented functionality and boundaries

Entry route: **/app/control-center**. Dedicated namespace: **/api/control-center**.
A link is retained in the old founder CRM. New UI permission visibility is convenience;
all sensitive enforcement is server-side. Lazy-loaded separate internal shell/sidebar,
mobile menu, table scroll, loading/error/empty states, search, scope/date filters, stable
created-date ordering, pagination, review panels, confirmation forms, notifications.

Actual implemented endpoints:
- GET /config (public issuer URL only), GET /session, POST /logout.
- GET /overview (1/7/30/90/365-day registration period; actual aggregate totals/freshness).
- GET /organizations, /users, /properties, /reservations, /turnovers, /incidents,
  /subscriptions, /support, /communications, /security, /audit (bounded directory queries).
- GET /organizations/:id, /users/:id (user memberships included).
- PATCH /organizations/:id/status and /users/:id/status (reason, confirmation, CAS, audit).
- PATCH /organizations/:id/plan (existing PLANS entitlements, current property-count check,
  no destructive downgrade, no payment operation). Concurrent property creation/quota
  enforcement is not made fully serializable by this increment.
- GET /analytics: persisted record counts/distinct organization presence, NOT event usage.
- GET /revenue: explicit unavailable money metrics, provider status and legacy record count.
- POST /support: validated case with idempotency key/content-conflict detection.
- GET/PATCH /support/:id; POST /support/:id/notes: constrained transitions/reason/CAS,
  internal-only notes, transactional mutation/audit, rollback on failure.
- POST /communications, GET /communications/:id, POST /communications/:id/approve|publish:
  one-organization in-app notices, two-person approval, transactional deterministic inbox
  row, stored Available status rather than false Sent/Delivered/Read. Draft/notes creation
  does not yet have the retry-key coverage provided by support ticket creation.
- POST /security/revoke: administrator sessions/cutoff only, audited.
- GET /system: actual current DB SELECT 1 latency/time; other dependencies not checked.
- GET /settings: real profile/matrix/flag rows and policy limitations.
- PUT /settings/flags: only internal support creation, global or organization scope,
  current version, confirmation, fresh auth, audit; checked in server support creation.
- GET /reports/:dataset?format=json|csv: server-validated dataset and report permissions,
  filters, current bounded page, audited before sending, no-store, CSV formula protection.
  No public download URL. No full-dataset async job, PDF or long-lived export archive.

Status of requested phases (none declared fully accepted merely because UI exists):
- Phase 0: repository/data/auth discovery recorded above.
- Phase 1: explicit grants/session registry/permissions/audit/shell implemented and locally
  tested. Real provider MFA/reauth and browser login/session contract remain gates.
- Phase 2: core directories/customer suspension/org status/entitlements and partial
  profiles implemented. Full ten-tab org dossier, deletion request process, metadata
  editing, complete member/usage/support histories and payment-provider subscriptions
  are NOT implemented.
- Phase 3: operational directories/internal case transitions/notes and two-person in-app
  notices implemented. Assignment/reassignment UI, SLA/escalation automation, secure
  support attachments/customer replies, scheduling/segmentation/email are NOT implemented.
- Phase 4: honest financial unavailability, database-record presence analytics and bounded
  exports implemented. Product-event instrumentation, retention/activation cohorts,
  DAU/WAU/MAU, acquisition attribution and full revenue analytics NOT implemented.
- Phase 5: admin session feed/revocation/permission-denial audit, DB health probe and one
  scoped feature control implemented. Security incident investigation workflow, provider
  health history, failure-rate telemetry, editable role matrix and broad config remain.
- Phase 6: local isolated HTTP/PG tests/build/typechecks performed. Browser, independent
  PG connection races, provider/staging/restore/performance gates remain unexecuted.

There is deliberately no navigation entry claiming a finished growth dashboard, payment
processor, SLA monitor or security IDS. Reports are working per-directory export actions.
The complete Definition of Done in the master request has NOT been met.

Files:
- server/lib/control-center.ts (authorization, redaction, directories), control-migrations.ts.
- server/routes/controlCenter.ts; server/app.ts mounts API/SPA route and avoids initializer.
- server/security.ts (exposes verified iat/exp/auth_time), server/domain.ts and routes/auth.ts
  (explicit internal profile and customer suspension enforcement).
- src/pages/ControlCenterPage.tsx; src/App.tsx; src/pages/PlatformCrmPage.tsx.
- src/lib/neonAuth.ts optional import.meta.env access for Node render-test compatibility;
  browser authentication behavior otherwise unchanged.
- scripts/control-migrate.ts, scripts/control-bootstrap.ts.
- db/migrations/005_control_center.sql.
- tests/control-center.test.ts, tests/control-center-ui.test.ts; tests/helpers/jwt.ts
  permits explicit issued-at claim for expiry tests.

## C. Tests / QA

Final local results: **30 top-level tests passed, 0 failed, 0 skipped** (26 existing,
4 new). `npm run typecheck`, `npm run typecheck:tests`, `npm run build`, and
`git diff --check` passed. `npm audit` reports 0 vulnerabilities. Both operator scripts
were additionally typechecked with strict standalone TypeScript compiler options.
Build still reports third-party Zod annotation warnings, not failures. No browser
console pass or performance result is claimed.
New named tests:
1. Control Center signed identity/explicit roles/safe directories/support/export/revocation.
2. Control migration transactional, replay-safe and checksum-locked.
3. Protected entry rendering, no fake populated dashboard.
4. Common audit credential-format redaction.

The HTTP integration test signs real RS256 JWTs against local JWKS and uses dedicated
memory://staywise_test PGlite PostgreSQL, never DATABASE_URL. Asserts:
- anonymous/customer/founder-email denied; role limits; dataset export limits.
- actual counts, paging, organization-scoped search, no guest PII/access code leak.
- organization/customer suspension, internal-profile protection, stale-version conflict.
- entitlement changes audit without payment, recent auth_time requirement.
- injected audit failure rolls back organization state.
- support creation retry/content conflict, invalid/stale transitions and internal notes.
- separate-author approval, no premature/duplicate publish, Available-not-Delivered inbox.
- scoped feature disable/re-enable and stale version, permission hot-change.
- admin suspension, token-age expiry, cutoff revocation and logout replay denial.
- no raw tokens or guest secrets in audit; DB UPDATE/DELETE audit trigger rejection.
- real full SQL migration applied only in tests; replay no-op; changed checksum rejected;
  no auto-created administrator profile.

Development failure: Node rendering initially failed because neonAuth accessed Vite-only
import.meta.env directly. Optional access fixed it; test retained, not disabled.

NON EXÉCUTÉ: seven viewport checks (360/390/430/768/1024/1440/1920), browser console/
keyboard/forms/E2E, real Neon MFA/auth_time/refresh/recovery and user last-login semantics,
independent-connection PostgreSQL races, real deployment/rollback/restore, high-volume
query performance and full customer-route regression matrix. Current Chromium executable
cannot launch: missing libnspr4.so (rechecked). Existing tenant/media tests still run but
are representative, not an exhaustive proof of isolation for every route.

## D. Business readiness

Real: database organization/user/property totals, registration dates, current plans/quotas,
cleaning task counts, incident records, internal cases, stored notices, admin audit/sessions.
Not established: paying customer counts, paid subscription states, MRR/ARR/collections,
churn/LTV, activity/retention/cohorts and attribution. No payment provider connected;
legacy Paid records not used as evidence. Currencies never combined. No false email
or read acknowledgments. No new marketing tracking or bulk email.

## E. Staging / operations / rollback

**STAGING WITH BLOCKERS for this partial increment; NOT production ready.**

Do not run operator commands on production as part of this delivery. Before staging:
1. Provision an explicitly isolated staging database/provider; verify target out-of-band.
2. Back up and demonstrate restore; existing application schema and reviewed prior
   migrations must be present. Old npm run db:migrate does NOT apply 005.
3. Review 005 SQL/checksum and run, on staging only:
   STAYWISE_CONTROL_DB_ACTION=reviewed npx tsx scripts/control-migrate.ts
   This acquires transaction advisory lock, checks checksum/version, applies additive SQL
   once, records 005; does not initialize base schema or seed anything.
4. Link an existing verified Neon account through existing auth. Bootstrap by existing
   user ID (not email), following reviewed DBA approval, on staging only:
   STAYWISE_CONTROL_DB_ACTION=reviewed npx tsx scripts/control-bootstrap.ts USER_ID SUPER_ADMIN Active "Reviewed initial global internal grant"
   Requires existing linked users row; serialized updates; last-super guard; revokes prior
   registered admin sessions on changes; appends DBA-provenance audit. No credential in CLI.
   It is an operator procedure, not provider-authenticated self-service role administration.
5. Verify NEON_AUTH_BASE_URL, NEON_AUTH_AUDIENCE, JWKS contract and signed auth_time.
   Missing recent auth_time intentionally blocks sensitive mutations; do not substitute
   frontend time or token refresh time. STAYWISE_CONTROL_DB_ACTION is operator-only,
   not an application authorization or runtime enable switch.
6. Verify UI sign-in/recovery/logout and provider MFA policy, then all role/API/browser/
   multi-connection tests. Never bootstrap real production access by email.

Operational limits: per-page exports only, settings/profile listing capped at 100,
notes limited to latest 100, no retention/purge jobs, no full security investigation feed.
Permission grants and configuration beyond one flag need a reviewed implementation.

Rollback: disable control routes/access and keep additive schema/audits. Do NOT restore
email-based platform privileges or drop the audit data. Preserve account suspensions and
session cutoffs when rolling back application code; older pre-005 code would not enforce
those new controls and is not a safe rollback without an access gate. Review migration
compatibility before any rollback. No destructive down migration or production operation.
