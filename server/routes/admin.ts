import { issueInvitation, revokeInvitation } from '../lib/invitations.js';
import { authorizeProperty, validateAssignments, ORGANIZATION_WIDE_ROLES } from '../lib/authorization.js';
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
import { getPlanSpec, parsePlanTier } from '../../src/lib/plans.js';
import { percentRatio, ratio } from '../../src/lib/metrics.js';

export const adminRouter = Router();
adminRouter.use(requireAuth);

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
    const cleaningCompletionRate = percentRatio(completedCleanings, cleaningRange.length);
    const readinessRate = percentRatio(readyProperties, propertyList.length);

    const resolved = incidentsRange.filter((i) => i.resolved_at && i.created_at);
    let avgResolutionHours: number | null = null;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce((acc, i) => acc + Math.max(0, Date.parse(i.resolved_at) - Date.parse(i.created_at)), 0);
      const rawHours = ratio(totalMs, resolved.length * 3600000, 0);
      avgResolutionHours = rawHours !== null ? Math.max(1, rawHours) : null;
    }

    const categoryMap: Record<string, number> = {};
    for (const inc of incidentsRange) {
      categoryMap[inc.category] = (categoryMap[inc.category] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(categoryMap).map(([category, count]) => ({ category, count }));

    const avgFeedbackScore = ratio(
      feedbackRange.reduce(
        (acc, f) => acc + (f.cleaning_rating + f.checkin_rating + f.comfort_rating + f.maintenance_rating) / 4,
        0
      ),
      feedbackRange.length,
      2
    );

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
        aiDeflectionRate: percentRatio(
          aiRange.filter((a) => a.escalated === 0).length,
          aiRange.length
        ),
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
       JOIN properties p ON p.id = a.property_id AND p.organization_id = a.organization_id
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
    await authorizeProperty(db, actor, row.property_id);

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
       JOIN properties p ON p.id = s.property_id AND p.organization_id = s.organization_id
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
    await authorizeProperty(db, actor, existing.property_id);

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
          assigned_property_ids: JSON.parse(m.assigned_property_ids_json || '[]'),
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
    const result = await issueInvitation(db, actor, req.body || {});
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(201).json(result);
  })
);

adminRouter.get('/team/invitations', requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'), ah(async (req, res) => {
  const actor = getActor(req);
  const invitations = await db.query('SELECT id,email,name,role,status,created_at,expires_at FROM organization_invitations WHERE organization_id=$1 ORDER BY created_at DESC', [actor.organizationId]);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(invitations);
}));
adminRouter.post('/team/invitations/:id/revoke', requireRoles('Organization Owner', 'Organization Admin', 'Platform Super Admin'), ah(async (req, res) => {
  await revokeInvitation(db, getActor(req), String(req.params.id));
  res.json({ ok: true });
}));

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
         LEFT JOIN properties p ON p.id = n.property_id AND p.organization_id = n.organization_id
         WHERE n.organization_id = $1
         ORDER BY n.created_at DESC
         LIMIT 40`,
        [actor.organizationId]
      ),
    ]);

    res.json({
      deliveryCapabilities: { inApp: true, email: false, sms: false },
      rules: rules.map((r) => ({ ...r, channel: 'In-App', description: 'Internal notification only. Email and SMS are not delivered.', enabled: Boolean(r.enabled), quiet_hours_respected: Boolean(r.quiet_hours_respected) })),
      notifications: notifications.filter((n) => !n.property_id || canAccessProperty(actor, n.property_id)).map(n => ({ ...n, channel: 'In-App' })),
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
       JOIN properties p ON p.id = f.property_id AND p.organization_id = f.organization_id
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
    const feedback = await db.queryOne<any>('SELECT property_id FROM feedback WHERE id=$1 AND organization_id=$2', [req.params.id, actor.organizationId]);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found.' });
    await authorizeProperty(db, actor, feedback.property_id);
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
       LEFT JOIN properties p ON p.id = a.property_id AND p.organization_id = a.organization_id
       WHERE a.organization_id = $1
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [actor.organizationId]
    );
    res.json(rows.filter((row: any) => !row.property_id || canAccessProperty(actor, row.property_id)));
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
      invoices: invoices.filter((record: any) => record.status !== 'Early Access ($0)'),
      billingMode: 'free-access',
      paymentCollectionEnabled: false,
    });
  })
);

adminRouter.post(
  '/organization/billing',
  requireRoles('Organization Owner', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const chosenPlan = parsePlanTier(req.body?.planTier);
    if (!chosenPlan) return res.status(400).json({ error: 'Invalid plan tier. Choose Starter, Professional, or Portfolio.' });
    const spec = getPlanSpec(chosenPlan);

    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const countRow = await db.queryOne<{ c: number }>(
      'SELECT COUNT(*)::int as c FROM properties WHERE organization_id = $1 AND archived = 0',
      [actor.organizationId]
    );
    const activeCount = countRow?.c ?? 0;

    if (activeCount > spec.propertyLimit) {
      return res.status(409).json({
        error: `Cannot switch to ${chosenPlan} (max ${spec.propertyLimit} properties): you currently have ${activeCount} active properties. Archive ${activeCount - spec.propertyLimit} property(ies) first.`,
        code: 'DOWNGRADE_EXCEEDS_ACTIVE_PROPERTIES',
      });
    }

    const now = nowIso();
    await db.transaction(async (tx) => {
      await tx.execute('UPDATE organizations SET plan_tier = $1, property_limit = $2, ai_monthly_allowance = $3 WHERE id = $4', [
        chosenPlan,
        spec.propertyLimit,
        spec.aiMonthlyAllowance,
        actor.organizationId,
      ]);

    });

    await logAudit({
      organizationId: actor.organizationId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'BILLING_PLAN_CHANGED',
      entityType: 'Organization',
      entityId: actor.organizationId,
      details: `Switched workspace tier to ${chosenPlan} (up to ${spec.propertyLimit} properties, ${spec.aiMonthlyAllowance} AI queries/mo, $0 Free Access); no payment collected or invoice issued.`,
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
