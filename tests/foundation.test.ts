import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase, fakeClock, fakeStorage, fakeTransport, fixtures } from './helpers/harness.js';

test('test database guard refuses every target except explicitly named memory database', async () => {
  for (const target of ['', 'postgresql://localhost/prod', 'memory://production']) {
    await assert.rejects(createTestDatabase(target));
  }
});

test('dedicated embedded PostgreSQL supports isolated tenant fixtures and rollback', async () => {
  const { engine } = await createTestDatabase('memory://staywise_test');
  try {
    await engine.exec('CREATE TABLE properties (id text PRIMARY KEY, organization_id text NOT NULL)');
    for (const p of fixtures.properties) await engine.query('INSERT INTO properties VALUES ($1,$2)', [p.id, p.organization_id]);
    assert.deepEqual((await engine.query('SELECT id FROM properties WHERE organization_id=$1', ['org-a'])).rows, [{ id: 'prop-a' }]);
    await assert.rejects(engine.transaction(async tx => {
      await tx.query('DELETE FROM properties WHERE id=$1', ['prop-a']);
      throw new Error('injected failure');
    }));
    assert.equal((await engine.query('SELECT * FROM properties')).rows.length, 2);
  } finally { await engine.close(); }
});

test('clock, storage and transport doubles are deterministic and make no network calls', async () => {
  const clock = fakeClock(); const storage = fakeStorage(); const transport = fakeTransport();
  const before = clock.now(); clock.advance(1000); assert.equal(clock.now(), before + 1000);
  storage.put('private-a', new Uint8Array([1])); assert.deepEqual(storage.get('private-a'), new Uint8Array([1]));
  assert.equal((await transport.send({ id: 'message' })).status, 'sent'); assert.equal(transport.accepted.length, 1);
});
