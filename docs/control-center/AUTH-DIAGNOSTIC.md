# Sign-in setup diagnostic

This increment does not activate an administrator or fix the unknown real Neon
JWT audience. Production/database settings are not changed.

- GET /api/auth/configuration returns only configured/missing environment names.
  Configured means present, not provider-validated.
- POST /api/auth/session-diagnostic is rate limited, no-store, and never creates
  an identity, workspace, session or grant. It verifies signature, configured
  issuer, expiration, required claims and future iat before returning bounded
  audience candidates and a strict email_verified boolean. It intentionally does
  not validate audience: this result MUST NOT authorize any operation.
- The ordinary authentication verifier still requires the explicit configured
  audience. An observed audience must be reviewed against the provider contract
  before configuring it; diagnostics are not automatic trust-on-first-use.
- The auth page checks setup before signup/login and offers a diagnostic button
  after an error. An existing provider session is needed for useful diagnostics.
  With no session and missing configuration, this is not a complete recovery flow.
- No raw token, email, subject, cookie or provider error is returned by diagnostics.

Local evidence: 32 tests passed, application/test TypeScript passed, build passed.
No real provider/browser/deployment validation performed.

The SQL companion 005_staging_install.sql is for a fresh reviewed base only.
It is NOT a repair/replay script. The user's existing staging already contains
005 objects without a recorded checksum; do not execute the companion there or
mark that database reconciled without a full structural review.
