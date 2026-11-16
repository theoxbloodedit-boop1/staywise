import test from 'node:test';
import assert from 'node:assert/strict';
import { cn } from '../src/lib/cn.js';
import { DEFAULT_PLAN_TIER, PLAN_LIST, getPlanSpec, parsePlanTier } from '../src/lib/plans.js';
import { formatMetricPercent, formatMetricScore, percentRatio, ratio } from '../src/lib/metrics.js';
import {
  GUEST_VERIFY_MAX_FAILURES,
  checkRateLimitLock,
  createMemoryAttemptStore,
  hashRateLimitKey,
  recordRateLimitOutcome,
} from '../server/lib/rate-limit.js';
import { PUBLIC_SEO_META, getSeoMetaForPath } from '../src/seo/Seo.js';
import { PUBLIC_PAGE_PATHS } from '../src/routes.js';
import { GUIDEBOOK_TEMPLATES } from '../src/pages/TemplatesPage.js';
import { isPlatformAdminEmail } from '../server/domain.js';
import { parseFeedbackRating, sortGuidebookSections } from '../server/lib/guest-helpers.js';

test('cn() resolves conflicting Tailwind classes cleanly via tailwind-merge', () => {
  const merged = cn('bg-slate-900 text-white border-slate-900', 'bg-white text-slate-900 border-white');
  assert.equal(merged.includes('bg-slate-900'), false);
  assert.equal(merged.includes('text-white'), false);
  assert.equal(merged.includes('bg-white'), true);
  assert.equal(merged.includes('text-slate-900'), true);
});

test('plans.ts enforces Starter default, $0 full access, and strict server validation', () => {
  assert.equal(DEFAULT_PLAN_TIER, 'Starter');
  assert.equal(PLAN_LIST.length, 3);
  for (const plan of PLAN_LIST) {
    assert.equal(plan.amountCents, 0);
    assert.equal(plan.priceMonthlyUsd, 0);
    assert.equal(plan.fullFeatureAccess, true);
  }
  assert.equal(parsePlanTier('starter'), 'Starter');
  assert.equal(parsePlanTier(' Professional '), 'Professional');
  assert.equal(parsePlanTier('PORTFOLIO'), 'Portfolio');
  assert.equal(parsePlanTier('Enterprise'), null);
  assert.equal(parsePlanTier(''), null);
  assert.equal(parsePlanTier(undefined), null);
  assert.equal(getPlanSpec('Starter').propertyLimit, 5);
});

test('metrics.ts never emits 100%, NaN, or null% on zero/empty datasets', () => {
  assert.equal(ratio(0, 0), null);
  assert.equal(percentRatio(0, 0), null);
  assert.equal(percentRatio(0, -3), null);
  assert.equal(percentRatio(3, 4), 75);
  assert.equal(formatMetricPercent(null), '—');
  assert.equal(formatMetricPercent(undefined), '—');
  assert.equal(formatMetricPercent(88), '88%');
  assert.equal(formatMetricScore(null), '—');
  assert.equal(formatMetricScore(4.85), '4.85 / 5.0');
});

test('rate-limit.ts enforces 8-attempt lockout, Retry-After, window reset, and clear on success', async () => {
  const store = createMemoryAttemptStore();
  const key = hashRateLimitKey('203.0.113.55', 'barton-creek-modern');
  const t0 = 1_700_000_000_000;

  for (let i = 1; i < GUEST_VERIFY_MAX_FAILURES; i++) {
    const pre = await checkRateLimitLock(key, { store, now: t0 + i * 1000 });
    assert.equal(pre.blocked, false);
    const out = await recordRateLimitOutcome(key, false, { store, now: t0 + i * 1000 });
    assert.equal(out.newlyLocked, false);
  }

  // 8th failure triggers lockout
  const lockedOut = await recordRateLimitOutcome(key, false, { store, now: t0 + 10_000 });
  assert.equal(lockedOut.newlyLocked, true);
  assert.equal(lockedOut.failCount, GUEST_VERIFY_MAX_FAILURES);
  assert.ok(lockedOut.retryAfterSec >= 890);

  const blockedCheck = await checkRateLimitLock(key, { store, now: t0 + 15_000 });
  assert.equal(blockedCheck.blocked, true);
  assert.equal(blockedCheck.allowed, false);
  assert.ok(blockedCheck.retryAfterSec > 0);

  // Successful verification resets counter completely
  await recordRateLimitOutcome(key, true, { store, now: t0 + 20_000 });
  const resetCheck = await checkRateLimitLock(key, { store, now: t0 + 21_000 });
  assert.equal(resetCheck.blocked, false);
  assert.equal(resetCheck.remaining, GUEST_VERIFY_MAX_FAILURES);
});

test('SEO metadata, public routes, and 12 guidebook templates are complete and consistent', () => {
  assert.equal(PUBLIC_PAGE_PATHS.length, 9);
  assert.equal(GUIDEBOOK_TEMPLATES.length, 12);

  const titles = new Set<string>();
  for (const p of PUBLIC_PAGE_PATHS) {
    const meta = getSeoMetaForPath(p);
    assert.equal(meta.path, p);
    assert.equal(Boolean(meta.noindex), false);
    assert.ok(meta.title.length > 10);
    assert.ok(meta.description.length > 30);
    titles.add(meta.title);
  }
  assert.equal(titles.size, PUBLIC_PAGE_PATHS.length);

  assert.equal(PUBLIC_SEO_META['/auth'].noindex, true);
  assert.equal(PUBLIC_SEO_META['/404'].noindex, true);
  assert.equal(PUBLIC_SEO_META['/404'].is404, true);
});

test('isPlatformAdminEmail enforces strict founder email allowlist', () => {
  assert.equal(isPlatformAdminEmail('theoxbloodedit@gmail.com'), true);
  assert.equal(isPlatformAdminEmail('  THEOXBLOODEDIT@GMAIL.COM  '), true);
  assert.equal(isPlatformAdminEmail('claire@sunbeltstays.com'), false);
  assert.equal(isPlatformAdminEmail(''), false);
  assert.equal(isPlatformAdminEmail(null), false);
});

test('guest-helpers sort sections by section_order_json and validate 1-5 ratings', () => {
  const ordered = sortGuidebookSections(
    [
      { section_key: 'welcome', sort_order: 0 },
      { section_key: 'checkin', sort_order: 1 },
      { section_key: 'wifi_home', sort_order: 3 },
    ],
    JSON.stringify(['wifi_home', 'welcome', 'checkin'])
  );
  assert.deepEqual(
    ordered.map((s) => s.section_key),
    ['wifi_home', 'welcome', 'checkin']
  );

  assert.equal(parseFeedbackRating(5), 5);
  assert.equal(parseFeedbackRating(1), 1);
  assert.equal(parseFeedbackRating(undefined), 5);
  assert.equal(parseFeedbackRating(0), null);
  assert.equal(parseFeedbackRating(6), null);
  assert.equal(parseFeedbackRating(-2), null);
  assert.equal(parseFeedbackRating(3.5), null);
});
