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
  syncOverdueCleanings,
  uid,
} from '../domain.js';

export const operationsRouter = Router();
operationsRouter.use(requireAuth);

const ALLOWED_STATUSES = [
  'Pending',
  'Assigned',
  'In Progress',
  'Submitted for Review',
  'Completed',
  'Rejected',
  'Overdue',
];

operationsRouter.get(
  '/',
  ah(async (req, res) => {
    const actor = getActor(req);
    await syncOverdueCleanings(actor.organizationId);

    const rows = await db.query<any>(
      `SELECT c.*, p.name as property_name, p.city as property_city, p.readiness_status, p.readiness_reason
       FROM cleaning_tasks c
       JOIN properties p ON p.id = c.property_id
       WHERE c.organization_id = $1
       ORDER BY c.due_date ASC`,
      [actor.organizationId]
    );

    const scoped = rows.filter((r) => canAccessProperty(actor, r.property_id));

    res.json(
      scoped.map((r) => ({
        ...r,
        checklist: JSON.parse(r.checklist_json || '[]'),
        photo_urls: JSON.parse(r.photo_urls_json || '[]'),
      }))
    );
  })
);

operationsRouter.post(
  '/',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);

    const b = req.body || {};
    if (!b.property_id || !b.title || !b.due_date) {
      return res.status(400).json({ error: 'Property, task title, and scheduled deadline are required.' });
    }

    const prop = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [b.property_id, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found in organization.' });

    const id = uid('cln');
    const now = nowIso();
    const status = b.assigned_name && b.assigned_name !== 'Unassigned' ? 'Assigned' : 'Pending';

    const defaultChecklist = [
      { id: 'c1', area: 'Kitchen', label: 'Sanitize counters, sink, induction stove & empty fridge', done: false },
      { id: 'c2', area: 'Bathrooms', label: 'Clean showers/toilets, polish mirrors & set fresh towels', done: false },
      { id: 'c3', area: 'Bedrooms', label: 'Make beds with crisp linens & check closets/drawers', done: false },
      { id: 'c4', area: 'Living Area', label: 'Vacuum rugs, mop floors & test TV/remotes', done: false },
      { id: 'c5', area: 'Consumables', label: 'Restock coffee, paper towels, soap & garbage liners', done: false },
    ];

    await db.execute(
      `INSERT INTO cleaning_tasks (id, organization_id, property_id, reservation_id, title, assigned_user_id, assigned_name, due_date, status, checklist_json, photo_urls_json, notes, review_notes, reviewed_by, completed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '[]', $11, '', NULL, NULL, $12, $13)`,
      [
        id,
        actor.organizationId,
        prop.id,
        b.reservation_id || null,
        String(b.title).trim(),
        b.assigned_user_id || null,
        b.assigned_name || 'Unassigned',
        b.due_date,
        status,
        JSON.stringify(b.checklist || defaultChecklist),
        b.notes || '',
        now,
        now,
      ]
    );

    const readiness = await computePropertyReadiness(prop.id);

    if (b.assigned_name && b.assigned_name !== 'Unassigned') {
      await dispatchNotification({
        organizationId: actor.organizationId,
        propertyId: prop.id,
        channel: 'In-App + SMS',
        recipientRole: 'Cleaning Staff',
        recipientName: b.assigned_name,
        urgency: 'Normal',
        title: `New Cleaning Assigned: ${prop.name}`,
        body: `${b.title} due by ${b.due_date}.`,
      });
    }

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'CLEANING_TASK_CREATED',
      entityType: 'CleaningTask',
      entityId: id,
      details: `Created cleaning task "${b.title}" (${status}, assigned to ${b.assigned_name || 'Unassigned'}).`,
    });

    const created = await db.queryOne<any>(
      `SELECT c.*, p.name as property_name, p.city as property_city, p.readiness_status, p.readiness_reason
       FROM cleaning_tasks c JOIN properties p ON p.id = c.property_id WHERE c.id = $1`,
      [id]
    );

    res.status(201).json({
      ...created,
      checklist: JSON.parse(created.checklist_json),
      photo_urls: JSON.parse(created.photo_urls_json),
      readiness,
    });
  })
);

operationsRouter.patch(
  '/:id',
  ah(async (req, res) => {
    const actor = getActor(req);
    const existing = await db.queryOne<any>(
      'SELECT * FROM cleaning_tasks WHERE id = $1 AND organization_id = $2',
      [req.params.id, actor.organizationId]
    );
    if (!existing) return res.status(404).json({ error: 'Cleaning task not found.' });
    if (!canAccessProperty(actor, existing.property_id)) return res.status(403).json({ error: 'Property access denied.' });

    const b = req.body || {};
    const isSupervisor = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Inspector', 'Platform Super Admin'].includes(actor.actorRole);
    const isDispatcher = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'].includes(actor.actorRole);

    let nextStatus = b.status || existing.status;
    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: `Invalid status "${nextStatus}".` });
    }

    if ((nextStatus === 'Completed' || nextStatus === 'Rejected') && !isSupervisor) {
      const org = await db.queryOne<any>('SELECT require_cleaning_approval FROM organizations WHERE id = $1', [
        actor.organizationId,
      ]);
      if (actor.actorRole === 'Cleaning Staff' && nextStatus === 'Completed' && org?.require_cleaning_approval) {
        nextStatus = 'Submitted for Review';
      } else {
        return res.status(403).json({ error: 'Only supervisors or managers may approve or reject cleaning tasks.' });
      }
    }

    if (!isDispatcher && (b.assigned_user_id !== undefined || b.assigned_name !== undefined)) {
      return res.status(403).json({ error: 'Only managers or concierges may reassign cleaning tasks.' });
    }
    if (!isSupervisor && b.review_notes !== undefined && b.review_notes !== existing.review_notes) {
      return res.status(403).json({ error: 'Only supervisors may modify review notes.' });
    }

    const nextChecklist = b.checklist ? JSON.stringify(b.checklist) : existing.checklist_json;
    const nextPhotos = b.photo_urls ? JSON.stringify(b.photo_urls) : existing.photo_urls_json;
    const completedAt =
      nextStatus === 'Submitted for Review' || nextStatus === 'Completed'
        ? nowIso()
        : existing.completed_at;
    const reviewedBy =
      nextStatus === 'Completed' || nextStatus === 'Rejected' ? actor.actorName : existing.reviewed_by;

    await db.execute(
      `UPDATE cleaning_tasks SET
        assigned_user_id = $1, assigned_name = $2, status = $3, checklist_json = $4, photo_urls_json = $5,
        notes = $6, review_notes = $7, reviewed_by = $8, completed_at = $9, updated_at = $10
       WHERE id = $11`,
      [
        isDispatcher ? b.assigned_user_id ?? existing.assigned_user_id : existing.assigned_user_id,
        isDispatcher ? b.assigned_name ?? existing.assigned_name : existing.assigned_name,
        nextStatus,
        nextChecklist,
        nextPhotos,
        b.notes ?? existing.notes,
        isSupervisor ? b.review_notes ?? existing.review_notes : existing.review_notes,
        reviewedBy,
        completedAt,
        nowIso(),
        existing.id,
      ]
    );

    const readiness = await computePropertyReadiness(existing.property_id);

    if (nextStatus === 'Submitted for Review') {
      await dispatchNotification({
        organizationId: actor.organizationId,
        propertyId: existing.property_id,
        channel: 'In-App',
        recipientRole: 'Property Manager',
        recipientName: 'Operations Team',
        urgency: 'Normal',
        title: `Cleaning Awaiting Supervisor Review`,
        body: `${actor.actorName} submitted "${existing.title}" for approval.`,
      });
    }

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: existing.property_id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: `CLEANING_${nextStatus.toUpperCase().replace(/\s+/g, '_')}`,
      entityType: 'CleaningTask',
      entityId: existing.id,
      details: `Cleaning task "${existing.title}" → ${nextStatus}. Property readiness: ${readiness.status} (${readiness.reason}).`,
    });

    const updated = await db.queryOne<any>(
      `SELECT c.*, p.name as property_name, p.city as property_city, p.readiness_status, p.readiness_reason
       FROM cleaning_tasks c JOIN properties p ON p.id = c.property_id WHERE c.id = $1`,
      [existing.id]
    );

    res.json({
      ...updated,
      checklist: JSON.parse(updated.checklist_json),
      photo_urls: JSON.parse(updated.photo_urls_json),
      readiness,
    });
  })
);
