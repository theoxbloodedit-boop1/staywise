# Staging review — one-time invitation display

## User evidence

Screenshots 98–99 show successful pending invitation creation and revocation.
After a second creation the user explicitly reports no token displayed. Pending
creation is proven; acceptance and restricted-role behavior are NOT validated.
No token, password or raw invitation response is recorded in this report.

## Root cause and correction

TeamPage sets the returned invitation token in component memory, then calls
onRefreshContext. App binds that callback to hydrateFromBackend, which sets
`authReady=false`, unmounting the workspace. This discards the token and returns
the user to the default route. A pending invitation does not alter current user
membership, so this global refresh is unnecessary.

Removed that callback from TeamPage and its App invocation. The local invitation
list still refreshes. The token remains in component memory until dismissed,
org change or navigation/unmount; it is not added to browser persistent storage.
Existing lost tokens cannot be recovered from their hashes. Revoke the unused
pending invitation before a replacement is created after the fix is deployed.

## Local checks

`npm run verify`: 48 passed, 0 failed/skipped; application/test/tools TypeScript,
production client/SSR build and npm audit succeeded (0 vulnerabilities reported).
The added UI source regression guards removal of global hydration and retention
of the token setter. It is NOT a browser lifecycle test. Real staging token
visibility/copy and acceptance still require user verification after deployment.

## Other observed staging gates remain open

- Guest portal screenshots 87–90 expose the exact address in transport text before
  stay verification despite the protective banner.
- Generated guide contains unverified facilities, contact/emergency/location
  examples and an inspection claim while property readiness is Not Ready.
- Browser find screenshot 94 reports 0/0 for the internal-note marker: visible
  text check only, not proof of response-payload redaction.
- Photo/default capacity discrepancies need investigation against submitted data.

Do not use this test property for real guests or treat these gates as passed.
