import { Router, type Request } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import {
  ah,
  computePropertyReadiness,
  decryptCheckinContent,
  decryptWifiContent,
  dispatchNotification,
  logAudit,
  nowIso,
  resolveGuestVerification,
  runSafeAiAssistant,
  uid,
} from '../domain.js';
import { createRateLimiter } from '../security.js';

export const guestRouter = Router();

const MAX_FAILED_CODE_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60_000;
const LOCKOUT_MS = 15 * 60_000;

function getClientIpHash(req: Request, slug: string): string {
  const fwd = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  const ip = fwd || req.ip || req.socket.remoteAddress || 'unknown';
  return crypto.createHash('sha256').update(`${ip}::${slug}`).digest('hex').slice(0, 48);
}

async function checkGuestBruteForceLock(req: Request, slug: string): Promise<{ blocked: boolean; retryAfterSec: number }> {
  const key = getClientIpHash(req, slug);
  const now = Date.now();
  const row = await db.queryOne<{ fail_count: number; window_start: number; locked_until: number }>(
    'SELECT fail_count, window_start, locked_until FROM guest_verify_attempts WHERE ip_slug = $1',
    [key]
  );
  if (row && Number(row.locked_until) > now) {
    return { blocked: true, retryAfterSec: Math.ceil((Number(row.locked_until) - now) / 1000) };
  }
  return { blocked: false, retryAfterSec: 0 };
}

async function recordGuestCodeAttempt(req: Request, slug: string, valid: boolean, orgId?: string, propId?: string) {
  const key = getClientIpHash(req, slug);
  const now = Date.now();
  if (valid) {
    await db.execute('DELETE FROM guest_verify_attempts WHERE ip_slug = $1', [key]);
    return;
  }
  const existing = await db.queryOne<{ fail_count: number; window_start: number; locked_until: number }>(
    'SELECT fail_count, window_start, locked_until FROM guest_verify_attempts WHERE ip_slug = $1',
    [key]
  );
  let nextCount = 1;
  let windowStart = now;
  if (existing && now - Number(existing.window_start) < ATTEMPT_WINDOW_MS) {
    nextCount = Number(existing.fail_count) + 1;
    windowStart = Number(existing.window_start);
  }
  const lockedUntil = nextCount >= MAX_FAILED_CODE_ATTEMPTS ? now + LOCKOUT_MS : 0;
  await db.execute(
    `INSERT INTO guest_verify_attempts (ip_slug, fail_count, window_start, locked_until)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (ip_slug) DO UPDATE SET fail_count = $2, window_start = $3, locked_until = $4`,
    [key, nextCount, windowStart, lockedUntil]
  );
  if (lockedUntil > 0 && orgId && propId) {
    await logAudit({
      organizationId: orgId,
      propertyId: propId,
      actorName: 'Rate Limiter',
      actorRole: 'Guest',
      action: 'GUEST_CODE_BRUTEFORCE_BLOCKED',
      entityType: 'Property',
      entityId: propId,
      details: `Blocked repeated invalid access code attempts on ${slug} (${nextCount} attempts in 15m).`,
    });
  }
}

const guestVerifyLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 15,
  prefix: 'guest-verify',
});

const guestActionLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 40,
  prefix: 'guest-action',
});

guestRouter.get(
  '/:slug',
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT * FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );

    if (!prop) return res.status(404).json({ error: 'Property Welcome Book not found.' });

    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    if (code) {
      const lockCheck = await checkGuestBruteForceLock(req, prop.slug);
      if (lockCheck.blocked) {
        res.setHeader('Retry-After', String(lockCheck.retryAfterSec));
        return res.status(429).json({
          error: 'Too many invalid access code attempts. Please wait 15 minutes or contact your host.',
        });
      }
    }

    const verification = await resolveGuestVerification(prop, code);
    if (code) {
      await recordGuestCodeAttempt(req, prop.slug, verification.valid, prop.organization_id, prop.id);
    }
    const isVerified = verification.valid;
    const reservation = verification.valid ? verification.reservation : null;

    const guidebook = await db.queryOne<any>('SELECT * FROM guidebooks WHERE property_id = $1', [prop.id]);
    const sectionsRaw = await db.query<any>(
      'SELECT * FROM guidebook_sections WHERE property_id = $1 AND is_visible = 1 ORDER BY sort_order ASC',
      [prop.id]
    );

    const sections = sectionsRaw.map((sec) => {
      let content = JSON.parse(sec.content_json);
      if (sec.section_key === 'checkin') {
        content = decryptCheckinContent(content);
        if (content.accessRestricted && !isVerified) {
          content.smartLockCode = null;
          content.lockboxInstructions = 'Locked — verify your active booking access code above to reveal lockbox & smart-lock details.';
          content.smartLockInstructions = 'Smart-lock entry PIN unlocks automatically once your stay code is verified.';
        }
      }
      if (sec.section_key === 'wifi_home') {
        content = decryptWifiContent(content);
        if (content.restrictWifiUntilVerified && !isVerified) {
          content.wifiPassword = null;
        }
      }
      return {
        section_key: sec.section_key,
        title: sec.title,
        sort_order: sec.sort_order,
        content,
      };
    });

    const publicProperty = {
      id: prop.id,
      slug: prop.slug,
      name: prop.name,
      address_line: isVerified ? prop.address_line : `${prop.city}, ${prop.state}`,
      city: prop.city,
      state: prop.state,
      postal_code: prop.postal_code,
      country: prop.country,
      timezone: prop.timezone,
      currency: prop.currency,
      temp_unit: prop.temp_unit,
      emergency_number: prop.emergency_number,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      max_occupancy: prop.max_occupancy,
      cover_image: prop.cover_image,
      description: prop.description,
      amenities: JSON.parse(prop.amenities_json || '[]'),
    };

    res.json({
      property: publicProperty,
      guidebook: guidebook
        ? {
            brand_name: guidebook.brand_name,
            accent_color: guidebook.accent_color,
            typography_style: guidebook.typography_style,
            cover_image: guidebook.cover_image,
            section_order: JSON.parse(guidebook.section_order_json || '[]'),
          }
        : null,
      isVerified,
      verificationStatus: verification.valid ? 'verified' : verification.reason,
      reservation: reservation
        ? {
            id: reservation.id,
            guest_name: reservation.guest_name,
            check_in_date: reservation.check_in_date,
            check_out_date: reservation.check_out_date,
            guest_count: reservation.guest_count,
            access_code: reservation.access_code,
            house_rules_acknowledged: Boolean(reservation.house_rules_acknowledged),
            check_out_status: reservation.check_out_status,
          }
        : null,
      sections,
    });
  })
);

guestRouter.post(
  '/:slug/verify',
  guestVerifyLimiter,
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, slug, name, organization_id, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });

    const lockCheck = await checkGuestBruteForceLock(req, prop.slug);
    if (lockCheck.blocked) {
      res.setHeader('Retry-After', String(lockCheck.retryAfterSec));
      return res.status(429).json({
        error: 'Too many invalid access code attempts. Please wait 15 minutes or contact your host.',
      });
    }

    const { code } = req.body || {};
    const verification = await resolveGuestVerification(prop, code);
    if (code) {
      await recordGuestCodeAttempt(req, prop.slug, verification.valid, prop.organization_id, prop.id);
    }
    if (!verification.valid) {
      const messages: Record<string, string> = {
        missing: 'Please enter your stay access code.',
        invalid: 'Booking access code was not recognized for this property.',
        cancelled: 'This reservation has been cancelled.',
        not_yet_active: 'Access codes unlock automatically 48 hours before your check-in date.',
        expired: 'This reservation stay window has expired.',
      };
      return res.status(401).json({ error: messages[verification.reason] || 'Invalid stay code.' });
    }

    const reservation = verification.reservation;
    await logAudit({
      organizationId: prop.organization_id,
      propertyId: prop.id,
      actorName: reservation.guest_name,
      actorRole: 'Guest',
      action: 'GUEST_ACCESS_VERIFIED',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `Guest verified time-bound access code ${reservation.access_code} for ${prop.name}.`,
    });

    res.json({ ok: true, accessCode: reservation.access_code });
  })
);

guestRouter.post(
  '/:slug/acknowledge-rules',
  guestActionLimiter,
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, organization_id, name, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });
    const { code } = req.body || {};
    const verification = await resolveGuestVerification(prop, code);
    if (!verification.valid) return res.status(401).json({ error: 'Verify an active booking code first.' });

    const reservation = verification.reservation;
    await db.execute('UPDATE reservations SET house_rules_acknowledged = 1 WHERE id = $1', [reservation.id]);
    await logAudit({
      organizationId: prop.organization_id,
      propertyId: prop.id,
      actorName: reservation.guest_name,
      actorRole: 'Guest',
      action: 'HOUSE_RULES_ACKNOWLEDGED',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `Guest acknowledged House Rules for ${prop.name}.`,
    });
    res.json({ ok: true });
  })
);

guestRouter.post(
  '/:slug/confirm-departure',
  guestActionLimiter,
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, organization_id, name, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });
    const { code } = req.body || {};
    const verification = await resolveGuestVerification(prop, code);
    if (!verification.valid) return res.status(401).json({ error: 'Verify an active booking code first.' });

    const reservation = verification.reservation;
    await db.execute(`UPDATE reservations SET check_out_status = 'Departed', status = 'Completed' WHERE id = $1`, [
      reservation.id,
    ]);

    await dispatchNotification({
      organizationId: prop.organization_id,
      propertyId: prop.id,
      channel: 'In-App + SMS',
      recipientRole: 'Cleaning Staff',
      recipientName: 'Turnover Team',
      urgency: 'Normal',
      title: `Guest Departed: ${prop.name}`,
      body: `${reservation.guest_name} confirmed checkout. Property is clear for turnover cleaning.`,
    });

    await logAudit({
      organizationId: prop.organization_id,
      propertyId: prop.id,
      actorName: reservation.guest_name,
      actorRole: 'Guest',
      action: 'GUEST_DEPARTURE_CONFIRMED',
      entityType: 'Reservation',
      entityId: reservation.id,
      details: `Guest confirmed departure at ${prop.name}.`,
    });

    res.json({ ok: true });
  })
);

guestRouter.post(
  '/:slug/ai',
  guestActionLimiter,
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, organization_id, name, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });

    const { question, code, sessionId } = req.body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: 'Please type a question.' });
    }

    const org = await db.queryOne<any>('SELECT ai_monthly_allowance FROM organizations WHERE id = $1', [
      prop.organization_id,
    ]);
    const monthPrefix = nowIso().slice(0, 7);
    const usedRow = await db.queryOne<{ c: number }>(
      'SELECT COUNT(*)::int as c FROM ai_conversations WHERE organization_id = $1 AND created_at LIKE $2',
      [prop.organization_id, `${monthPrefix}%`]
    );
    const usedThisMonth = usedRow?.c ?? 0;

    if (org?.ai_monthly_allowance && usedThisMonth >= org.ai_monthly_allowance) {
      return res.json({
        id: uid('ai'),
        answer: `Our automated concierge has reached its monthly inquiry limit for this workspace. I’ve routed your question straight to the local host team for human assistance.`,
        sources: [],
        confidence: 'Escalated — Allowance Reached',
        escalated: true,
        knowledgeGap: false,
        emergencyAlert: false,
      });
    }

    const verification = await resolveGuestVerification(prop, code);
    const reservation = verification.valid ? verification.reservation : null;

    const result = await runSafeAiAssistant({
      propertyId: prop.id,
      question: String(question).trim(),
      isVerifiedGuest: verification.valid,
    });

    const convId = uid('ai');
    await db.execute(
      `INSERT INTO ai_conversations (id, organization_id, property_id, reservation_id, session_id, guest_question, ai_answer, verified_sources_json, confidence, escalated, knowledge_gap_flag, gap_resolved, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12)`,
      [
        convId,
        prop.organization_id,
        prop.id,
        reservation?.id || null,
        sessionId || 'sess-guest',
        String(question).trim(),
        result.answer,
        JSON.stringify(result.sources),
        result.confidence,
        result.escalated ? 1 : 0,
        result.knowledgeGap ? 1 : 0,
        nowIso(),
      ]
    );

    if (result.escalated) {
      await dispatchNotification({
        organizationId: prop.organization_id,
        propertyId: prop.id,
        channel: result.emergencyAlert ? 'SMS + Email + In-App' : 'In-App',
        recipientRole: 'Concierge',
        recipientName: 'Concierge & Property Manager',
        urgency: result.emergencyAlert ? 'Critical' : 'High',
        title: result.emergencyAlert
          ? `EMERGENCY AI ESCALATION: ${prop.name}`
          : `AI Guest Escalation / Knowledge Gap: ${prop.name}`,
        body: `Guest asked: "${String(question).trim()}"`,
      });
    }

    res.json({ id: convId, ...result });
  })
);

guestRouter.post(
  '/:slug/support',
  guestActionLimiter,
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, organization_id, name, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });

    const b = req.body || {};
    if (!b.subject || !b.message) {
      return res.status(400).json({ error: 'Subject and description are required.' });
    }

    const verification = await resolveGuestVerification(prop, b.code);
    const reservation = verification.valid ? verification.reservation : null;
    const supId = uid('sup');
    const now = nowIso();
    const isMaintenance = Boolean(b.report_as_maintenance);

    if (isMaintenance && !verification.valid) {
      return res.status(401).json({
        error: 'Please verify your active stay code at the top of the Guest Portal before dispatching a maintenance work order.',
      });
    }

    let incidentId: string | null = null;
    let woCode: string | null = null;
    const safeUrgency = verification.valid && ['Normal', 'High', 'Critical'].includes(b.urgency) ? b.urgency : 'Normal';

    if (isMaintenance) {
      incidentId = uid('inc');
      woCode = `WO-${Math.floor(1050 + Math.random() * 8900)}`;
      const priority = ['Critical', 'High', 'Medium', 'Low'].includes(b.urgency) ? b.urgency : 'High';
      const deadline = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);

      await db.execute(
        `INSERT INTO incidents (id, organization_id, property_id, reservation_id, source, category, priority, title, description, status, assigned_to_id, assigned_to_name, work_order_code, deadline, internal_notes, resolution_notes, attachment_urls_json, resolution_urls_json, verified_by, created_at, updated_at, resolved_at)
         VALUES ($1, $2, $3, $4, 'Guest Portal', $5, $6, $7, $8, 'New', NULL, 'Unassigned', $9, $10, 'Reported directly via Mobile Guest Portal.', '', $11, '[]', NULL, $12, $13, NULL)`,
        [
          incidentId,
          prop.organization_id,
          prop.id,
          reservation?.id || null,
          b.category || 'Other',
          priority,
          String(b.subject).trim(),
          String(b.message).trim(),
          woCode,
          deadline,
          JSON.stringify(b.attachment_url ? [b.attachment_url] : []),
          now,
          now,
        ]
      );

      await computePropertyReadiness(prop.id);

      await dispatchNotification({
        organizationId: prop.organization_id,
        propertyId: prop.id,
        channel: priority === 'Critical' ? 'SMS + Email + In-App' : 'In-App',
        recipientRole: 'Property Manager',
        recipientName: 'Operations Team',
        urgency: priority === 'Critical' ? 'Critical' : 'High',
        title: `Guest Reported ${priority} Issue (${woCode}): ${prop.name}`,
        body: `${b.category || 'Maintenance'}: ${b.subject}`,
      });
    }

    await db.execute(
      `INSERT INTO support_requests (id, organization_id, property_id, reservation_id, guest_name, subject, message, category, urgency, status, escalated_to_incident_id, attachment_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Open', $10, $11, $12)`,
      [
        supId,
        prop.organization_id,
        prop.id,
        reservation?.id || null,
        b.guest_name || reservation?.guest_name || 'Guest Visitor',
        String(b.subject).trim(),
        String(b.message).trim(),
        b.category || 'General Support',
        safeUrgency,
        incidentId,
        verification.valid ? b.attachment_url || null : null,
        now,
      ]
    );

    await logAudit({
      organizationId: prop.organization_id,
      propertyId: prop.id,
      actorName: b.guest_name || reservation?.guest_name || 'Guest',
      actorRole: 'Guest',
      action: isMaintenance ? 'GUEST_MAINTENANCE_REPORTED' : 'GUEST_SUPPORT_CREATED',
      entityType: isMaintenance ? 'Incident' : 'SupportRequest',
      entityId: incidentId || supId,
      details: `Guest submitted "${b.subject}" (${b.category || 'General'})${woCode ? ` → Work Order ${woCode}` : ''}.`,
    });

    res.status(201).json({
      id: supId,
      incidentId,
      workOrderCode: woCode,
      status: 'Open',
      created_at: now,
    });
  })
);

guestRouter.get(
  '/:slug/requests',
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Not found.' });

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const verification = await resolveGuestVerification(prop, code);
    if (!verification.valid) {
      return res.json([]);
    }

    const requests = await db.query(
      `SELECT s.id, s.subject, s.category, s.urgency, s.status, s.created_at, i.work_order_code, i.status as incident_status
       FROM support_requests s
       LEFT JOIN incidents i ON i.id = s.escalated_to_incident_id
       WHERE s.property_id = $1 AND s.reservation_id = $2
       ORDER BY s.created_at DESC
       LIMIT 15`,
      [prop.id, verification.reservation.id]
    );

    res.json(requests);
  })
);

guestRouter.post(
  '/:slug/feedback',
  guestActionLimiter,
  ah(async (req, res) => {
    const prop = await db.queryOne<any>(
      'SELECT id, organization_id, name, timezone FROM properties WHERE slug = $1 AND archived = 0',
      [req.params.slug]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });

    const b = req.body || {};
    const verification = await resolveGuestVerification(prop, b.code);
    const reservation = verification.valid ? verification.reservation : null;
    const id = uid('fb');

    await db.execute(
      `INSERT INTO feedback (id, organization_id, property_id, reservation_id, guest_name, cleaning_rating, checkin_rating, comfort_rating, maintenance_rating, comments, follow_up_requested, follow_up_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        prop.organization_id,
        prop.id,
        reservation?.id || null,
        b.guest_name || reservation?.guest_name || 'Verified Stay Guest',
        Number(b.cleaning_rating || 5),
        Number(b.checkin_rating || 5),
        Number(b.comfort_rating || 5),
        Number(b.maintenance_rating || 5),
        b.comments || '',
        b.follow_up_requested ? 1 : 0,
        b.follow_up_requested ? 'Follow-up Open' : 'None',
        nowIso(),
      ]
    );

    await logAudit({
      organizationId: prop.organization_id,
      propertyId: prop.id,
      actorName: b.guest_name || reservation?.guest_name || 'Guest',
      actorRole: 'Guest',
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'Feedback',
      entityId: id,
      details: `Honest stay feedback submitted for ${prop.name}.`,
    });

    res.status(201).json({ ok: true, id });
  })
);
