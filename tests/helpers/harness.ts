import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import type { DbExecutor } from '../../server/db.js';

// The embedded engine can ONLY use memory. No application DATABASE_URL is read.
export async function createTestDatabase(target: string) {
  assert.equal(target, 'memory://staywise_test', 'Refusing non-test database target');
  const engine = new PGlite();
  const wrap = (client: Pick<PGlite, 'query'>): DbExecutor => ({
    async query<T>(sql: string, params: unknown[] = []) {
      return (await client.query(sql, params)).rows as T[];
    },
    async queryOne<T>(sql: string, params: unknown[] = []) {
      return (await client.query(sql, params)).rows[0] as T | undefined;
    },
    async execute(sql: string, params: unknown[] = []) {
      return (await client.query(sql, params)).affectedRows || 0;
    },
  });
  return { engine, executor: wrap(engine), wrap };
}

export const fixtures = {
  organizations: ['org-a', 'org-b'],
  properties: [{ id: 'prop-a', organization_id: 'org-a' }, { id: 'prop-b', organization_id: 'org-b' }],
  roles: ['Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Cleaning Staff', 'Maintenance Technician', 'Inspector', 'Guest'],
};

export function fakeClock(start = 1_700_000_000_000) {
  let time = start;
  return { now: () => time, advance: (ms: number) => { time += ms; } };
}

export function fakeTransport() {
  const accepted: unknown[] = [];
  return { accepted, send: async (message: unknown) => { accepted.push(message); return { status: 'sent' }; } };
}

export function fakeStorage() {
  const objects = new Map<string, Uint8Array>();
  return { put: (id: string, data: Uint8Array) => objects.set(id, data), get: (id: string) => objects.get(id) };
}
