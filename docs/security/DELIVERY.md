# STAYWISE — Phase 2, first implementation increment

Date: 2026-11-16. Verdict: **NOT READY**.

Dependency follow-up (after this interim report): the four HIGH npm audit alerts
are resolved with a targeted override of @vercel/cli-config to 0.4.0, which uses
patched Zod (lockfile resolves 4.6.7). Advisory: GHSA-mrhx-c7xc-m3w5.
Blob stays 2.9.0; OIDC stays 3.8.10. No forced downgrade or OIDC major upgrade.
Keep this override until Blob/OIDC natively resolve a patched CLI config; removing
it requires a fresh audit and compatibility tests. Verified from clean npm ci:
npm audit reports zero vulnerabilities; 22/22 tests pass, both typechecks and
build pass. Added transitive-resolution config parse/import compatibility test.
Real external Blob/OIDC transport remains NOT EXECUTED. The Neon peer-dependency
warning and Rollup annotation warnings remain, independently of the fixed advisory.
Earlier counts below describe the prior delivery, not the current audit result.

This is an interim delivery, NOT completion of the fourteen-lot mandate.
No deployment, remote migration, key replacement, production access, historical deletion
or automatic historical certification was performed. Work remains on the fixed Arena
branch arena/195fd2dd-staywise; no second branch was created.

## A. Executive summary

Baseline e1e7e0e: 7 tests passed, typecheck/build passed. Existing dependency audit had
four HIGH entries in the Blob/OIDC/CLI/Zod chain. No baseline test failure.

Implemented increment: isolated embedded PostgreSQL tests; strict compatible field
crypto; explicit tenant/property authorization; verified pending invitations; new private
media store, authorized byte reads and frontend fetch. Remaining work prevents activation.
Actual provider contracts, actual old ciphertexts and existing public Blob exposure are
not verified. Readiness/business validations/notifications have NOT yet been repaired.

## B. Work actually performed

| Lot | State |
|---|---|
| 00 | Local foundation implemented; no PostgreSQL server or provider staging available |
| 01 | Implemented/tested on synthetic legacy v1 and v2; actual data inventory blocks activation |
| 02 | Implemented broad scope checks; full endpoint matrix, data constraints and races remain |
| 03 | Implemented invitations/API/UI and strict JWT contract; actual Neon contract and multi-connection acceptance test outstanding |
| 04 | New private evidence path implemented/tested; historical inventory/revocation, guest-session dependency and browser tests outstanding |
| 05 | Not started: distributed limits, short revocable guest sessions, physical-access policy |
| 06 | Not started as a full lot; invitations already use transaction + audit via explicit executor |
| 07–09 | Not started: inspection/cleaning/incident business integrity still blocking |
| 10 | Not started: current dispatchNotification still incorrectly uses Delivered |
| 11 | Not started: version/checksum runner and removal of runtime DDL/seed still required |
| 12 | Not started: rotation entity/readiness replacement still required |
| 13 | Not started: no outbox worker or external transport integrated |
| 14 | Local tests/typechecks/build executed; full acceptance incomplete |

Git history correction (verified before commit): the previously reported hashes
7725710, 977c149, 456ea2c, eabfe75 and f87389b are absent from this checkout's
history. They must not be used as delivery references. The preserved changes were
reverified together and are recorded in the actual commits created after base e1e7e0e.
Use `git log --oneline e1e7e0e..HEAD` for authoritative references.

Verification rerun before committing: npm ci succeeded; npm test 21/21 passed;
application and test typechecks passed; build passed; git diff --check passed.
The first test attempt could not start because dependencies were not installed
(tsx not found); installing from the lockfile resolved that environment issue.
Four HIGH dependency advisories and the Neon peer dependency warning remain.

Principal changed files:
- server/security.ts, server/domain.ts, server/app.ts
- server/lib/{authorization,field-encryption,invitations,private-media}.ts
- server/routes/{admin,auth,guest,guidebooks,incidents,inspections,media,operations,platformCrm,properties,reservations}.ts
- src/lib/api.ts; src/components/PrivateEvidenceImage.tsx
- src/pages/{AuthPage,TeamAutomationsPage,CleaningPage,IncidentsPage}.tsx
- db/migrations/003_security_invitations.sql, 004_private_media.sql
- tests/{foundation,encryption,authorization,invitations,media}.test.ts and helpers
- package.json/package-lock.json, tsconfig.tests.json, .env.example, docs/security/*

Dependencies: PGlite dev-only (isolated PostgreSQL with no available server binary);
sharp production (full image decode/re-encode, not just MIME/signature inspection).
No existing tests disabled. No forced dependency audit fix applied.

## C. Test results and scope

Final local suite: 21 top-level tests, 21 passed, 0 failed, 0 skipped.
Includes 7 pre-existing + 14 new top-level tests (multiple assertions per test).
Typecheck application and tests passed; production build passed. Rollup's pre-existing
third-party Zod annotation warnings remain. Build-generated shell changes are not kept
as source modifications; deployment build regenerates the shell.

Failures during development, now corrected: incomplete property fixture lacked required
cover_image/description; JWT test fixture overwrote its own audience override; media test
tuple inferred string|number for HTTP headers. No disabled test or ignored final failure.

### Original T01–T30 mapping (NOT 30 completed tests)

| IDs | Executed evidence / outstanding |
|---|---|
| T01–T05 | Representative real Express/JWT + embedded PG negative and positive routes; admin vs manager billing; NOT exhaustive endpoint matrix |
| T06 | Private route denies anonymous, tenant B and unassigned principal; actual app JWT separately tested |
| T07 | Invalid assignment JSON/type/duplicates/wildcard and unknown role denied |
| T08 | Local signed JWT issuer/audience/expiry/strict email boolean, wrong/unverified invitation identity; real Neon NOT EXECUTED |
| T09 | Sequential replay, revocation/expiry and atomic audit rollback tested; independent connection race NOT EXECUTED |
| T10–T12 | NOT EXECUTED; business corrections not implemented |
| T13 | Registered media rejects URL, category/tenant mismatch; required business evidence policy NOT IMPLEMENTED |
| T14–T18 | NOT EXECUTED; readiness/incident/concurrency corrections outstanding |
| T19–T20 | NOT EXECUTED; no reliable notification/idempotency lot delivered |
| T21–T23 | NOT EXECUTED; rotation engine not delivered |
| T24 | Invitation audit-failure rollback tested; general business/outbox transaction failure NOT EXECUTED |
| T25 | NOT EXECUTED; existing memory-store lockout test is not distributed proof |
| T26–T27 | Synthetic exact old v1 format, opt-in v2, wrong keys/tamper/config errors tested; real historical samples NOT EXECUTED |
| T28 | Media HTTP no-store/direct access tested; full CDN/browser/export checks NOT EXECUTED |
| T29 | Additive 003/004 executed in dedicated memory test DBs; version/checksum/resumption/legacy-copy tests NOT EXECUTED |
| T30 | NOT EXECUTED |

PGlite is not a PostgreSQL server with independently concurrent connections. Tests
never read the application DATABASE_URL. Test target must exactly equal
memory://staywise_test. No server restoration or backup was demonstrated.

## D. Security details

See ENCRYPTION.md, AUTHORIZATION.md, INVITATIONS.md and MEDIA.md.
No predictable crypto fallback or automatic session-key derivation remains. Default
writer stays v1; explicit read-only legacy keys and v2 keyring supported. No backfill.
Malformed assignments/unknown roles deny; field-role wildcard grants no property access.
Managers retain organization scope with *, and explicit lists restrict them. Existing
field-role wildcard data must be reviewed, not silently promoted or rewritten.
Email alone no longer links an account. Invitations do not activate memberships before
verified acceptance. JWT audience now required; actual provider claims need validation.
New private media are authenticated byte reads, never public Blob URLs. Legacy local
media route returns 410 rather than expose unclassified bytes. Existing public Blob URLs
may STILL be reachable independently: inventory and remediation remain blocking.
Guest media currently relies on the old code verifier: LOT05 remains mandatory.

## E. Operational integrity

Cleaning/incident reference mutations now accept registered private media IDs only.
Historical URL arrays remain intact, but cannot be resubmitted as new verified evidence.
Random cleaner autoassignment removed; generated cleaning task stays unassigned.
General inspection, task closure, critical reclassification, readiness and notification
state machines remain uncorrected. No claim of reliable operational validation is made.
Only invitation create/accept/revoke currently combine mutation and audit in this increment.

## F. Database

Created 003_security_invitations.sql and 004_private_media.sql, additive only.
Executed on isolated embedded PG. Never executed on Neon or production.
The existing npm run db:migrate only runs the legacy schema initializer: it does NOT
apply these new files. Do not treat it as a deployment procedure for this increment.
Runtime schema/seed initialization remains and MUST be removed by LOT11 before activation.
No legacy ciphertext/media/membership was migrated. Backup/restore NOT EXECUTED.

## G. Frontend

Auth page accepts a manually shared invitation token after verified sign-in. Team page
shows one-time token as NOT SENT, property selection, pending invitation list/revocation.
Cleaning and incident images load through authorized fetch/object URLs; URLs revoked on
cleanup. Legacy references show unavailable instead of fetching a public proof URL.
Typechecked and built. Browser E2E, accessibility and mobile/network tests NOT EXECUTED.

## H. Staging and rollback (preparation, not authorization to deploy)

Do not connect this increment to existing customer data or deploy it as a complete release.
1. Finish LOT05–13 and versioned migrations; prepare a separate staging DB/provider/storage.
2. Verify provider issuer/audience/email/revocation; set NEON_AUTH_AUDIENCE explicitly.
3. Inventory actual legacy keys, keep STAYWISE_DATA_KEY unchanged, preserve historical keys.
4. Optional variables: STAYWISE_LEGACY_DATA_KEYS, STAYWISE_DATA_KEYRING,
   STAYWISE_ACTIVE_DATA_KEY_ID; STAYWISE_ENCRYPTION_WRITE_VERSION defaults to 1.
5. Inventory private/public legacy media and wildcard staff memberships before any backfill.
6. Demonstrate restore; apply explicit reviewed migrations to staging only; no runtime seed.
7. Run local tests plus independent-connection, actual-provider, browser/CDN and full T01–T30.
8. Request separate deployment approval only after blockers resolved.

Local verification (no external database required):
  npm ci
  npm test
  npm run typecheck
  npm run typecheck:tests
  npm run build

Rollback rules: keep additive tables/data and audit; do not destructively down-migrate.
After v2 writes, retain a v2-capable reader/keyring even if writer returns to v1.
Never restore public evidence access or auto email linking. Pause uploads/invitations if
necessary and repair explicit access through audited operations. General rollback and
restore are not yet demonstrated. No production rollback operation has been attempted.

## I. Final decision

**NOT READY**. This increment contains real tested corrections, but the whole mission
is unfinished. Particularly blocking: guest sessions/limits, operational validation,
transactional readiness, truthful notifications/outbox, controlled migrations, actual
provider/legacy-data verification, historical public media remediation and full acceptance.
No push or deployment performed. Continue with LOT05; no additional authorization is
needed for the already authorized code work, but external activation remains separate.
