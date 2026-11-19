# Authentication recovery review

Scope: static review of current checkout and user-supplied staging evidence.
No remote configuration, production change, or live end-to-end test performed.

## Established observations

- Neon account exists; one attempt reported successful provider login followed by issuer_mismatch. A later attempt reported Invalid origin/no_session. Browser origins were not captured consistently, so the cause of the later refusal is not established.
- Server historically equated JWT issuer with browser Auth URL. NEON_AUTH_ISSUER now permits an exact independent issuer; actual signed staging issuer/audience have not yet been reported by the latest diagnostic.
- NEON_AUTH_AUDIENCE was absent in screenshots. Presence/current value cannot be checked remotely here.
- Application context, onboarding and internal control require strict verified email. Neon screenshots show verification-at-signup disabled. This does not prove the user's email is unverified, but provider account existence/login alone does not satisfy the application requirement.
- Staging has 005 tables, expected permission counts, selected columns and audit trigger. Complete structural reconciliation and migration ledger remain unverified. Do not rerun 005 or insert its checksum as a substitute for review.
- Existing internal administrator profile has not been granted. Successful customer onboarding alone cannot grant internal permissions.

## Review findings

- Generic login errors conflate invalid signature/claims and unverified email; directing every failure to JWKS is inaccurate.
- Public configuration preflight establishes only presence, not correctness or successful provider operation.
- Token fallback is defensive handling of the installed SDK's session.token behavior, not a demonstrated root cause of this user's failure.
- Tests use local signed fixtures and a source-order regression guard. These are not browser/provider end-to-end tests.
- Multiple deployment origins made manual validation inconsistent. One stable branch origin must be confirmed as allowed in the SAME provider environment that the deployed auth config uses.

## Required acceptance gates (ordered)

1. Capture deployment commit, actual window origin, server-provided Auth URL and matching provider allowed origins as one environment record.
2. Confirm provider login from that origin without changing URLs mid-test.
3. Use the latest bounded diagnostic to verify signature, inspect signed issuer/audience and verified-email boolean. Review issuer/audience against provider configuration before setting exact expected values. No auto-trust, wildcard or disabled claim checks.
4. Validate API context with that session; separately verify/complete email verification if required.
5. Reconcile DB schema/ledger and create application user through normal verified onboarding.
6. Use the existing guarded operator bootstrap for a specifically identified existing user; verify denial for normal accounts and revocation.
7. Browser smoke test on staging before claiming login is fixed. Sensitive operations also require the real provider auth_time contract.

## Operational boundary

Without secure remote environment access or browser execution evidence the agent cannot complete gates 1–7 alone. Further speculative production/preview patches are not a substitute. No account password, bearer token, connection string or API secret should be pasted into chat.
