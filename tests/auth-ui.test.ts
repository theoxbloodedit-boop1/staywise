import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthPage } from '../src/pages/AuthPage.js';

test('login and onboarding offer provider email verification without an admin shortcut', () => {
  for (const onboardingUser of [null, { email: 'test@example.test', name: 'Test' }]) {
    const html = renderToStaticMarkup(React.createElement(AuthPage, {
      onBack() {}, onNavigate() {}, onSuccess() {}, onboardingUser,
    }));
    assert.match(html, /Send email verification code/);
    assert.match(html, /Email verification code \(6 digits\)/);
    assert.match(html, /Verify email code/);
    assert.match(html, /Verify ownership of your email/);
    assert.doesNotMatch(html, /Mark.*verified|Grant.*SUPER_ADMIN/);
  }
});

test('invited staff signup renders identity fields without organization provisioning fields', () => {
  const html = renderToStaticMarkup(React.createElement(AuthPage, {
    initialMode: 'staff-register', onBack() {}, onNavigate() {}, onSuccess() {},
  }));
  assert.match(html, /Create Your Staff Account/);
  assert.match(html, /Create Staff Account Only/);
  assert.match(html, /Full Name/);
  assert.match(html, /Work Email/);
  assert.match(html, /Password \(min 8 characters\)/);
  assert.match(html, /I accept the/);
  assert.match(html, /not an organization/);
  assert.doesNotMatch(html, /Company or Portfolio Name|Primary Region|Workspace Capacity Tier|Create Account &amp; Workspace/);
});

test('staff registration source guard returns before workspace provisioning and preserves invitation login path', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile('src/pages/AuthPage.tsx', 'utf8');
  const start = source.indexOf("if (mode === 'staff-register') {", source.indexOf('await neonSignUp'));
  const end = source.indexOf('const token = await getNeonJwtToken()', start);
  const staff = source.slice(start, end);
  assert.match(staff, /setStaffFlow\(true\)/);
  assert.match(staff, /setMode\('login'\)/);
  assert.match(staff, /return;/);
  assert.doesNotMatch(staff, /completeWorkspaceProvisioning\(|\/api\/auth\/onboard/);
  assert.match(source, /ctx\.needsOnboarding && \(staffFlow \|\| invitationToken\.trim\(\)\)/);
});
