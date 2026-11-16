# R04 — pending invitations and explicit identity contract

Implemented: only hashed, 256-bit one-time invitation tokens persist; pending state,
48-hour expiry, revocation, verified matching email, transactional acceptance and audit.
Membership is not active until acceptance. Historical memberships are not removed or
rewritten. Ambiguous pre-existing membership causes refusal rather than overwrite.

JWT signature validation now requires an exact issuer, explicit NEON_AUTH_AUDIENCE,
expiration/issued-at and supported asymmetric algorithms. email_verified must be the
boolean true for internal access, onboarding and invitation acceptance. Arbitrary email
matching no longer links accounts, including /context and onboarding. A sub already
linked to another account is never overwritten by an email match.

BLOCKER: actual Neon claims, issuer, audience, verification and revocation semantics
have NOT been checked. Obtain these from an isolated staging provider and run the
contract tests against it before activation. Missing audience denies authentication.
No provider setting or environment secret was changed by this release.

SQL 003_security_invitations.sql is additive, tested on embedded PostgreSQL only.
It is NOT automatically added to production startup schema; apply explicitly using an
approved migration procedure after the versioned migration runner is delivered. Current
legacy startup DDL/seed behavior still exists elsewhere and remains a deployment blocker.

Frontend: inviter gets the raw token once, explicitly marked NOT SENT; secure manual
sharing is required (no email transport claimed). Recipient signs in with verified email
and pastes the token into /auth. Token is never put in a URL/localStorage. Revocation and
pending listing APIs exist. Browser interaction tests and real email verification remain
NOT EXECUTED.

Rollback: do not restore automatic email linking or active-on-invite behavior. Pause
invitation creation/acceptance, retain records and audits, reissue through a controlled
process. No destructive down migration. Tokens already accepted never become pending.

Executed synthetic tests: issuer/audience/signature checks, strict email boolean;
issue/accept/replay/wrong identity/unverified/expiry/revocation and audit-failure rollback.
PGlite serializes work: these do NOT prove independent-connection concurrency (T09
concurrency remains NOT EXECUTED on PostgreSQL server).
