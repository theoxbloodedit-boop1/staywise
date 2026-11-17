-- Additive internal authorization; grants nobody access automatically.
CREATE TABLE admin_profiles (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','SUPPORT','BILLING_ADMIN','READ_ONLY_ANALYST')),
 status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
 revoked_before BIGINT NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE admin_role_permissions (
 role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','SUPPORT','BILLING_ADMIN','READ_ONLY_ANALYST')),
 permission TEXT NOT NULL,
 PRIMARY KEY(role,permission)
);
INSERT INTO admin_role_permissions(role,permission)
SELECT role,permission FROM (VALUES ('SUPER_ADMIN'),('ADMIN'),('READ_ONLY_ANALYST')) roles(role)
CROSS JOIN (VALUES ('overview.read'),('organizations.read'),('users.read'),('properties.read'),('operations.read'),('billing.read')) perms(permission);
INSERT INTO admin_role_permissions(role,permission) VALUES
 ('SUPER_ADMIN','organizations.write'),('ADMIN','organizations.write'),
 ('SUPER_ADMIN','support.read'),('SUPER_ADMIN','support.write'),('ADMIN','support.read'),('ADMIN','support.write'),('SUPPORT','support.read'),('SUPPORT','support.write'),
 ('SUPPORT','organizations.read'),('SUPPORT','users.read'),
 ('BILLING_ADMIN','organizations.read'),('BILLING_ADMIN','billing.read'),
 ('SUPER_ADMIN','security.read'),('SUPER_ADMIN','security.write'),('SUPER_ADMIN','settings.read'),('SUPER_ADMIN','audit.read'),('SUPER_ADMIN','reports.read'),('SUPER_ADMIN','system.read'),
 ('ADMIN','reports.read'),('READ_ONLY_ANALYST','reports.read');
CREATE TABLE admin_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES admin_profiles(user_id),
 issued_at BIGINT NOT NULL,
 expires_at BIGINT NOT NULL,
 revoked BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_user ON admin_sessions(user_id,expires_at);
CREATE TABLE admin_audit_logs (
 id TEXT PRIMARY KEY, administrator_id TEXT REFERENCES users(id),
 action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT,
 organization_id TEXT REFERENCES organizations(id), request_id TEXT NOT NULL,
 result TEXT NOT NULL CHECK(result IN ('success','denied')),
 reason TEXT, changes_json JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_recent ON admin_audit_logs(created_at DESC);
CREATE INDEX admin_audit_org ON admin_audit_logs(organization_id,created_at DESC);
CREATE FUNCTION reject_admin_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Administrative audit records are append-only'; END $$;
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION reject_admin_audit_mutation();
-- Separate B2B internal cases, not guest support_requests; references preserve their source.
CREATE TABLE admin_support_tickets (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id),
 requester_user_id TEXT REFERENCES users(id), source_request_id TEXT REFERENCES support_requests(id),
 subject TEXT NOT NULL CHECK(length(subject) BETWEEN 3 AND 200),
 category TEXT NOT NULL CHECK(category IN ('Account','Authentication','Billing','Welcome Books','Guest Access','Reservations','Cleaning','Inspections','Incidents','Technical Issue','Feature Request','Other')),
 priority TEXT NOT NULL CHECK(priority IN ('Low','Normal','High','Urgent')),
 status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Waiting for Customer','Escalated','Resolved','Closed')),
 assigned_admin_id TEXT REFERENCES admin_profiles(user_id),
 resolution_reason TEXT, version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), resolved_at TIMESTAMPTZ
);
CREATE INDEX admin_support_org ON admin_support_tickets(organization_id,created_at DESC);
CREATE TABLE admin_support_notes (
 id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES admin_support_tickets(id),
 author_id TEXT NOT NULL REFERENCES admin_profiles(user_id),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 visibility TEXT NOT NULL DEFAULT 'internal' CHECK(visibility='internal'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Financial truth remains organizations/plan_tier and payment_records; no duplicate ledger.
ALTER TABLE organizations ADD COLUMN control_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'Active' CHECK(account_status IN ('Active','Suspended'));
ALTER TABLE users ADD COLUMN control_revoked_before BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN control_version INTEGER NOT NULL DEFAULT 1;
INSERT INTO admin_role_permissions(role,permission) VALUES ('SUPER_ADMIN','users.write'),('ADMIN','users.write');

INSERT INTO admin_role_permissions(role,permission) VALUES ('SUPER_ADMIN','billing.write'),('BILLING_ADMIN','billing.write');
CREATE TABLE admin_announcements (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 160),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 author_id TEXT NOT NULL REFERENCES admin_profiles(user_id),
 approved_by TEXT REFERENCES admin_profiles(user_id),
 status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Approved','Published')),
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ,
 CHECK(approved_by IS NULL OR approved_by<>author_id)
);
CREATE INDEX admin_announcements_org ON admin_announcements(organization_id,created_at DESC);
INSERT INTO admin_role_permissions(role,permission)
SELECT role,permission FROM (VALUES ('SUPER_ADMIN'),('ADMIN')) roles(role)
CROSS JOIN (VALUES ('communications.read'),('communications.write'),('communications.publish')) perms(permission);
CREATE TABLE admin_feature_flags (
 name TEXT NOT NULL CHECK(name='control_support_creation'),
 scope TEXT NOT NULL, enabled BOOLEAN NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(name,scope)
);
INSERT INTO admin_role_permissions(role,permission) VALUES ('SUPER_ADMIN','settings.write');
