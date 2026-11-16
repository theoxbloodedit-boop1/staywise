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
  uid,
} from '../domain.js';

export const incidentsRouter = Router();
incidentsRouter.use(requireAuth);

export const INCIDENT_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Heating',
  'Air conditioning',
  'Wi-Fi',
  'Appliances',
  'Furniture',
  'Access and locks',
  'Cleaning',
  'Noise',
  'Safety',
  'Other',
];

const INCIDENT_STATUSES = ['New', 'Assigned', 'In Progress', 'Awaiting Verification', 'Resolved', 'Reopened'];

incidentsRouter.get(
  '/',
  ah(async (req, res) => {
    const actor = getActor(req);

    const rows = await db.query<any>(
      `SELECT i.*, p.name as property_name, p.city as property_city, p.readiness_status
       FROM incidents i
       JOIN properties p ON p.id = i.property_id
       WHERE i.organization_id = $1
       ORDER BY CASE i.priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, i.created_at DESC`,
      [actor.organizationId]
    );

    const scoped = rows.filter((r) => canAccessProperty(actor, r.property_id));

    res.json(
      scoped.map((r) => ({
        ...r,
        attachment_urls: JSON.parse(r.attachment_urls_json || '[]'),
        resolution_urls: JSON.parse(r.resolution_urls_json || '[]'),
      }))
    );
  })
);

incidentsRouter.post(
  '/',
  ah(async (req, res) => {
    const actor = getActor(req);

    const b = req.body || {};
    if (!b.property_id || !b.title || !b.category) {
      return res.status(400).json({ error: 'Property, category, and incident title are required.' });
    }

    const prop = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [b.property_id, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found in organization.' });
    if (!canAccessProperty(actor, prop.id)) return res.status(403).json({ error: 'Property access denied.' });

    const id = uid('inc');
    const woCode = `WO-${Math.floor(1050 + Math.random() * 8900)}`;
    const priority = ['Critical', 'High', 'Medium', 'Low'].includes(b.priority) ? b.priority : 'Medium';
    const status = b.assigned_to_name && b.assigned_to_name !== 'Unassigned' ? 'Assigned' : 'New';
    const now = nowIso();
    const defaultDeadline = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 16);

    await db.execute(
      `INSERT INTO incidents (id, organization_id, property_id, reservation_id, source, category, priority, title, description, status, assigned_to_id, assigned_to_name, work_order_code, deadline, internal_notes, resolution_notes, attachment_urls_json, resolution_urls_json, verified_by, created_at, updated_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, '', $16, '[]', NULL, $17, $18, NULL)`,
      [
        id,
        actor.organizationId,
        prop.id,
        b.reservation_id || null,
        actor.actorRole,
        b.category,
        priority,
        String(b.title).trim(),
        b.description || '',
        status,
        b.assigned_to_id || null,
        b.assigned_to_name || 'Unassigned',
        woCode,
        b.deadline || defaultDeadline,
        b.internal_notes || '',
        JSON.stringify(b.attachment_urls || []),
        now,
        now,
      ]
    );

    const readiness = await computePropertyReadiness(prop.id);

    if (priority === 'Critical') {
      await dispatchNotification({
        organizationId: actor.organizationId,
        propertyId: prop.id,
        channel: 'SMS + Email + In-App',
        recipientRole: 'Maintenance Technician',
        recipientName: b.assigned_to_name || 'On-Call Operations Lead',
        urgency: 'Critical',
        title: `CRITICAL INCIDENT ${woCode}: ${prop.name}`,
        body: `${b.category} — ${b.title}. Property readiness automatically set to Not Ready.`,
      });
    }

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'INCIDENT_CREATED',
      entityType: 'Incident',
      entityId: id,
      details: `Logged ${priority} ${b.category} incident ${woCode}: "${b.title}". Readiness: ${readiness.status}.`,
    });

    const created = await db.queryOne<any>(
      `SELECT i.*, p.name as property_name, p.city as property_city, p.readiness_status
       FROM incidents i JOIN properties p ON p.id = i.property_id WHERE i.id = $1`,
      [id]
    );

    res.status(201).json({
      ...created,
      attachment_urls: JSON.parse(created.attachment_urls_json),
      resolution_urls: JSON.parse(created.resolution_urls_json),
      readiness,
    });
  })
);

incidentsRouter.patch(
  '/:id',
  ah(async (req, res) => {
    const actor = getActor(req);
    const existing = await db.queryOne<any>(
      'SELECT * FROM incidents WHERE id = $1 AND organization_id = $2',
      [req.params.id, actor.organizationId]
    );
    if (!existing) return res.status(404).json({ error: 'Incident not found in organization.' });
    if (!canAccessProperty(actor, existing.property_id)) return res.status(403).json({ error: 'Property access denied.' });

    const b = req.body || {};
    const isVerifier = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Inspector', 'Platform Super Admin'].includes(actor.actorRole);
    const isDispatcher = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'].includes(actor.actorRole);

    const nextStatus = b.status || existing.status;
    if (!INCIDENT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: `Invalid incident status "${nextStatus}".` });
    }

    if ((nextStatus === 'Resolved' || nextStatus === 'Reopened') && !isVerifier) {
      return res.status(403).json({
        error: 'Maintenance technicians submit resolution evidence as "Awaiting Verification"; a Property Manager or Owner must verify and close.',
      });
    }

    if (!isDispatcher && (b.assigned_to_id !== undefined || b.assigned_to_name !== undefined || b.priority !== undefined || b.deadline !== undefined)) {
      return res.status(403).json({
        error: 'Only managers or concierges may reassign technicians, change priority, or alter deadlines.',
      });
    }

    const now = nowIso();
    const resolvedAt = nextStatus === 'Resolved' ? now : nextStatus === 'Reopened' ? null : existing.resolved_at;
    const verifiedBy = nextStatus === 'Resolved' ? actor.actorName : existing.verified_by;

    await db.execute(
      `UPDATE incidents SET
        priority = $1, status = $2, assigned_to_id = $3, assigned_to_name = $4,
        deadline = $5, internal_notes = $6, resolution_notes = $7,
        resolution_urls_json = $8, verified_by = $9, updated_at = $10, resolved_at = $11
       WHERE id = $12`,
      [
        isDispatcher ? b.priority ?? existing.priority : existing.priority,
        nextStatus,
        isDispatcher ? b.assigned_to_id ?? existing.assigned_to_id : existing.assigned_to_id,
        isDispatcher ? b.assigned_to_name ?? existing.assigned_to_name : existing.assigned_to_name,
        isDispatcher ? b.deadline ?? existing.deadline : existing.deadline,
        b.internal_notes ?? existing.internal_notes,
        b.resolution_notes ?? existing.resolution_notes,
        b.resolution_urls ? JSON.stringify(b.resolution_urls) : existing.resolution_urls_json,
        verifiedBy,
        now,
        resolvedAt,
        existing.id,
      ]
    );

    const readiness = await computePropertyReadiness(existing.property_id);

    if (nextStatus === 'Awaiting Verification') {
      await dispatchNotification({
        organizationId: actor.organizationId,
        propertyId: existing.property_id,
        channel: 'In-App',
        recipientRole: 'Property Manager',
        recipientName: 'Operations Team',
        urgency: 'High',
        title: `Work Order ${existing.work_order_code} Awaiting Verification`,
        body: `${actor.actorName} uploaded resolution evidence for "${existing.title}".`,
      });
    }

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: existing.property_id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: `INCIDENT_${nextStatus.toUpperCase().replace(/\s+/g, '_')}`,
      entityType: 'Incident',
      entityId: existing.id,
      details: `Work order ${existing.work_order_code} updated to ${nextStatus}${b.assigned_to_name ? ` (Tech: ${b.assigned_to_name})` : ''}. Property readiness: ${readiness.status}.`,
    });

    const updated = await db.queryOne<any>(
      `SELECT i.*, p.name as property_name, p.city as property_city, p.readiness_status
       FROM incidents i JOIN properties p ON p.id = i.property_id WHERE i.id = $1`,
      [existing.id]
    );

    res.json({
      ...updated,
      attachment_urls: JSON.parse(updated.attachment_urls_json),
      resolution_urls: JSON.parse(updated.resolution_urls_json),
      readiness,
    });
  })
);
