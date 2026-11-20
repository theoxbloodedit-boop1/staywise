# Invited staff registration — staging correction

## Observed blocker

User confirmed token visibility after c7815ff, then reported the invited address
has no existing account. Previously the only signup flow could provision a new
organization. Do not guide an invited worker through owner signup as a workaround.

## Correction

AuthPage now offers `Invited staff? Create a staff account` from login/onboarding.
The identity-only form asks for name, exact invited email, password and legal
acceptance; no organization, country or capacity fields. It invokes provider
signup, returns immediately to login with email-verification guidance and never
calls workspace provisioning in that branch. After verified login, the in-memory
staff flow (or a pasted invitation token) keeps an unlinked user at invitation
acceptance rather than switching to owner onboarding. Existing owner signup stays
separate. No automatic acceptance, email-derived role or authorization bypass.

The acceptance endpoint remains the authority for verified identity, invited
email match, token validity, expiry, revocation and property assignment.

## Evidence and limits

`npm run verify` succeeded: 50 tests passed, 0 failed/skipped; application, tests
and tools TypeScript; client and SSR build; npm audit (0 vulnerabilities reported).
Two additional tests check static-rendered staff form and source-level early-return
regression. These are NOT real-provider signup or browser interaction tests.

Pending staging checks: create staff identity, receive/verify provider OTP, sign
in, accept preserved token and confirm Cleaning Staff property scope and denied
admin actions. No remote DB changes were made by this correction. Existing
invitation need not be regenerated unless expired/revoked; preserve its raw token
privately, not in this repository or chat.
