import { Router } from 'express';
import { db } from '../db.js';
import { buildDefaultSections, defaultSectionOrder } from '../seed-data.js';
import {
  ah,
  canAccessProperty,
  computePropertyReadiness,
  getActor,
  logAudit,
  nowIso,
  readPropertyReadinessGates,
  requireAuth,
  requireRoles,
  uid,
} from '../domain.js';

export const propertiesRouter = Router();
propertiesRouter.use(requireAuth);

propertiesRouter.get(
  '/',
  ah(async (req, res) => {
    const actor = getActor(req);
    const includeArchived = req.query.includeArchived === '1';
    const rows = await db.query<any>(
      `SELECT * FROM properties WHERE organization_id = $1 ${includeArchived ? '' : 'AND archived = 0'} ORDER BY created_at DESC`,
      [actor.organizationId]
    );

    const filtered = rows.filter((p) => canAccessProperty(actor, p.id));
    const enriched = await Promise.all(
      filtered.map(async (p) => ({
        ...p,
        amenities: JSON.parse(p.amenities_json || '[]'),
        readiness: await readPropertyReadinessGates(p.id),
      }))
    );

    res.json(enriched);
  })
);

propertiesRouter.post(
  '/',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);

    const org = await db.queryOne<any>('SELECT * FROM organizations WHERE id = $1', [actor.organizationId]);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const countRow = await db.queryOne<{ c: number }>(
      'SELECT COUNT(*)::int as c FROM properties WHERE organization_id = $1 AND archived = 0',
      [actor.organizationId]
    );
    const activeCount = countRow?.c ?? 0;

    if (activeCount >= org.property_limit) {
      return res.status(402).json({
        error: `Plan limit reached: ${org.plan_tier} supports up to ${org.property_limit} active properties. Upgrade your billing plan to add more properties.`,
        code: 'PLAN_LIMIT_REACHED',
      });
    }

    const body = req.body || {};
    if (!body.name || !body.address_line || !body.city || !body.state || !body.postal_code) {
      return res.status(400).json({ error: 'Property name, street address, city, state, and postal code are required.' });
    }

    const country: 'US' | 'AU' = body.country === 'AU' ? 'AU' : 'US';
    const currency = body.currency || (country === 'AU' ? 'AUD' : 'USD');
    const tempUnit = body.temp_unit || (country === 'AU' ? 'C' : 'F');
    const emergencyNumber = country === 'AU' ? '000' : '911';
    const timezone = body.timezone || (country === 'AU' ? 'Australia/Sydney' : 'America/Chicago');
    const coverImage =
      body.cover_image || (country === 'AU' ? '/images/tallebudgera.webp' : '/images/barton-creek.jpg');

    const propId = uid('prop');
    const slug =
      String(body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.floor(100 + Math.random() * 899);

    const now = nowIso();
    const fullAddr = `${body.address_line}, ${body.city}, ${body.state} ${body.postal_code}${country === 'AU' ? ', Australia' : ''}`;

    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO properties (id, organization_id, slug, name, address_line, city, state, postal_code, country, timezone, currency, temp_unit, emergency_number, bedrooms, bathrooms, max_occupancy, cover_image, description, amenities_json, parking_info, access_summary, emergency_notes, internal_notes, operational_status, readiness_status, readiness_reason, archived, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'Active', 'Not Ready', 'Pre-arrival inspection required', 0, $24)`,
        [
          propId,
          actor.organizationId,
          slug,
          String(body.name).trim(),
          String(body.address_line).trim(),
          String(body.city).trim(),
          String(body.state).trim(),
          String(body.postal_code).trim(),
          country,
          timezone,
          currency,
          tempUnit,
          emergencyNumber,
          Number(body.bedrooms || 2),
          Number(body.bathrooms || 2),
          Number(body.max_occupancy || 4),
          coverImage,
          body.description || 'Thoughtfully prepared short-term rental with verified digital guestbook.',
          JSON.stringify(body.amenities || ['High-Speed Wi-Fi', 'Smart Lock', 'Air Conditioning', 'Full Kitchen']),
          body.parking_info || 'Driveway parking available.',
          body.access_summary || 'Smart keypad entry with stay-specific PIN.',
          body.emergency_notes || `Emergency services: ${emergencyNumber}.`,
          body.internal_notes || '',
          now,
        ]
      );

      await tx.execute(
        `INSERT INTO guidebooks (id, organization_id, property_id, brand_name, accent_color, typography_style, cover_image, section_order_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'Modern Sans', $6, $7, $8)`,
        [
          uid('gb'),
          actor.organizationId,
          propId,
          String(body.name).trim(),
          org.brand_color || '#0F766E',
          coverImage,
          JSON.stringify(defaultSectionOrder()),
          now,
        ]
      );

      const sections = buildDefaultSections({
        orgId: actor.organizationId,
        propertyId: propId,
        propertyName: String(body.name).trim(),
        address: fullAddr,
        city: String(body.city).trim(),
        country,
        hostName: org.name,
        hostPhone: org.contact_phone,
        hostEmail: org.contact_email,
        wifiNetwork: body.wifi_network || `${String(body.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 12)}_Guest`,
        wifiPassword: body.wifi_password || 'Staywise2026!',
        smartLockCode: String(Math.floor(100000 + Math.random() * 899999)),
      });

      for (const s of sections) {
        await tx.execute(
          `INSERT INTO guidebook_sections (id, organization_id, property_id, section_key, title, is_visible, sort_order, content_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            s.id,
            s.organization_id,
            s.property_id,
            s.section_key,
            s.title,
            s.is_visible,
            s.sort_order,
            s.content_json,
            s.updated_at,
          ]
        );
      }
    });

    const readiness = await computePropertyReadiness(propId);

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: propId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: propId,
      details: `Created property "${body.name}" (${country} · ${currency} · ${emergencyNumber}) with dedicated Welcome Book.`,
    });

    const created = await db.queryOne<any>('SELECT * FROM properties WHERE id = $1', [propId]);
    res.status(201).json({ ...created, amenities: JSON.parse(created.amenities_json || '[]'), readiness });
  })
);

propertiesRouter.patch(
  '/:id',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const propertyId = String(req.params.id);

    const existing = await db.queryOne<any>(
      'SELECT * FROM properties WHERE id = $1 AND organization_id = $2',
      [propertyId, actor.organizationId]
    );
    if (!existing) return res.status(404).json({ error: 'Property not found in this organization.' });
    if (!canAccessProperty(actor, existing.id)) return res.status(403).json({ error: 'Property access denied.' });

    const b = req.body || {};
    const country = b.country || existing.country;
    const emergencyNumber = country === 'AU' ? '000' : '911';

    if (existing.archived === 1 && b.archived === false) {
      const org = await db.queryOne<any>('SELECT plan_tier, property_limit FROM organizations WHERE id = $1', [
        actor.organizationId,
      ]);
      const countRow = await db.queryOne<{ c: number }>(
        'SELECT COUNT(*)::int as c FROM properties WHERE organization_id = $1 AND archived = 0',
        [actor.organizationId]
      );
      const activeCount = countRow?.c ?? 0;
      if (activeCount >= org.property_limit) {
        return res.status(402).json({
          error: `Plan limit reached: ${org.plan_tier} supports ${org.property_limit} active properties.`,
          code: 'PLAN_LIMIT_REACHED',
        });
      }
    }

    await db.execute(
      `UPDATE properties SET
        name = $1, address_line = $2, city = $3, state = $4, postal_code = $5,
        country = $6, timezone = $7, currency = $8, temp_unit = $9, emergency_number = $10,
        bedrooms = $11, bathrooms = $12, max_occupancy = $13, description = $14,
        amenities_json = $15, parking_info = $16, access_summary = $17, emergency_notes = $18,
        internal_notes = $19, operational_status = $20, archived = $21
       WHERE id = $22 AND organization_id = $23`,
      [
        b.name ?? existing.name,
        b.address_line ?? existing.address_line,
        b.city ?? existing.city,
        b.state ?? existing.state,
        b.postal_code ?? existing.postal_code,
        country,
        b.timezone ?? existing.timezone,
        b.currency ?? existing.currency,
        b.temp_unit ?? existing.temp_unit,
        emergencyNumber,
        b.bedrooms ?? existing.bedrooms,
        b.bathrooms ?? existing.bathrooms,
        b.max_occupancy ?? existing.max_occupancy,
        b.description ?? existing.description,
        b.amenities ? JSON.stringify(b.amenities) : existing.amenities_json,
        b.parking_info ?? existing.parking_info,
        b.access_summary ?? existing.access_summary,
        b.emergency_notes ?? existing.emergency_notes,
        b.internal_notes ?? existing.internal_notes,
        b.operational_status ?? existing.operational_status,
        b.archived !== undefined ? (b.archived ? 1 : 0) : existing.archived,
        propertyId,
        actor.organizationId,
      ]
    );

    await logAudit({
      organizationId: actor.organizationId,
      propertyId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: b.archived ? 'PROPERTY_ARCHIVED' : 'PROPERTY_UPDATED',
      entityType: 'Property',
      entityId: propertyId,
      details: `Updated settings for "${b.name ?? existing.name}".`,
    });

    const updated = await db.queryOne<any>('SELECT * FROM properties WHERE id = $1', [propertyId]);
    res.json({
      ...updated,
      amenities: JSON.parse(updated.amenities_json || '[]'),
      readiness: await readPropertyReadinessGates(propertyId),
    });
  })
);
