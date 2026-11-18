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
- The auth page checks setup before signup. Login first establishes a provider
  session, then checks server setup before requesting application context. This
  allows a signed-in user to run the diagnostic even when audience is missing.
  Provider sign-in alone never authenticates the user to Staywise or grants roles.
  A valid provider session is needed for useful diagnostics.
- No raw token, email, subject, cookie or provider error is returned by diagnostics.

Local evidence: 32 tests passed, application/test TypeScript passed, build passed.
No real provider/browser/deployment validation performed.

The SQL companion 005_staging_install.sql is for a fresh reviewed base only.
It is NOT a repair/replay script. The user's existing staging already contains
005 objects without a recorded checksum; do not execute the companion there or
mark that database reconciled without a full structural review.

## Token transport correction
The installed SDK returns getSession().data.session.token, replacing it with
set-auth-jwt only when that response header is available. An opaque session
credential must not be sent to a JWT verifier. The browser now shape-checks the
SDK result and falls back to the provider's /token endpoint with credentials and
no-store when necessary. Shape is not authentication; all server checks remain.
Diagnostic failures now include only allowlisted reason codes, not raw errors.
35 local tests, both TypeScript checks and build passed. This does not prove the
real staging failure was an opaque token; the next diagnostic distinguishes it
from issuer/key/expiry failures. No audience is inferred or trusted automatically.

## Separate exact JWT issuer
Staging reported issuer_mismatch. NEON_AUTH_ISSUER now overrides the expected
JWT issuer without changing the browser Auth URL or the configured JWKS URL.
The normal verifier still requires exact issuer and audience matches.
The diagnostic now verifies signature/expiry first using ONLY the configured
JWKS, then returns bounded signed observedIssuer/audiences and issuerMatches.
It does not accept issuer-provided key URLs or change environment settings.
This supersedes the earlier diagnostic requirement to match issuer before
reporting candidates. Candidates require operator/provider review; they do not
grant authority. Tests cover separate issuer success and trailing-slash mismatch.

## Email verification recovery
AuthPage now offers Send email verification link on login/onboarding, using the
installed SDK adapter.sendVerificationEmail with a callback bound to the current
origin. It never edits provider verification records. Successful API acceptance
is described as requested, not delivered. The UI prevents repeat submission in
that mount; provider-side rate limits/delivery still apply. Auth context signals
verification required only after ordinary JWT verification succeeds, and the
login error no longer mislabels that condition as a JWKS issue.
Validation: prior 35-test suite passed, new SSR login/onboarding test passed,
application/test TypeScript and build passed. Real outbound email not tested.

## OTP correction
User evidence confirms delivery of a six-digit verification code, not a link.
The UI now has a separate email-code field and Verify email code action, distinct
from organization invitation acceptance. Send/resend uses emailOtp.sendVerificationOtp
with type email-verification; validation uses emailOtp.verifyEmail. Only the provider
changes verification status. A successful response signs out before a fresh login;
an invalid/expired response clears the code and enables a new request. No OTP is
persisted in storage, logged or sent to Staywise business APIs.
Installed SDK plugin methods are exercised against a local HTTP fake provider:
correct endpoint/body, malformed code rejected before request, provider rejection
propagated. This proves transport integration, not real email deliverability.
Full 36-test suite/build/typechecks passed before addition of the HTTP contract test;
that additional test and test TypeScript pass separately.
