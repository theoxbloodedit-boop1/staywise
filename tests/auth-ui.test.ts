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
