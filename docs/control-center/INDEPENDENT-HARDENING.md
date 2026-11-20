# Independent hardening — completed without remote credentials

## Executed work

1. Added `npm run verify`: application/test/operator-tools TypeScript, full tests,
   production build and npm audit (all severities). Any failing step stops the
   command. This is local verification, not deployment or release authorization.
2. Added `tsconfig.tools.json` so operator scripts are typechecked as well as the
   application. No production schema/bootstrap script is executed by verify.
3. Added `.github/workflows/verify.yml` for pull requests and main/arena pushes:
   Node 22, lockfile install, read-only repository permission, no deployment or
   database credentials. Workflow execution and required branch protection are
   NOT established until separately pushed/configured on GitHub.
4. Fixed operator cleanup in control-migrate/control-bootstrap: a rejected guard
   must not call getPool merely to close it. Added closePoolIfInitialized and a
   child-process regression test for both tools with no database/environment file.
5. Added a failed-migration regression after actual DDL: created objects AND ledger
   roll back transactionally before a subsequent valid migration succeeds.
6. Tightened schema comparison: duplicate metadata identities cause rejection,
   unexpected role permissions are treated as drift. No automatic DDL repair,
   privilege grant, remote read or ledger adoption is performed.

## Evidence from this execution

`npm ci --no-audit --no-fund` succeeded.
`npm run verify` succeeded:
- application TypeScript passed;
- tests TypeScript passed;
- scripts/tools TypeScript passed;
- 40 tests passed, 0 failed, 0 skipped;
- Vite client + SSR/prerender build passed;
- npm audit: 0 vulnerabilities.

`git diff --check` passed. The incidental build-generated shell is restored to
its pre-build version; no customer work is discarded. Build outputs remain ignored.

## What this does NOT establish

- no actual Neon/Vercel deployment validation, external PostgreSQL restore or
  independently connected concurrency test;
- no authenticated browser/mobile/keyboard/screen-reader execution;
- no real provider reauthentication/auth_time contract verification;
- no remote 005 schema/ledger reconciliation;
- no revocation of exposed secrets (must occur in the provider account);
- no completed financial/product/growth mandate or production readiness;
- no CI check execution on GitHub and no production publication.

The four real staging acceptance gates remain HOLD; see STAGING-GATES-RUNBOOK.md.
