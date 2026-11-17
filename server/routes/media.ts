import { Router, type Request, type RequestHandler } from 'express';
import type { DbExecutor } from '../db.js';
import { ah } from '../domain.js';
import { AuthorizationError } from '../lib/authorization.js';
import { readPrivateEvidence, storePrivateEvidence, type MediaPrincipal } from '../lib/private-media.js';

export function createMediaRouter(database: DbExecutor, resolvePrincipal: (req: Request) => Promise<MediaPrincipal>, limiter: RequestHandler) {
  const router = Router();
  router.use((_req,res,next) => { res.setHeader('Cache-Control','private, no-store'); next(); });
  // Historical media must be inventoried and explicitly classified; never auto-published.
  router.get('/uploads/:id', (_req,res) => res.status(410).json({error:'Legacy media requires classification before access.'}));
  router.post('/uploads', limiter, ah(async(req,res) => {
    const principal = await resolvePrincipal(req);
    const propertyId = 'guest' in principal ? principal.guest.propertyId : req.body?.property_id;
    if (typeof propertyId !== 'string') throw new AuthorizationError(422,'MEDIA_PROPERTY_REQUIRED');
    const category = 'guest' in principal ? 'guest-issue' : req.body?.category;
    const result = await storePrivateEvidence(database,principal,{propertyId,category,dataUrl:req.body?.dataUrl});
    res.status(201).json(result);
  }));
  router.get('/media/:id', limiter, ah(async(req,res) => {
    const principal = await resolvePrincipal(req);
    const media = await readPrivateEvidence(database,principal,req.params.id);
    res.setHeader('Content-Type','image/jpeg');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.send(Buffer.from(media.data));
  }));
  return router;
}
