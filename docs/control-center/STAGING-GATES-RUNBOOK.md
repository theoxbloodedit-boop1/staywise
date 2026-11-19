# Staging release gates — execution status

## Current decision: HOLD

No production publication authorized by this review. No remote data/role/schema
change made. Vercel connector reports disconnected; Neon connector unsupported.
Direct staging fetch reaches Vercel authentication, not the application.

## 1. Real provider reauthentication

The bounded session diagnostic now reports authenticationTimePresent and
recentProviderAuthentication, based exclusively on signed auth_time (never iat).
These are observations after signature verification, not authorization or MFA
proof. The protected mutation independently requires normal issuer/audience/email,
explicit role, permission, reason, confirmation, version and fresh auth_time.

Real test (NOT EXECUTED): sign in again on stable staging origin, inspect diagnostic,
then perform one reversible action on a disposable record through its normal form.
If auth_time is absent, do not bypass the guard. If present, check after >5 minutes
that the same operation is denied, and after actual provider reauthentication that
a new signed auth_time advances and the operation succeeds. Verify audit and state.
Do not test suspension/revocation on the sole recovery administrator.

## 2. Migration 005 structural reconciliation

Prepared:
- server/lib/control-schema-review.ts: catalog query + strict comparator.
- scripts/control-schema-review.ts: OFFLINE expected-schema generation/comparison;
  no app DB import, connection URL, remote connection, DDL repair or ledger insert.
- docs/control-center/sql/005_catalog_review.sql: SELECT-only metadata query for
  reviewed staging, including columns/types/defaults/nullability, constraints,
  indexes, audit trigger definition/enabled state, audit function and exact role
  permissions. No users, audit entries, sessions, emails or secrets returned.
- docs/control-center/sql/005_expected_catalog.json: 214 expected metadata rows,
  derived by applying repository schema + 002–005 to an isolated PGlite engine.

Operator: run SELECT-only SQL on staywise-staging-clean and export JSON rows to
an access-controlled local file. Compare with:

    npx tsx scripts/control-schema-review.ts /path/to/actual-catalog.json

Exit 2 means differences; review each, including PostgreSQL-version formatting
changes. The comparator never rewrites SQL, collapses literal whitespace or
accepts differences automatically. Missing table/query errors are also blockers.
Catalog comparison is a bounded 005-object review, NOT a complete database
security review: ACLs, schema search_path configuration, RLS policies, role
ownership and TRUNCATE privileges require separate external PostgreSQL review.
An unexpected equivalent object name may require manual review, not auto-repair.

Ledger: first use SELECT to_regclass('public.control_schema_migrations'). Only if
present, read its 005 row and compare checksum with the exact reviewed migration.
Do not invent prior execution evidence. Even after schema agreement, recording an
adoption of preexisting objects requires a separately reviewed transactional
procedure with truthful provenance, not replaying 005 or silently marking it done.

Remote catalog/ledger reconciliation NOT EXECUTED here.

## 3. Deployed roles/forms/downloads

Local HTTP matrix was rerun: explicit role checks, 16 read destinations, customer
denial, filters/page/scope, CSV formula protection, support retries/CAS/rollback,
communications independent approval and inbox availability, feature enforcement,
session revoke/expiry and audit immutability. See STAGING-JOURNEY-REVIEW.md.

Actual staging test NOT EXECUTED: ordinary test account; support/billing/analyst
accounts with only explicitly reviewed grants; disposable support ticket;
wrong confirmation/missing reason/stale version denial; permitted CSV downloaded
and opened; two different authors for announcement approval; cleanup audited.
No tokens/passwords/OTP codes in evidence. Keep authorization checks enabled.

## 4. Browser/mobile/accessibility

NOT EXECUTED here. No browser automation engine/authenticated browser is available.
Do not treat SSR markup tests as seven-width or WCAG certification.
Manual/automated acceptance widths: 320, 375, 390, 768, 1024, 1280, 1440 pixels.
Check sidebar open/close and Escape, focus return, labels, keyboard-only access,
visible focus, errors/loading/empty states, contrast, table horizontal scrolling,
zoom 200%, export downloads and ordinary-user denial. Automated accessibility
scan supplements but does not replace keyboard/screen-reader checks.

## Local execution evidence

38 tests passed (zero failed/skipped); app and test TypeScript passed; build
passed; diff check passed. Comparator self-comparison matches 214 expected rows.
Drift test detects disabled audit trigger, missing permission and nullable status
without creating a migration ledger or granting an administrator.
Signed-JWT diagnostic tests cover absent, fresh, old, future and string auth_time.

These results do not close any of the four REAL staging acceptance gates above.
