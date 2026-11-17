import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import express from 'express';
import sharp from 'sharp';
import { SCHEMA_STATEMENTS } from '../server/db.js';
import { createMediaRouter } from '../server/routes/media.js';
import { AuthorizationError } from '../server/lib/authorization.js';
import { normalizeEvidence, readPrivateEvidence, storePrivateEvidence, validateEvidenceReferences } from '../server/lib/private-media.js';
import { createTestDatabase } from './helpers/harness.js';

const actor: any = { organizationId:'org-a',userId:'owner',actorRole:'Organization Owner',assignedPropertyIds:['*'],orgAccountStatus:'Active' };

test('image validation fully decodes files, rejects mismatched types/truncation and strips original metadata',async()=>{
  const png = await sharp({create:{width:2,height:2,channels:3,background:'red'}}).png().toBuffer();
  const result = await normalizeEvidence(`data:image/png;base64,${png.toString('base64')}`);
  assert.equal((await sharp(result).metadata()).format,'jpeg');
  for (const bad of [`data:image/jpeg;base64,${png.toString('base64')}`,`data:image/png;base64,${Buffer.from('not an image').toString('base64')}`,`data:image/png;base64,${png.subarray(0,12).toString('base64')}`,'https://arbitrary.test/file']) await assert.rejects(normalizeEvidence(bad));
});

test('T06/T13/T28: private media HTTP reads require authorized identity even with known ID; references reject arbitrary URLs and foreign tenants', async()=>{
  const {engine,executor} = await createTestDatabase('memory://staywise_test');
  const app = express(); app.use(express.json());
  // Principal is injected, not read from any user-controlled object/organization field.
  app.use('/api',createMediaRouter(executor,async req=>{
    if (req.headers.authorization==='Bearer tenant-a') return {actor};
    if (req.headers.authorization==='Bearer tenant-b') return {actor:{...actor,organizationId:'org-b'}};
    if (req.headers.authorization==='Bearer unassigned') return {actor:{...actor,actorRole:'Inspector',assignedPropertyIds:[]}};
    throw new AuthorizationError(403,'MEDIA_AUTH_REQUIRED');
  },(_req,_res,next)=>next()));
  app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status||500).json({code:err.code}));
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error();const base=`http://127.0.0.1:${address.port}`;
  try {
    for(const sql of SCHEMA_STATEMENTS)await engine.exec(sql);
    await engine.exec(await fs.readFile(new URL('../db/migrations/004_private_media.sql',import.meta.url),'utf8'));
    await engine.exec("INSERT INTO organizations (id,name,slug,contact_email,contact_phone,created_at) VALUES ('org-a','A','a','a@test.test','','2026-01-01'),('org-b','B','b','b@test.test','','2026-01-01')");
    await engine.exec("INSERT INTO users (id,name,email,avatar_initials,created_at) VALUES ('owner','Owner','owner@test.test','OW','2026-01-01')");
    await engine.exec("INSERT INTO properties (id,organization_id,slug,name,address_line,city,state,postal_code,cover_image,description,created_at) VALUES ('prop-a','org-a','a','A','','','','','','','2026-01-01')");
    const png = await sharp({create:{width:2,height:2,channels:3,background:'blue'}}).png().toBuffer();
    const dataUrl=`data:image/png;base64,${png.toString('base64')}`;
    const upload=await fetch(base+'/api/uploads',{method:'POST',headers:{Authorization:'Bearer tenant-a','Content-Type':'application/json'},body:JSON.stringify({property_id:'prop-a',category:'cleaning',dataUrl})});
    assert.equal(upload.status,201);assert.equal(upload.headers.get('cache-control'),'private, no-store');
    const {media_id}=await upload.json() as any;
    for(const [authorization,status] of [['',403],['Bearer tenant-b',404],['Bearer unassigned',403]] as const) {
      const response=await fetch(base+'/api/media/'+media_id,{headers:authorization?{Authorization:authorization}:{}});
      assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.equal(response.headers.get('content-type')?.includes('image'),false);
    }
    const allowed=await fetch(base+'/api/media/'+media_id,{headers:{Authorization:'Bearer tenant-a'}});
    assert.equal(allowed.status,200);assert.equal(allowed.headers.get('content-type'),'image/jpeg');
    const bytes=Buffer.from(await allowed.arrayBuffer());const stored=await executor.queryOne<any>('SELECT * FROM media_assets WHERE id=$1',[media_id]);
    assert.equal(stored.visibility,'private');assert.equal(stored.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
    await validateEvidenceReferences(executor,'org-a','prop-a',[media_id],'cleaning');
    await assert.rejects(validateEvidenceReferences(executor,'org-b','prop-a',[media_id]));
    await assert.rejects(validateEvidenceReferences(executor,'org-a','prop-a',['https://public.test/proof']));
    await assert.rejects(validateEvidenceReferences(executor,'org-a','prop-a',[media_id],'incident'));
    await assert.rejects(storePrivateEvidence(executor,{actor:{...actor,organizationId:'org-b'}},{propertyId:'prop-a',category:'cleaning',dataUrl}));
    await assert.rejects(readPrivateEvidence(executor,{actor:{...actor,orgAccountStatus:'Suspended'}},media_id));
    const old=await fetch(base+'/api/uploads/old-id');assert.equal(old.status,410);assert.equal(old.headers.get('cache-control'),'private, no-store');
    assert.equal((await executor.query('SELECT * FROM uploaded_assets')).length,0); // New path never writes historical/public store.
  } finally {
    await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();});await engine.close();
  }
});
