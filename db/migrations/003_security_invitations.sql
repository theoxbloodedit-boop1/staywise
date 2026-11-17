-- Additive only. No existing user/membership is modified or reclassified.
CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Organization Admin','Property Manager','Concierge','Cleaning Staff','Maintenance Technician','Inspector')),
  assigned_property_ids_json TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by TEXT REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_pending_email
  ON organization_invitations (organization_id, LOWER(email)) WHERE status='pending';
