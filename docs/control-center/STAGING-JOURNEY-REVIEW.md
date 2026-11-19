# CRM journey review — release gate

## Verdict

**HOLD: do not publish to production on this evidence.** Local regression checks
pass and user-supplied screenshots establish a working staging login and internal
Control Center audit screen. They do not establish complete deployed journey QA.

No production deployment, remote migration, account change, grant or destructive
staging operation was performed during this review.

## Evidence and boundaries

- Direct attempt to retrieve the stable staging Control Center redirected to
  Vercel login (Protected Deployment). The reviewer has no authenticated browser
  or provider/DB access here. Keep deployment protection enabled.
- User screenshot shows workspace access and explicit SUPER_ADMIN audit screen,
  bootstrap audit success and session.started entries. These are user-observed
  staging evidence, not independently executed browser tests.
- Extended tests/control-center.test.ts and ran the entire suite: **37 passed,
  zero failed/skipped**. The new assertions are within the existing integration
  test, not 16 extra independently reported test cases.
- Application TypeScript, test TypeScript, build and git diff --check passed.
- npm audit returned zero known vulnerabilities at execution time.
- Integration uses local HTTP, locally signed JWTs/JWKS and PGlite. Synthetic
  organizations/accounts in tests never touch Neon. This is not independent
  PostgreSQL connection concurrency proof, browser QA or a penetration test.

## Journey matrix

| Journey | Executed locally | Actual deployed staging |
|---|---|---|
| Existing-account sign-in and email OTP | Signed JWT cases + real installed SDK to local fake OTP endpoint, errors tested | User screenshot establishes eventual workspace login; OTP success shown |
| Explicit internal role and entry | Anonymous 401, customer/founder 403; explicit internal profile accepted | User screenshot establishes SUPER_ADMIN audit screen |
| Every CRM read destination | HTTP 200 for session, organizations, users, properties, reservations, turnovers, incidents, subscriptions, support, communications, audit, security, analytics, revenue, settings, system; no-store asserted | Not independently executed; audit page only established by screenshot |
| Customer cannot read internal destinations | HTTP 403 on all 16 listed read endpoints | Separate ordinary-account test still needed |
| Neon email claim compatibility | Signed camelCase accepted only with explicit profile; conflicting claims rejected | Successful staging entry shown; exact live claim not independently captured |
| Directory filters/paging/search | Page distinction, max limit, dates/range, status, scope and literal SQL-like search checked | Browser forms/search/export still need execution |
| CSV export | Permissions, no-store, formula escaping, audited export checked | Download/open actual file not executed |
| Organization status and entitlements | Permission, reason/confirmation/version, stale state and fresh-auth rejection checked | Real provider auth_time and successful/denied form flows not executed |
| User suspension | Customer mutation and protected internal-user denial checked | Not executed; do not suspend the sole real admin |
| Support lifecycle | Create/retry idempotency, status, note, CAS and rollback cases checked | Not executed on test records |
| Communications | Separate-author approval, publication, one in-app notice, retry/CAS checked | Not executed with two real internal accounts; no delivery proof |
| Scoped feature flag | Permission/version/confirmation and actual support creation enforcement checked | Not executed; leave staging settings unchanged |
| Sessions, logout and revocation | Expiry, future-issued JWT, profile/permission changes and revoked token denied; repeat same JWT does not duplicate session.started | Actual provider refresh/reauth/logout and revocation across tabs not executed |
| Audit | Successful/denied/export records, secret redaction, UPDATE/DELETE rejected; grant transaction visible in supplied screenshot | Append-only enforcement not independently tested against deployed Neon |
| Revenue/product metrics | Unavailable revenue remains unavailable; persisted-record counts do not become activity/retention evidence | UI semantics need manual check; no financial readiness claim |
| Mobile/accessibility | Static React render checks only | Seven-width, keyboard, screen-reader, focus and download behavior not executed |

## Production blockers

1. **Real sensitive-action authentication contract.** Writes that require a fresh
   signed auth_time (within five minutes) intentionally fail closed. Do not bypass
   using iat. Real provider reauthentication and token lifetime/refresh remain to
   be validated. Successful read access is not proof that writes work.
2. **Staging schema reconciliation.** 005 objects were installed manually before
   the guarded ledger insert. Selected objects/counts were checked, not a complete
   structural diff. Never insert a checksum solely to hide the missing ledger.
3. **Actual staging journey run.** Protected deployment prevents independent
   execution here. Do not report all menu links/forms as browser-tested.
4. **Separate-role and two-author evidence.** A successful super-admin read does
   not demonstrate ordinary-user denial or independent communication approval in
   the real environment.
5. **Release/rollback validation.** Production keeps its existing configuration.
   New issuer/audience/schema/grant requirements must be reviewed for that
   environment separately. Never copy staging super-admin grants to production.
6. **Scope gaps.** Larger financial/product/growth workflows remain partial.
   Backend read endpoints passing does not establish the complete original mandate.

## Controlled staging acceptance run

Use only staywise-staging-clean and the stable branch hostname. Do not use real
customer data or alter production. Keep a second browser session for a normal test
account and another authorized operator before any revocation test.

1. Confirm deployed commit, browser origin, provider URL and DB target together.
2. Read each menu destination above; inspect empty states, details, pagination,
   organization/status/date filters, reset and errors. Capture the request result
   and UI outcome without secrets. Download a permitted CSV and open it safely.
3. With a separate ordinary test account, attempt direct internal URLs/APIs: denied.
4. Test missing reason, wrong confirmation, stale version and missing auth_time on
   disposable records first: requests must fail without mutations/audit success.
5. Only after valid provider reauthentication is established, perform reversible
   mutations on disposable staging records. Compare DB state/audit entries before
   and after; no blind retries or sole-admin suspension/revocation.
6. Two different authorized test accounts approve/publish a disposable announcement;
   verify one inbox record and no unsupported Sent/Delivered claim.
7. Logout/reopen, expiration and revocation checks with a recovery operator present.
8. Browser layouts at 320, 375, 390, 768, 1024, 1280 and 1440 px; keyboard navigation,
   focus/escape, screen reader labels, horizontal tables and loading/error states.

Until these gates are recorded, release status remains HOLD, not production-ready.
