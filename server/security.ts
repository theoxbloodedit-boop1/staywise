import crypto from 'crypto';
import { createFieldEncryption } from './lib/field-encryption.js';
import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Configuration is validated on every sensitive operation; no process-local fallback key.
export function validateFieldEncryptionConfiguration(): void {
  createFieldEncryption(process.env);
}

export function encryptField(plain: string | null | undefined): string {
  return createFieldEncryption(process.env).encrypt(plain);
}

export function decryptField(value: string | null | undefined): string {
  return createFieldEncryption(process.env).decrypt(value);
}

export function getNeonAuthBaseUrl(): string | null {
  const raw = process.env.NEON_AUTH_BASE_URL || process.env.VITE_NEON_AUTH_URL;
  return raw ? raw.replace(/\/+$/, '') : null;
}

export function getNeonAuthJwksUrl(): string | null {
  if (process.env.NEON_AUTH_JWKS_URL) return process.env.NEON_AUTH_JWKS_URL.trim();
  const base = getNeonAuthBaseUrl();
  return base ? `${base}/.well-known/jwks.json` : null;
}

let cachedJwksUrl: string | null = null;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  const jwksUrl = getNeonAuthJwksUrl();
  if (!jwksUrl) return null;
  if (!cachedJwks || cachedJwksUrl !== jwksUrl) {
    cachedJwksUrl = jwksUrl;
    cachedJwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return cachedJwks;
}

export interface VerifiedNeonUser {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
  authenticationTime?: number;
  issuedAt?: number;
  expiresAt?: number;
}

export async function verifyNeonAuthJwt(token: string | undefined): Promise<VerifiedNeonUser | null> {
  if (!token) return null;
  const jwks = getJwks();
  if (!jwks) return null;

  const baseUrl = getNeonAuthBaseUrl();
  const audience = process.env.NEON_AUTH_AUDIENCE?.trim();
  if (!baseUrl || !audience) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: baseUrl,
      audience,
      algorithms: ['RS256', 'ES256', 'EdDSA'],
      requiredClaims: ['sub', 'email', 'exp', 'iat'],
    });

    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    const name =
      typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : email.split('@')[0] || 'Operator';
    const emailVerified = payload.email_verified === true;

    if (!sub || !email) return null;
    return { sub, email, name, emailVerified, authenticationTime: typeof payload.auth_time === 'number' ? payload.auth_time : undefined, issuedAt: payload.iat, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

const rateBuckets = new Map<string, number[]>();

// Periodically prune stale IP buckets to prevent unbounded memory growth
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateBuckets.entries()) {
    const recent = timestamps.filter((t) => now - t < 15 * 60_000);
    if (recent.length === 0) {
      rateBuckets.delete(key);
    } else {
      rateBuckets.set(key, recent);
    }
  }
}, 5 * 60_000);
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

export function createRateLimiter(opts: { windowMs: number; max: number; prefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip) || 'unknown';
    const key = `${opts.prefix}:${ip}`;
    const now = Date.now();
    const hits = (rateBuckets.get(key) || []).filter((t) => now - t < opts.windowMs);
    if (hits.length >= opts.max) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a few minutes and try again.',
        code: 'RATE_LIMITED',
      });
    }
    hits.push(now);
    rateBuckets.set(key, hits);
    next();
  };
}
