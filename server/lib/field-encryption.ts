import crypto from 'node:crypto';

export class FieldEncryptionError extends Error {
  readonly status = 503;
  constructor(readonly code: 'ENCRYPTION_CONFIG_INVALID' | 'ENCRYPTED_FIELD_UNREADABLE') {
    super(code === 'ENCRYPTION_CONFIG_INVALID' ? 'Field encryption is not configured safely.' : 'An encrypted field could not be read.');
    this.name = 'FieldEncryptionError';
  }
}

function key(value: unknown): Buffer {
  if (typeof value !== 'string' || !/^[a-f\d]{64}$/i.test(value.trim())) throw new FieldEncryptionError('ENCRYPTION_CONFIG_INVALID');
  return Buffer.from(value.trim(), 'hex');
}
function decode(value: string, length?: number): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const result = Buffer.from(value, 'base64url');
  if (result.toString('base64url') !== value || (length !== undefined && result.length !== length)) throw new Error('Invalid encoding');
  return result;
}

// No filesystem, session-secret derivation, random ephemeral key or known fallback.
// Existing legacy key material must be explicitly preserved by the operator.
export function createFieldEncryption(env: Record<string, string | undefined>) {
  const current = key(env.STAYWISE_DATA_KEY || env.ENCRYPTION_KEY);
  const legacy: Buffer[] = [current];
  const ring = new Map<string, Buffer>();
  try {
    const extra: unknown = JSON.parse(env.STAYWISE_LEGACY_DATA_KEYS || '[]');
    const keys: unknown = JSON.parse(env.STAYWISE_DATA_KEYRING || '{}');
    if (!Array.isArray(extra) || !keys || typeof keys !== 'object' || Array.isArray(keys)) throw new Error();
    for (const value of extra) legacy.push(key(value));
    for (const [id, value] of Object.entries(keys)) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error();
      ring.set(id, key(value));
    }
  } catch { throw new FieldEncryptionError('ENCRYPTION_CONFIG_INVALID'); }
  const version = env.STAYWISE_ENCRYPTION_WRITE_VERSION || '1';
  const activeId = env.STAYWISE_ACTIVE_DATA_KEY_ID || '';
  if (!['1', '2'].includes(version) || (version === '2' && !ring.has(activeId))) throw new FieldEncryptionError('ENCRYPTION_CONFIG_INVALID');

  function decrypt(value: string | null | undefined): string {
    if (!value) return '';
    if (!value.startsWith('enc:')) return value; // Historical plaintext is not silently re-certified or rewritten.
    try {
      const parts = value.split(':');
      const v2 = parts[1] === 'v2';
      if ((!v2 && parts[1] !== 'v1') || parts.length !== (v2 ? 6 : 5)) throw new Error();
      const candidates = v2 ? [ring.get(parts[2])].filter((k): k is Buffer => Boolean(k)) : legacy;
      const offset = v2 ? 3 : 2;
      const iv = decode(parts[offset], 12), tag = decode(parts[offset + 1], 16), data = decode(parts[offset + 2]);
      for (const candidate of candidates) {
        try {
          const decipher = crypto.createDecipheriv('aes-256-gcm', candidate, iv);
          if (v2) decipher.setAAD(Buffer.from(`staywise:enc:v2:${parts[2]}`));
          decipher.setAuthTag(tag);
          return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
        } catch { /* Try explicitly configured historical keys only. */ }
      }
      throw new Error();
    } catch { throw new FieldEncryptionError('ENCRYPTED_FIELD_UNREADABLE'); }
  }

  return {
    decrypt,
    encrypt(plain: string | null | undefined): string {
      if (!plain) return '';
      if (plain.startsWith('enc:')) { decrypt(plain); return plain; }
      const iv = crypto.randomBytes(12);
      const v2 = version === '2';
      const cipher = crypto.createCipheriv('aes-256-gcm', v2 ? ring.get(activeId)! : current, iv);
      if (v2) cipher.setAAD(Buffer.from(`staywise:enc:v2:${activeId}`));
      const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return `${v2 ? `enc:v2:${activeId}` : 'enc:v1'}:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${data.toString('base64url')}`;
    },
  };
}
