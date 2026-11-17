import { authorizeProperty } from '../lib/authorization.js';
import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import {
  ah,
  canAccessProperty,
  computePropertyReadiness,
  dispatchNotification,
  getActor,
  logAudit,
  nowIso,
  requireAuth,
  requireRoles,
  uid,
} from '../domain.js';

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth);

reservationsRouter.get(
  '/',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);

    const rows = await db.query<any>(
      `SELECT r.*, p.name as property_name, p.slug as property_slug, p.country as property_country, p.currency as property_currency
       FROM reservations r
       JOIN properties p ON p.id = r.property_id AND p.organization_id = r.organization_id
       WHERE r.organization_id = $1
       ORDER BY r.check_in_date ASC`,
      [actor.organizationId]
    );

    res.json(rows.filter((r) => canAccessProperty(actor, r.property_id)));
  })
);

reservationsRouter.post(
  '/',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const b = req.body || {};
    if (!b.property_id || !b.guest_name || !b.check_in_date || !b.check_out_date) {
      return res.status(400).json({ error: 'Property, guest name, arrival date, and departure date are required.' });
    }

    const prop = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [b.property_id, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found in organization.' });
    await authorizeProperty(db, actor, prop.id);

    const id = uid('res');
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const bytes = crypto.randomBytes(8);
    let suffix = '';
    for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % alphabet.length];
    const accessCode = `STAY-${suffix}`;
    const now = nowIso();

    await db.execute(
      `INSERT INTO reservations (id, organization_id, property_id, guest_name, guest_email, guest_phone, guest_count, check_in_date, check_out_date, access_code, status, check_in_status, check_out_status, special_instructions, house_rules_acknowledged, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Confirmed', 'Pending', 'Pending', $11, 0, $12)`,
      [
        id,
        actor.organizationId,
        prop.id,
        String(b.guest_name).trim(),
        b.guest_email || 'guest@example.com',
        b.guest_phone || '',
        Number(b.guest_count || 2),
        b.check_in_date,
        b.check_out_date,
        accessCode,
        b.special_instructions || '',
        now,
      ]
    );

    if (b.create_turnover_task !== false) {
      // Assignment is explicit: never pick an arbitrary organization cleaner.

      const cleanId = uid('cln');
      const checklist = [
        { id: 'c1', area: 'Kitchen', label: 'Sanitize counters, cooktop & empty refrigerator', done: false },
        { id: 'c2', area: 'Bathrooms', label: 'Scrub showers, restock soaps & fresh towels', done: false },
        { id: 'c3', area: 'Bedrooms', label: 'Triple-sheet fresh linens & inspect under beds', done: false },
        { id: 'c4', area: 'Living Area', label: 'Vacuum floors, dust surfaces & align remotes', done: false },
        { id: 'c5', area: 'Consumables', label: 'Restock coffee, dishwasher tabs & paper goods', done: false },
      ];
      await db.execute(
        `INSERT INTO cleaning_tasks (id, organization_id, property_id, reservation_id, title, assigned_user_id, assigned_name, due_date, status, checklist_json, photo_urls_json, notes, review_notes, reviewed_by, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '[]', $11, '', NULL, NULL, $12, $13)`,
        [
          cleanId,
          actor.organizationId,
          prop.id,
          id,
          `Turnover for ${String(b.guest_name).trim()} — ${prop.name}`,
          null,
          'Unassigned',
          `${b.check_in_date}T14:00`,
          'Pending',
          JSON.stringify(checklist),
          `Linked to reservation ${accessCode}`,
          now,
          now,
        ]
      );
      await computePropertyReadiness(prop.id);
    }

    await dispatchNotification({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      channel: 'Email + In-App',
      recipientRole: 'Guest',
      recipientName: String(b.guest_name).trim(),
      urgency: 'Normal',
      title: `Reservation Confirmed: ${prop.name}`,
      body: `Guest access code ${accessCode} generated for ${b.check_in_date} – ${b.check_out_date}.`,
    });

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'RESERVATION_CREATED',
      entityType: 'Reservation',
      entityId: id,
      details: `Created manual reservation for ${b.guest_name} (${b.check_in_date} → ${b.check_out_date}) with code ${accessCode}.`,
    });

    const created = await db.queryOne(
      'SELECT r.*, p.name as property_name, p.slug as property_slug FROM reservations r JOIN properties p ON p.id = r.property_id AND p.organization_id = r.organization_id WHERE r.id = $1',
      [id]
    );
    res.status(201).json(created);
  })
);

reservationsRouter.patch(
  '/:id',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const existing = await db.queryOne<any>(
      'SELECT * FROM reservations WHERE id = $1 AND organization_id = $2',
      [req.params.id, actor.organizationId]
    );
    if (!existing) return res.status(404).json({ error: 'Reservation not found.' });
    await authorizeProperty(db, actor, existing.property_id);

    const b = req.body || {};
    await db.execute(
      `UPDATE reservations SET
        status = $1, check_in_status = $2, check_out_status = $3, special_instructions = $4, guest_count = $5
       WHERE id = $6`,
      [
        b.status ?? existing.status,
        b.check_in_status ?? existing.check_in_status,
        b.check_out_status ?? existing.check_out_status,
        b.special_instructions ?? existing.special_instructions,
        b.guest_count ?? existing.guest_count,
        existing.id,
      ]
    );

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: existing.property_id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'RESERVATION_UPDATED',
      entityType: 'Reservation',
      entityId: existing.id,
      details: `Updated stay status (${b.status ?? existing.status} / Check-in: ${b.check_in_status ?? existing.check_in_status}).`,
    });

    const updated = await db.queryOne(
      'SELECT r.*, p.name as property_name, p.slug as property_slug FROM reservations r JOIN properties p ON p.id = r.property_id AND p.organization_id = r.organization_id WHERE r.id = $1',
      [existing.id]
    );
    res.json(updated);
  })
);
