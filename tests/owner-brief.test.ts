import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OwnerBrief, ownerNextStep } from '../src/components/OwnerBrief.js';

const zero = { totalProperties: 0, criticalIncidents: 0, overdueCleaning: 0, notReadyProperties: 0, unresolvedGuestRequests: 0 };
test('owner briefing prioritizes critical issues, overdue tasks, setup, blockers and guest requests', () => {
  assert.equal(ownerNextStep({ ...zero, criticalIncidents: 1, overdueCleaning: 2 }).route, 'incidents');
  assert.equal(ownerNextStep({ ...zero, totalProperties: 3, overdueCleaning: 2 }).route, 'cleaning');
  assert.equal(ownerNextStep(zero).action, 'Add your first property');
  assert.equal(ownerNextStep({ ...zero, totalProperties: 2, notReadyProperties: 1 }).route, 'properties');
  assert.equal(ownerNextStep({ ...zero, totalProperties: 2, unresolvedGuestRequests: 1 }).route, 'ai-console');
  assert.equal(ownerNextStep({ ...zero, totalProperties: 2 }).route, 'reservations');
});
test('owner briefing displays unknown values as unavailable, never a fabricated all-clear', () => {
  const step = ownerNextStep({}); assert.match(step.detail, /unavailable/);
  const html = renderToStaticMarkup(React.createElement(OwnerBrief, { indicators: { criticalIncidents: NaN, totalProperties: -1 }, onNavigate() {} }));
  assert.match(html, /—/); assert.doesNotMatch(html, />NaN<|>-1<|Everything is ready/);
});
test('owner briefing has one clear action, explicit heading and truthful empty-state counts', () => {
  const html = renderToStaticMarkup(React.createElement(OwnerBrief, { indicators: zero, onNavigate() {} }));
  assert.match(html, /aria-labelledby="owner-brief-title"/);
  assert.match(html, /Add your first property/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.equal((html.match(/<dd/g) || []).length, 4);
  assert.doesNotMatch(html, /sample customer|revenue|100%/i);
});
