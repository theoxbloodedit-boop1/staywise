-- Staywise Rate Limiting & Guest Code Brute-Force Protection Migration
-- Compatible with Neon PostgreSQL

CREATE TABLE IF NOT EXISTS guest_verify_attempts (
  ip_slug TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL,
  locked_until BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_guest_verify_locked_until
  ON guest_verify_attempts (locked_until);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL,
  blocked_until BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked_until
  ON rate_limit_buckets (blocked_until);
