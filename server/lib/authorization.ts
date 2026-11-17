import type { DbExecutor } from '../db.js';

export const OPERATIONAL_ROLES = [
  'Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager',
  'Concierge', 'Cleaning Staff', 'Maintenance Technician', 'Inspector',
] as const;
export const ORGANIZATION_WIDE_ROLES = ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'];

export class AuthorizationError extends Error {
  constructor(readonly status: 403 | 404 | 422, readonly code: string) {
    super(status === 404 ? 'Resource not found.' : status === 422 ? 'Invalid resource reference.' : 'Action not permitted.');
    this.name = 'AuthorizationError';
  }
}
export interface ScopedActor {
  organizationId: string;
  actorRole: string;
  assignedPropertyIds: string[];
}

export function parseAssignments(raw: unknown): string[] | null {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(value) || !value.every(id => typeof id === 'string' && id.trim() === id && id.length > 0 && id.length <= 128)) return null;
    if (new Set(value).size !== value.length || (value.includes('*') && value.length !== 1)) return null;
    return value;
  } catch { return null; }
}
export function isKnownOperationalRole(role: string): boolean {
  return (OPERATIONAL_ROLES as readonly string[]).includes(role);
}

// Scope check only: callers MUST first establish organization ownership (authorizeProperty).
export function hasPropertyScope(actor: ScopedActor, propertyId: string): boolean {
  if (!isKnownOperationalRole(actor.actorRole) || !propertyId) return false;
  const assignments = parseAssignments(actor.assignedPropertyIds);
  if (!assignments) return false;
  if (assignments.includes('*')) return ORGANIZATION_WIDE_ROLES.includes(actor.actorRole);
  if (['Organization Owner', 'Organization Admin', 'Platform Super Admin'].includes(actor.actorRole)) return true;
  // Explicit list, including [], restricts managers. Field roles never receive wildcard access.
  return assignments.includes(propertyId);
}

export async function authorizeProperty(executor: DbExecutor, actor: ScopedActor, propertyId: unknown) {
  if (typeof propertyId !== 'string' || !isKnownOperationalRole(actor.actorRole)) throw new AuthorizationError(403, 'PROPERTY_ACCESS_DENIED');
  const property = await executor.queryOne<{ id: string; organization_id: string }>(
    'SELECT id, organization_id FROM properties WHERE id = $1 AND organization_id = $2',
    [propertyId, actor.organizationId]
  );
  if (!property) throw new AuthorizationError(404, 'RESOURCE_NOT_FOUND');
  if (!hasPropertyScope(actor, property.id)) throw new AuthorizationError(403, 'PROPERTY_ACCESS_DENIED');
  return property;
}

export async function validateAssignments(executor: DbExecutor, organizationId: string, role: string, raw: unknown): Promise<string[]> {
  const assignments = parseAssignments(raw);
  if (!isKnownOperationalRole(role) || !assignments || (assignments.includes('*') && !ORGANIZATION_WIDE_ROLES.includes(role))) {
    throw new AuthorizationError(422, 'INVALID_PROPERTY_ASSIGNMENTS');
  }
  for (const id of assignments) {
    if (id !== '*' && !await executor.queryOne('SELECT id FROM properties WHERE id=$1 AND organization_id=$2', [id, organizationId])) {
      throw new AuthorizationError(422, 'INVALID_PROPERTY_ASSIGNMENTS');
    }
  }
  return assignments;
}

export async function validateReservationReference(executor: DbExecutor, actor: ScopedActor, propertyId: string, reservationId: unknown) {
  if (reservationId === undefined || reservationId === null || reservationId === '') return;
  if (typeof reservationId !== 'string' || !await executor.queryOne(
    'SELECT id FROM reservations WHERE id=$1 AND organization_id=$2 AND property_id=$3',
    [reservationId, actor.organizationId, propertyId]
  )) throw new AuthorizationError(422, 'INVALID_RESERVATION_REFERENCE');
}

export async function resolveAssignee(executor: DbExecutor, actor: ScopedActor, propertyId: string, userId: unknown, name: unknown) {
  if (userId === null || userId === '' || (userId === undefined && (!name || name === 'Unassigned'))) return { id: null, name: 'Unassigned' };
  if ((userId !== undefined && typeof userId !== 'string') || (name !== undefined && typeof name !== 'string')) throw new AuthorizationError(422, 'INVALID_ASSIGNEE');
  const rows = await executor.query<any>(
    `SELECT u.id, u.name, m.role, m.assigned_property_ids_json FROM organization_memberships m
     JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.status='Active'
     AND ${userId ? 'u.id=$2' : 'u.name=$2'}`,
    [actor.organizationId, userId || name]
  );
  if (rows.length !== 1) throw new AuthorizationError(422, 'INVALID_ASSIGNEE');
  const row = rows[0]; const assigned = parseAssignments(row.assigned_property_ids_json);
  if (!assigned || !hasPropertyScope({ organizationId: actor.organizationId, actorRole: row.role, assignedPropertyIds: assigned }, propertyId)) throw new AuthorizationError(422, 'INVALID_ASSIGNEE');
  return { id: row.id as string, name: row.name as string };
}
