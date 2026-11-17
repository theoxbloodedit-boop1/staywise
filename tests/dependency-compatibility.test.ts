import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Exercise the actual transitive resolution used by Blob, not an unrelated root copy.
const require = createRequire(import.meta.url);
const blobRequire = createRequire(require.resolve('@vercel/blob'));
const oidcRequire = createRequire(blobRequire.resolve('@vercel/oidc'));

test('patched Vercel CLI config remains compatible with the Blob OIDC dependency', async () => {
  const config = oidcRequire('@vercel/cli-config');
  assert.equal(config.parseGlobalConfig({ currentTeam: 'test-team', telemetry: { enabled: false } }).currentTeam, 'test-team');
  assert.equal(config.parseAuthConfig({ token: 'synthetic-test-token' }).token, 'synthetic-test-token');
  assert.throws(() => config.parseAuthConfig({ token: 123 }));
  assert.throws(() => config.parseGlobalConfig({ credStorage: 'invalid-value' }));
  const oidc = blobRequire('@vercel/oidc');
  assert.equal(typeof oidc.getVercelOidcToken, 'function');
  // Only an import smoke check: never contacts Blob or reads real credentials.
  const blob = await import('@vercel/blob');
  assert.equal(typeof blob.put, 'function');
});
