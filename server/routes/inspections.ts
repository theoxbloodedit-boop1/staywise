import { Router } from 'express';
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

export const inspectionsRouter = Router();
inspectionsRouter.use(requireAuth);

inspectionsRouter.get(
  '/',
  ah(async (req, res) => {
    const actor = getActor(req);

    const assetsRows = await db.query<any>(
      `SELECT a.*, p.name as property_name
       FROM property_assets a
       JOIN properties p ON p.id = a.property_id
       WHERE a.organization_id = $1
       ORDER BY p.name ASC, a.category ASC`,
      [actor.organizationId]
    );
    const assets = assetsRows.filter((a) => canAccessProperty(actor, a.property_id));

    const inspectionsRows = await db.query<any>(
      `SELECT ins.*, p.name as property_name, p.readiness_status, p.readiness_reason
       FROM inspections ins
       JOIN properties p ON p.id = ins.property_id
       WHERE ins.organization_id = $1
       ORDER BY ins.inspected_at DESC`,
      [actor.organizationId]
    );
    const inspections = inspectionsRows.filter((i) => canAccessProperty(actor, i.property_id));

    res.json({
      assets,
      inspections: inspections.map((i) => ({ ...i, items: JSON.parse(i.items_json || '[]') })),
    });
  })
);

inspectionsRouter.post(
  '/assets',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Inspector', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const b = req.body || {};
    if (!b.property_id || !b.name || !b.category) {
      return res.status(400).json({ error: 'Property, asset name, and category are required.' });
    }
    const prop = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [b.property_id, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });

    const id = uid('ast');
    await db.execute(
      `INSERT INTO property_assets (id, organization_id, property_id, name, category, location, condition_status, baseline_notes, replacement_cost, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        actor.organizationId,
        prop.id,
        String(b.name).trim(),
        b.category,
        b.location || 'Main Area',
        b.condition_status || 'Good',
        b.baseline_notes || '',
        Number(b.replacement_cost || 0),
        nowIso(),
      ]
    );

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'ASSET_ADDED',
      entityType: 'PropertyAsset',
      entityId: id,
      details: `Registered ${b.category} asset "${b.name}" at ${prop.name}.`,
    });

    const created = await db.queryOne(
      'SELECT a.*, p.name as property_name FROM property_assets a JOIN properties p ON p.id = a.property_id WHERE a.id = $1',
      [id]
    );
    res.status(201).json(created);
  })
);

inspectionsRouter.post(
  '/',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Inspector', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const b = req.body || {};
    if (!b.property_id || !b.type || !Array.isArray(b.items)) {
      return res.status(400).json({ error: 'Property, inspection type, and inspected items list are required.' });
    }

    const prop = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [b.property_id, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });
    if (!canAccessProperty(actor, prop.id)) return res.status(403).json({ error: 'Property access denied.' });

    const discrepancies = b.items.filter((it: any) => it.status === 'Missing' || it.status === 'Damaged');
    const overallStatus = b.overall_status || (discrepancies.length > 0 ? 'Failed' : 'Passed');

    const id = uid('insp');
    const now = nowIso();

    await db.execute(
      `INSERT INTO inspections (id, organization_id, property_id, type, inspector_name, inspected_at, overall_status, items_json, discrepancies_count, summary_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        actor.organizationId,
        prop.id,
        b.type,
        actor.actorName,
        now,
        overallStatus,
        JSON.stringify(b.items),
        discrepancies.length,
        b.summary_notes ||
          (discrepancies.length > 0
            ? `Documented ${discrepancies.length} neutral condition discrepancy item(s) for review.`
            : 'All inspected inventory items match baseline reference condition.'),
      ]
    );

    for (const item of b.items) {
      if (item.assetId) {
        const cond =
          item.status === 'Intact' ? 'Good' : item.status === 'Wear Noted' ? 'Fair' : item.status;
        await db.execute(
          'UPDATE property_assets SET condition_status = $1, updated_at = $2 WHERE id = $3 AND property_id = $4',
          [cond, now, item.assetId, prop.id]
        );
      }
    }

    const readiness = await computePropertyReadiness(prop.id);

    if (overallStatus === 'Failed') {
      await dispatchNotification({
        organizationId: actor.organizationId,
        propertyId: prop.id,
        channel: 'Email + In-App',
        recipientRole: 'Organization Owner',
        recipientName: 'Operations Team',
        urgency: 'High',
        title: `Inspection Hold: ${prop.name}`,
        body: `${b.type} inspection flagged ${discrepancies.length} discrepancy item(s). Readiness held at Not Ready.`,
      });
    }

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: `INSPECTION_${overallStatus.toUpperCase().replace(/\s+/g, '_')}`,
      entityType: 'Inspection',
      entityId: id,
      details: `${b.type} inspection recorded as ${overallStatus} (${discrepancies.length} discrepancies). Property readiness: ${readiness.status}.`,
    });

    const created = await db.queryOne<any>(
      'SELECT ins.*, p.name as property_name, p.readiness_status, p.readiness_reason FROM inspections ins JOIN properties p ON p.id = ins.property_id WHERE ins.id = $1',
      [id]
    );

    res.status(201).json({ ...created, items: JSON.parse(created.items_json), readiness });
  })
);
