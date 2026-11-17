# R02 — private evidence increment (NOT complete historical remediation)

New evidence is stored only in the private media_assets PostgreSQL table. The new route
never calls the legacy public Blob uploader. Public marketing/guidebook resources are
unchanged. No legacy object has been copied/deleted/reclassified.

sharp is a required production dependency: it fully decodes supported image bytes,
checks declared type, rejects animation/oversized pixels, re-encodes JPEG and strips
metadata. Filename/data URL type alone is not trusted. Fingerprint is of the stored
normalized bytes, not proof of time/location/authenticity of the depicted operation.

New register: organization, property, category, private visibility, actor or reservation,
type, size, fingerprint, receipt timestamp and availability. No arbitrary URLs accepted
as new cleaning/incident/support evidence. Existing *_urls JSON field names remain for
API compatibility, but new values must be media IDs. Historical arrays are not rewritten.
Attempting to resubmit an array with legacy URLs fails explicitly; classification needed.

GET /api/media/:id requires current server-verified identity and tenant/property scope.
Guest media ownership is restricted to the verified reservation. The current guest-code
path still depends on LOT05, which is NOT completed; guest sessions/bruteforce remain
activation blockers. Authenticated byte reads use private,no-store and no public redirect.
Frontend uses authorized fetch, temporary object URL, cancellation and revocation.
Legacy /api/uploads/:id now returns 410 with no file bytes. This intentional safety
restriction can hide legacy guidebook uploads until classification. Public Blob URLs
already issued cannot be revoked by changing this API: inventory and provider cache
remediation require a separate approved operation and remain BLOCKING.

Migration 004_private_media.sql: additive, tested in memory, not applied remotely.
PG BYTEA selected for a bounded first implementation, not a high-volume media solution.
Validate database storage, transfer cost, serverless memory and throughput before pilot.
Private object storage can replace the backend without changing media-ID authorization.
No automatic media backfill and no public-store conversion is included.

Tests executed: real decode errors; Express media route against embedded PostgreSQL;
anonymous, foreign-tenant, unassigned, suspended denials; private headers; registered
reference checks; bytes/fingerprint match. Media test principal injection isolates route
policy from JWT verification (separately tested). Browser/mobile rendering: NOT EXECUTED.

Rollback: keep private registry and data; disable new uploads if needed. Never return to
public evidence URLs. Preserve originals/legacy objects for an approved inventory; do not
restore public legacy reads as a convenience. No destructive down migration.
