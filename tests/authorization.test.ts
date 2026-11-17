import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { db, SCHEMA_STATEMENTS } from '../server/db.js';
import { canAccessProperty, isOperationalRole } from '../server/domain.js';
import { authorizeProperty, parseAssignments, resolveAssignee, validateReservationReference, validateAssignments, AuthorizationError } from '../server/lib/authorization.js';
import { adminRouter } from '../server/routes/admin.js';
import { reservationsRouter } from '../server/routes/reservations.js';
import { operationsRouter } from '../server/routes/operations.js';
import { inspectionsRouter } from '../server/routes/inspections.js';
import { createTestDatabase } from './helpers/harness.js';
import { createJwtFixture } from './helpers/jwt.js';

const actor: any = { organizationId: 'org-a', actorRole: 'Cleaning Staff', assignedPropertyIds: ['prop-a'] };

test('T05/T07: roles, explicit manager scope and malformed assignments fail closed', () => {
  for (const raw of ['bad', '{}', 'null', '[1]', '["*","prop-a"]', '["prop-a","prop-a"]', undefined]) assert.equal(parseAssignments(raw), null);
  assert.equal(isOperationalRole('Unexpected Admin'), false);
  assert.equal(isOperationalRole('Guest'), false);
  assert.equal(canAccessProperty(actor, 'prop-a'), true);
  assert.equal(canAccessProperty(actor, 'prop-b'), false);
  assert.equal(canAccessProperty({ ...actor, assignedPropertyIds: ['*'] }, 'prop-a'), false);
  assert.equal(canAccessProperty({ ...actor, actorRole: 'Property Manager', assignedPropertyIds: ['*'] }, 'prop-a'), true);
  assert.equal(canAccessProperty({ ...actor, actorRole: 'Property Manager', assignedPropertyIds: [] }, 'prop-a'), false);
});

test('T01-T05/T07: real HTTP routes and PostgreSQL reject cross-tenant and unassigned mutations', async () => {
  const { engine, executor } = await createTestDatabase('memory://staywise_test');
  const jwt = await createJwtFixture();
  const saved = { query: db.query, queryOne: db.queryOne, execute: db.execute };
  const oldBase = process.env.NEON_AUTH_BASE_URL, oldJwks = process.env.NEON_AUTH_JWKS_URL;
  const oldAudience = process.env.NEON_AUTH_AUDIENCE;
  process.env.NEON_AUTH_BASE_URL = jwt.issuer; process.env.NEON_AUTH_JWKS_URL = `${jwt.issuer}/jwks`; process.env.NEON_AUTH_AUDIENCE = 'staywise-test';
  Object.assign(db, executor);
  const app = express(); app.use(express.json());
  app.use('/admin', adminRouter); app.use('/reservations', reservationsRouter); app.use('/cleaning', operationsRouter); app.use('/inspections', inspectionsRouter);
  app.use((err: any, _req: any, res: any, _next: any) => res.status(err instanceof AuthorizationError ? err.status : 500).json({ code: err.code }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const statement of SCHEMA_STATEMENTS) await engine.exec(statement);
    for (const id of ['org-a', 'org-b']) await engine.query("INSERT INTO organizations (id,name,slug,contact_email,contact_phone,created_at) VALUES ($1,$1,$1,'test@example.test','','2026-01-01')", [id]);
    for (const [id, org] of [['prop-a','org-a'],['prop-a2','org-a'],['prop-b','org-b']]) {
      await engine.query(`INSERT INTO properties (id,organization_id,slug,name,address_line,city,state,postal_code,cover_image,description,created_at) VALUES ($1,$2,$1,$1,'test','test','test','test','','','2026-01-01')`, [id,org]);
    }
    await engine.query("INSERT INTO users (id,neon_auth_id,name,email,avatar_initials,created_at) VALUES ('user-a','auth-a','Worker','a@example.test','WA','2026-01-01')");
    await engine.query(`INSERT INTO organization_memberships (id,organization_id,user_id,role,assigned_property_ids_json,status,created_at) VALUES ('mem-a','org-a','user-a','Inspector','["prop-a"]','Active','2026-01-01')`);
    const token = await jwt.sign();
    const request = (path: string, body: unknown) => fetch(base+path, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify(body) });
    assert.equal((await request('/inspections/assets', { property_id:'prop-b', name:'Asset', category:'test' })).status,404);
    assert.equal((await request('/inspections/assets', { property_id:'prop-a2', name:'Asset', category:'test' })).status,403);
    assert.equal((await request('/reservations', { property_id:'prop-a', guest_name:'Guest', check_in_date:'2026-01-01',check_out_date:'2026-01-02' })).status,403); // inspector cannot reserve
    assert.equal((await request('/inspections/assets', { property_id:'prop-a', name:'Allowed asset', category:'test' })).status,201);
    await engine.query("UPDATE organization_memberships SET role='Property Manager' WHERE id='mem-a'");
    assert.equal((await fetch(base+'/admin/billing', { headers:{ Authorization:`Bearer ${token}` } })).status,403);
    await engine.query("UPDATE organization_memberships SET role='Organization Admin' WHERE id='mem-a'");
    assert.equal((await fetch(base+'/admin/billing', { headers:{ Authorization:`Bearer ${token}` } })).status,200);
    await engine.query("UPDATE organization_memberships SET role='Concierge' WHERE id='mem-a'");
    assert.equal((await request('/reservations', { property_id:'prop-a2', guest_name:'Guest', check_in_date:'2026-01-01',check_out_date:'2026-01-02' })).status,403);
    assert.equal((await request('/cleaning', { property_id:'prop-b',title:'Task',due_date:'2026-01-01' })).status,404);
    assert.equal((await engine.query('SELECT * FROM cleaning_tasks')).rows.length,0);
    assert.equal((await engine.query('SELECT * FROM property_assets')).rows.length,1);
    await engine.query("UPDATE organization_memberships SET assigned_property_ids_json='broken' WHERE id='mem-a'");
    assert.equal((await request('/cleaning', {property_id:'prop-a',title:'Task',due_date:'2026-01-01'})).status,401);
    await engine.query(`UPDATE organization_memberships SET assigned_property_ids_json='["*"]',role='Unknown' WHERE id='mem-a'`);
    assert.equal((await request('/cleaning', {property_id:'prop-a',title:'Task',due_date:'2026-01-01'})).status,401);
    await assert.rejects(authorizeProperty(executor, { ...actor, actorRole:'Organization Admin',assignedPropertyIds:['*'] }, 'prop-b'));
    await assert.rejects(validateReservationReference(executor, actor, 'prop-a', 'foreign-reservation'));
    await assert.rejects(resolveAssignee(executor, actor, 'prop-a', 'user-b', undefined));
    await assert.rejects(validateAssignments(executor,'org-a','Inspector',['*']));
    await assert.rejects(validateAssignments(executor,'org-a','Inspector',['prop-b']));
  } finally {
    Object.assign(db, saved);
    for (const [name,value] of Object.entries({ NEON_AUTH_BASE_URL:oldBase, NEON_AUTH_JWKS_URL:oldJwks, NEON_AUTH_AUDIENCE:oldAudience })) value === undefined ? delete process.env[name] : process.env[name]=value;
    await new Promise<void>(resolve => { server.close(()=>resolve()); server.closeAllConnections(); });
    await jwt.close(); await engine.close();
  }
});
