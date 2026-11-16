import crypto from 'node:crypto';
import sharp from 'sharp';
import type { DbExecutor } from '../db.js';
import type { ActorContext } from '../domain.js';
import { AuthorizationError, authorizeProperty } from './authorization.js';

export type MediaPrincipal = { actor: ActorContext } | { guest: { organizationId: string; propertyId: string; reservationId: string } };
export const isMediaId = (id: unknown): id is string => typeof id === 'string' && /^media-[0-9a-f-]{36}$/.test(id);
const categories = ['cleaning','incident','inspection','guest-issue'];

export async function normalizeEvidence(dataUrl: unknown): Promise<Buffer> {
  if (typeof dataUrl !== 'string' || dataUrl.length > 7_000_000) throw new AuthorizationError(422,'INVALID_IMAGE');
  const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new AuthorizationError(422,'INVALID_IMAGE');
  const data = Buffer.from(match[2],'base64');
  if (!data.length || data.length > 5*1024*1024 || data.toString('base64') !== match[2]) throw new AuthorizationError(422,'INVALID_IMAGE');
  try {
    const image = sharp(data,{limitInputPixels:20_000_000,failOn:'warning'});
    const metadata = await image.metadata();
    if ((metadata.pages || 1) !== 1 || metadata.format !== (match[1] === 'jpg' ? 'jpeg' : match[1])) throw new Error();
    // Full decode and re-encode, strips metadata. Never serve attacker supplied original bytes.
    const result = await image.rotate().jpeg({quality:85}).toBuffer();
    if (result.length > 5*1024*1024) throw new Error();
    return result;
  } catch { throw new AuthorizationError(422,'INVALID_IMAGE'); }
}

async function scope(executor: DbExecutor, principal: MediaPrincipal, propertyId: string) {
  if ('actor' in principal) {
    const actor = principal.actor;
    if (actor.orgAccountStatus !== 'Active' || (actor.actorRole === 'Platform Super Admin' && !actor.isPlatformAdmin)) throw new AuthorizationError(403,'MEDIA_ACCESS_DENIED');
    await authorizeProperty(executor,actor,propertyId);
    return { organizationId:actor.organizationId,userId:actor.userId,reservationId:null };
  }
  const guest = principal.guest;
  const reservation = await executor.queryOne<any>(`SELECT r.id FROM reservations r JOIN properties p ON p.id=r.property_id AND p.organization_id=r.organization_id
    JOIN organizations o ON o.id=r.organization_id WHERE r.id=$1 AND r.organization_id=$2 AND r.property_id=$3 AND r.status != 'Cancelled' AND p.archived=0 AND o.account_status='Active'`,[guest.reservationId,guest.organizationId,guest.propertyId]);
  if (propertyId !== guest.propertyId || !reservation) throw new AuthorizationError(403,'MEDIA_ACCESS_DENIED');
  // Caller must obtain guest principal via server-side stay verification, never request body claims.
  return {organizationId:guest.organizationId,userId:null,reservationId:guest.reservationId};
}

export async function storePrivateEvidence(executor: DbExecutor, principal: MediaPrincipal, body: {propertyId:string; category:string; dataUrl:unknown}, now = new Date()) {
  const owner = await scope(executor,principal,body.propertyId);
  if (!categories.includes(body.category) || ('guest' in principal && body.category !== 'guest-issue')) throw new AuthorizationError(422,'INVALID_MEDIA_CATEGORY');
  const data = await normalizeEvidence(body.dataUrl), id = `media-${crypto.randomUUID()}`;
  await executor.execute(`INSERT INTO media_assets (id,organization_id,property_id,category,uploaded_by_user_id,owner_reservation_id,mime_type,size_bytes,sha256,received_at,data)
    VALUES ($1,$2,$3,$4,$5,$6,'image/jpeg',$7,$8,$9,$10)`,[id,owner.organizationId,body.propertyId,body.category,owner.userId,owner.reservationId,data.length,crypto.createHash('sha256').update(data).digest('hex'),now.toISOString(),data]);
  return {media_id:id,visibility:'private'};
}

export async function readPrivateEvidence(executor: DbExecutor, principal: MediaPrincipal, id: unknown) {
  if (!isMediaId(id)) throw new AuthorizationError(404,'MEDIA_NOT_FOUND');
  const organizationId = 'actor' in principal ? principal.actor.organizationId : principal.guest.organizationId;
  const media = await executor.queryOne<any>("SELECT * FROM media_assets WHERE id=$1 AND organization_id=$2 AND status='available'",[id,organizationId]);
  if (!media) throw new AuthorizationError(404,'MEDIA_NOT_FOUND');
  await scope(executor,principal,media.property_id);
  if ('guest' in principal && media.owner_reservation_id !== principal.guest.reservationId) throw new AuthorizationError(403,'MEDIA_ACCESS_DENIED');
  return media;
}

export async function validateEvidenceReferences(executor: DbExecutor, organizationId:string, propertyId:string, references:unknown, category?:string, reservationId?:string) {
  if (!Array.isArray(references) || references.length>50 || new Set(references).size!==references.length) throw new AuthorizationError(422,'INVALID_EVIDENCE_REFERENCES');
  for (const id of references) {
    if (!isMediaId(id)) throw new AuthorizationError(422,'REGISTERED_PRIVATE_EVIDENCE_REQUIRED');
    const media = await executor.queryOne<any>("SELECT category,owner_reservation_id FROM media_assets WHERE id=$1 AND organization_id=$2 AND property_id=$3 AND visibility='private' AND status='available'",[id,organizationId,propertyId]);
    if (!media || (category && media.category !== category) || (reservationId && media.owner_reservation_id !== reservationId)) throw new AuthorizationError(422,'INVALID_EVIDENCE_REFERENCE');
  }
  return references as string[];
}
