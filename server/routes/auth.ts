import { Router } from 'express';
import { db } from '../db.js';
import { ah, getActor, logAudit, nowIso, requireAuth, resolveNeonJwt, uid } from '../domain.js';
import { createRateLimiter, getNeonAuthBaseUrl } from '../security.js';

export const authRouter = Router();

const authLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: 'auth',
});

const PLAN_META: Record<string, { limit: number; cents: number; aiQuota: number }> = {
  Starter: { limit: 2, cents: 1900, aiQuota: 100 },
  Professional: { limit: 10, cents: 4900, aiQuota: 500 },
  Portfolio: { limit: 25, cents: 9900, aiQuota: 2000 },
};

authRouter.get(
  '/context',
  ah(async (req, res) => {
    const neonUser = await resolveNeonJwt(req);
    const neonAuthUrl = getNeonAuthBaseUrl();

    if (!neonUser) {
      return res.json({
        authenticated: false,
        needsOnboarding: false,
        user: null,
        neonUser: null,
        organization: null,
        organizations: [],
        members: [],
        neonAuthUrl,
      });
    }

    let user = await db.queryOne<any>('SELECT * FROM users WHERE neon_auth_id = $1', [neonUser.sub]);
    if (!user) {
      const byEmail = await db.queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [neonUser.email]);
      if (byEmail && !byEmail.neon_auth_id) {
        await db.execute('UPDATE users SET neon_auth_id = $1 WHERE id = $2', [neonUser.sub, byEmail.id]);
        user = { ...byEmail, neon_auth_id: neonUser.sub };
      }
    }

    if (!user) {
      return res.json({
        authenticated: true,
        needsOnboarding: true,
        user: null,
        neonUser,
        organization: null,
        organizations: [],
        members: [],
        neonAuthUrl,
      });
    }

    const memberships = await db.query<any>(
      `SELECT m.*, o.name as org_name, o.slug as org_slug, o.default_country, o.plan_tier, o.property_limit
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND m.status = 'Active'
       ORDER BY o.created_at ASC`,
      [user.id]
    );

    if (memberships.length === 0) {
      return res.json({
        authenticated: true,
        needsOnboarding: true,
        user: null,
        neonUser,
        organization: null,
        organizations: [],
        members: [],
        neonAuthUrl,
      });
    }

    const requestedOrgId =
      typeof req.headers['x-staywise-org'] === 'string' ? req.headers['x-staywise-org'].trim() : '';
    const activeMembership =
      memberships.find((m) => m.organization_id === requestedOrgId) || memberships[0];

    const currentOrg = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [
      activeMembership.organization_id,
    ]);

    const organizations = memberships.map((m) => ({
      id: m.organization_id,
      name: m.org_name,
      slug: m.org_slug,
      default_country: m.default_country,
      plan_tier: m.plan_tier,
      property_limit: m.property_limit,
    }));

    const canSeeMemberEmails = ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'].includes(
      activeMembership.role
    );

    const membersRows = await db.query<any>(
      `SELECT m.id as membership_id, m.role, m.assigned_property_ids_json, m.status,
              u.id as user_id, u.name, u.email, u.avatar_initials
       FROM organization_memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = $1 AND m.status = 'Active'
       ORDER BY m.created_at ASC`,
      [activeMembership.organization_id]
    );

    const members = membersRows.map((m) => ({
      ...m,
      email: canSeeMemberEmails ? m.email : '',
    }));

    let assignedPropertyIds: string[] = ['*'];
    try {
      assignedPropertyIds = JSON.parse(activeMembership.assigned_property_ids_json || '["*"]');
    } catch {
      assignedPropertyIds = ['*'];
    }

    res.json({
      authenticated: true,
      needsOnboarding: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_initials: user.avatar_initials,
        role: activeMembership.role,
        organizationId: activeMembership.organization_id,
        assignedPropertyIds,
      },
      neonUser,
      organization: currentOrg || null,
      organizations,
      members,
      neonAuthUrl,
    });
  })
);

authRouter.post(
  '/onboard',
  authLimiter,
  ah(async (req, res) => {
    const neonUser = await resolveNeonJwt(req);
    if (!neonUser) {
      return res.status(401).json({ error: 'Valid Neon Auth session required before creating a workspace.' });
    }

    const { orgName, ownerName, country = 'US', planTier = 'Starter', contactPhone, termsAccepted, privacyAccepted } =
      req.body || {};

    if (!orgName || !String(orgName).trim()) {
      return res.status(400).json({ error: 'Organization name is required.' });
    }
    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy.' });
    }

    const chosenPlan = PLAN_META[planTier] ? planTier : 'Starter';
    const { limit, cents, aiQuota } = PLAN_META[chosenPlan];
    const displayName = String(ownerName || neonUser.name || neonUser.email.split('@')[0]).trim();

    const orgId = uid('org');
    const memId = uid('mem');
    const slug =
      String(orgName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 899);

    const initials = displayName
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const now = nowIso();
    const CURRENCY_BY_REGION: Record<string, string> = {
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      EU: 'EUR',
      AU: 'AUD',
      INTL: 'USD',
    };
    const PHONE_BY_REGION: Record<string, string> = {
      US: '+1 (555) 010-0100',
      CA: '+1 (416) 555-0100',
      GB: '+44 20 7946 0100',
      EU: '+33 1 42 68 55 00',
      AU: '+61 400 000 000',
      INTL: '+1 (555) 010-0100',
    };
    const rawCountry = String(country || 'US').toUpperCase();
    const safeCountry = CURRENCY_BY_REGION[rawCountry] ? rawCountry : 'US';
    const currency = CURRENCY_BY_REGION[safeCountry];
    const invoiceNum = `INV-${new Date().getUTCFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;

    let userId = '';

    await db.transaction(async (tx) => {
      const existingUser = await tx.queryOne<any>(
        'SELECT * FROM users WHERE neon_auth_id = $1 OR LOWER(email) = LOWER($2)',
        [neonUser.sub, neonUser.email]
      );

      if (existingUser) {
        userId = existingUser.id;
        await tx.execute('UPDATE users SET neon_auth_id = $1, name = $2 WHERE id = $3', [
          neonUser.sub,
          displayName,
          userId,
        ]);
      } else {
        userId = uid('usr');
        await tx.execute(
          `INSERT INTO users (id, neon_auth_id, name, email, password_hash, avatar_initials, created_at)
           VALUES ($1, $2, $3, $4, NULL, $5, $6)`,
          [userId, neonUser.sub, displayName, neonUser.email, initials || 'OW', now]
        );
      }

      await tx.execute(
        `INSERT INTO organizations (id, name, slug, brand_color, contact_email, contact_phone, default_country, plan_tier, property_limit, ai_monthly_allowance, require_cleaning_approval, require_pre_arrival_inspection, terms_accepted_at, privacy_accepted_at, created_at)
         VALUES ($1, $2, $3, '#0F766E', $4, $5, $6, $7, $8, $9, 1, 1, $10, $11, $12)`,
        [
          orgId,
          String(orgName).trim(),
          slug,
          neonUser.email,
          contactPhone || PHONE_BY_REGION[safeCountry],
          safeCountry,
          chosenPlan,
          limit,
          aiQuota,
          now,
          now,
          now,
        ]
      );

      await tx.execute(
        `INSERT INTO organization_memberships (id, organization_id, user_id, role, assigned_property_ids_json, status, created_at)
         VALUES ($1, $2, $3, 'Organization Owner', '["*"]', 'Active', $4)`,
        [memId, orgId, userId, now]
      );

      await tx.execute(
        `INSERT INTO payment_records (id, organization_id, plan_tier, amount_cents, tax_cents, currency, status, invoice_number, period_label, created_at)
         VALUES ($1, $2, $3, $4, 0, $5, 'Paid', $6, $7, $8)`,
        [
          uid('pay'),
          orgId,
          chosenPlan,
          cents,
          currency,
          invoiceNum,
          new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ' Monthly',
          now,
        ]
      );

      await tx.execute(
        `INSERT INTO automation_rules (id, organization_id, name, trigger_event, channel, recipient_role, enabled, quiet_hours_respected, description)
         VALUES ($1, $2, 'Critical Incident Alert', 'Critical incident', 'SMS + Email + In-App', 'Organization Owner', 1, 1, $3)`,
        [
          uid('aut'),
          orgId,
          'Immediately alerts property owner and assigned technician when a critical issue occurs.',
        ]
      );
    });

    await logAudit({
      organizationId: orgId,
      actorName: displayName,
      actorRole: 'Organization Owner',
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: orgId,
      details: `Provisioned organization "${String(orgName).trim()}" via Neon Auth on ${chosenPlan} plan (${limit} properties max).`,
    });

    const organization = await db.queryOne('SELECT * FROM organizations WHERE id = $1', [orgId]);
    res.status(201).json({
      ok: true,
      organization,
      user: {
        id: userId,
        name: displayName,
        email: neonUser.email,
        role: 'Organization Owner',
        organizationId: orgId,
        avatar_initials: initials || 'OW',
      },
    });
  })
);

authRouter.post(
  '/accept-legal',
  requireAuth,
  ah(async (req, res) => {
    const actor = getActor(req);
    const now = nowIso();
    await db.execute('UPDATE organizations SET terms_accepted_at = $1, privacy_accepted_at = $2 WHERE id = $3', [
      now,
      now,
      actor.organizationId,
    ]);
    res.json({ ok: true, acceptedAt: now });
  })
);
