import { createJwtFixture } from './helpers/jwt.js';
import { guidebooksRouter } from '../server/routes/guidebooks.js';
import { propertiesRouter } from '../server/routes/properties.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { db, SCHEMA_STATEMENTS } from '../server/db.js';
import { encryptField } from '../server/security.js';
import { guestRouter } from '../server/routes/guest.js';
import { createTestDatabase } from './helpers/harness.js';
import { buildDefaultSections } from '../server/seed-data.js';
import { createMediaRouter } from '../server/routes/media.js';
import { verifyGuestRequest } from '../server/lib/guest-verification.js';
import { AuthorizationError } from '../server/lib/authorization.js';

const address = '100 PRIVATE_AUDIT_ADDRESS';
const secret = 'PRIVATE_PIN_MARKER';
const hidden = 'HIDDEN_SECTION_MARKER';

test('guest privacy boundaries on real HTTP routes with isolated PostgreSQL fixtures', async t => {
  const { engine, executor, wrap } = await createTestDatabase('memory://staywise_test');
  const jwt = await createJwtFixture();
  const authNames = ['NEON_AUTH_ISSUER', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_JWKS_URL', 'NEON_AUTH_AUDIENCE'] as const;
  const authBefore = authNames.map(name => process.env[name]);
  process.env.NEON_AUTH_ISSUER = jwt.issuer; process.env.NEON_AUTH_BASE_URL = jwt.issuer;
  process.env.NEON_AUTH_JWKS_URL = jwt.issuer + '/jwks'; process.env.NEON_AUTH_AUDIENCE = 'staywise-test';
  const original = { query: db.query, queryOne: db.queryOne, execute: db.execute, transaction: db.transaction };
  const key = process.env.STAYWISE_DATA_KEY;
  process.env.STAYWISE_DATA_KEY = 'b'.repeat(64);
  Object.assign(db, executor, { transaction: (fn: any) => engine.transaction(tx => fn(wrap(tx))) });
  const app = express(); app.use(express.json());
  app.use('/guest', guestRouter);
  app.use('/guidebooks', guidebooksRouter);
  app.use('/properties', propertiesRouter);
  // Same shared verification boundary as the application's media resolver.
  app.use(createMediaRouter(db, async req => {
    const result = await verifyGuestRequest(req, { id: 'p', organization_id: 'o', timezone: 'UTC' }, req.headers['x-stay-code']);
    if (!result.valid) throw new AuthorizationError(403, 'MEDIA_AUTH_REQUIRED');
    return { guest: { organizationId: 'o', propertyId: 'p', reservationId: result.reservation.id } };
  }, (_req, _res, next) => next()));
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err.retryAfterSec) res.setHeader('Retry-After', String(err.retryAfterSec));
    res.status(err.status || 500).json({ code: err.code || 'ERROR' });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(r => server.once('listening', r));
  const port = (server.address() as any).port;
  const request = (path: string, body?: any) => fetch(`http://127.0.0.1:${port}${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  try {
    for (const statement of SCHEMA_STATEMENTS) await engine.exec(statement);
    await executor.execute("INSERT INTO organizations(id,name,slug,contact_email,contact_phone,created_at) VALUES('o','Org','org','host@example.test','','2026-01-01')");
    await executor.execute("INSERT INTO properties(id,organization_id,slug,name,address_line,city,state,postal_code,cover_image,description,internal_notes,timezone,created_at) VALUES('p','o','property','Fixture',$1,'City','TX','00000','private-photo-url','private-description','INTERNAL_NOTE_MARKER','UTC','2026-01-01')", [address]);
    await executor.execute("INSERT INTO reservations(id,organization_id,property_id,guest_name,guest_email,guest_phone,check_in_date,check_out_date,access_code,created_at) VALUES('r','o','p','Fixture Guest','guest@example.test','','2000-01-01','2100-01-01','VALID-FIXTURE','2026-01-01')");
    await executor.execute("INSERT INTO reservations(id,organization_id,property_id,guest_name,guest_email,guest_phone,check_in_date,check_out_date,access_code,created_at) VALUES('expired','o','p','Expired','guest@example.test','','2000-01-01','2000-01-02','EXPIRED-FIXTURE','2000-01-01')");
    for (const [section, visible, content] of [
      ['checkin', 1, { fullAddress: address, directions: address, mapLink: address, smartLockCode: encryptField(secret), lockboxInstructions: encryptField('PRIVATE_LOCKBOX'), accessRestricted: false }],
      ['wifi_home', 1, { wifiPassword: encryptField('PRIVATE_WIFI'), wifiNetwork: 'Fixture', restrictWifiUntilVerified: false }],
      ['getting_around', 0, { taxiRideshare: hidden, airportDirections: hidden }],
      ['welcome', 1, { welcomeMessage: 'Reviewed welcome', importantNotes: address }],
    ] as const) await executor.execute('INSERT INTO guidebook_sections(id,organization_id,property_id,section_key,title,is_visible,sort_order,content_json,updated_at) VALUES($1,\'o\',\'p\',$1,$1,$2,0,$3,\'2026-01-01\')', [section, visible, JSON.stringify(content)]);

    await executor.execute("INSERT INTO users(id,neon_auth_id,name,email,avatar_initials,created_at) VALUES('owner','auth-a','Owner','a@example.test','OW','2026-01-01')");
    await executor.execute("INSERT INTO organization_memberships(id,organization_id,user_id,role,created_at) VALUES('mem','o','owner','Organization Owner','2026-01-01')");
    const ownerToken = await jwt.sign();
    const ownerRequest = (path: string, body: any, method = 'PATCH') => fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await t.test('missing, invalid and expired codes never receive any free-text section or secret', async () => {
      for (const suffix of ['', '?code=INVALID', '?code=EXPIRED-FIXTURE']) {
        const res = await request('/guest/property' + suffix);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');
        const data = await res.json();
        assert.equal(data.isVerified, false);
        assert.deepEqual(data.sections, []);
        assert.doesNotMatch(JSON.stringify(data), /PRIVATE_|INTERNAL_NOTE_MARKER|HIDDEN_SECTION_MARKER|private-photo-url|private-description/);
      }
    });
    await t.test('verified guest sees visible fields but never hidden sections, staff notes or echoed access code', async () => {
      const res = await request('/guest/property?code=VALID-FIXTURE');
      const data = await res.json();
      assert.equal(data.isVerified, true);
      assert.ok(JSON.stringify(data).includes(secret));
      assert.ok(JSON.stringify(data).includes(address));
      assert.doesNotMatch(JSON.stringify(data), /HIDDEN_SECTION_MARKER|INTERNAL_NOTE_MARKER|VALID-FIXTURE/);
    });
    await t.test('verification never echoes or writes the booking code to audit details', async () => {
      const response = await request('/guest/property/verify', { code: 'VALID-FIXTURE' });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
      const logs = await executor.query<any>("SELECT details FROM audit_logs WHERE action='GUEST_ACCESS_VERIFIED'");
      assert.equal(logs.length, 1);
      assert.doesNotMatch(JSON.stringify(logs), /VALID-FIXTURE/);
    });
    await t.test('search without verification returns no guide content; verified search cannot read hidden sections', async () => {
      for (const code of [undefined, 'INVALID', 'VALID-FIXTURE']) {
        const res = await request('/guest/property/ai', { question: 'taxi', code });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');
        const data = await res.json();
        assert.doesNotMatch(JSON.stringify(data), /HIDDEN_SECTION_MARKER|PRIVATE_|INTERNAL_NOTE_MARKER/);
        if (!code || code === 'INVALID') assert.deepEqual(data.sources, []);
      }
    });
    await t.test('eight failed codes across routes lock both guide and media verification, including a correct code', async () => {
      await executor.execute('DELETE FROM guest_verify_attempts');
      for (let i = 0; i < 8; i++) {
        const res = i % 2 ? await request('/guest/property/ai', { question: 'taxi', code: 'INVALID' }) : await request('/guest/property?code=INVALID');
        assert.equal(res.status, 200);
      }
      for (const [path, body] of [['/guest/property?code=VALID-FIXTURE', undefined], ['/guest/property/verify', { code: 'VALID-FIXTURE' }], ['/guest/property/ai', { question: 'taxi', code: 'VALID-FIXTURE' }]] as const) {
        const res = await request(path, body);
        assert.equal(res.status, 429);
        assert.ok(Number(res.headers.get('retry-after')) > 0);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');
      }
      const media = await fetch(`http://127.0.0.1:${port}/media/media-00000000-0000-0000-0000-000000000000`, { headers: { 'x-stay-code': 'VALID-FIXTURE' } });
      assert.equal(media.status, 429);
      assert.ok(Number(media.headers.get('retry-after')) > 0);
      assert.equal(media.headers.get('cache-control'), 'private, no-store');
    });
    await t.test('new property creation preserves submitted capacity and creates only unconfigured hidden drafts', async () => {
      const response = await ownerRequest('/properties', { name: 'Real creation fixture', address_line: address, city: 'City', state: 'TX', postal_code: '00000', bedrooms: 1, bathrooms: 1, max_occupancy: 2 }, 'POST');
      assert.equal(response.status, 201);
      const property = await response.json();
      assert.equal(property.bedrooms, 1); assert.equal(property.bathrooms, 1); assert.equal(property.max_occupancy, 2);
      assert.equal(property.cover_image, ''); assert.deepEqual(property.amenities, []);
      const rows = await executor.query<any>('SELECT * FROM guidebook_sections WHERE property_id=$1', [property.id]);
      assert.equal(rows.length, 8); assert.ok(rows.every(row => row.is_visible === 0));
      const wifi = JSON.parse(rows.find(row => row.section_key === 'wifi_home').content_json);
      assert.equal(wifi.wifiPassword, ''); assert.equal(wifi.wifiNetwork, '');
      const checkin = JSON.parse(rows.find(row => row.section_key === 'checkin').content_json);
      assert.equal(checkin.smartLockCode, '');
      const path = `/guidebooks/${property.id}/sections/welcome`;
      const denied = await ownerRequest(path, { is_visible: true });
      assert.equal(denied.status, 422);
      assert.equal((await denied.json()).code, 'PUBLICATION_CONFIRMATION_REQUIRED');
      const allowed = await ownerRequest(path, { is_visible: true, publication_confirmed: true });
      assert.equal(allowed.status, 200);
      assert.equal((await allowed.json()).is_visible, true);
    });
    await t.test('missing-property errors are also no-store', async () => {
      const res = await request('/guest/missing'); assert.equal(res.status, 404);
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
    });
  } finally {
    Object.assign(db, original);
    authNames.forEach((name, index) => { if (authBefore[index] === undefined) delete process.env[name]; else process.env[name] = authBefore[index]; });
    await jwt.close();
    if (key === undefined) delete process.env.STAYWISE_DATA_KEY; else process.env.STAYWISE_DATA_KEY = key;
    await new Promise<void>((r, j) => server.close(e => e ? j(e) : r()));
    await engine.close();
  }
});

test('new property guide sections are hidden drafts with no invented safety or equipment facts', () => {
  const drafts = buildDefaultSections({ orgId: 'o', propertyId: 'p', propertyName: 'Test', address, city: 'City', country: 'US', hostName: 'Host', hostPhone: '', hostEmail: 'host@example.test', wifiNetwork: '', wifiPassword: '', smartLockCode: '' });
  assert.equal(drafts.length, 8);
  assert.ok(drafts.every(section => section.is_visible === 0));
  const contents = Object.fromEntries(drafts.map(row => [row.section_key, JSON.parse(row.content_json)]));
  assert.equal(contents.emergency.nearestHospital, '');
  assert.equal(contents.emergency.fireProcedure, '');
  assert.equal(contents.emergency.safetyNotes, '');
  assert.equal(contents.checkin.smartLockCode, '');
  assert.equal(contents.wifi_home.wifiPassword, '');
  assert.deepEqual(contents.local_picks.items, []);
  assert.doesNotMatch(JSON.stringify(contents), /inspected before|Schlage|Regional Medical Center|Staywise2026|OLED|tested prior/);
});

test('hidden or unverified sections are excluded before parsing or decrypting their content', async () => {
  const { projectGuestSections } = await import('../server/lib/guest-content.js');
  const malformed = [{ section_key: 'checkin', is_visible: 0, content_json: 'not-json' }];
  assert.deepEqual(projectGuestSections(malformed, true), []);
  assert.deepEqual(projectGuestSections([{ ...malformed[0], is_visible: 1 }], false), []);
});
