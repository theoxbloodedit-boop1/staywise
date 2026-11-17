import crypto from 'node:crypto';
import type { DbExecutor } from '../db.js';
import type { ActorContext } from '../domain.js';
import type { VerifiedNeonUser } from '../security.js';
import { logAudit } from '../domain.js';
import { AuthorizationError, validateAssignments, ORGANIZATION_WIDE_ROLES } from './authorization.js';

export interface TransactionDatabase extends DbExecutor { transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> }
const roles = ['Organization Admin','Property Manager','Concierge','Cleaning Staff','Maintenance Technician','Inspector'];
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireInviter(actor: ActorContext) {
  if (!['Organization Owner','Organization Admin','Platform Super Admin'].includes(actor.actorRole) || actor.orgAccountStatus !== 'Active' || (actor.actorRole === 'Platform Super Admin' && !actor.isPlatformAdmin)) throw new AuthorizationError(403, 'INVITATION_FORBIDDEN');
}

export async function issueInvitation(database: TransactionDatabase, actor: ActorContext, body: any, now = new Date()) {
  requireInviter(actor);
  if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim()) || body.email.length > 254 || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200 || !roles.includes(body.role)) throw new AuthorizationError(422, 'INVALID_INVITATION');
  const email = body.email.trim().toLowerCase(), token = crypto.randomBytes(32).toString('base64url');
  const invitationId = id('inv');
  const expires = new Date(now.getTime() + 48 * 3600_000);
  await database.transaction(async tx => {
    const assignments = await validateAssignments(tx, actor.organizationId, body.role, body.assigned_property_ids ?? (ORGANIZATION_WIDE_ROLES.includes(body.role) ? ['*'] : []));
    // Serialize invitations for the same organization/email; no raw token in SQL or audit.
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`invite:${actor.organizationId}:${email}`]);
    await tx.execute("UPDATE organization_invitations SET status='expired' WHERE organization_id=$1 AND LOWER(email)=$2 AND status='pending' AND expires_at <= $3", [actor.organizationId,email,now.toISOString()]);
    const pending = await tx.queryOne("SELECT id FROM organization_invitations WHERE organization_id=$1 AND LOWER(email)=$2 AND status='pending'",[actor.organizationId,email]);
    if (pending) throw new AuthorizationError(422,'INVITATION_ALREADY_PENDING');
    await tx.execute(`INSERT INTO organization_invitations (id,organization_id,email,name,role,assigned_property_ids_json,token_hash,invited_by,created_at,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [invitationId,actor.organizationId,email,body.name.trim(),body.role,JSON.stringify(assignments),hash(token),actor.userId,now.toISOString(),expires.toISOString()]);
    await logAudit({organizationId:actor.organizationId,actorName:actor.actorName,actorRole:actor.actorRole,action:'INVITATION_CREATED',entityType:'Invitation',entityId:invitationId,details:'Pending invitation created; no transport delivery claimed.'},tx);
  });
  // Only returned once, to the authenticated inviter. Never embedded in a URL or logged.
  return { ok:true, invitation_id:invitationId, invitation_token:token, expires_at:expires.toISOString(), delivery_status:'not_sent' };
}

export async function acceptInvitation(database: TransactionDatabase, identity: VerifiedNeonUser, token: unknown, now = new Date()) {
  if (!identity.emailVerified || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AuthorizationError(403,'INVITATION_INVALID');
  return database.transaction(async tx => {
    const invitation = await tx.queryOne<any>("SELECT * FROM organization_invitations WHERE token_hash=$1 FOR UPDATE", [hash(token)]);
    if (!invitation || invitation.status !== 'pending' || new Date(invitation.expires_at).getTime() <= now.getTime() || invitation.email.toLowerCase() !== identity.email.trim().toLowerCase()) throw new AuthorizationError(403,'INVITATION_INVALID');
    const org = await tx.queryOne<any>('SELECT account_status FROM organizations WHERE id=$1 FOR UPDATE', [invitation.organization_id]);
    if (!org || org.account_status !== 'Active') throw new AuthorizationError(403,'INVITATION_INVALID');
    await validateAssignments(tx,invitation.organization_id,invitation.role,invitation.assigned_property_ids_json);
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`identity:${identity.email.toLowerCase()}`]);
    let user = await tx.queryOne<any>('SELECT * FROM users WHERE neon_auth_id=$1 FOR UPDATE',[identity.sub]);
    if (!user) {
      user = await tx.queryOne<any>('SELECT * FROM users WHERE LOWER(email)=LOWER($1) FOR UPDATE',[identity.email]);
      if (user?.neon_auth_id && user.neon_auth_id !== identity.sub) throw new AuthorizationError(403,'IDENTITY_ALREADY_LINKED');
      if (user) await tx.execute('UPDATE users SET neon_auth_id=$1 WHERE id=$2 AND neon_auth_id IS NULL',[identity.sub,user.id]);
      else {
        user = { id:id('usr') };
        await tx.execute("INSERT INTO users (id,neon_auth_id,name,email,avatar_initials,created_at) VALUES ($1,$2,$3,$4,$5,$6)",[user.id,identity.sub,invitation.name,invitation.email,invitation.name.slice(0,2).toUpperCase(),now.toISOString()]);
      }
    }
    const member = await tx.queryOne('SELECT id FROM organization_memberships WHERE organization_id=$1 AND user_id=$2',[invitation.organization_id,user.id]);
    if (member) throw new AuthorizationError(422,'MEMBERSHIP_ALREADY_EXISTS'); // Never overwrite historical memberships.
    const membershipId = id('mem');
    await tx.execute("INSERT INTO organization_memberships (id,organization_id,user_id,role,assigned_property_ids_json,status,created_at) VALUES ($1,$2,$3,$4,$5,'Active',$6)",[membershipId,invitation.organization_id,user.id,invitation.role,invitation.assigned_property_ids_json,now.toISOString()]);
    await tx.execute("UPDATE organization_invitations SET status='accepted',accepted_by=$1,accepted_at=$2 WHERE id=$3",[user.id,now.toISOString(),invitation.id]);
    await logAudit({organizationId:invitation.organization_id,actorName:invitation.name,actorRole:invitation.role,action:'INVITATION_ACCEPTED',entityType:'Invitation',entityId:invitation.id,details:`Membership ${membershipId} activated by verified identity.`},tx);
    return { ok:true, organization_id:invitation.organization_id };
  });
}

export async function revokeInvitation(database: TransactionDatabase, actor: ActorContext, invitationId: string, now = new Date()) {
  requireInviter(actor);
  await database.transaction(async tx => {
    const changed = await tx.execute("UPDATE organization_invitations SET status='revoked',revoked_at=$1 WHERE id=$2 AND organization_id=$3 AND status='pending'",[now.toISOString(),invitationId,actor.organizationId]);
    if (!changed) throw new AuthorizationError(404,'INVITATION_NOT_FOUND');
    await logAudit({organizationId:actor.organizationId,actorName:actor.actorName,actorRole:actor.actorRole,action:'INVITATION_REVOKED',entityType:'Invitation',entityId:invitationId,details:'Pending invitation revoked.'},tx);
  });
}
