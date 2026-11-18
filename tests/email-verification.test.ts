import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { configureNeonAuthUrl, neonSendVerificationEmail, neonVerifyEmailCode } from '../src/lib/neonAuth.js';

test('verification uses provider OTP send/verify endpoints and does not accept malformed codes', async () => {
  const requests: { path: string; body: Record<string, string> }[] = [];
  let rejected = false;
  const server = createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    requests.push({ path: req.url || '', body: JSON.parse(text || '{}') });
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = rejected ? 400 : 200;
    res.end(JSON.stringify(rejected ? { message: 'Invalid OTP', code: 'INVALID_OTP' } : { success: true, status: true }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Missing address');
  configureNeonAuthUrl(`http://127.0.0.1:${address.port}/auth`);
  try {
    await neonSendVerificationEmail(' test@example.test ');
    await neonVerifyEmailCode('test@example.test', '123456');
    assert.deepEqual(requests.map(r => r.path), ['/auth/email-otp/send-verification-otp', '/auth/email-otp/verify-email']);
    assert.deepEqual(requests[0].body, { email: 'test@example.test', type: 'email-verification' });
    assert.deepEqual(requests[1].body, { email: 'test@example.test', otp: '123456' });
    await assert.rejects(neonVerifyEmailCode('test@example.test', 'bad'), /six-digit/);
    assert.equal(requests.length, 2);
    rejected = true;
    await assert.rejects(neonVerifyEmailCode('test@example.test', '654321'), /Invalid OTP/);
  } finally {
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  }
});
