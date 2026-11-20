import { projectGuestSections } from './lib/guest-content.js';
import { controlPrincipal } from './lib/control-center.js';
import { hasPropertyScope, isKnownOperationalRole, parseAssignments } from './lib/authorization.js';
import crypto from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { db, type DbExecutor } from './db.js';
import { decryptField, verifyNeonAuthJwt, type VerifiedNeonUser } from './security.js';

export function ah(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getLocalDateStr(timezone: string, offsetDays = 0): string {
  try {
    const dt = new Date(Date.now() + offsetDays * 86400000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dt);
  } catch {
    return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
  }
}

export function getLocalDateTimeMinuteStr(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    const hh = map.hour === '24' ? '00' : map.hour;
    return `${map.year}-${map.month}-${map.day}T${hh}:${map.minute}`;
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

function addDaysToYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export async function resolveGuestVerification(
  prop: { id: string; timezone?: string },
  code?: string,
  database: DbExecutor = db
): Promise<
  | { valid: true; reservation: any }
  | { valid: false; reason: 'missing' | 'invalid' | 'cancelled' | 'not_yet_active' | 'expired' }
> {
  if (!code || !code.trim()) return { valid: false, reason: 'missing' };

  const reservation = await database.queryOne(
    'SELECT * FROM reservations WHERE property_id = $1 AND UPPER(access_code) = UPPER($2)',
    [prop.id, code.trim()]
  );

  if (!reservation) return { valid: false, reason: 'invalid' };
  if (reservation.status === 'Cancelled') return { valid: false, reason: 'cancelled' };

  const localToday = getLocalDateStr(prop.timezone || 'UTC');
  const windowStart = addDaysToYmd(reservation.check_in_date, -2);
  const windowEnd = addDaysToYmd(reservation.check_out_date, 1);

  if (localToday < windowStart) return { valid: false, reason: 'not_yet_active' };
  if (localToday > windowEnd) return { valid: false, reason: 'expired' };

  return { valid: true, reservation };
}

const DEFAULT_PLATFORM_ADMIN_EMAILS = ['theoxbloodedit@gmail.com'];

export function isPlatformAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.STAYWISE_PLATFORM_ADMIN_EMAILS;
  const allowlist = raw
    ? raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_PLATFORM_ADMIN_EMAILS;
  return allowlist.includes(email.trim().toLowerCase());
}

export interface ActorContext {
  organizationId: string;
  userId: string;
  neonAuthId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  isPlatformAdmin: boolean;
  orgAccountStatus: string;
  assignedPropertyIds: string[];
}

export function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header === 'string' && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, '').trim();
  }
  return undefined;
}

export async function resolveNeonJwt(req: Request): Promise<VerifiedNeonUser | null> {
  const token = extractBearerToken(req);
  return verifyNeonAuthJwt(token);
}

export async function resolveSessionActor(req: Request): Promise<ActorContext | null> {
  const neonUser = await resolveNeonJwt(req);
  if (!neonUser || !neonUser.emailVerified) return null;

  // Email alone never links an account. Only verified invitation acceptance may link.
  const user = await db.queryOne<any>('SELECT * FROM users WHERE neon_auth_id = $1', [neonUser.sub]);

  if (!user || (user.account_status && user.account_status !== 'Active') || (user.control_revoked_before && (neonUser.issuedAt || 0) <= Number(user.control_revoked_before))) return null;

  const requestedOrg =
    typeof req.headers['x-staywise-org'] === 'string' ? req.headers['x-staywise-org'].trim() : '';

  const membership = requestedOrg
    ? await db.queryOne<any>(
        `SELECT * FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 AND status = 'Active'`,
        [user.id, requestedOrg]
      )
    : await db.queryOne<any>(
        `SELECT * FROM organization_memberships WHERE user_id = $1 AND status = 'Active' ORDER BY created_at ASC LIMIT 1`,
        [user.id]
      );

  if (!membership || membership.status !== 'Active') {
    return null;
  }

  const assignedPropertyIds = parseAssignments(membership.assigned_property_ids_json);
  if (!assignedPropertyIds || !isKnownOperationalRole(membership.role)) return null;

  const orgRow = await db.queryOne<{ account_status?: string }>(
    'SELECT account_status FROM organizations WHERE id = $1',
    [membership.organization_id]
  );

  let isPlatformAdmin = false;
  if (membership.role === 'Platform Super Admin') {
    // Explicit internal grant only; email allowlists are not authorization.
    try { isPlatformAdmin = (await controlPrincipal(db,req)).role === 'SUPER_ADMIN'; }
    catch { isPlatformAdmin = false; }
  }

  return {
    organizationId: membership.organization_id,
    userId: user.id,
    neonAuthId: neonUser.sub,
    actorName: user.name,
    actorEmail: user.email,
    actorRole: membership.role,
    isPlatformAdmin,
    orgAccountStatus: orgRow?.account_status || 'Unknown',
    assignedPropertyIds,
  };
}

export const requireAuth: RequestHandler = ah(async (req, res, next) => {
  const actor = await resolveSessionActor(req);
  if (!actor) {
    return res.status(401).json({ error: 'Authentication required. Please sign in with Neon Auth.' });
  }
  if (!isOperationalRole(actor.actorRole) || (actor.actorRole === 'Platform Super Admin' && !actor.isPlatformAdmin)) {
    return res.status(403).json({ error: 'Guests cannot access internal operations.' });
  }
  if (actor.orgAccountStatus !== 'Active') {
    return res.status(403).json({ error: 'This workspace is currently suspended. Contact Staywise support.' });
  }
  (req as any).actor = actor;
  next();
});

export const requirePlatformAdmin: RequestHandler = ah(async (req, res, next) => {
  const actor = getActor(req);
  if (!actor || !actor.isPlatformAdmin) {
    return res.status(403).json({ error: 'Platform Super Admin access required.' });
  }
  if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    try {
      const principal = await controlPrincipal(db,req);
      const age = Math.floor(Date.now()/1000) - (principal.authenticatedAt || 0);
      if (age < 0 || age > 300) return res.status(403).json({ error: 'Recent provider reauthentication required for platform changes.' });
    } catch { return res.status(403).json({ error: 'Internal authorization required.' }); }
  }
  next();
});

export function getActor(req: Request): ActorContext {
  return (req as any).actor as ActorContext;
}

export function requireRoles(...allowed: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const actor = getActor(req);
    if (!actor || !isOperationalRole(actor.actorRole) || !allowed.includes(actor.actorRole) || (actor.actorRole === 'Platform Super Admin' && !actor.isPlatformAdmin)) {
      return res.status(403).json({ error: `Role "${actor?.actorRole || 'None'}" is not authorized for this action.` });
    }
    next();
  };
}

export function isOperationalRole(role: string) {
  return isKnownOperationalRole(role);
}

export function canAccessProperty(actor: ActorContext, propertyId: string): boolean {
  return hasPropertyScope(actor, propertyId);
}

export async function logAudit(opts: {
  organizationId: string;
  propertyId?: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}, executor: DbExecutor = db) {
  await executor.execute(
    `INSERT INTO audit_logs (id, organization_id, property_id, actor_name, actor_role, action, entity_type, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      uid('aud'),
      opts.organizationId,
      opts.propertyId || null,
      opts.actorName,
      opts.actorRole,
      opts.action,
      opts.entityType,
      opts.entityId,
      opts.details,
      nowIso(),
    ]
  );
}

export async function dispatchNotification(opts: {
  organizationId: string;
  propertyId?: string | null;
  channel: string;
  recipientRole: string;
  recipientName: string;
  urgency: 'Normal' | 'High' | 'Critical';
  title: string;
  body: string;
}) {
  const cutoffIso = new Date(Date.now() - 5 * 60_000).toISOString();
  const existing = await db.queryOne(
    `SELECT id FROM notifications WHERE organization_id = $1 AND title = $2 AND created_at >= $3 LIMIT 1`,
    [opts.organizationId, opts.title, cutoffIso]
  );
  if (existing) return null;

  const id = uid('not');
  await db.execute(
    `INSERT INTO notifications (id, organization_id, property_id, channel, recipient_role, recipient_name, urgency, title, body, delivery_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      opts.organizationId,
      opts.propertyId || null,
      'In-App',
      opts.recipientRole,
      opts.recipientName,
      opts.urgency,
      opts.title,
      opts.body,
      'Available In-App',
      nowIso(),
    ]
  );
  return id;
}

export async function syncOverdueCleanings(organizationId: string) {
  const openRows = await db.query<{
    id: string;
    property_id: string;
    title: string;
    due_date: string;
    timezone: string;
  }>(
    `SELECT c.id, c.property_id, c.title, c.due_date, p.timezone
     FROM cleaning_tasks c
     JOIN properties p ON p.id = c.property_id
     WHERE c.organization_id = $1 AND c.status IN ('Pending', 'Assigned', 'In Progress')`,
    [organizationId]
  );

  const overdueRows = openRows.filter((row) => row.due_date < getLocalDateTimeMinuteStr(row.timezone || 'UTC'));
  if (overdueRows.length === 0) return;

  const now = nowIso();
  for (const row of overdueRows) {
    await db.execute(`UPDATE cleaning_tasks SET status = 'Overdue', updated_at = $1 WHERE id = $2`, [now, row.id]);
    await computePropertyReadiness(row.property_id);
    await dispatchNotification({
      organizationId,
      propertyId: row.property_id,
      channel: 'In-App + SMS',
      recipientRole: 'Property Manager',
      recipientName: 'Operations Lead',
      urgency: 'High',
      title: `Overdue Cleaning Task: ${row.title}`,
      body: `Local deadline (${row.due_date}) passed without completion.`,
    });
  }
}

export async function readPropertyReadinessGates(propertyId: string): Promise<{
  status: 'Ready' | 'Not Ready';
  reason: string;
  gates: {
    incidentsClear: boolean;
    cleaningApproved: boolean;
    inspectionPassed: boolean;
  };
}> {
  const prop = await db.queryOne<any>(
    'SELECT id, organization_id, readiness_status, readiness_reason FROM properties WHERE id = $1',
    [propertyId]
  );

  if (!prop) {
    return {
      status: 'Not Ready',
      reason: 'Property not found',
      gates: { incidentsClear: false, cleaningApproved: false, inspectionPassed: false },
    };
  }

  const [org, criticalIncidents, openCleanings, lastCompletedCleaning, latestInspection] = await Promise.all([
    db.queryOne<any>('SELECT require_cleaning_approval, require_pre_arrival_inspection FROM organizations WHERE id = $1', [
      prop.organization_id,
    ]),
    db.query<any>(
      `SELECT id, category, work_order_code FROM incidents WHERE property_id = $1 AND priority = 'Critical' AND status != 'Resolved'`,
      [propertyId]
    ),
    db.query<any>(
      `SELECT id, status, title FROM cleaning_tasks WHERE property_id = $1 AND status != 'Completed' ORDER BY updated_at DESC`,
      [propertyId]
    ),
    db.queryOne<{ completed_at: string | null }>(
      `SELECT completed_at FROM cleaning_tasks WHERE property_id = $1 AND status = 'Completed' ORDER BY completed_at DESC LIMIT 1`,
      [propertyId]
    ),
    db.queryOne<{ id: string; overall_status: string; inspected_at: string }>(
      `SELECT id, overall_status, inspected_at FROM inspections WHERE property_id = $1 AND type = 'Pre-Arrival' ORDER BY inspected_at DESC LIMIT 1`,
      [propertyId]
    ),
  ]);

  const incidentsClear = criticalIncidents.length === 0;
  const cleaningApproved = openCleanings.length === 0;
  const inspectionRequired = Boolean(org?.require_pre_arrival_inspection);

  let inspectionFresh = true;
  if (latestInspection && lastCompletedCleaning?.completed_at) {
    inspectionFresh = latestInspection.inspected_at >= lastCompletedCleaning.completed_at;
  }

  const inspectionPassed = !inspectionRequired
    ? latestInspection?.overall_status !== 'Failed'
    : Boolean(latestInspection && latestInspection.overall_status === 'Passed' && inspectionFresh);

  const blockers: string[] = [];
  if (!incidentsClear) {
    blockers.push(
      `${criticalIncidents.length} unresolved Critical incident (${criticalIncidents[0].work_order_code} · ${criticalIncidents[0].category})`
    );
  }
  if (!cleaningApproved) {
    blockers.push(`Cleaning ${openCleanings[0].status.toLowerCase()}`);
  }
  if (!inspectionPassed) {
    if (!latestInspection || !inspectionFresh) {
      blockers.push('Pre-arrival inspection required after latest cleaning');
    } else {
      blockers.push(`Pre-arrival inspection ${latestInspection.overall_status.toLowerCase()}`);
    }
  }

  const status: 'Ready' | 'Not Ready' = blockers.length === 0 ? 'Ready' : 'Not Ready';
  const reason =
    blockers.length === 0 ? 'All cleaning, inspection & safety checks verified' : `Blocked: ${blockers.join(' · ')}`;

  return {
    status,
    reason,
    gates: { incidentsClear, cleaningApproved, inspectionPassed },
  };
}

export async function computePropertyReadiness(propertyId: string) {
  const result = await readPropertyReadinessGates(propertyId);
  await db.execute('UPDATE properties SET readiness_status = $1, readiness_reason = $2 WHERE id = $3', [
    result.status,
    result.reason,
    propertyId,
  ]);
  return result;
}

export function decryptCheckinContent(content: Record<string, any>): Record<string, any> {
  return {
    ...content,
    smartLockCode: decryptField(content.smartLockCode),
    lockboxInstructions: decryptField(content.lockboxInstructions),
  };
}

export function decryptWifiContent(content: Record<string, any>): Record<string, any> {
  return {
    ...content,
    wifiPassword: decryptField(content.wifiPassword),
  };
}

export async function runSafeAiAssistant(opts: {
  propertyId: string;
  question: string;
  isVerifiedGuest: boolean;
}) {
  const prop = await db.queryOne<Record<string, any>>('SELECT * FROM properties WHERE id = $1', [opts.propertyId]);

  if (!prop) {
    return {
      answer: 'Property context could not be verified.',
      sources: [],
      confidence: 'Unavailable',
      escalated: true,
      knowledgeGap: false,
      emergencyAlert: false,
    };
  }

  if (!opts.isVerifiedGuest) {
    return {
      answer: 'Verify your active booking code before searching the private property guide. If anyone is in immediate danger, contact the local emergency services.',
      sources: [], confidence: 'Restricted — Verification Required', escalated: false,
      knowledgeGap: false, emergencyAlert: false,
    };
  }
  const sectionsRows = await db.query<any>(
    'SELECT section_key, title, content_json, is_visible FROM guidebook_sections WHERE property_id = $1 AND is_visible = 1',
    [opts.propertyId]
  );
  const sections: Record<string, Record<string, any>> = {};
  for (const row of projectGuestSections(sectionsRows, true)) sections[row.section_key] = row.content;

  const q = opts.question.toLowerCase().trim();
  const emergency = sections.emergency || {};
  const checkin = sections.checkin || {};
  const wifi = sections.wifi_home || {};
  const rules = sections.rules || {};
  const checkout = sections.checkout || {};
  const gettingAround = sections.getting_around || {};
  const localPicks = sections.local_picks || { items: [] };
  const welcome = sections.welcome || {};

  const hasWord = (patterns: string[]) =>
    patterns.some((p) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q));

  const emergencyKeywords = [
    'gas smell',
    'smell gas',
    'fire',
    'smoke',
    'flood',
    'water leak',
    'burst pipe',
    'leaking',
    'locked out',
    'lockout',
    'ambulance',
    'police',
    '911',
    '000',
    'spark',
    'electrical shock',
    'no power',
    'intruder',
    'medical',
    'emergency',
    'broken window',
  ];

  if (hasWord(emergencyKeywords)) {
    const num = prop.emergency_number || emergency.primaryNumber || '911';
    const mgrPhone = emergency.managerEmergencyPhone || welcome.hostPhone || 'Host line on file';
    const extraLines: string[] = [];
    if (hasWord(['water', 'leak', 'flood']) && emergency.waterShutoffProcedure) {
      extraLines.push(`Host guide shutoff info: ${emergency.waterShutoffProcedure}`);
    }
    if (hasWord(['lock', 'locked', 'lockout']) && emergency.lockoutProcedure) {
      extraLines.push(`Host guide lockout procedure: ${emergency.lockoutProcedure}`);
    }
    if (hasWord(['fire', 'smoke']) && emergency.fireProcedure) {
      extraLines.push(`Host guide fire procedure: ${emergency.fireProcedure}`);
    }

    return {
      answer: `HIGH-PRIORITY SAFETY & ESCALATION NOTICE for ${prop.name}: If anyone is in immediate danger, call ${num} right away. For urgent property assistance, contact the host contact listed in the guide at ${mgrPhone}. ${extraLines.join(' ')} This conversation is recorded for internal team review. No email or SMS is sent; contact your host or emergency services directly when urgent.`,
      sources: ['Emergency Information'],
      confidence: 'Escalated — Safety Protocol',
      escalated: true,
      knowledgeGap: false,
      emergencyAlert: true,
    };
  }

  const sensitiveKeywords = ['code', 'pin', 'lockbox', 'smart lock', 'smartlock', 'keypad', 'password', 'door code'];
  if (hasWord(sensitiveKeywords) && !opts.isVerifiedGuest) {
    return {
      answer: `For guest security, smart-lock PINs, lockbox codes, and private Wi-Fi credentials for ${prop.name} are restricted until you verify your active stay code at the top of this Guest Portal. Once verified, they unlock immediately in your Check-In and Wi-Fi sections.`,
      sources: ['Check-In Instructions (Access Policy)'],
      confidence: 'Restricted — Verification Required',
      escalated: false,
      knowledgeGap: false,
      emergencyAlert: false,
    };
  }

  // Detect schedule exceptions or custom approval requests (e.g., "check-in à 9h", "early check-in", "late checkout", "baggage drop")
  const hasExplicitTimePattern = /\b\d{1,2}\s?(h|am|pm|:00|:30)\b/i.test(q);
  const specialScheduleKeywords = [
    'early',
    'late',
    'earlier',
    'later',
    'extend',
    'before',
    'after',
    'luggage',
    'baggage',
    'bags',
    'drop off',
    'extra guest',
    'additional guest',
    'refund',
    'discount',
    'discount',
    'tôt',
    'tot',
    'tard',
    'avant',
    'après',
    'apres',
    'arrivée',
    'arrivee',
    'départ',
    'depart',
    'bagage',
  ];
  const isCustomTimeOrApprovalRequest =
    hasWord(specialScheduleKeywords) ||
    (hasExplicitTimePattern &&
      hasWord(['check-in', 'check in', 'checkin', 'check-out', 'check out', 'checkout', 'arrive', 'arrival', 'leave', 'depart']));

  const matchedParts: string[] = [];
  const sources = new Set<string>();

  if (isCustomTimeOrApprovalRequest) {
    sources.add('Check-In Instructions');
    sources.add('Before You Go / Check-Out');
    return {
      answer: `Standard check-in for ${prop.name} begins at ${checkin.checkInTime || 'not configured'} and check-out is at ${checkout.checkOutTime || 'not configured'}. Custom timing (such as early arrival, late departure, or luggage drop-off) requires turnover clearance and isn’t auto-approved in the Welcome Book, so your question is recorded for internal team review, not automatically approved. No email or SMS is sent.`,
      sources: Array.from(sources),
      confidence: 'Escalated — Host Approval Required',
      escalated: true,
      knowledgeGap: false,
      emergencyAlert: false,
    };
  }

  if (sections.wifi_home && hasWord(['wifi', 'wi-fi', 'internet', 'password', 'network'])) {
    sources.add('Wi-Fi & Home Instructions');
    if (opts.isVerifiedGuest || !wifi.restrictWifiUntilVerified) {
      matchedParts.push(`Wi-Fi Network: "${wifi.wifiNetwork}" · Password: "${wifi.wifiPassword}".`);
    } else {
      matchedParts.push(`Wi-Fi network "${wifi.wifiNetwork}" is available; password unlocks after verifying your booking code above.`);
    }
  }

  if (sections.checkin && hasWord(['check-in', 'check in', 'arrive', 'arrival', 'key', 'keys', 'lock', 'code', 'pin', 'entry'])) {
    sources.add('Check-In Instructions');
    matchedParts.push(`Check-in starts at ${checkin.checkInTime}. ${checkin.smartLockInstructions}`);
    if (opts.isVerifiedGuest) {
      matchedParts.push(`Your verified stay PIN is ${checkin.smartLockCode}# (${checkin.keyCollection}).`);
    }
  }

  if ((sections.checkin || sections.getting_around) && hasWord(['park', 'parking', 'car', 'garage', 'driveway', 'ev'])) {
    sources.add('Check-In Instructions');
    sources.add('Getting Around');
    matchedParts.push(`Parking: ${checkin.parkingInstructions} ${gettingAround.parkingDetails || ''}`.trim());
  }

  if (sections.rules && hasWord(['pet', 'pets', 'dog', 'dogs', 'cat', 'cats'])) {
    sources.add('House Rules');
    matchedParts.push(`Pet policy: ${rules.petPolicy}`);
  }
  if (sections.rules && hasWord(['smoke', 'smoking', 'vape', 'vaping'])) {
    sources.add('House Rules');
    matchedParts.push(`Smoking policy: ${rules.smokingPolicy}`);
  }
  if (sections.rules && hasWord(['quiet', 'noise', 'party', 'parties', 'visitor', 'visitors'])) {
    sources.add('House Rules');
    matchedParts.push(`Quiet hours: ${rules.quietHours}. Party policy: ${rules.partyPolicy}`);
  }
  if (sections.wifi_home && hasWord(['ac', 'air conditioning', 'thermostat', 'cooling', 'heat', 'heating', 'temperature'])) {
    sources.add('Wi-Fi & Home Instructions');
    matchedParts.push(`Climate control: ${wifi.acInstructions} ${wifi.heatingInstructions}`);
  }
  if (sections.wifi_home && hasWord(['tv', 'television', 'streaming', 'netflix', 'apple tv'])) {
    sources.add('Wi-Fi & Home Instructions');
    matchedParts.push(`TV & Streaming: ${wifi.tvStreaming}`);
  }
  if (sections.wifi_home && hasWord(['pool', 'spa', 'hot tub'])) {
    sources.add('Wi-Fi & Home Instructions');
    matchedParts.push(`Pool & Spa: ${wifi.poolSpa} (${rules.poolPolicy})`);
  }
  if (sections.wifi_home && hasWord(['washer', 'dryer', 'laundry'])) {
    sources.add('Wi-Fi & Home Instructions');
    matchedParts.push(`Laundry: ${wifi.washerDryer}`);
  }
  if (sections.wifi_home && hasWord(['dishwasher', 'kitchen', 'coffee', 'espresso', 'cook', 'cooking'])) {
    sources.add('Wi-Fi & Home Instructions');
    matchedParts.push(`Kitchen & Appliances: ${wifi.kitchenAppliances} Dishwasher: ${wifi.dishwasher}`);
  }
  if (sections.checkout && hasWord(['check-out', 'check out', 'checkout', 'depart', 'departure', 'leave', 'trash', 'bin', 'bins', 'rubbish'])) {
    sources.add('Before You Go / Check-Out');
    matchedParts.push(`Check-out is at ${checkout.checkOutTime}. ${checkout.keyReturn} Waste: ${checkout.wasteInstructions}`);
  }
  if (sections.local_picks && hasWord(['eat', 'food', 'restaurant', 'restaurants', 'dinner', 'cafe', 'cafes', 'coffee', 'grocery', 'supermarket', 'pharmacy'])) {
    sources.add('Places to Eat & Local Picks');
    const items = (localPicks.items || []) as Array<any>;
    if (items.length > 0) {
      const top = items.slice(0, 3).map((i) => `${i.name} (${i.category} — ${i.description})`).join(' · ');
      matchedParts.push(`Host guide local picks near ${prop.city}: ${top}`);
    }
  }
  if (sections.getting_around && hasWord(['airport', 'uber', 'taxi', 'transit', 'bus', 'train'])) {
    sources.add('Getting Around');
    matchedParts.push(`Getting Around: ${gettingAround.airportDirections} ${gettingAround.taxiRideshare}`);
  }

  if (matchedParts.length === 0) {
    const stopWords = new Set(['is', 'are', 'the', 'a', 'an', 'there', 'any', 'do', 'you', 'have', 'provide', 'available', 'can', 'i', 'we', 'my', 'your', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'what', 'where', 'how']);
    const queryTokens = q
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !stopWords.has(t));

    const noteLines = `${welcome.importantNotes || ''}\n${welcome.announcements || ''}`
      .split('\n')
      .map((l) => l.replace(/^[•\-*\s]+/, '').trim())
      .filter(Boolean);

    for (const line of noteLines) {
      const lowerLine = line.toLowerCase();
      const hits = queryTokens.filter((t) => new RegExp(`\\b${t}`, 'i').test(lowerLine));
      if (hits.length >= 1) {
        matchedParts.push(line);
        sources.add('Welcome & Host Notes');
      }
    }
  }

  if (matchedParts.length > 0) {
    return {
      answer: matchedParts.join(' '),
      sources: Array.from(sources),
      confidence: 'Guide content — not independently verified',
      escalated: false,
      knowledgeGap: false,
      emergencyAlert: false,
    };
  }

  return {
    answer: `I don’t have verified information on file in ${prop.name}’s Welcome Book to answer "${opts.question}". Rather than guessing, this question is recorded in the internal support console. No email or SMS is sent; contact your host directly if needed.`,
    sources: [],
    confidence: 'Unavailable — Escalated',
    escalated: true,
    knowledgeGap: true,
    emergencyAlert: false,
  };
}
