import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { db } from '../server/db.js';
import { dispatchNotification } from '../server/domain.js';
import { authRouter } from '../server/routes/auth.js';

test('notification persistence never claims SMS/email delivery, even if caller requests them', async () => {
  const originalQuery = db.queryOne;
  const originalExecute = db.execute;
  let values: any[] = [];
  db.queryOne = async () => undefined;
  db.execute = async (_sql, params = []) => { values = params; return 1; };
  try {
    const id = await dispatchNotification({ organizationId: 'org-a', channel: 'SMS + Email + In-App', recipientRole: 'Organization Owner', recipientName: 'Owner', urgency: 'Critical', title: 'Critical incident', body: 'Requires intervention' });
    assert.ok(id);
    assert.equal(values[3], 'In-App');
    assert.equal(values[9], 'Available In-App');
  } finally { db.queryOne = originalQuery; db.execute = originalExecute; }
});

test('missing required auth audience gives an actionable 503 without environment values', async () => {
  const previous = process.env.NEON_AUTH_AUDIENCE;
  delete process.env.NEON_AUTH_AUDIENCE;
  const app = express();
  app.use('/auth', authRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No port');
    const response = await fetch(`http://127.0.0.1:${address.port}/auth/context`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.code, 'AUTH_CONFIGURATION_INCOMPLETE');
    assert.ok(body.missing.includes('NEON_AUTH_AUDIENCE'));
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(body), /postgresql:\/\/|Bearer /);
  } finally {
    if (previous === undefined) delete process.env.NEON_AUTH_AUDIENCE;
    else process.env.NEON_AUTH_AUDIENCE = previous;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
