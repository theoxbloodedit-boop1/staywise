import { authorizeProperty } from '../lib/authorization.js';
import { Router } from 'express';
import { db } from '../db.js';
import {
  ah,
  canAccessProperty,
  decryptCheckinContent,
  decryptWifiContent,
  getActor,
  logAudit,
  nowIso,
  requireAuth,
  requireRoles,
} from '../domain.js';
import { encryptField } from '../security.js';
import { sortGuidebookSections } from '../lib/guest-helpers.js';

export const guidebooksRouter = Router();
guidebooksRouter.use(requireAuth);

function formatSectionForStaff(s: any) {
  let content = JSON.parse(s.content_json);
  if (s.section_key === 'checkin') content = decryptCheckinContent(content);
  if (s.section_key === 'wifi_home') content = decryptWifiContent(content);
  return {
    ...s,
    is_visible: Boolean(s.is_visible),
    content,
  };
}

guidebooksRouter.get(
  '/:propertyId',
  requireRoles('Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'),
  ah(async (req, res) => {
    const actor = getActor(req);

    const prop = await db.queryOne<any>(
      'SELECT * FROM properties WHERE id = $1 AND organization_id = $2',
      [req.params.propertyId, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found in organization.' });
    await authorizeProperty(db, actor, prop.id);
    if (!canAccessProperty(actor, prop.id)) return res.status(403).json({ error: 'Property access denied.' });

    const guidebook = await db.queryOne<any>('SELECT * FROM guidebooks WHERE property_id = $1', [prop.id]);
    const sections = sortGuidebookSections(
      await db.query<any>(
        'SELECT * FROM guidebook_sections WHERE property_id = $1 ORDER BY sort_order ASC',
        [prop.id]
      ),
      guidebook?.section_order_json
    );

    res.json({
      property: { ...prop, amenities: JSON.parse(prop.amenities_json || '[]') },
      guidebook: guidebook
        ? { ...guidebook, section_order: JSON.parse(guidebook.section_order_json || '[]') }
        : null,
      sections: sections.map(formatSectionForStaff),
    });
  })
);

guidebooksRouter.patch(
  '/:propertyId',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const prop = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [req.params.propertyId, actor.organizationId]
    );
    if (!prop) return res.status(404).json({ error: 'Property not found.' });
    await authorizeProperty(db, actor, prop.id);
    if (!canAccessProperty(actor, prop.id)) return res.status(403).json({ error: 'Property access denied.' });

    const gb = await db.queryOne<any>('SELECT * FROM guidebooks WHERE property_id = $1', [prop.id]);
    if (!gb) return res.status(404).json({ error: 'Guidebook not found.' });

    const b = req.body || {};
    await db.execute(
      `UPDATE guidebooks SET
        brand_name = $1, accent_color = $2, typography_style = $3, cover_image = $4, section_order_json = $5, updated_at = $6
       WHERE property_id = $7`,
      [
        b.brand_name ?? gb.brand_name,
        b.accent_color ?? gb.accent_color,
        b.typography_style ?? gb.typography_style,
        b.cover_image ?? gb.cover_image,
        b.section_order ? JSON.stringify(b.section_order) : gb.section_order_json,
        nowIso(),
        prop.id,
      ]
    );

    if (Array.isArray(b.section_order)) {
      for (let idx = 0; idx < b.section_order.length; idx++) {
        await db.execute(
          'UPDATE guidebook_sections SET sort_order = $1 WHERE property_id = $2 AND section_key = $3',
          [idx, prop.id, b.section_order[idx]]
        );
      }
    }

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: prop.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'GUIDEBOOK_CUSTOMIZED',
      entityType: 'Guidebook',
      entityId: gb.id,
      details: `Updated Welcome Book branding & layout for ${prop.name}.`,
    });

    const updated = await db.queryOne<any>('SELECT * FROM guidebooks WHERE property_id = $1', [prop.id]);
    res.json({ ...updated, section_order: JSON.parse(updated.section_order_json) });
  })
);

guidebooksRouter.patch(
  '/:propertyId/sections/:sectionKey',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const propertyId = String(req.params.propertyId);
    const sec = await db.queryOne<any>(
      'SELECT * FROM guidebook_sections WHERE property_id = $1 AND organization_id = $2 AND section_key = $3',
      [propertyId, actor.organizationId, String(req.params.sectionKey)]
    );
    if (!sec) return res.status(404).json({ error: 'Guidebook section not found.' });
    if (!canAccessProperty(actor, propertyId)) return res.status(403).json({ error: 'Property access denied.' });

    const b = req.body || {};
    const nextVisible = b.is_visible !== undefined ? (b.is_visible ? 1 : 0) : sec.is_visible;
    const nextTitle = b.title ?? sec.title;

    let nextContentStr = sec.content_json;
    if (b.content) {
      const contentToStore = { ...b.content };
      if (req.params.sectionKey === 'checkin') {
        if (contentToStore.smartLockCode) contentToStore.smartLockCode = encryptField(String(contentToStore.smartLockCode));
        if (contentToStore.lockboxInstructions) {
          contentToStore.lockboxInstructions = encryptField(String(contentToStore.lockboxInstructions));
        }
      }
      if (req.params.sectionKey === 'wifi_home') {
        if (contentToStore.wifiPassword) contentToStore.wifiPassword = encryptField(String(contentToStore.wifiPassword));
      }
      nextContentStr = JSON.stringify(contentToStore);
    }

    await db.execute(
      `UPDATE guidebook_sections SET title = $1, is_visible = $2, content_json = $3, updated_at = $4 WHERE id = $5`,
      [nextTitle, nextVisible, nextContentStr, nowIso(), sec.id]
    );

    await logAudit({
      organizationId: actor.organizationId,
      propertyId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'GUIDEBOOK_SECTION_UPDATED',
      entityType: 'GuidebookSection',
      entityId: sec.id,
      details: `Updated "${nextTitle}" (${req.params.sectionKey}) section in Welcome Book.`,
    });

    const updated = await db.queryOne<any>('SELECT * FROM guidebook_sections WHERE id = $1', [sec.id]);
    res.json(formatSectionForStaff(updated));
  })
);

guidebooksRouter.post(
  '/:propertyId/duplicate',
  requireRoles('Organization Owner', 'Organization Admin', 'Property Manager', 'Platform Super Admin'),
  ah(async (req, res) => {
    const actor = getActor(req);
    const { targetPropertyId } = req.body || {};
    if (!targetPropertyId) return res.status(400).json({ error: 'targetPropertyId is required.' });

    const sourceProp = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [req.params.propertyId, actor.organizationId]
    );
    const targetProp = await db.queryOne<any>(
      'SELECT id, name FROM properties WHERE id = $1 AND organization_id = $2',
      [targetPropertyId, actor.organizationId]
    );

    if (!sourceProp || !targetProp) {
      return res.status(404).json({ error: 'Both source and target properties must belong to your organization.' });
    }

    await authorizeProperty(db, actor, sourceProp.id);
    await authorizeProperty(db, actor, targetProp.id);

    const sourceSections = await db.query<any>(
      'SELECT section_key, title, is_visible, sort_order, content_json FROM guidebook_sections WHERE property_id = $1',
      [sourceProp.id]
    );

    await db.transaction(async (tx) => {
      for (const s of sourceSections) {
        const srcContent = JSON.parse(s.content_json);
        const tgtExisting = await tx.queryOne<{ content_json: string }>(
          'SELECT content_json FROM guidebook_sections WHERE property_id = $1 AND section_key = $2',
          [targetProp.id, s.section_key]
        );
        const tgtContent = tgtExisting ? JSON.parse(tgtExisting.content_json) : {};

        if (s.section_key === 'checkin') {
          srcContent.smartLockCode = tgtContent.smartLockCode || srcContent.smartLockCode;
          srcContent.lockboxInstructions = tgtContent.lockboxInstructions || srcContent.lockboxInstructions;
          srcContent.fullAddress = tgtContent.fullAddress || srcContent.fullAddress;
        }
        if (s.section_key === 'wifi_home') {
          srcContent.wifiNetwork = tgtContent.wifiNetwork || srcContent.wifiNetwork;
          srcContent.wifiPassword = tgtContent.wifiPassword || srcContent.wifiPassword;
        }

        await tx.execute(
          `UPDATE guidebook_sections SET title = $1, is_visible = $2, sort_order = $3, content_json = $4, updated_at = $5
           WHERE property_id = $6 AND section_key = $7`,
          [s.title, s.is_visible, s.sort_order, JSON.stringify(srcContent), nowIso(), targetProp.id, s.section_key]
        );
      }
    });

    await logAudit({
      organizationId: actor.organizationId,
      propertyId: targetProp.id,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      action: 'GUIDEBOOK_DUPLICATED',
      entityType: 'Guidebook',
      entityId: targetProp.id,
      details: `Duplicated Welcome Book template from "${sourceProp.name}" to "${targetProp.name}" (preserving encrypted property credentials).`,
    });

    res.json({ ok: true, message: `Welcome Book template duplicated to ${targetProp.name}.` });
  })
);
