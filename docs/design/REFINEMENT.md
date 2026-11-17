# Staywise — design refinement delivery

## A. Implementation

Frontend-only increment, 2026-11-16. Existing architecture: React 18, TypeScript,
Tailwind, custom shared UI components, callback-based route navigation and SSR/prerender.
No backend, auth, permission, database, encryption or API contract changes in this increment.
Security work already present in the checkout is outside this design patch.

Files intentionally changed:
- src/pages/LandingPage.tsx: split hero, shorter proposition, product-first hierarchy,
  seven linked feature areas, explicit sample cards, simplified security claims,
  Early Access capacity comparison, associated FAQ controls/panels.
- src/components/ProductPreview.tsx (new): real MobileGuidePreview reuse with explicitly
  illustrative public-only content; clearly labeled operational illustration, no invented
  approval/evidence/assignment/completion counts. Neither component enters customer data.
- src/components/MobileGuidePreview.tsx: responsive max-width, pressed state on controls,
  larger touch targets; optional compact presentation, original full height preserved
  for existing editor use. Narrowed props to consumed fields, existing callers compatible.
- src/components/ui/OperationalStatus.tsx (new): reusable icon/text/color presentation of
  recorded status and full wrapping reason; no inferred state or readiness calculation.
- src/pages/DashboardPage.tsx: shared status presentation, untruncated reasons, honest
  final-validation disclaimer; legacy server Ready record shown as unavailable final
  validation with original record/reason preserved; network error/retry presentation.
- src/components/PublicChrome.tsx: mobile/tablet navigation to 1280px to avoid crowding,
  Escape close, aria-controls, skip link, larger footer links and clearer sample wording.
- src/components/ui/Button.tsx: token colors, flexible labels, 44/48px default/large targets.
- src/components/ui/index.tsx: consistent card radius, 44px input/select targets.
- src/index.css and tailwind.config.js: Inter headings/display, exact navy/teal/cloud/mist
  tokens, visible focus, reduced-motion behavior, text readability; unused Jakarta font
  imports removed (font dependency not changed).
- src/pages/{PublicPages,GuidebookFeaturePage,TurnoverFeaturePage,TemplatesPage,LegalPages}.tsx:
  skip-link destination. PublicPages plan badge no longer claims Most Popular.
- tests/design.test.ts: four new rendering/regression tests.

Property imagery, sample guest portal links, existing auth/workspace actions, plans,
usage limits and all routes retained. No new production or test dependencies added to
package.json. Browser tools were attempted only in excluded .cache, not shipped.

## B. Visual QA

Responsive implementation: single-column mobile hero, flexible demo phone, stacked form,
wrapping property metadata, fluid actions, desktop two-column composition, tablet menu.

IMPORTANT: this is code-level responsive work, not a completed visual validation.

| Viewport | Browser visual validation |
|---|---|
| 360px | NON EXÉCUTÉ |
| 390px | NON EXÉCUTÉ |
| 430px | NON EXÉCUTÉ |
| 768px | NON EXÉCUTÉ |
| 1024px | NON EXÉCUTÉ |
| 1440px | NON EXÉCUTÉ |
| 1920px | NON EXÉCUTÉ |

Attempted Playwright Core + Chromium through temporary npm tooling. Browser launch
failed before rendering: missing system shared library libnspr4.so. No browser was
preinstalled. Browser binary download hosts/system package mirrors are outside the
allowed network set. No before/after screenshots or overflow/console claims are made.
The user's supplied images serve as qualitative before-reference only.

Live preview: Vite preview bound to 0.0.0.0:4173, static production build. This is a visual
preview only: no backend or customer database is started. Auth and live operational
APIs require a separately configured environment; guest portal navigation is preserved
but cannot be functionally validated through this static server.

## C. Technical QA (executed)

- npm ci: PASS. Existing Neon peer dependency warning persists.
- npm test: 26 passed / 0 failed / 0 skipped (22 existing, 4 new).
- npm run typecheck: PASS.
- npm run typecheck:tests: PASS.
- npm run build: PASS, public routes prerendered. Existing third-party Zod Rollup
  annotation warnings remain; no build failure.
- npm audit: zero vulnerabilities reported.
- git diff --check: PASS before delivery.

New tests cover unknown-status fail-closed rendering; explicit public sample labeling;
all nine marketing routes render with one skip destination and existing nav/legal links;
no placeholder href=#; sample portal targets, plan capacities and initial FAQ association.
These tests are SSR/render assertions, NOT browser interaction or pixel tests.

NON EXÉCUTÉ: actual clicks for each CTA, authenticated dashboard against live API,
keyboard navigation in browser, accordion toggling, reduced-motion emulation, console
errors, automated contrast/accessibility scan, image crop/overflow checks at seven
widths, Lighthouse/layout shift and full application mobile regression. No frontend
behavior regression detected by executed tests; absence of browser regressions unproven.

## D. Outstanding issues

- Backend final readiness validation remains unreliable/incomplete from earlier work.
  This patch cannot certify Ready. Dashboard shows that limitation instead of a final
  positive badge, without modifying the returned data or business logic.
- Operations illustration is labeled, static explanatory content, not a working new
  dashboard. Guest preview is the actual existing interactive component.
- Real dashboard/table still uses horizontal scrolling for dense operational data.
  A full mobile workspace redesign and all dialogs are not covered in this increment.
- Some older marketing/FAQ/security/plan copy outside the edited sections still needs
  a complete security/product/legal claim review; no assertion of universal compliance.
- Existing legal company/contact information retained, not independently verified.
- Existing public demo codes retained only for known sample properties. No customer
  credentials were introduced. Existing guest verification behavior left unchanged.
- Existing private-media and other backend activation blockers remain unchanged.

## E. Staging readiness

STAGING WITH BLOCKERS: suitable for isolated visual review of the built frontend,
NOT approved for customer-data staging or production. Before visual sign-off, execute
all seven viewport/browser checks, navigation/CTA/FAQ checks, authenticated smoke tests,
contrast/keyboard checks and capture screenshots. Finish the separate backend gates
before operational rollout. No production deployment or push performed in this task.

Rollback: revert only this frontend design commit. No schema, data or key rollback is
required. Restore the original server-generated shell only through the normal build;
the build artifact was not manually edited or committed with this patch.
