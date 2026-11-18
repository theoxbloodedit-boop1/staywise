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

/** JWT issuer is an exact claim, not necessarily the browser Auth URL. */
export function getNeonAuthIssuer(): string | null {
  return process.env.NEON_AUTH_ISSUER?.trim() || getNeonAuthBaseUrl();
}

export function getNeonAuthJwksUrl(): string | null {
  if (process.env.NEON_AUTH_JWKS_URL) return process.env.NEON_AUTH_JWKS_URL.trim();
  const base = getNeonAuthBaseUrl();
  return base ? `${base}/.well-known/jwks.json` : null;
}

/** Public configuration names only: never return environment values or tokens. */
export function getNeonAuthConfigurationStatus() {
  const missing: string[] = [];
  if (!getNeonAuthBaseUrl()?.trim()) missing.push('NEON_AUTH_BASE_URL');
  if (!getNeonAuthJwksUrl()?.trim()) missing.push('NEON_AUTH_JWKS_URL');
  if (!process.env.NEON_AUTH_AUDIENCE?.trim()) missing.push('NEON_AUTH_AUDIENCE');
  return { configured: missing.length === 0, missing };
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

  const baseUrl = getNeonAuthIssuer();
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

/** Diagnostic only. Never use this result as an authenticated identity. */
export async function diagnoseNeonSession(token: string | undefined) {
  if (!token || token.length > 16384) return { status: 'no_session' as const };
  const jwks = getJwks();
  const issuer = getNeonAuthIssuer();
  if (!jwks || !issuer) return { status: 'configuration_incomplete' as const };
  try {
    // Signature is verified against operator-configured JWKS BEFORE inspecting
    // issuer/audience. This diagnostic never authenticates or changes trust.
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ['RS256', 'ES256', 'EdDSA'],
      requiredClaims: ['sub', 'exp', 'iat'],
    });
    if (!payload.iat || payload.iat > Date.now() / 1000 + 30) return { status: 'invalid_session' as const };
    const raw = payload.aud;
    const audiences = (typeof raw === 'string' ? [raw] : Array.isArray(raw) ? raw : [])
      .filter((value): value is string => typeof value === 'string' && value.length <= 512)
      .slice(0, 8);
    const observedIssuer = typeof payload.iss === 'string' && payload.iss.length <= 1024
      ? payload.iss : null;
    return {
      status: 'signature_verified_not_authorized' as const,
      issuerMatches: observedIssuer === issuer,
      observedIssuer,
      audiences,
      audienceConfigured: Boolean(process.env.NEON_AUTH_AUDIENCE?.trim()),
      emailVerified: payload.email_verified === true,
    };
  } catch (error) {
    // Allowlisted codes only; never return provider messages, URLs or claim values.
    const code = (error as { code?: string }).code;
    const claim = (error as { claim?: string }).claim;
    const reason = code === 'ERR_JWT_EXPIRED' ? 'expired'
      : code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' && claim === 'iss' ? 'issuer_mismatch'
      : code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' ? 'required_claim_invalid'
      : code === 'ERR_JWKS_NO_MATCHING_KEY' ? 'signing_key_not_found'
      : code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ? 'signature_invalid'
      : code === 'ERR_JOSE_ALG_NOT_ALLOWED' ? 'algorithm_not_allowed'
      : code === 'ERR_JWS_INVALID' || code === 'ERR_JWT_INVALID' ? 'token_format_invalid'
      : 'verification_unavailable';
    return { status: 'invalid_session' as const, reason };
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
