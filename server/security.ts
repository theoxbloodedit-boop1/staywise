import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SECRETS_FILE = path.join(DATA_DIR, '.server-secrets.json');

let cachedDataKeyHex: string | null = null;

function resolveDataKeyHex(): string {
  if (cachedDataKeyHex) return cachedDataKeyHex;

  const envKey = process.env.STAYWISE_DATA_KEY || process.env.ENCRYPTION_KEY;
  if (envKey && /^[0-9a-fA-F]{64}$/.test(envKey.trim())) {
    cachedDataKeyHex = envKey.trim();
    return cachedDataKeyHex;
  }

  // Fallback derived key if user provided a passphrase/cookie secret
  const fallbackSecret = process.env.NEON_AUTH_COOKIE_SECRET || process.env.SESSION_SECRET;
  if (fallbackSecret && fallbackSecret.length >= 16) {
    cachedDataKeyHex = crypto.createHash('sha256').update(`staywise-aes:${fallbackSecret}`).digest('hex');
    return cachedDataKeyHex;
  }

  // Local non-serverless fallback only (avoid writing to read-only Vercel filesystem)
  if (!process.env.VERCEL) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(SECRETS_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8'));
        if (parsed.dataKeyHex && /^[0-9a-fA-F]{64}$/.test(parsed.dataKeyHex)) {
          cachedDataKeyHex = parsed.dataKeyHex;
          return cachedDataKeyHex!;
        }
      }
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(SECRETS_FILE, JSON.stringify({ dataKeyHex: generated }, null, 2), { mode: 0o600 });
      cachedDataKeyHex = generated;
      return generated;
    } catch {
      // Fall through if filesystem is read-only
    }
  }

  // Ephemeral fallback warning — production Vercel deployments should set STAYWISE_DATA_KEY
  console.warn('[STAYWISE SECURITY] STAYWISE_DATA_KEY is not set. Configure a 64-char hex key in environment variables.');
  cachedDataKeyHex = crypto.createHash('sha256').update('staywise-unconfigured-dev-key').digest('hex');
  return cachedDataKeyHex;
}

export function encryptField(plain: string | null | undefined): string {
  if (!plain) return '';
  if (plain.startsWith('enc:v1:')) return plain;
  const key = Buffer.from(resolveDataKeyHex(), 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptField(value: string | null | undefined): string {
  if (!value) return '';
  if (!value.startsWith('enc:v1:')) return value;
  try {
    const [, , ivB64, tagB64, dataB64] = value.split(':');
    const key = Buffer.from(resolveDataKeyHex(), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
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
}

export async function verifyNeonAuthJwt(token: string | undefined): Promise<VerifiedNeonUser | null> {
  if (!token) return null;
  const jwks = getJwks();
  if (!jwks) return null;

  const baseUrl = getNeonAuthBaseUrl();
  try {
    const { payload } = await jwtVerify(token, jwks, {
      ...(baseUrl ? { issuer: [baseUrl, new URL(baseUrl).origin] } : {}),
    });

    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    const name =
      typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : email.split('@')[0] || 'Operator';
    const emailVerified = Boolean(payload.email_verified);

    if (!sub || !email) return null;
    return { sub, email, name, emailVerified };
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
