import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createFieldEncryption, FieldEncryptionError } from '../server/lib/field-encryption.js';
const old = '12'.repeat(32), next = '34'.repeat(32);
const legacy = createFieldEncryption({ STAYWISE_DATA_KEY: old });

// Fixed wire-format generator reproduces the original v1 encoder independently.
function historical(value: string) {
  const iv = Buffer.alloc(12, 7);
  const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(old, 'hex'), iv);
  const data = Buffer.concat([c.update(value), c.final()]);
  return `enc:v1:${iv.toString('base64url')}:${c.getAuthTag().toString('base64url')}:${data.toString('base64url')}`;
}

test('T26: exact historical v1 ciphertext remains readable and v1 remains default writer', () => {
  assert.equal(legacy.decrypt(historical('door secret')), 'door secret');
  assert.match(legacy.encrypt('wifi'), /^enc:v1:/);
  assert.equal(legacy.decrypt(legacy.encrypt('wifi')), 'wifi');
});

test('T26: opt-in v2 writer reads both versions; former keys remain read-only', () => {
  const config = { STAYWISE_DATA_KEY: old, STAYWISE_DATA_KEYRING: JSON.stringify({ next }), STAYWISE_ACTIVE_DATA_KEY_ID: 'next', STAYWISE_ENCRYPTION_WRITE_VERSION: '2' };
  const codec = createFieldEncryption(config);
  assert.equal(codec.decrypt(historical('old secret')), 'old secret');
  const value = codec.encrypt('new secret');
  assert.match(value, /^enc:v2:next:/); assert.equal(codec.decrypt(value), 'new secret');
  const reader = createFieldEncryption({ ...config, STAYWISE_ENCRYPTION_WRITE_VERSION: '1' });
  assert.equal(reader.decrypt(value), 'new secret');
  assert.equal(createFieldEncryption({ STAYWISE_DATA_KEY: next, STAYWISE_LEGACY_DATA_KEYS: JSON.stringify([old]) }).decrypt(historical('historical')), 'historical');
});

test('T27: missing, invalid or session-derived configuration fails closed in all environments', () => {
  for (const env of [{}, { SESSION_SECRET: 'a'.repeat(64) }, { STAYWISE_DATA_KEY: 'bad' }, { STAYWISE_DATA_KEY: old, STAYWISE_DATA_KEYRING: '[]' }, { STAYWISE_DATA_KEY: old, STAYWISE_ENCRYPTION_WRITE_VERSION: '2' }]) {
    assert.throws(() => createFieldEncryption(env), (e: any) => e instanceof FieldEncryptionError && e.code === 'ENCRYPTION_CONFIG_INVALID');
  }
});

test('T27: tampering, unknown version/key and invalid encodings never become empty strings', () => {
  const value = historical('secret');
  const parts = value.split(':'); parts[3] = Buffer.alloc(16).toString('base64url');
  for (const bad of [parts.join(':'), 'enc:v9:any', 'enc:v2:unknown:a:b:c', 'enc:v1:x:y:z', value + ':trailing']) {
    assert.throws(() => legacy.decrypt(bad), (e: any) => e.code === 'ENCRYPTED_FIELD_UNREADABLE');
    assert.throws(() => legacy.encrypt(bad));
  }
  assert.equal(legacy.decrypt('historical plaintext'), 'historical plaintext');
});

test('encryption uses fresh IVs, never rewrites valid ciphertext and exposes no field value in errors', () => {
  const a = legacy.encrypt('sensitive'), b = legacy.encrypt('sensitive');
  assert.notEqual(a, b); assert.equal(legacy.encrypt(a), a);
  try { legacy.decrypt('enc:v1:sensitive:broken:value'); } catch (e) { assert.doesNotMatch(String(e), /sensitive/); }
});
