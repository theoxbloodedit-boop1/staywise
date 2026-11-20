import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { SCHEMA_STATEMENTS } from '../server/db.js';
import { issueInvitation, acceptInvitation, revokeInvitation } from '../server/lib/invitations.js';
import { createTestDatabase } from './helpers/harness.js';
import { createJwtFixture } from './helpers/jwt.js';
import { verifyNeonAuthJwt } from '../server/security.js';

const actor: any = { organizationId:'org-a', userId:'owner', actorRole:'Organization Owner', actorName:'Owner', orgAccountStatus:'Active',assignedPropertyIds:['*'] };
const identity = { sub:'new-auth', email:'invite@example.test', name:'Worker', emailVerified:true };

test('T08: real signature verification requires issuer, audience, expiry and strict verified-email boolean', async () => {
  const fixture = await createJwtFixture();
  const names = ['NEON_AUTH_BASE_URL','NEON_AUTH_JWKS_URL','NEON_AUTH_AUDIENCE'];
  const saved = names.map(n => process.env[n]);
  try {
    process.env.NEON_AUTH_BASE_URL=fixture.issuer; process.env.NEON_AUTH_JWKS_URL=`${fixture.issuer}/jwks`; process.env.NEON_AUTH_AUDIENCE='staywise-test';
    assert.equal((await verifyNeonAuthJwt(await fixture.sign()))?.emailVerified,true);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:'false'})))?.emailVerified,false);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:undefined,emailVerified:true})))?.emailVerified,true);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:undefined,emailVerified:false})))?.emailVerified,false);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:undefined,emailVerified:'true'})))?.emailVerified,false);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:false,emailVerified:true})))?.emailVerified,false);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:true,emailVerified:false})))?.emailVerified,false);
    assert.equal((await verifyNeonAuthJwt(await fixture.sign({email_verified:undefined,emailVerified:undefined})))?.emailVerified,false);
    assert.equal(await verifyNeonAuthJwt(await fixture.sign({ aud:'wrong' })),null);
    assert.equal(await verifyNeonAuthJwt(await fixture.sign({ exp: 1 })),null);
    process.env.NEON_AUTH_BASE_URL=fixture.issuer+'/wrong';
    assert.equal(await verifyNeonAuthJwt(await fixture.sign()),null);
    process.env.NEON_AUTH_BASE_URL=fixture.issuer;
    delete process.env.NEON_AUTH_AUDIENCE; assert.equal(await verifyNeonAuthJwt(await fixture.sign()),null);
  } finally {
    names.forEach((n,i)=>saved[i]===undefined ? delete process.env[n] : process.env[n]=saved[i]);
    await fixture.close();
  }
});

test('T08/T09: pending hashed invitations require verified identity, expire, revoke and consume once transactionally', async () => {
  const { engine, executor, wrap } = await createTestDatabase('memory://staywise_test');
  const database = { ...executor, transaction: <T>(fn: any): Promise<T> => engine.transaction(tx=>fn(wrap(tx as any))) };
  try {
    for (const sql of SCHEMA_STATEMENTS) await engine.exec(sql);
    await engine.exec(await fs.readFile(new URL('../db/migrations/003_security_invitations.sql',import.meta.url),'utf8'));
    await engine.exec("INSERT INTO organizations (id,name,slug,contact_email,contact_phone,created_at) VALUES ('org-a','A','a','a@test.test','','2026-01-01')");
    await engine.exec("INSERT INTO users (id,name,email,avatar_initials,created_at) VALUES ('owner','Owner','owner@test.test','OW','2026-01-01')");
    const body = { email:identity.email, name:'Worker', role:'Cleaning Staff',assigned_property_ids:[] };
    const now = new Date('2026-11-16T12:00:00Z');
    const invite = await issueInvitation(database,actor,body,now);
    assert.equal(invite.delivery_status,'not_sent');
    assert.equal((await engine.query('SELECT * FROM organization_memberships')).rows.length,0);
    const stored = await executor.queryOne<any>('SELECT * FROM organization_invitations');
    assert.notEqual(stored.token_hash,invite.invitation_token); assert.equal(stored.token_hash.length,64);
    await assert.rejects(acceptInvitation(database,{...identity,emailVerified:false},invite.invitation_token,now));
    await assert.rejects(acceptInvitation(database,{...identity,email:'wrong@test.test'},invite.invitation_token,now));
    const result = await acceptInvitation(database,identity,invite.invitation_token,now);
    assert.equal(result.organization_id,'org-a');
    await assert.rejects(acceptInvitation(database,identity,invite.invitation_token,now));
    assert.equal((await engine.query('SELECT * FROM organization_memberships')).rows.length,1);
    const second = await issueInvitation(database,actor,{...body,email:'other@test.test'},now);
    await revokeInvitation(database,actor,second.invitation_id,now);
    await assert.rejects(acceptInvitation(database,{...identity,email:'other@test.test'},second.invitation_token,now));
    const third = await issueInvitation(database,actor,{...body,email:'expired@test.test'},now);
    await assert.rejects(acceptInvitation(database,{...identity,email:'expired@test.test'},third.invitation_token,new Date('2026-11-19')));
    const audits = await executor.query<any>('SELECT * FROM audit_logs');
    assert.equal(JSON.stringify(audits).includes(invite.invitation_token),false);
    assert.equal(audits.filter(a=>a.action==='INVITATION_ACCEPTED').length,1);
    // Audit failure must roll back the issued invitation, not leave an unaudited pending row.
    const failing = { ...database, transaction: <T>(fn: any): Promise<T> => engine.transaction(tx=>fn({...wrap(tx as any),execute:async(sql:string,params:any[])=>{ if(sql.includes('INSERT INTO audit_logs')) throw new Error('injected audit failure'); return wrap(tx as any).execute(sql,params); }})) };
    await assert.rejects(issueInvitation(failing,actor,{...body,email:'rollback@test.test'},now));
    assert.equal((await executor.query('SELECT * FROM organization_invitations WHERE email=$1',['rollback@test.test'])).length,0);
  } finally { await engine.close(); }
});
