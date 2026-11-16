-- 002_platform_crm.sql
-- Adds Founder SaaS CRM lifecycle, account status, notes, and contact timestamp columns to organizations.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS crm_stage TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS crm_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS last_contacted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_crm_stage ON organizations (crm_stage, account_status);
