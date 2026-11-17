import { validateAssignments } from '../lib/authorization.js';
import { Router } from 'express';
import { db } from '../db.js';
import { getNeonDatabaseOverview } from '../backup.js';
import { ah, getActor, logAudit, nowIso, requireAuth, requirePlatformAdmin } from '../domain.js';
import { parsePlanTier } from '../../src/lib/plans.js';

export const platformCrmRouter = Router();
platformCrmRouter.use(requireAuth, requirePlatformAdmin);

const VALID_CRM_STAGES = new Set(['Onboarding', 'Active', 'Power Host', 'VIP', 'At Risk', 'Churned']);
const VALID_ACCOUNT_STATUSES = new Set(['Active', 'Suspended']);
const VALID_MEMBER_ROLES = new Set([
  'Platform Super Admin',
  'Organization Owner',
  'Organization Admin',
  'Property Manager',
  'Concierge',
  'Cleaning Staff',
  'Maintenance Technician',
  'Inspector',
]);

platformCrmRouter.get(
  '/overview',
  ah(async (req, res) => {
    const actor = getActor(req);
    const monthPrefix = nowIso().slice(0, 7);
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      orgs,
      users,
      memberships,
      props,
      reservations,
      incidents,
      aiRows,
      supportRequests,
      feedbackRows,
      auditLogs,
      databaseHealth,
    ] = await Promise.all([
      db.query<any>('SELECT * FROM organizations ORDER BY created_at DESC'),
      db.query<any>('SELECT id, name, email, avatar_initials, neon_auth_id, created_at FROM users ORDER BY created_at DESC'),
      db.query<any>(
        `SELECT m.id, m.organization_id, m.user_id, m.role, m.status, m.created_at,
                u.name as user_name, u.email as user_email, u.neon_auth_id,
                o.name as org_name, o.slug as org_slug
         FROM organization_memberships m
         JOIN users u ON u.id = m.user_id
         JOIN organizations o ON o.id = m.organization_id
         ORDER BY m.created_at DESC`
      ),
      db.query<any>('SELECT id, organization_id, readiness_status, archived, country FROM properties'),
      db.query<any>('SELECT id, organization_id, status FROM reservations'),
      db.query<any>('SELECT id, organization_id, status, priority FROM incidents'),
      db.query<any>('SELECT id, organization_id, created_at FROM ai_conversations'),
      db.query<any>(
        `SELECT s.*, o.name as org_name, p.name as property_name
         FROM support_requests s
         JOIN organizations o ON o.id = s.organization_id
         LEFT JOIN properties p ON p.id = s.property_id AND p.organization_id = s.organization_id
         ORDER BY s.created_at DESC LIMIT 40`
      ),
      db.query<any>(
        `SELECT f.*, o.name as org_name, p.name as property_name
         FROM feedback f
         JOIN organizations o ON o.id = f.organization_id
         LEFT JOIN properties p ON p.id = f.property_id AND p.organization_id = f.organization_id
         ORDER BY f.created_at DESC LIMIT 40`
      ),
      db.query<any>(
        `SELECT a.*, o.name as org_name
         FROM audit_logs a
         JOIN organizations o ON o.id = a.organization_id
         ORDER BY a.created_at DESC LIMIT 60`
      ),
      getNeonDatabaseOverview(actor.organizationId),
    ]);

    const enrichedOrgs = orgs.map((org) => {
      const orgMembers = memberships.filter((m) => m.organization_id === org.id);
      const owner = orgMembers.find((m) => m.role === 'Organization Owner') || orgMembers[0];
      const activeProps = props.filter((p) => p.organization_id === org.id && p.archived === 0);
      const orgStays = reservations.filter((r) => r.organization_id === org.id && r.status !== 'Cancelled');
      const orgOpenIncidents = incidents.filter((i) => i.organization_id === org.id && i.status !== 'Resolved');
      const orgAiMonth = aiRows.filter((a) => a.organization_id === org.id && a.created_at.startsWith(monthPrefix));

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        default_country: org.default_country,
        plan_tier: org.plan_tier,
        property_limit: org.property_limit,
        ai_monthly_allowance: org.ai_monthly_allowance || 250,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
        crm_stage: org.crm_stage || 'Active',
        account_status: org.account_status || 'Active',
        crm_notes: org.crm_notes || '',
        last_contacted_at: org.last_contacted_at || null,
        created_at: org.created_at,
        owner_name: owner?.user_name || '—',
        owner_email: owner?.user_email || org.contact_email,
        neon_linked: Boolean(owner?.neon_auth_id),
        member_count: orgMembers.filter((m) => m.status === 'Active').length,
        active_properties: activeProps.length,
        ready_properties: activeProps.filter((p) => p.readiness_status === 'Ready').length,
        reservations_count: orgStays.length,
        open_incidents: orgOpenIncidents.length,
        ai_used_month: orgAiMonth.length,
      };
    });

    const userDirectory = users.map((u) => {
      const userMems = memberships.filter((m) => m.user_id === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_initials: u.avatar_initials,
        neon_linked: Boolean(u.neon_auth_id),
        created_at: u.created_at,
        workspaces: userMems.map((m) => ({
          membership_id: m.id,
          organization_id: m.organization_id,
          org_name: m.org_name,
          role: m.role,
          status: m.status,
        })),
      };
    });

    const kpis = {
      totalOrganizations: orgs.length,
      activeOrganizations: orgs.filter((o) => (o.account_status || 'Active') === 'Active').length,
      suspendedOrganizations: orgs.filter((o) => o.account_status === 'Suspended').length,
      newOrgsLast7d: orgs.filter((o) => o.created_at >= sevenDaysAgoIso).length,
      totalUsers: users.length,
      neonVerifiedUsers: users.filter((u) => Boolean(u.neon_auth_id)).length,
      totalActiveProperties: props.filter((p) => p.archived === 0).length,
      totalReservations: reservations.filter((r) => r.status !== 'Cancelled').length,
      openIncidents: incidents.filter((i) => i.status !== 'Resolved').length,
      aiQueriesThisMonth: aiRows.filter((a) => a.created_at.startsWith(monthPrefix)).length,
      openSupportEscalations: supportRequests.filter((s) => s.status !== 'Resolved').length,
    };

    res.json({
      kpis,
      organizations: enrichedOrgs,
      users: userDirectory,
      supportRequests,
      feedback: feedbackRows,
      auditLogs,
      databaseHealth,
    });
  })
);

platformCrmRouter.patch(
  '/organizations/:orgId',
  ah(async (req, res) => {
    const actor = getActor(req);
    const orgId = String(req.params.orgId || '');
    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [orgId]);
    if (!org) return res.status(404).json({ error: 'Client organization not found.' });

    const b = req.body || {};
    let nextPlan = org.plan_tier;
    if (b.plan_tier !== undefined) {
      const parsed = parsePlanTier(b.plan_tier);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid plan tier. Choose Starter, Professional, or Portfolio.' });
      }
      nextPlan = parsed;
    }

    let nextLimit = Number(org.property_limit);
    if (b.property_limit !== undefined) {
      const n = Number(b.property_limit);
      if (!Number.isInteger(n) || n < 1 || n > 5000) {
        return res.status(400).json({ error: 'Property limit must be an integer between 1 and 5000.' });
      }
      nextLimit = n;
    }

    let nextAiQuota = Number(org.ai_monthly_allowance || 250);
    if (b.ai_monthly_allowance !== undefined) {
      const n = Number(b.ai_monthly_allowance);
      if (!Number.isInteger(n) || n < 0 || n > 100000) {
        return res.status(400).json({ error: 'AI allowance must be an integer between 0 and 100000.' });
      }
      nextAiQuota = n;
    }

    let nextStage = org.crm_stage || 'Active';
    if (b.crm_stage !== undefined) {
      if (!VALID_CRM_STAGES.has(b.crm_stage)) {
        return res.status(400).json({ error: 'Invalid CRM stage.' });
      }
      nextStage = b.crm_stage;
    }

    let nextStatus = org.account_status || 'Active';
    if (b.account_status !== undefined) {
      if (!VALID_ACCOUNT_STATUSES.has(b.account_status)) {
        return res.status(400).json({ error: 'Account status must be Active or Suspended.' });
      }
      if (org.id === actor.organizationId && b.account_status === 'Suspended') {
        return res.status(400).json({ error: 'Cannot suspend the active founder workspace.' });
      }
      nextStatus = b.account_status;
    }

    const nextNotes = b.crm_notes !== undefined ? String(b.crm_notes).slice(0, 4000) : org.crm_notes || '';
    const nextContacted =
      b.markContactedNow === true
        ? nowIso()
        : b.last_contacted_at !== undefined
          ? b.last_contacted_at
          : org.last_contacted_at || null;

    await db.execute(
      `UPDATE organizations
       SET plan_tier = $1, property_limit = $2, ai_monthly_allowance = $3,
           crm_stage = $4, account_status = $5, crm_notes = $6, last_contacted_at = $7
       WHERE id = $8`,
      [nextPlan, nextLimit, nextAiQuota, nextStage, nextStatus, nextNotes, nextContacted, orgId]
    );

    await logAudit({
      organizationId: orgId,
      actorName: actor.actorName,
      actorRole: 'Platform Super Admin',
      action: 'PLATFORM_CRM_ORG_UPDATED',
      entityType: 'Organization',
      entityId: orgId,
      details: `Founder CRM updated ${org.name}: stage=${nextStage}, status=${nextStatus}, plan=${nextPlan} (${nextLimit} props, ${nextAiQuota} AI/mo).`,
    });

    res.json(await db.queryOne('SELECT * FROM organizations WHERE id = $1', [orgId]));
  })
);

platformCrmRouter.patch(
  '/memberships/:membershipId',
  ah(async (req, res) => {
    const actor = getActor(req);
    const membershipId = String(req.params.membershipId || '');
    const mem = await db.queryOne<any>('SELECT * FROM organization_memberships WHERE id = $1', [membershipId]);
    if (!mem) return res.status(404).json({ error: 'Membership not found.' });

    const b = req.body || {};
    const nextRole = b.role ?? mem.role;
    const nextStatus = b.status ?? mem.status;

    if (!VALID_MEMBER_ROLES.has(nextRole)) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }
    if (!['Active', 'Inactive'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Status must be Active or Inactive.' });
    }

    await validateAssignments(db, mem.organization_id, nextRole, b.assigned_property_ids ?? JSON.parse(mem.assigned_property_ids_json));
    await db.execute('UPDATE organization_memberships SET role = $1, status = $2 WHERE id = $3', [
      nextRole,
      nextStatus,
      membershipId,
    ]);

    await logAudit({
      organizationId: mem.organization_id,
      actorName: actor.actorName,
      actorRole: 'Platform Super Admin',
      action: 'PLATFORM_CRM_MEMBERSHIP_UPDATED',
      entityType: 'Membership',
      entityId: membershipId,
      details: `Founder CRM updated membership ${membershipId} -> role=${nextRole}, status=${nextStatus}.`,
    });

    res.json({ ok: true, id: membershipId, role: nextRole, status: nextStatus });
  })
);

platformCrmRouter.delete(
  '/organizations/:orgId',
  ah(async (req, res) => {
    const actor = getActor(req);
    const orgId = String(req.params.orgId || '');
    if (orgId === actor.organizationId) {
      return res.status(400).json({ error: 'Cannot delete the active founder workspace from CRM.' });
    }

    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [orgId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const confirmSlug = String(req.body?.confirmSlug || '').trim();
    if (confirmSlug !== org.slug && confirmSlug !== org.name) {
      return res.status(400).json({ error: `Type "${org.slug}" to confirm permanent deletion.` });
    }

    const memberUserIds = await db.query<{ user_id: string }>(
      'SELECT user_id FROM organization_memberships WHERE organization_id = $1',
      [orgId]
    );

    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM organizations WHERE id = $1', [orgId]);
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

    res.json({ ok: true, deletedOrgId: orgId });
  })
);
