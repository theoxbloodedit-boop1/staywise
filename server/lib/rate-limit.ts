import crypto from 'crypto';
import type { Request } from 'express';
import { db } from '../db.js';

export const GUEST_VERIFY_MAX_FAILURES = 8;
export const GUEST_VERIFY_WINDOW_MS = 15 * 60_000;
export const GUEST_VERIFY_LOCKOUT_MS = 15 * 60_000;

export interface AttemptRecord {
  fail_count: number;
  window_start: number;
  locked_until: number;
}

export interface LockoutCheckResult {
  allowed: boolean;
  blocked: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface AttemptStore {
  get(key: string): Promise<AttemptRecord | undefined>;
  upsert(key: string, record: AttemptRecord): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createPgAttemptStore(): AttemptStore {
  return {
    async get(key) {
      return db.queryOne<AttemptRecord>(
        'SELECT fail_count, window_start, locked_until FROM guest_verify_attempts WHERE ip_slug = $1',
        [key]
      );
    },
    async upsert(key, record) {
      await db.execute(
        `INSERT INTO guest_verify_attempts (ip_slug, fail_count, window_start, locked_until)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ip_slug) DO UPDATE
         SET fail_count = $2, window_start = $3, locked_until = $4`,
        [key, record.fail_count, record.window_start, record.locked_until]
      );
    },
    async remove(key) {
      await db.execute('DELETE FROM guest_verify_attempts WHERE ip_slug = $1', [key]);
    },
  };
}

export function createMemoryAttemptStore(): AttemptStore {
  const map = new Map<string, AttemptRecord>();
  return {
    async get(key) {
      return map.get(key);
    },
    async upsert(key, record) {
      map.set(key, record);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

export function extractClientIp(req: Pick<Request, 'headers' | 'ip' | 'socket'>): string {
  const fwd = (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return fwd || req.ip || req.socket?.remoteAddress || 'unknown';
}

export function hashRateLimitKey(ip: string, scope: string): string {
  return crypto.createHash('sha256').update(`${ip}::${scope}`).digest('hex').slice(0, 48);
}

export async function checkRateLimitLock(
  key: string,
  options: {
    store?: AttemptStore;
    maxAttempts?: number;
    windowMs?: number;
    now?: number;
  } = {}
): Promise<LockoutCheckResult> {
  const store = options.store || createPgAttemptStore();
  const maxAttempts = options.maxAttempts ?? GUEST_VERIFY_MAX_FAILURES;
  const windowMs = options.windowMs ?? GUEST_VERIFY_WINDOW_MS;
  const now = options.now ?? Date.now();

  const row = await store.get(key);
  if (!row) {
    return { allowed: true, blocked: false, remaining: maxAttempts, retryAfterSec: 0 };
  }

  const lockedUntil = Number(row.locked_until);
  if (lockedUntil > now) {
    return {
      allowed: false,
      blocked: true,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((lockedUntil - now) / 1000)),
    };
  }

  const withinWindow = now - Number(row.window_start) < windowMs;
  const used = withinWindow ? Number(row.fail_count) : 0;
  return {
    allowed: true,
    blocked: false,
    remaining: Math.max(0, maxAttempts - used),
    retryAfterSec: 0,
  };
}

export async function recordRateLimitOutcome(
  key: string,
  success: boolean,
  options: {
    store?: AttemptStore;
    maxAttempts?: number;
    windowMs?: number;
    lockoutMs?: number;
    now?: number;
  } = {}
): Promise<{ newlyLocked: boolean; failCount: number; retryAfterSec: number }> {
  const store = options.store || createPgAttemptStore();
  const maxAttempts = options.maxAttempts ?? GUEST_VERIFY_MAX_FAILURES;
  const windowMs = options.windowMs ?? GUEST_VERIFY_WINDOW_MS;
  const lockoutMs = options.lockoutMs ?? GUEST_VERIFY_LOCKOUT_MS;
  const now = options.now ?? Date.now();

  if (success) {
    await store.remove(key);
    return { newlyLocked: false, failCount: 0, retryAfterSec: 0 };
  }

  const existing = await store.get(key);
  let failCount = 1;
  let windowStart = now;
  if (existing && now - Number(existing.window_start) < windowMs) {
    failCount = Number(existing.fail_count) + 1;
    windowStart = Number(existing.window_start);
  }

  const shouldLock = failCount >= maxAttempts;
  const lockedUntil = shouldLock ? now + lockoutMs : 0;

  await store.upsert(key, {
    fail_count: failCount,
    window_start: windowStart,
    locked_until: lockedUntil,
  });

  return {
    newlyLocked: shouldLock && !(existing && Number(existing.locked_until) > now),
    failCount,
    retryAfterSec: shouldLock ? Math.ceil(lockoutMs / 1000) : 0,
  };
}
