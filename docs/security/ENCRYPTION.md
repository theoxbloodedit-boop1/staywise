# R01 — field encryption release contract

Implemented: strict dedicated 32-byte key, explicit read-only v1 historical keys,
reader for authenticated v1/v2 envelopes, opt-in v2 writer, explicit sanitized errors.
No key has been generated, replaced or rotated in any environment by this release.
Default remains the original v1 wire format. No automatic re-encryption/backfill.

## Activation blockers
Inventory and preserve the actual key before staging against existing data. If the old
application derived its key from a session secret or generated data/.server-secrets.json,
recover that exact key securely into the explicit legacy key list. Do not change session
secrets hoping to recover data. A known-default key may have been used: this requires
operator review, recovery into an explicit temporary reader and a separate rotation.
Never print keys or decrypted fields. Never deploy before sample reads succeed.
Historical plaintext remains readable, not automatically marked verified.

## Staging and rotation
1. Keep STAYWISE_DATA_KEY exactly unchanged. Configure legacy keys if necessary.
2. Deploy dual-version readers with write version 1. Test reads of actual legacy samples.
3. Configure a keyring and active ID; keep v1 key and all readers available.
4. Only in a separate approved release opt into write version 2.
5. Backfill is NOT implemented or authorized automatically. Inventory/restore required first.
6. Retain keys for backups as well as live data.

Rollback: after any v2 write, never revert to a v1-only binary. Disable v2 writes while
retaining this reader and keyring. A missing key fails with 503; it never returns an empty
secret. Removing the legacy insecure fallback is intentional even in development.

Tests: encryption.test.ts, five executed tests including T26/T27 synthetic historical
wire-format compatibility. Actual production ciphertext samples: NOT TESTED.
