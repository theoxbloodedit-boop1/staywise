import test from 'node:test';
import assert from 'node:assert/strict';
import { getNeonAuthConfigurationStatus } from '../server/security.js';

test('auth preflight fails closed without audience and exposes only variable names', () => {
  const names = ['NEON_AUTH_BASE_URL', 'VITE_NEON_AUTH_URL', 'NEON_AUTH_JWKS_URL', 'NEON_AUTH_AUDIENCE'];
  const saved = names.map(name => process.env[name]);
  try {
    for (const name of names) delete process.env[name];
    assert.equal(getNeonAuthConfigurationStatus().configured, false);
    process.env.NEON_AUTH_BASE_URL = 'https://example.invalid/auth';
    assert.deepEqual(getNeonAuthConfigurationStatus(), { configured: false, missing: ['NEON_AUTH_AUDIENCE'] });
    process.env.NEON_AUTH_AUDIENCE = '   ';
    assert.equal(getNeonAuthConfigurationStatus().configured, false);
    process.env.NEON_AUTH_AUDIENCE = 'operator-verified-audience';
    assert.deepEqual(getNeonAuthConfigurationStatus(), { configured: true, missing: [] });
    assert.ok(!JSON.stringify(getNeonAuthConfigurationStatus()).includes('operator-verified'));
  } finally {
    names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; });
  }
});

test('session diagnostic verifies signature without granting authentication or exposing identity', async () => {
  const { createJwtFixture } = await import('./helpers/jwt.js');
  const { diagnoseNeonSession, verifyNeonAuthJwt } = await import('../server/security.js');
  const fixture = await createJwtFixture();
  const names = ['NEON_AUTH_BASE_URL', 'NEON_AUTH_JWKS_URL', 'NEON_AUTH_AUDIENCE', 'NEON_AUTH_ISSUER'];
  const saved = names.map(name => process.env[name]);
  try {
    delete process.env.NEON_AUTH_ISSUER;
    process.env.NEON_AUTH_BASE_URL = fixture.issuer;
    process.env.NEON_AUTH_JWKS_URL = `${fixture.issuer}/jwks`;
    delete process.env.NEON_AUTH_AUDIENCE;
    const token = await fixture.sign();
    const result = await diagnoseNeonSession(token);
    assert.equal(result.status, 'signature_verified_not_authorized');
    assert.ok('authenticationTimePresent' in result && result.authenticationTimePresent === false);
    assert.ok('recentProviderAuthentication' in result && result.recentProviderAuthentication === false);
    const fresh = await diagnoseNeonSession(await fixture.sign({ auth_time: Math.floor(Date.now() / 1000) }));
    assert.ok('recentProviderAuthentication' in fresh && fresh.recentProviderAuthentication === true);
    for (const auth_time of [Math.floor(Date.now() / 1000) - 301, Math.floor(Date.now() / 1000) + 60, '12345']) {
      const stale = await diagnoseNeonSession(await fixture.sign({ auth_time }));
      assert.ok('recentProviderAuthentication' in stale && stale.recentProviderAuthentication === false);
    }

    assert.ok(!JSON.stringify(result).includes('a@example.test'));
    assert.ok(!JSON.stringify(result).includes(token));
    assert.equal(await verifyNeonAuthJwt(token), null);
    assert.equal((await diagnoseNeonSession('bad.token.value')).status, 'invalid_session');
    assert.deepEqual(await diagnoseNeonSession(undefined), { status: 'no_session' });
    assert.deepEqual(await diagnoseNeonSession(await fixture.sign({ exp: 1 })), { status: 'invalid_session', reason: 'expired' });
    process.env.NEON_AUTH_BASE_URL = `${fixture.issuer}/wrong`;
    const mismatch = await diagnoseNeonSession(token);
    assert.equal(mismatch.status, 'signature_verified_not_authorized');
    assert.ok('issuerMatches' in mismatch && mismatch.issuerMatches === false);
    assert.ok('observedIssuer' in mismatch && mismatch.observedIssuer === fixture.issuer);
    process.env.NEON_AUTH_AUDIENCE = 'staywise-test';
    assert.equal(await verifyNeonAuthJwt(token), null);
    process.env.NEON_AUTH_ISSUER = fixture.issuer;
    assert.equal((await verifyNeonAuthJwt(token))?.sub, 'auth-a');
    process.env.NEON_AUTH_ISSUER = `${fixture.issuer}/`;
    assert.equal(await verifyNeonAuthJwt(token), null);
  } finally {
    names.forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; });
    await fixture.close();
  }
});

test('login establishes provider session before checking application setup', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/pages/AuthPage.tsx', import.meta.url), 'utf8');
  // Regression guard for the no_session dead end: never preflight login before Neon.
  assert.ok(!source.includes("if (mode === 'register' || mode === 'login') {\n        const configuration"));
  const login = source.slice(source.indexOf("} else if (mode === 'login') {"));
  const signIn = login.indexOf('await neonSignIn(email, password)');
  const preflight = login.indexOf("apiFetch('/api/auth/configuration')");
  const context = login.indexOf("apiFetch('/api/auth/context')");
  assert.ok(signIn >= 0 && preflight > signIn && context > preflight);
});
