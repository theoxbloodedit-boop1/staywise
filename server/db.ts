import { Pool, neonConfig, type PoolClient } from '@neondatabase/serverless';
import ws from 'ws';
import { seedIfEmpty } from './seed-data.js';

// Enable WebSocket transport in Node.js environments (Node 20/22/Vercel Functions)
neonConfig.webSocketConstructor = ws;

export interface DbExecutor {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  execute(sql: string, params?: any[]): Promise<number>;
}

let poolInstance: Pool | null = null;
let readyPromise: Promise<void> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED);
}

export function getPool(): Pool {
  if (poolInstance) return poolInstance;
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured. Set your Neon PostgreSQL connection string.');
  }
  poolInstance = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return poolInstance;
}

function wrapClient(client: Pool | PoolClient): DbExecutor {
  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const res = await client.query(sql, params);
      return res.rows as T[];
    },
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const res = await client.query(sql, params);
      return res.rows[0] as T | undefined;
    },
    async execute(sql: string, params: any[] = []): Promise<number> {
      const res = await client.query(sql, params);
      return res.rowCount ?? 0;
    },
  };
}

export const db: DbExecutor & {
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
} = {
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return wrapClient(getPool()).query<T>(sql, params);
  },
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return wrapClient(getPool()).queryOne<T>(sql, params);
  },
  async execute(sql: string, params: any[] = []): Promise<number> {
    return wrapClient(getPool()).execute(sql, params);
  },
  async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(wrapClient(client));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },
};

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    brand_color TEXT NOT NULL DEFAULT '#0F766E',
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    default_country TEXT NOT NULL DEFAULT 'US',
    plan_tier TEXT NOT NULL DEFAULT 'Professional',
    property_limit INTEGER NOT NULL DEFAULT 10,
    ai_monthly_allowance INTEGER NOT NULL DEFAULT 500,
    require_cleaning_approval INTEGER NOT NULL DEFAULT 1,
    require_pre_arrival_inspection INTEGER NOT NULL DEFAULT 1,
    terms_accepted_at TEXT,
    privacy_accepted_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    neon_auth_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_initials TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payment_records (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'Paid',
    invoice_number TEXT NOT NULL,
    period_label TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organization_memberships (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    assigned_property_ids_json TEXT NOT NULL DEFAULT '["*"]',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    timezone TEXT NOT NULL DEFAULT 'America/Chicago',
    currency TEXT NOT NULL DEFAULT 'USD',
    temp_unit TEXT NOT NULL DEFAULT 'F',
    emergency_number TEXT NOT NULL DEFAULT '911',
    bedrooms INTEGER NOT NULL DEFAULT 2,
    bathrooms DOUBLE PRECISION NOT NULL DEFAULT 2,
    max_occupancy INTEGER NOT NULL DEFAULT 4,
    cover_image TEXT NOT NULL,
    description TEXT NOT NULL,
    amenities_json TEXT NOT NULL DEFAULT '[]',
    parking_info TEXT NOT NULL DEFAULT '',
    access_summary TEXT NOT NULL DEFAULT '',
    emergency_notes TEXT NOT NULL DEFAULT '',
    internal_notes TEXT NOT NULL DEFAULT '',
    operational_status TEXT NOT NULL DEFAULT 'Active',
    readiness_status TEXT NOT NULL DEFAULT 'Ready',
    readiness_reason TEXT NOT NULL DEFAULT 'All cleaning, inspection & safety checks verified',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS guidebooks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT UNIQUE NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    accent_color TEXT NOT NULL DEFAULT '#0F766E',
    typography_style TEXT NOT NULL DEFAULT 'Modern Sans',
    cover_image TEXT NOT NULL,
    section_order_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS guidebook_sections (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 2,
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    access_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    check_in_status TEXT NOT NULL DEFAULT 'Pending',
    check_out_status TEXT NOT NULL DEFAULT 'Pending',
    special_instructions TEXT NOT NULL DEFAULT '',
    house_rules_acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cleaning_tasks (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_id TEXT,
    title TEXT NOT NULL,
    assigned_user_id TEXT,
    assigned_name TEXT NOT NULL DEFAULT 'Unassigned',
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    checklist_json TEXT NOT NULL,
    photo_urls_json TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    review_notes TEXT NOT NULL DEFAULT '',
    reviewed_by TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_id TEXT,
    source TEXT NOT NULL DEFAULT 'Staff',
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to_id TEXT,
    assigned_to_name TEXT NOT NULL DEFAULT 'Unassigned',
    work_order_code TEXT NOT NULL,
    deadline TEXT NOT NULL,
    internal_notes TEXT NOT NULL DEFAULT '',
    resolution_notes TEXT NOT NULL DEFAULT '',
    attachment_urls_json TEXT NOT NULL DEFAULT '[]',
    resolution_urls_json TEXT NOT NULL DEFAULT '[]',
    verified_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS property_assets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    condition_status TEXT NOT NULL DEFAULT 'Good',
    baseline_notes TEXT NOT NULL DEFAULT '',
    replacement_cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    inspector_name TEXT NOT NULL,
    inspected_at TEXT NOT NULL,
    overall_status TEXT NOT NULL,
    items_json TEXT NOT NULL,
    discrepancies_count INTEGER NOT NULL DEFAULT 0,
    summary_notes TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS support_requests (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_id TEXT,
    guest_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'Normal',
    status TEXT NOT NULL DEFAULT 'Open',
    escalated_to_incident_id TEXT,
    attachment_url TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_id TEXT,
    session_id TEXT NOT NULL,
    guest_question TEXT NOT NULL,
    ai_answer TEXT NOT NULL,
    verified_sources_json TEXT NOT NULL DEFAULT '[]',
    confidence TEXT NOT NULL DEFAULT 'Verified',
    escalated INTEGER NOT NULL DEFAULT 0,
    knowledge_gap_flag INTEGER NOT NULL DEFAULT 0,
    gap_resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    quiet_hours_respected INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT,
    channel TEXT NOT NULL,
    recipient_role TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'Normal',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'Delivered',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_id TEXT,
    guest_name TEXT NOT NULL,
    cleaning_rating INTEGER NOT NULL,
    checkin_rating INTEGER NOT NULL,
    comfort_rating INTEGER NOT NULL,
    maintenance_rating INTEGER NOT NULL,
    comments TEXT NOT NULL DEFAULT '',
    follow_up_requested INTEGER NOT NULL DEFAULT 0,
    follow_up_status TEXT NOT NULL DEFAULT 'None',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id TEXT,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS uploaded_assets (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    property_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    data BYTEA NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email))`,
  `CREATE INDEX IF NOT EXISTS idx_users_neon_auth_id ON users (neon_auth_id)`,
  `CREATE INDEX IF NOT EXISTS idx_memberships_user ON organization_memberships (user_id, organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_properties_org ON properties (organization_id, archived)`,
  `CREATE INDEX IF NOT EXISTS idx_reservations_prop_code ON reservations (property_id, UPPER(access_code))`,
  `CREATE INDEX IF NOT EXISTS idx_cleaning_org_status ON cleaning_tasks (organization_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_incidents_org_prop ON incidents (organization_id, property_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs (organization_id, created_at DESC)`,
];

export async function initSchema() {
  for (const stmt of SCHEMA_STATEMENTS) {
    await db.execute(stmt);
  }
}

export async function ensureDbReady(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!readyPromise) {
    readyPromise = (async () => {
      await initSchema();
      await seedIfEmpty(db);
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  await readyPromise;
}
