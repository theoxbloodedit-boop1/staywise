-- New evidence only; no legacy file is copied, deleted or automatically classified.
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  property_id TEXT NOT NULL REFERENCES properties(id),
  category TEXT NOT NULL CHECK (category IN ('cleaning','incident','inspection','guest-issue')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility='private'),
  uploaded_by_user_id TEXT REFERENCES users(id),
  owner_reservation_id TEXT REFERENCES reservations(id),
  mime_type TEXT NOT NULL CHECK (mime_type='image/jpeg'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes>0 AND size_bytes<=5242880),
  sha256 TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','quarantined')),
  data BYTEA NOT NULL,
  CHECK (uploaded_by_user_id IS NOT NULL OR owner_reservation_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_media_org_property ON media_assets(organization_id,property_id);
