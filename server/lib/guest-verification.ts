import type { Request } from 'express';
import { db } from '../db.js';
import { resolveGuestVerification, logAudit } from '../domain.js';
import { AuthorizationError } from './authorization.js';
import { checkRateLimitLock, recordRateLimitOutcome, createPgAttemptStore, extractClientIp, hashRateLimitKey } from './rate-limit.js';

/** Shared by ALL guest endpoints, including private media. Transaction-scoped
 * lock serializes check + lookup + attempt update across instances/connections. */
export async function verifyGuestRequest(req: Request, prop: { id: string; organization_id?: string; timezone?: string }, code: unknown) {
  if (typeof code !== 'string' || !code.trim()) return { valid: false, reason: 'missing' } as const;
  const key = hashRateLimitKey(extractClientIp(req), prop.id);
  return db.transaction(async tx => {
    await tx.execute('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`guest-code:${key}`]);
    const store = createPgAttemptStore(tx);
    const lock = await checkRateLimitLock(key, { store });
    if (lock.blocked) throw new AuthorizationError(429, 'GUEST_CODE_LOCKED', lock.retryAfterSec);
    const result = await resolveGuestVerification(prop, code, tx);
    const outcome = await recordRateLimitOutcome(key, result.valid, { store });
    if (outcome.newlyLocked && prop.organization_id) {
      await logAudit({ organizationId: prop.organization_id, propertyId: prop.id, actorName: 'Rate Limiter', actorRole: 'Guest', action: 'GUEST_CODE_BRUTEFORCE_BLOCKED', entityType: 'Property', entityId: prop.id, details: 'Repeated invalid booking-code attempts blocked for 15 minutes.' }, tx);
    }
    return result;
  });
}
