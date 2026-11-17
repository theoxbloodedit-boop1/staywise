# R03 — authorization increment

Implemented:
- Known operational role allowlist; malformed assignment JSON denied rather than wildcard.
- Field roles cannot use `*`. Existing field-role wildcard memberships are preserved but
  have no property access until explicitly assigned by an authorized administrator.
- Manager `*` retains organization scope; explicit list or [] restricts that manager.
- Platform operations require explicit platform membership, verified token email and
  configured/default platform allowlist. Ordinary organization APIs remain tenant scoped.
- Object mutation paths in cleaning, incidents, inspections, reservations, guidebook copy,
  support and feedback authorize the property's organization and actor scope.
- Related reservation and assigned user are checked before cleaning/incident writes.
- Joined property rows must have matching organization ownership.
- Random automatic cleaner selection removed: reservation turnover starts unassigned.

Tests executed: pure scope policy and HTTP integration using real signed local JWT/JWKS,
Express routers and isolated embedded PostgreSQL. Negative routes assert no mutation.
This does NOT prove every route or concurrent membership revocation is secure.

Remaining blockers: evidence reference validation requires media registry (LOT04);
all mutation/audit races require LOT06; historical inconsistent rows require inventory
and constraints; full endpoint matrix and real-provider tests remain outstanding.

Compatibility: historical wildcard field memberships need deliberate explicit assignments.
No historical membership was changed. No production data was accessed. There is no
implicit data migration in this increment. Unknown organization status denies access.

Rollback: preserve assignment corrections and deny-by-default rules. If a legitimate
user loses access, repair the explicit assignment through an audited administrative
operation; never restore fail-open wildcard behavior. Do not activate against existing
users before assignment inventory and auth-provider checks.
