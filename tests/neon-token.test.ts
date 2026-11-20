import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNeonToken } from '../src/lib/neonToken.js';

test('opaque SDK session credential is never forwarded as a JWT', async () => {
  let calls = 0;
  assert.equal(await resolveNeonToken(async () => 'opaque-session-secret', async () => { calls++; return 'abc.def.ghi'; }), 'abc.def.ghi');
  assert.equal(calls, 1);
  assert.equal(await resolveNeonToken(async () => 'opaque', async () => 'also-opaque'), null);
});
test('SDK JWT needs no second request; explicit endpoint handles SDK failure', async () => {
  assert.equal(await resolveNeonToken(async () => 'abc.def.ghi', async () => { throw Error('must not run'); }), 'abc.def.ghi');
  assert.equal(await resolveNeonToken(async () => { throw Error('missing'); }, async () => 'abc.def.ghi'), 'abc.def.ghi');
  assert.equal(await resolveNeonToken(async () => null, async () => { throw Error('offline'); }), null);
});
