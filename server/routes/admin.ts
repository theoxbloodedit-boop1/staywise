import { Router } from 'express';
import { db } from '../db.js';
import {
  ah,
  canAccessProperty,
  computePropertyReadiness,
  decryptCheckinContent,
  decryptWifiContent,
  getActor,
  getLocalDateStr,
  logAudit,
  nowIso,
  readPropertyReadinessGates,
  requireAuth,
  requireRoles,
  syncOverdueCleanings,
  uid,
} from '../domain.js';
import { getNeonDatabaseOverview } from '../backup.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

const PLAN_CATALOG: Record<string, { limit: number; cents: number; aiQuota: number }> = {
  Starter: { limit: 2, cents: 1900, aiQuota: 100 },
  Professional: { limit: 10, cents: 4900, aiQuota: 500 },
  Portfolio: { limit: 25, cents: 9900, aiQuota: 2000 },
};

function formatRangeLabel(startYmd: string, endYmd: string): string {
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };
  return `${fmt(startYmd)} – ${fmt(endYmd)}`;
}

adminRouter.get(
  '/dashboard',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Inspector'),
  ah(async (req, res) => {
    const actor = getActor(req);
    await syncOverdueCleanings(actor.organizationId);

    const range = (req.query.range as string) || '30d';
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    const org = await db.queryOne<any>(
      'SELECT default_country, ai_monthly_allowance FROM organizations WHERE id = $1',
      [actor.organizationId]
    );
    const TZ_BY_REGION: Record<string, string> = {
      US: 'America/Chicago',
      CA: 'America/Toronto',
      GB: 'Europe/London',
      EU: 'Europe/Paris',
      AU: 'Australia/Sydney',
      INTL: 'UTC',
    };
    const defaultTz = TZ_BY_REGION[org?.default_country] || 'America/Chicago';
    const today = getLocalDateStr(defaultTz);
    const cutoffYmd = getLocalDateStr(defaultTz, -days);
    const cutoffIso = `${cutoffYmd}T00:00:00Z`;

    const propertiesRaw = await db.query<any>(
      'SELECT * FROM properties WHERE organization_id = $1 AND archived = 0 ORDER BY name ASC',
      [actor.organizationId]
    );
    const properties = propertiesRaw.filter((p) => canAccessProperty(actor, p.id));

    const propertyList = await Promise.all(
      properties.map(async (p) => {
        const r = await readPropertyReadinessGates(p.id);
        return {
          ...p,
          readiness_status: r.status,
          readiness_reason: r.reason,
          gates: r.gates,
        };
      })
    );

    const allowedSet = new Set(propertyList.map((p) => p.id));
    const filterByScope = (rows: any[]) => rows.filter((r) => allowedSet.has(r.property_id));

    const [reservationsRows, cleaningRows, incidentsRows, supportRows, aiRows, feedbackRows] = await Promise.all([
      db.query<any>('SELECT * FROM reservations WHERE organization_id = $1', [actor.organizationId]),
      db.query<any>('SELECT * FROM cleaning_tasks WHERE organization_id = $1', [actor.organizationId]),
      db.query<any>('SELECT * FROM incidents WHERE organization_id = $1', [actor.organizationId]),
      db.query<any>('SELECT * FROM support_requests WHERE organization_id = $1', [actor.organizationId]),
      db.query<any>('SELECT * FROM ai_conversations WHERE organization_id = $1', [actor.organizationId]),
      db.query<any>('SELECT * FROM feedback WHERE organization_id = $1', [actor.organizationId]),
    ]);

    const reservations = filterByScope(reservationsRows);
    const cleaning = filterByScope(cleaningRows);
    const incidentsAll = filterByScope(incidentsRows);
    const supportAll = filterByScope(supportRows);
    const aiAll = filterByScope(aiRows);
    const feedbackAll = filterByScope(feedbackRows);

    const incidentsRange = incidentsAll.filter((i) => i.created_at >= cutoffIso);
    const cleaningRange = cleaning.filter((c) => c.due_date >= cutoffYmd || c.created_at >= cutoffIso);
    const supportRange = supportAll.filter((s) => s.created_at >= cutoffIso);
    const aiRange = aiAll.filter((a) => a.created_at >= cutoffIso);
    const feedbackRange = feedbackAll.filter((f) => f.created_at >= cutoffIso);

    const activeStays = reservations.filter(
      (r) => r.status !== 'Cancelled' && (r.status === 'Active' || (r.check_in_date <= today && r.check_out_date >= today))
    ).length;
    const upcomingArrivals = reservations.filter((r) => r.status !== 'Cancelled' && r.check_in_date >= today && r.check_in_status !== 'Checked In').length;
    const upcomingDepartures = reservations.filter((r) => r.status !== 'Cancelled' && r.check_out_date >= today && r.check_out_status !== 'Departed').length;

    const readyProperties = propertyList.filter((p) => p.readiness_status === 'Ready').length;
    const notReadyProperties = propertyList.length - readyProperties;

    const openIncidents = incidentsAll.filter((i) => i.status !== 'Resolved').length;
    const criticalIncidents = incidentsAll.filter((i) => i.status !== 'Resolved' && i.priority === 'Critical').length;
    const overdueCleaning = cleaning.filter((c) => c.status === 'Overdue').length;
    const pendingMaintenance = incidentsAll.filter((i) => ['New', 'Assigned', 'In Progress'].includes(i.status)).length;
    const unresolvedGuestRequests = supportAll.filter((s) => s.status !== 'Resolved').length;

    const completedCleanings = cleaningRange.filter((c) => c.status === 'Completed').length;
    const cleaningCompletionRate =
      cleaningRange.length > 0 ? Math.round((completedCleanings / cleaningRange.length) * 100) : null;
    const readinessRate =
      propertyList.length > 0 ? Math.round((readyProperties / propertyList.length) * 100) : null;

    const resolved = incidentsRange.filter((i) => i.resolved_at && i.created_at);
    let avgResolutionHours: number | null = null;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((acc, i) => acc + Math.max(0, Date.parse(i.resolved_at) - Date.parse(i.created_at)), 0);
      avgResolutionHours = Math.max(1, Math.round(totalMs / resolved.length / 3600000));
    }

    const categoryMap: Record<string, number> = {};
    for (const inc of incidentsRange) {
      categoryMap[inc.category] = (categoryMap[inc.category] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

    const avgFeedbackScore =
      feedbackRange.length > 0
        ? Number(
            (
              feedbackRange.reduce(
                (acc, f) => acc + (f.cleaning_rating + f.checkin_rating + f.comfort_rating + f.maintenance_rating) / 4,
                0
              ) / feedbackRange.length
            ).toFixed(2)
          )
        : null;

    const knowledgeGapsOpen = aiAll.filter((a) => a.knowledge_gap_flag === 1 && a.gap_resolved === 0).length;

    res.json({
      range,
      today,
      dateWindowLabel: formatRangeLabel(cutoffYmd, today),
      indicators: {
        totalProperties: propertyList.length,
        activeStays,
        upcomingArrivals,
        upcomingDepartures,
        readyProperties,
        notReadyProperties,
        openIncidents,
        criticalIncidents,
        overdueCleaning,
        pendingMaintenance,
        unresolvedGuestRequests,
      },
      analytics: {
        cleaningCompletionRate,
        readinessRate,
        avgResolutionHours,
        guestInquiryVolume: aiRange.length + supportRange.length,
        aiDeflectionRate:
          aiRange.length > 0
            ? Math.round((aiRange.filter((a) => a.escalated === 0).length / aiRange.length) * 100)
            : null,
        knowledgeGapsOpen,
        avgFeedbackScore,
        categoryBreakdown,
      },
      propertyReadinessMatrix: propertyList,
    });
  })
);

adminRouter.get(
  '/ai-console',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);

    const conversations = await db.query<any>(
      `SELECT a.*, p.name as property_name
       FROM ai_conversations a
       JOIN properties p ON p.id = a.property_id
       WHERE a.organization_id = $1
       ORDER BY a.created_at DESC`,
      [actor.organizationId]
    );

    res.json(
      conversations
        .filter((c) => canAccessProperty(actor, c.property_id))
        .map((c) => ({
          ...c,
          verified_sources: JSON.parse(c.verified_sources_json || '[]'),
        }))
    );
  })
);

adminRouter.post(
  '/ai-console/gaps/:id/resolve',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const row = await db.queryOne<any>(
      'SELECT * FROM ai_conversations WHERE id = $1 AND organization_id = $2',
      [req.params.id, actor.organizationId]
    );
    if (!row) return res.status(404).json({ error: 'Conversation not found.' });

    const { answerNote } = req.body || {};
    if (!answerNote || !String(answerNote).trim()) {
      return res.status(400).json({ error: 'Verified answer note is required to publish to Welcome Book.' });
    }

    const sec = await db.queryOne<any>(
      `SELECT * FROM guidebook_sections WHERE property_id = $1 AND section_key = 'welcome'`,
      [row.property_id]
    );

    if (sec) {
      const content = JSON.parse(sec.content_json);
      content.importantNotes = `${content.importantNotes || ''}\n• ${String(answerNote).trim()}`.trim();
      await db.execute('UPDATE guidebook_sections SET content_json = $1, updated_at = $2 WHERE id = $3', [
        JSON.stringify(content),
        nowIso(),
        sec.id,
      ]);
    }

    await db.execute('UPDATE ai_conversations SET gap_resolved = 1 WHERE id = $1', [row.id]);

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: row.property_id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'AI_KNOWLEDGE_GAP_RESOLVED',
      entityType: 'AIConversation',
      entityId: row.id,
      details: `Published verified host answer into Welcome Book to close AI knowledge gap.`,
    });

    res.json({ ok: true });
  })
);

adminRouter.get(
  '/support-requests',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const rows = await db.query<any>(
      `SELECT s.*, p.name as property_name
       FROM support_requests s
       JOIN properties p ON p.id = s.property_id
       WHERE s.organization_id = $1
       ORDER BY s.created_at DESC`,
      [actor.organizationId]
    );
    res.json(rows.filter((r) => canAccessProperty(actor, r.property_id)));
  })
);

adminRouter.patch(
  '/support-requests/:id',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const existing = await db.queryOne<any>(
      'SELECT * FROM support_requests WHERE id = $1 AND organization_id = $2',
      [req.params.id, actor.organizationId]
    );
    if (!existing) return res.status(404).json({ error: 'Support request not found.' });

    await db.execute('UPDATE support_requests SET status = $1 WHERE id = $2', [
      req.body?.status || 'Resolved',
      existing.id,
    ]);
    await logAudit({
      organizationId: actor.organizationId,
      propertyId: existing.property_id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'SUPPORT_REQUEST_UPDATED',
      entityType: 'SupportRequest',
      entityId: existing.id,
      details: `Updated guest support request "${existing.subject}" → ${req.body?.status || 'Resolved'}.`,
    });
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/team',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'),
  ah(async (req, res) => {
    const actor = getActor(req);

    const [members, cleaningStats] = await Promise.all([
      db.query<any>(
        `SELECT m.id as membership_id, m.role, m.assigned_property_ids_json, m.status, m.created_at,
                u.id as user_id, u.name, u.email, u.avatar_initials, u.neon_auth_id
         FROM organization_memberships m
         JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = $1
         ORDER BY m.created_at ASC`,
        [actor.organizationId]
      ),
      db.query<any>(`SELECT assigned_name, status FROM cleaning_tasks WHERE organization_id = $1`, [
        actor.organizationId,
      ]),
    ]);

    res.json(
      members.map((m) => {
        const assigned = cleaningStats.filter((t) => t.assigned_name === m.name);
        return {
          ...m,
          neon_linked: Boolean(m.neon_auth_id),
          assigned_property_ids: JSON.parse(m.assigned_property_ids_json || '["*"]'),
          workload_total: assigned.length,
          workload_completed: assigned.filter((t) => t.status === 'Completed').length,
        };
      })
    );
  })
);

adminRouter.post(
  '/team/invite',
  requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const { name, email, role, assigned_property_ids } = req.body || {};
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required.' });
    }

    const ALLOWED_ORG_ROLES = [
      'Organization Admin',
      'Property Manager',
      'Cleaning Staff',
      'Maintenance Technician',
      'Inspector',
      'Concierge',
    ];
    if (!ALLOWED_ORG_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid organization staff role.' });
    }

    let user = await db.queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [String(email).trim()]);
    const now = nowIso();

    if (!user) {
      const userId = uid('usr');
      const initials = String(name)
        .split(/\s+/)
        .map((p: string) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      await db.execute(
        'INSERT INTO users (id, neon_auth_id, name, email, password_hash, avatar_initials, created_at) VALUES ($1, NULL, $2, $3, NULL, $4, $5)',
        [userId, String(name).trim(), String(email).trim(), initials || 'TM', now]
      );
      user = { id: userId, name: String(name).trim(), email: String(email).trim(), avatar_initials: initials };
    }

    const existingMem = await db.queryOne(
      'SELECT id FROM organization_memberships WHERE organization_id = $1 AND user_id = $2',
      [actor.organizationId, user.id]
    );
    if (existingMem) {
      return res.status(409).json({ error: 'User is already a member of this organization.' });
    }

    const memId = uid('mem');
    await db.execute(
      `INSERT INTO organization_memberships (id, organization_id, user_id, role, assigned_property_ids_json, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Active', $6)`,
      [memId, actor.organizationId, user.id, role, JSON.stringify(assigned_property_ids || ['*']), now]
    );

    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'TEAM_MEMBER_INVITED',
      entityType: 'OrganizationMembership',
      entityId: memId,
      details: `Invited ${name} (${email}) with role "${role}". They can sign in via Neon Auth using this email to activate automatically.`,
    });

    res.status(201).json({ ok: true, membership_id: memId });
  })
);

adminRouter.get(
  '/automations',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const [rules, notifications] = await Promise.all([
      db.query<any>('SELECT * FROM automation_rules WHERE organization_id = $1', [actor.organizationId]),
      db.query<any>(
        `SELECT n.*, p.name as property_name
         FROM notifications n
         LEFT JOIN properties p ON p.id = n.property_id
         WHERE n.organization_id = $1
         ORDER BY n.created_at DESC
         LIMIT 40`,
        [actor.organizationId]
      ),
    ]);

    res.json({
      rules: rules.map((r) => ({ ...r, enabled: Boolean(r.enabled), quiet_hours_respected: Boolean(r.quiet_hours_respected) })),
      notifications,
    });
  })
);

adminRouter.patch(
  '/automations/:id',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const existing = await db.queryOne<any>(
      'SELECT * FROM automation_rules WHERE id = $1 AND organization_id = $2',
      [req.params.id, actor.organizationId]
    );
    if (!existing) return res.status(404).json({ error: 'Rule not found.' });

    const b = req.body || {};
    await db.execute('UPDATE automation_rules SET enabled = $1, quiet_hours_respected = $2 WHERE id = $3', [
      b.enabled !== undefined ? (b.enabled ? 1 : 0) : existing.enabled,
      b.quiet_hours_respected !== undefined ? (b.quiet_hours_respected ? 1 : 0) : existing.quiet_hours_respected,
      existing.id,
    ]);

    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'AUTOMATION_RULE_TOGGLED',
      entityType: 'AutomationRule',
      entityId: existing.id,
      details: `Updated automation "${existing.name}" (enabled=${b.enabled ?? existing.enabled}).`,
    });

    res.json({ ok: true });
  })
);

adminRouter.get(
  '/feedback',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const rows = await db.query<any>(
      `SELECT f.*, p.name as property_name
       FROM feedback f
       JOIN properties p ON p.id = f.property_id
       WHERE f.organization_id = $1
       ORDER BY f.created_at DESC`,
      [actor.organizationId]
    );
    res.json(rows.filter((r) => canAccessProperty(actor, r.property_id)));
  })
);

adminRouter.patch(
  '/feedback/:id',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);
    await db.execute('UPDATE feedback SET follow_up_status = $1 WHERE id = $2 AND organization_id = $3', [
      req.body?.follow_up_status || 'Followed Up',
      req.params.id,
      actor.organizationId,
    ]);
    res.json({ ok: true });
  })
);

adminRouter.get(
  '/audit-logs',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const rows = await db.query(
      `SELECT a.*, p.name as property_name
       FROM audit_logs a
       LEFT JOIN properties p ON p.id = a.property_id
       WHERE a.organization_id = $1
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [actor.organizationId]
    );
    res.json(rows);
  })
);

adminRouter.patch(
  '/organization/settings',
  requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const b = req.body || {};
    await db.execute(
      `UPDATE organizations SET
        name = $1, brand_color = $2, contact_email = $3, contact_phone = $4, default_country = $5,
        require_cleaning_approval = $6, require_pre_arrival_inspection = $7
       WHERE id = $8`,
      [
        b.name ?? org.name,
        b.brand_color ?? org.brand_color,
        b.contact_email ?? org.contact_email,
        b.contact_phone ?? org.contact_phone,
        b.default_country ?? org.default_country,
        b.require_cleaning_approval !== undefined ? (b.require_cleaning_approval ? 1 : 0) : org.require_cleaning_approval,
        b.require_pre_arrival_inspection !== undefined
          ? b.require_pre_arrival_inspection
            ? 1
            : 0
          : org.require_pre_arrival_inspection,
        org.id,
      ]
    );

    const props = await db.query<{ id: string }>('SELECT id FROM properties WHERE organization_id = $1', [org.id]);
    for (const p of props) await computePropertyReadiness(p.id);

    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'Organization',
      entityId: org.id,
      details: `Updated organization profile & operational readiness rules.`,
    });

    res.json(await db.queryOne('SELECT * FROM organizations WHERE id = $1', [org.id]));
  })
);

adminRouter.get(
  '/billing',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const activeRow = await db.queryOne<{ c: number }>(
      'SELECT COUNT(*)::int as c FROM properties WHERE organization_id = $1 AND archived = 0',
      [actor.organizationId]
    );
    const activePropertiesCount = activeRow?.c ?? 0;

    const monthPrefix = nowIso().slice(0, 7);
    const aiRow = await db.queryOne<{ c: number }>(
      'SELECT COUNT(*)::int as c FROM ai_conversations WHERE organization_id = $1 AND created_at LIKE $2',
      [actor.organizationId, `${monthPrefix}%`]
    );
    const aiUsedThisMonth = aiRow?.c ?? 0;

    const invoices = await db.query(
      'SELECT * FROM payment_records WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 24',
      [actor.organizationId]
    );

    res.json({
      organization: org,
      activePropertiesCount,
      aiUsedThisMonth,
      aiMonthlyAllowance: org.ai_monthly_allowance || 500,
      invoices,
    });
  })
);

adminRouter.post(
  '/organization/billing',
  requireRoles('Organization Owner', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const { planTier } = req.body || {};
    const spec = PLAN_CATALOG[planTier];
    if (!spec) return res.status(400).json({ error: 'Invalid plan tier.' });

    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const countRow = await db.queryOne<{ c: number }>(
      'SELECT COUNT(*)::int as c FROM properties WHERE organization_id = $1 AND archived = 0',
      [actor.organizationId]
    );
    const activeCount = countRow?.c ?? 0;

    if (activeCount > spec.limit) {
      return res.status(409).json({
        error: `Cannot downgrade to ${planTier} (max ${spec.limit} properties): you currently have ${activeCount} active properties. Archive ${activeCount - spec.limit} property(ies) first.`,
        code: 'DOWNGRADE_EXCEEDS_ACTIVE_PROPERTIES',
      });
    }

    const now = nowIso();
    const CURRENCY_MAP: Record<string, string> = { US: 'USD', CA: 'CAD', GB: 'GBP', EU: 'EUR', AU: 'AUD', INTL: 'USD' };
    const currency = CURRENCY_MAP[org.default_country] || 'USD';
    const invoiceNum = `INV-${new Date().getUTCFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;

    await db.transaction(async (tx) => {
      await tx.execute('UPDATE organizations SET plan_tier = $1, property_limit = $2, ai_monthly_allowance = $3 WHERE id = $4', [
        planTier,
        spec.limit,
        spec.aiQuota,
        actor.organizationId,
      ]);

      await tx.execute(
        `INSERT INTO payment_records (id, organization_id, plan_tier, amount_cents, tax_cents, currency, status, invoice_number, period_label, created_at)
         VALUES ($1, $2, $3, 0, 0, $4, 'Early Access ($0)', $5, $6, $7)`,
        [
          uid('pay'),
          actor.organizationId,
          planTier,
          currency,
          invoiceNum,
          new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' Early Access',
          now,
        ]
      );
    });

    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'BILLING_PLAN_CHANGED',
      entityType: 'Organization',
      entityId: actor.organizationId,
      details: `Switched subscription plan to ${planTier} (up to ${spec.limit} properties, ${spec.aiQuota} AI queries/mo) · Invoice ${invoiceNum}.`,
    });

    res.json(await db.queryOne('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]));
  })
);

adminRouter.get(
  '/backups',
  requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const database = await getNeonDatabaseOverview(actor.organizationId);
    res.json({ database });
  })
);

adminRouter.post(
  '/backups/run',
  requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const database = await getNeonDatabaseOverview(actor.organizationId);
    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'DATABASE_SNAPSHOT_VERIFIED',
      entityType: 'Backup',
      entityId: 'neon-pitr',
      details: `Verified Neon PostgreSQL point-in-time recovery state (${database.counts.properties} properties, ${database.counts.reservations} stays, ${database.mediaStorage}).`,
    });
    res.status(201).json({ database });
  })
);

adminRouter.get(
  '/organization/export',
  requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const [
      members,
      properties,
      sectionsRaw,
      reservations,
      cleaningTasks,
      incidents,
      inspections,
      feedback,
      paymentRecords,
      auditLogs,
    ] = await Promise.all([
      db.query(
        `SELECT m.id, m.role, m.assigned_property_ids_json, m.status, u.name, u.email
         FROM organization_memberships m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = $1`,
        [org.id]
      ),
      db.query('SELECT * FROM properties WHERE organization_id = $1', [org.id]),
      db.query<any>('SELECT * FROM guidebook_sections WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM reservations WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM cleaning_tasks WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM incidents WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM inspections WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM feedback WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM payment_records WHERE organization_id = $1', [org.id]),
      db.query('SELECT * FROM audit_logs WHERE organization_id = $1', [org.id]),
    ]);

    const guidebookSections = sectionsRaw.map((s) => {
      let parsed = JSON.parse(s.content_json);
      if (s.section_key === 'checkin') parsed = decryptCheckinContent(parsed);
      if (s.section_key === 'wifi_home') parsed = decryptWifiContent(parsed);
      return { ...s, content: parsed, content_json: undefined };
    });

    const bundle = {
      exportedAt: nowIso(),
      exportedBy: actor.actorName,
      organization: org,
      members,
      properties,
      guidebookSections,
      reservations,
      cleaningTasks,
      incidents,
      inspections,
      feedback,
      paymentRecords,
      auditLogs,
    };

    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'ORGANIZATION_DATA_EXPORTED',
      entityType: 'Organization',
      entityId: org.id,
      details: `Exported complete organization JSON archive (GDPR / Privacy Act portability).`,
    });

    res.setHeader('Content-Disposition', `attachment; filename="staywise-export-${org.slug}-${nowIso().slice(0, 10)}.json"`);
    res.json(bundle);
  })
);

adminRouter.delete(
  '/organization',
  requireRoles('Organization Owner', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const confirmName = req.body?.confirmName;
    if (!confirmName || String(confirmName).trim() !== org.name) {
      return res.status(400).json({ error: `Please type "${org.name}" exactly to confirm permanent deletion.` });
    }

    const memberUserIds = await db.query<{ user_id: string }>(
      'SELECT user_id FROM organization_memberships WHERE organization_id = $1',
      [org.id]
    );

    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM organizations WHERE id = $1', [org.id]);
      for (const m of memberUserIds) {
        const remaining = await tx.queryOne<{ c: number }>(
          'SELECT COUNT(*)::int as c FROM organization_memberships WHERE user_id = $1',
          [m.user_id]
        );
        if ((remaining?.c ?? 0) === 0) {
          await tx.execute('DELETE FROM users WHERE id = $1', [m.user_id]);
        }
      }
    });

    res.json({ ok: true, deletedOrganizationId: org.id });
  })
);
