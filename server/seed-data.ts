import { encryptField } from './security.js';
import type { DbExecutor } from './db.js';

export function defaultSectionOrder() {
  return [
    'welcome',
    'checkin',
    'rules',
    'wifi_home',
    'local_picks',
    'emergency',
    'getting_around',
    'checkout',
  ];
}

function buildExampleSections(opts: {
  orgId: string;
  propertyId: string;
  propertyName: string;
  address: string;
  city: string;
  country: string;
  hostName: string;
  hostPhone: string;
  hostEmail: string;
  wifiNetwork: string;
  wifiPassword: string;
  smartLockCode: string;
  checkInTime?: string;
  checkOutTime?: string;
  emergencyPhone?: string;
  tempExample?: string;
  hospitalName?: string;
  localPicks?: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    address: string;
    website: string;
    mapLink: string;
    phone: string;
    isOwnerPick: boolean;
  }>;
}) {
  const now = '2026-11-15T09:00:00Z';
  const isAU = opts.country === 'AU';
  const isMetric = opts.country !== 'US';
  const emergencyMap: Record<string, string> = { US: '911', CA: '911', GB: '999', EU: '112', AU: '000', INTL: '112' };
  const emergencyNum = emergencyMap[opts.country] || '112';
  const tempEx = opts.tempExample || (isMetric ? '22°C' : '72°F');
  const mapQuery = encodeURIComponent(opts.address);

  const sections = [
    {
      section_key: 'welcome',
      title: 'Welcome & Host Intro',
      sort_order: 0,
      content: {
        welcomeMessage: `Welcome to ${opts.propertyName}. Everything you need for a smooth, effortless stay is organized below.`,
        propertyIntro: `Carefully prepared and inspected before your arrival. Use the quick tabs or search bar anytime—no app download required.`,
        hostName: opts.hostName,
        hostBio: `Local hospitality & operations team ensuring every stay meets hotel-grade standards with residential warmth.`,
        hostPhone: opts.hostPhone,
        hostEmail: opts.hostEmail,
        announcements: `Trash collection is scheduled weekly; please follow waste sorting notes before departure.`,
        importantNotes: `Smart lock PIN and Wi-Fi credentials unlock automatically once your booking code is verified.`,
      },
    },
    {
      section_key: 'checkin',
      title: 'Check-In Instructions',
      sort_order: 1,
      content: {
        checkInTime: opts.checkInTime || '4:00 PM',
        fullAddress: opts.address,
        mapLink: `https://maps.google.com/?q=${mapQuery}`,
        directions: `Follow GPS directly to ${opts.address}. Look for the architectural house numbers illuminated next to the front entry walkway.`,
        parkingInstructions: `Complimentary private driveway parking for up to 2 vehicles. Street parking is permitted only in unmarked daytime bays.`,
        keyCollection: `Keyless smart deadbolt entry — no physical key pickup required.`,
        lockboxInstructions: encryptField(
          `Backup physical lockbox mounted on the utility gate (emergency use only via concierge authorization).`
        ),
        smartLockCode: encryptField(opts.smartLockCode),
        smartLockInstructions: `Tap the keypad to wake the screen, enter your 6-digit stay PIN followed by #, and wait 1 second for the deadbolt to retract.`,
        entrySteps: [
          'Park in the designated driveway bay.',
          'Proceed up the stone front walkway to the main timber entry door.',
          'Wake the Schlage Encode keypad and enter your verified stay PIN + #.',
          'Turn handle firmly and ensure deadbolt locks behind you upon exit.',
        ],
        accessTroubleshooting: `If the keypad flashes red, pause 3 seconds, press the Schlage logo to reset, and re-enter your PIN carefully.`,
        emergencyAccessContact: opts.hostPhone,
        accessRestricted: true,
      },
    },
    {
      section_key: 'rules',
      title: 'House Rules',
      sort_order: 2,
      content: {
        smokingPolicy: 'Strictly non-smoking indoors and within 15 ft / 5 m of open doors or windows.',
        petPolicy: 'Pets permitted only with prior written approval and pet fee registration.',
        partyPolicy: 'Zero events, parties, or amplified outdoor music permitted at any time.',
        quietHours: '10:00 PM – 8:00 AM daily.',
        visitorPolicy: 'Daytime visitors welcome until 9:00 PM; overnight guests must match reservation headcount.',
        occupancyLimit: 'Strictly enforced per local municipal short-term rental permit.',
        parkingRules: 'Do not block neighboring driveways or fire hydrants. Max 2 vehicles.',
        wasteDisposal: 'Separate general waste from mixed recycling using the labeled kitchen bins.',
        poolPolicy: isMetric
          ? 'Keep pool safety gate latched at all times. No glass bottles on the deck.'
          : 'No glass bottles on patio or pool deck. Rinse sand/sunscreen before entering spa.',
        customRestrictions: [
          'Do not tamper with exterior security cameras or Wi-Fi router equipment.',
          'Please lock all sliding patio doors when leaving the residence.',
        ],
        requireAcknowledgment: true,
      },
    },
    {
      section_key: 'wifi_home',
      title: 'Wi-Fi & Home Instructions',
      sort_order: 3,
      content: {
        wifiNetwork: opts.wifiNetwork,
        wifiPassword: encryptField(opts.wifiPassword),
        restrictWifiUntilVerified: true,
        acInstructions: `Smart wall thermostat in the main hallway. Recommended comfort setting: ${tempEx}. Please close exterior sliders when cooling/heating is active.`,
        heatingInstructions: `Switch thermostat mode to HEAT and adjust target temperature between ${isMetric ? '19°C–22°C' : '68°F–72°F'}.`,
        tvStreaming: `65" OLED Smart TV in living room. Use the Apple TV / Google TV remote; guest streaming profiles are ready—remember to sign out before checkout.`,
        kitchenAppliances: `Induction cooktop activates only when induction-compatible cookware is centered on the burner. Espresso bar pods are stocked in the top drawer.`,
        washerDryer: `Full-size front-load washer & dryer located in the laundry alcove. Detergent sheets provided above the unit.`,
        dishwasher: `Use one Eco Pod in the dispenser door and select "Normal" or "Auto" cycle.`,
        hotWater: `Instant tankless continuous hot water — allow 20 seconds for upstairs showers to reach temperature.`,
        poolSpa: `Automated filtration runs daily 8:00 AM – 2:00 PM. Heated spa controls are mounted beside the patio slider.`,
        smartHome: `Lutron scene dimmers are labeled by room near each doorway.`,
        troubleshooting: [
          'If Wi-Fi drops, do not press the reset pinhole; report via Guest Support for remote reboot.',
          'If breaker trips in kitchen, check GFCI reset button next to the island outlet.',
        ],
      },
    },
    {
      section_key: 'local_picks',
      title: 'Places to Eat & Local Picks',
      sort_order: 4,
      content: {
        items:
          opts.localPicks || [
            {
              id: `lp-${opts.propertyId}-1`,
              name: isAU ? 'Rick Shores' : `Corner Bistro ${opts.city}`,
              category: 'Restaurants',
              description: isAU
                ? 'Iconic waterfront Pan-Asian dining overlooking the coastline.'
                : `Neighborhood wood-fired kitchen and seasonal plates in ${opts.city}.`,
              address: isAU ? '43 Goodwin Terrace, Burleigh Heads' : `Central District, ${opts.city}`,
              website: 'https://example.com',
              mapLink: `https://maps.google.com/?q=${encodeURIComponent(opts.city + ' restaurant')}`,
              phone: opts.hostPhone,
              isOwnerPick: true,
            },
            {
              id: `lp-${opts.propertyId}-2`,
              name: isAU ? 'Paddock Bakery' : `Morning Roast ${opts.city}`,
              category: 'Cafes',
              description: isAU
                ? 'Heritage weatherboard cottage bakery serving wood-fired sourdough and specialty espresso.'
                : 'Neighborhood espresso bar with house pastries and sunny courtyard.',
              address: isAU ? '20 Hibiscus Haven, Miami' : `Main Square, ${opts.city}`,
              website: 'https://example.com',
              mapLink: `https://maps.google.com/?q=${encodeURIComponent(opts.city + ' cafe')}`,
              phone: opts.hostPhone,
              isOwnerPick: true,
            },
            {
              id: `lp-${opts.propertyId}-3`,
              name: `Central Market & Grocer`,
              category: 'Supermarkets',
              description: 'Full fresh produce, pantry staples, and prepared meals within 6 minutes.',
              address: `Central ${opts.city}`,
              website: 'https://example.com',
              mapLink: `https://maps.google.com/?q=${encodeURIComponent(opts.city + ' grocery')}`,
              phone: opts.hostPhone,
              isOwnerPick: false,
            },
            {
              id: `lp-${opts.propertyId}-4`,
              name: `24hr Local Pharmacy`,
              category: 'Pharmacies',
              description: 'Prescription pickup, travel essentials, and first-aid supplies.',
              address: `Main Ave, ${opts.city}`,
              website: 'https://example.com',
              mapLink: `https://maps.google.com/?q=${encodeURIComponent(opts.city + ' pharmacy')}`,
              phone: opts.hostPhone,
              isOwnerPick: false,
            },
          ],
      },
    },
    {
      section_key: 'emergency',
      title: 'Emergency Information',
      sort_order: 5,
      content: {
        primaryNumber: emergencyNum,
        managerEmergencyPhone: opts.hostPhone,
        maintenanceEmergencyPhone: opts.emergencyPhone || opts.hostPhone,
        nearestHospital: opts.hospitalName || `${opts.city} Regional Medical Center`,
        hospitalAddress: `Central Medical District, ${opts.city}`,
        fireProcedure: `Evacuate immediately via front or rear patio exits. Call ${emergencyNum} once outside at a safe distance. Fire extinguisher is stored under the kitchen sink.`,
        electricalProcedure: `Main breaker panel is located inside the garage/utility hallway. Do not touch exposed wiring or standing water; report immediately.`,
        waterShutoffProcedure: `Main water shutoff valve is on the exterior side wall near the hose bib (turn clockwise 90°). Report leaks immediately via Guest Support.`,
        lockoutProcedure: `Call the 24/7 Property Manager Emergency line (${opts.hostPhone}) for verified identity check and remote smart-lock unlock or backup lockbox code.`,
        safetyNotes: `Smoke and carbon monoxide detectors are tested prior to every turnover. Emergency exits must remain unobstructed.`,
      },
    },
    {
      section_key: 'getting_around',
      title: 'Getting Around',
      sort_order: 6,
      content: {
        airportDirections: `20–25 minutes from ${opts.city} Airport via the main coastal/city expressway.`,
        publicTransit: `Local transit and shuttle stops operate within 5 minutes walking distance.`,
        taxiRideshare: `Rideshare and licensed local taxis operate 24/7 with pickup directly at ${opts.address}.`,
        parkingDetails: `Use driveway spaces only. EV Level-2 wall connector available on request.`,
        carRental: `Major airport & neighborhood rental counters operate 6:00 AM – 11:00 PM.`,
        nearbyStations: `Nearest transit hub within 0.6 miles / 1 km.`,
        drivingNotes: `Observe posted residential speed limits and neighborhood parking signs.`,
      },
    },
    {
      section_key: 'checkout',
      title: 'Before You Go / Check-Out',
      sort_order: 7,
      content: {
        checkOutTime: opts.checkOutTime || '11:00 AM',
        keyReturn: 'No physical keys to return—simply close the front door and tap the lock icon on the keypad.',
        wasteInstructions: 'Tie kitchen garbage bags and place in exterior wheeled bins (General Waste / Recycling).',
        dishwasherInstructions: 'Load remaining dishes and start the dishwasher on Normal cycle.',
        laundryInstructions: 'Leave used bath towels in the shower tub or hamper; no need to strip beds.',
        lightsEquipment: `Turn off interior lights, patio heaters, and set thermostat to ${isMetric ? '24°C' : '74°F'} Eco.`,
        closingChecklist: [
          'Verify all windows and sliding glass doors are latched and locked.',
          'Check bedside drawers, outlets, and bathroom hooks for chargers or personal items.',
          'Load & start dishwasher.',
          'Tap "Confirm Departure" below so our turnover team can begin inspection.',
        ],
        forgottenItemsNote: 'Left something behind? Message Guest Support within 24 hours—we store recovered items for 14 days.',
        departureConfirmEnabled: true,
      },
    },
  ];

  return sections.map((s) => ({
    id: `sec-${opts.propertyId}-${s.section_key}`,
    organization_id: opts.orgId,
    property_id: opts.propertyId,
    section_key: s.section_key,
    title: s.title,
    is_visible: 1,
    sort_order: s.sort_order,
    content_json: JSON.stringify(s.content),
    updated_at: now,
  }));
}

/** New real properties start as hidden drafts. The example generator above is for
 * the explicitly guarded demo seed only, never for production property creation. */
export function buildDefaultSections(opts: Parameters<typeof buildExampleSections>[0]) {
  const contents: Record<string, Record<string, unknown>> = {
    welcome: { welcomeMessage: `Welcome to ${opts.propertyName}.`, propertyIntro: '', hostName: opts.hostName, hostPhone: opts.hostPhone, hostEmail: opts.hostEmail, importantNotes: '', announcements: '' },
    checkin: { checkInTime: opts.checkInTime || '', fullAddress: opts.address, mapLink: '', directions: '', parkingInstructions: '', keyCollection: '', smartLockCode: opts.smartLockCode ? encryptField(opts.smartLockCode) : '', lockboxInstructions: '', smartLockInstructions: '', entrySteps: [], accessRestricted: true },
    rules: { quietHours: '', smokingPolicy: '', petPolicy: '', partyPolicy: '', wasteDisposal: '', poolPolicy: '', customRestrictions: [], requireAcknowledgment: false },
    wifi_home: { wifiNetwork: opts.wifiNetwork, wifiPassword: opts.wifiPassword ? encryptField(opts.wifiPassword) : '', restrictWifiUntilVerified: true, acInstructions: '', heatingInstructions: '', tvStreaming: '', kitchenAppliances: '', washerDryer: '', dishwasher: '', poolSpa: '', troubleshooting: [] },
    local_picks: { items: opts.localPicks || [] },
    emergency: { primaryNumber: '', managerEmergencyPhone: opts.hostPhone, maintenanceEmergencyPhone: opts.emergencyPhone || '', nearestHospital: opts.hospitalName || '', hospitalAddress: '', fireProcedure: '', electricalProcedure: '', waterShutoffProcedure: '', lockoutProcedure: '', safetyNotes: '' },
    getting_around: { airportDirections: '', publicTransit: '', taxiRideshare: '', parkingDetails: '', drivingNotes: '' },
    checkout: { checkOutTime: opts.checkOutTime || '', keyReturn: '', wasteInstructions: '', dishwasherInstructions: '', laundryInstructions: '', lightsEquipment: '', closingChecklist: [], departureConfirmEnabled: false },
  };
  const titles = ['Welcome & Host Intro', 'Check-In Instructions', 'House Rules', 'Wi-Fi & Home Instructions', 'Places to Eat & Local Picks', 'Emergency Information', 'Getting Around', 'Before You Go / Check-Out'];
  return defaultSectionOrder().map((key, index) => ({
    id: `sec-${opts.propertyId}-${key}`, organization_id: opts.orgId, property_id: opts.propertyId,
    section_key: key, title: titles[index], is_visible: 0, sort_order: index,
    content_json: JSON.stringify(contents[key]), updated_at: new Date().toISOString(),
  }));
}

export async function seedIfEmpty(db: DbExecutor) {
  const countRow = await db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM organizations');
  if (countRow && countRow.c > 0) return;

  const insertOrgSql = `
    INSERT INTO organizations (id, name, slug, brand_color, contact_email, contact_phone, default_country, plan_tier, property_limit, ai_monthly_allowance, require_cleaning_approval, require_pre_arrival_inspection, terms_accepted_at, privacy_accepted_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (id) DO NOTHING
  `;

  await db.execute(insertOrgSql, [
    'org-sunbelt',
    'Sunbelt Stays Management',
    'sunbelt-stays',
    '#0F766E',
    'ops@sunbeltstays.com',
    '+1 (512) 555-0194',
    'US',
    'Professional',
    10,
    1000,
    1,
    1,
    '2026-06-01T10:00:00Z',
    '2026-06-01T10:00:00Z',
    '2026-06-01T10:00:00Z',
  ]);

  await db.execute(insertOrgSql, [
    'org-harborview',
    'Harborview Private Host',
    'harborview-host',
    '#1E3A8A',
    'claire@harborviewhost.com',
    '+1 (401) 555-0148',
    'US',
    'Starter',
    2,
    100,
    1,
    0,
    '2026-08-15T14:00:00Z',
    '2026-08-15T14:00:00Z',
    '2026-08-15T14:00:00Z',
  ]);

  const users = [
    ['usr-owner', 'Claire Sterling', 'claire@sunbeltstays.com', 'CS'],
    ['usr-pm', 'Marcus Vance', 'marcus@sunbeltstays.com', 'MV'],
    ['usr-concierge', 'Elena Rostova', 'elena@sunbeltstays.com', 'ER'],
    ['usr-cleaner', 'Sofia Alvarez', 'sofia@sunbeltstays.com', 'SA'],
    ['usr-tech', 'Devon Brooks', 'devon@sunbeltstays.com', 'DB'],
    ['usr-inspector', 'Liam O’Connor', 'liam@sunbeltstays.com', 'LO'],
    ['usr-harbor-owner', 'Hannah Reid', 'hannah@harborviewhost.com', 'HR'],
  ];
  for (const [id, name, email, init] of users) {
    await db.execute(
      `INSERT INTO users (id, neon_auth_id, name, email, password_hash, avatar_initials, created_at)
       VALUES ($1, NULL, $2, $3, NULL, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [id, name, email, init, '2026-06-01T10:00:00Z']
    );
  }

  const memberships = [
    ['mem-1', 'org-sunbelt', 'usr-owner', 'Organization Owner', '["*"]', 'Active'],
    ['mem-2', 'org-sunbelt', 'usr-pm', 'Property Manager', '["*"]', 'Active'],
    ['mem-3', 'org-sunbelt', 'usr-concierge', 'Concierge', '["*"]', 'Active'],
    ['mem-4', 'org-sunbelt', 'usr-cleaner', 'Cleaning Staff', '["prop-barton","prop-vista","prop-tallebudgera","prop-timberline"]', 'Active'],
    ['mem-5', 'org-sunbelt', 'usr-tech', 'Maintenance Technician', '["*"]', 'Active'],
    ['mem-6', 'org-sunbelt', 'usr-inspector', 'Inspector', '["*"]', 'Active'],
    ['mem-7', 'org-harborview', 'usr-harbor-owner', 'Organization Owner', '["*"]', 'Active'],
  ];
  for (const [id, orgId, uid, role, props, status] of memberships) {
    await db.execute(
      `INSERT INTO organization_memberships (id, organization_id, user_id, role, assigned_property_ids_json, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [id, orgId, uid, role, props, status, '2026-06-01T10:00:00Z']
    );
  }

  const insertPropSql = `
    INSERT INTO properties (id, organization_id, slug, name, address_line, city, state, postal_code, country, timezone, currency, temp_unit, emergency_number, bedrooms, bathrooms, max_occupancy, cover_image, description, amenities_json, parking_info, access_summary, emergency_notes, internal_notes, operational_status, readiness_status, readiness_reason, archived, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 0, $27)
    ON CONFLICT (id) DO NOTHING
  `;

  await db.execute(insertPropSql, [
    'prop-barton',
    'org-sunbelt',
    'barton-creek-modern',
    'The Barton Creek Modern',
    '2418 Barton Cliff Rd',
    'Austin',
    'TX',
    '78746',
    'US',
    'America/Chicago',
    'USD',
    'F',
    '911',
    3,
    2.5,
    6,
    '/images/barton-creek.jpg',
    'Glass-wrapped mid-century hill country residence minutes from Zilker Park and Barton Springs.',
    JSON.stringify(['1 Gbps Fiber Wi-Fi', 'Smart Deadbolt', 'EV Charger (J1772)', 'Chef Kitchen', 'Outdoor Fire Pit', 'Central AC']),
    'Private 2-car carport + driveway.',
    'Schlage Encode smart keypad on cedar front entry.',
    'Water shutoff located behind left side cedar gate.',
    'Owner prefers Eco cleaning supplies stored in garage cabinet.',
    'Active',
    'Ready',
    'All cleaning, inspection & safety checks verified',
    '2026-06-05T10:00:00Z',
  ]);

  await db.execute(insertPropSql, [
    'prop-vista',
    'org-sunbelt',
    'vista-chino-villa',
    'Vista Chino Desert Villa',
    '1142 E Vista Chino',
    'Palm Springs',
    'CA',
    '92262',
    'US',
    'America/Los_Angeles',
    'USD',
    'F',
    '911',
    4,
    3.5,
    8,
    '/images/vista-chino.jpg',
    'Architectural courtyard residence with heated saltwater lap pool, mountain views, and indoor-outdoor sliders.',
    JSON.stringify(['Heated Saltwater Pool', 'Spa', 'High-Speed Mesh Wi-Fi', 'Smart Lock', 'Outdoor Kitchen', 'Dual-Zone HVAC']),
    'Gated motor court for 3 vehicles.',
    'August Smart Lock on courtyard entry gate.',
    'Pool pump breaker inside west courtyard cabinet.',
    'City Palm Springs permit #PS-4492 posted inside pantry.',
    'Active',
    'Not Ready',
    'Blocked: 1 unresolved Critical incident (WO-1042 · Air conditioning) · Cleaning submitted for review · Pre-arrival inspection required after latest cleaning',
    '2026-06-12T10:00:00Z',
  ]);

  await db.execute(insertPropSql, [
    'prop-tallebudgera',
    'org-sunbelt',
    'tallebudgera-creek-house',
    'Tallebudgera Creek House',
    '48 Trees Road',
    'Gold Coast',
    'QLD',
    '4228',
    'AU',
    'Australia/Brisbane',
    'AUD',
    'C',
    '000',
    3,
    2,
    6,
    '/images/tallebudgera.webp',
    'Timber-clad coastal sanctuary overlooking calm creek waters with breezy open pavilion living.',
    JSON.stringify(['NBN Fibre Wi-Fi', 'Ducted Air Conditioning', 'Outdoor Rain Shower', 'Kayaks Included', 'Induction Kitchen', 'Smart Lock']),
    'Covered timber carport for 2 vehicles.',
    'Yale Assure SL keypad on boardwalk entry.',
    'Dial 000 for Police, Fire, Ambulance. Creek tidal notice in binder.',
    'QLD coastal pool fence compliance certificate current.',
    'Active',
    'Not Ready',
    'Blocked: Cleaning submitted for review · Pre-arrival inspection pending',
    '2026-07-02T10:00:00Z',
  ]);

  await db.execute(insertPropSql, [
    'prop-timberline',
    'org-sunbelt',
    'timberline-ridge-cabin',
    'Timberline Ridge Cabin',
    '890 Pinecrest Cir',
    'South Lake Tahoe',
    'CA',
    '96150',
    'US',
    'America/Los_Angeles',
    'USD',
    'F',
    '911',
    4,
    3,
    8,
    '/images/timberline-ridge.jpg',
    'Alpine cedar and steel mountain retreat with stone fireplace, hot tub, and direct national forest trail access.',
    JSON.stringify(['Hot Tub', 'Gas Stone Fireplace', 'Starlink + Fiber Wi-Fi', 'Heated Mudroom', 'EV Charger', 'Ski Storage']),
    'Heated driveway for 3 SUVs (snow chains required Dec–Mar).',
    'Keyless Yale keypad inside covered porch vestibule.',
    'Bear-proof trash enclosure required by El Dorado County.',
    'Snow plow vendor auto-dispatched >4 inches snowfall.',
    'Active',
    'Not Ready',
    'Blocked: Cleaning assigned · Pre-arrival inspection required after latest cleaning',
    '2026-07-18T10:00:00Z',
  ]);

  await db.execute(insertPropSql, [
    'prop-newport',
    'org-harborview',
    'newport-harbor-cottage',
    'Newport Harbor Cottage',
    '19 Thames Lane',
    'Newport',
    'RI',
    '02840',
    'US',
    'America/New_York',
    'USD',
    'F',
    '911',
    2,
    1.5,
    4,
    '/images/newport-harbor.webp',
    'Private shingle-style harbor cottage steps from Bowen’s Wharf and coastal sailing charters.',
    JSON.stringify(['Fiber Wi-Fi', 'Smart Deadbolt', 'Private Courtyard', 'Washer & Dryer', 'Bicycles']),
    'Dedicated cobblestone bay behind gate.',
    'Keypad entry on navy front door.',
    'Coast guard & local marine channel info inside welcome binder.',
    'Isolated to Harborview Private Host organization.',
    'Active',
    'Ready',
    'All cleaning, inspection & safety checks verified',
    '2026-08-15T14:00:00Z',
  ]);

  const propSpecs = [
    {
      orgId: 'org-sunbelt',
      propertyId: 'prop-barton',
      propertyName: 'The Barton Creek Modern',
      address: '2418 Barton Cliff Rd, Austin, TX 78746',
      city: 'Austin',
      country: 'US' as const,
      hostName: 'Sunbelt Stays Concierge',
      hostPhone: '+1 (512) 555-0194',
      hostEmail: 'concierge@sunbeltstays.com',
      wifiNetwork: 'BartonCreek_5G',
      wifiPassword: 'CedarOak2026!',
      smartLockCode: '482190',
      coverImage: '/images/barton-creek.jpg',
      accentColor: '#0F766E',
      hospitalName: 'St. David’s South Austin Medical Center',
    },
    {
      orgId: 'org-sunbelt',
      propertyId: 'prop-vista',
      propertyName: 'Vista Chino Desert Villa',
      address: '1142 E Vista Chino, Palm Springs, CA 92262',
      city: 'Palm Springs',
      country: 'US' as const,
      hostName: 'Sunbelt Stays Concierge',
      hostPhone: '+1 (760) 555-0133',
      hostEmail: 'palmsprings@sunbeltstays.com',
      wifiNetwork: 'VistaChino_Villa',
      wifiPassword: 'DesertSun72!',
      smartLockCode: '771408',
      coverImage: '/images/vista-chino.jpg',
      accentColor: '#B45309',
      hospitalName: 'Desert Regional Medical Center',
    },
    {
      orgId: 'org-sunbelt',
      propertyId: 'prop-tallebudgera',
      propertyName: 'Tallebudgera Creek House',
      address: '48 Trees Road, Gold Coast QLD 4228',
      city: 'Gold Coast',
      country: 'AU',
      hostName: 'Tallebudgera Host Team',
      hostPhone: '+61 7 5550 8412',
      hostEmail: 'goldcoast@sunbeltstays.com',
      wifiNetwork: 'TalleCreek_NBN',
      wifiPassword: 'EucalyptusBay26',
      smartLockCode: '905214',
      coverImage: '/images/tallebudgera.webp',
      accentColor: '#0E7490',
      checkInTime: '3:00 PM',
      checkOutTime: '10:00 AM',
      hospitalName: 'Gold Coast University Hospital',
    },
    {
      orgId: 'org-sunbelt',
      propertyId: 'prop-timberline',
      propertyName: 'Timberline Ridge Cabin',
      address: '890 Pinecrest Cir, South Lake Tahoe, CA 96150',
      city: 'South Lake Tahoe',
      country: 'US' as const,
      hostName: 'Sunbelt Mountain Ops',
      hostPhone: '+1 (530) 555-0177',
      hostEmail: 'tahoe@sunbeltstays.com',
      wifiNetwork: 'Timberline_Fiber',
      wifiPassword: 'AlpinePine99',
      smartLockCode: '634811',
      coverImage: '/images/timberline-ridge.jpg',
      accentColor: '#1E293B',
      hospitalName: 'Barton Memorial Hospital',
    },
    {
      orgId: 'org-harborview',
      propertyId: 'prop-newport',
      propertyName: 'Newport Harbor Cottage',
      address: '19 Thames Lane, Newport, RI 02840',
      city: 'Newport',
      country: 'US' as const,
      hostName: 'Hannah Reid',
      hostPhone: '+1 (401) 555-0148',
      hostEmail: 'claire@harborviewhost.com',
      wifiNetwork: 'Harborview_Guest',
      wifiPassword: 'SailingNewport26',
      smartLockCode: '319844',
      coverImage: '/images/newport-harbor.webp',
      accentColor: '#1E3A8A',
      hospitalName: 'Newport Hospital',
    },
  ];

  for (const spec of propSpecs) {
    await db.execute(
      `INSERT INTO guidebooks (id, organization_id, property_id, brand_name, accent_color, typography_style, cover_image, section_order_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [
        `gb-${spec.propertyId}`,
        spec.orgId,
        spec.propertyId,
        spec.propertyName,
        spec.accentColor,
        'Modern Sans',
        spec.coverImage,
        JSON.stringify(defaultSectionOrder()),
        '2026-11-15T08:00:00Z',
      ]
    );
    for (const sec of buildExampleSections(spec)) {
      await db.execute(
        `INSERT INTO guidebook_sections (id, organization_id, property_id, section_key, title, is_visible, sort_order, content_json, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
        [
          sec.id,
          sec.organization_id,
          sec.property_id,
          sec.section_key,
          sec.title,
          sec.is_visible,
          sec.sort_order,
          sec.content_json,
          sec.updated_at,
        ]
      );
    }
  }

  const reservations = [
    ['res-101', 'org-sunbelt', 'prop-barton', 'Jordan & Maya Ellis', 'jordan.ellis@example.com', '+1 (415) 555-0191', 4, '2026-11-15', '2026-11-19', 'STAY-4821', 'Active', 'Arriving Today', 'Pending', 'Early luggage drop requested for 2:30 PM; EV charger activated.', 1, '2026-11-01T10:00:00Z'],
    ['res-102', 'org-sunbelt', 'prop-vista', 'Daniel Park', 'dpark@example.com', '+1 (310) 555-0162', 6, '2026-11-16', '2026-11-21', 'STAY-7714', 'Confirmed', 'Pending', 'Pending', 'Requested heated pool prior to arrival.', 0, '2026-11-04T15:30:00Z'],
    ['res-103', 'org-sunbelt', 'prop-tallebudgera', 'Chloe & Liam Bennett', 'chloe.bennett@example.com.au', '+61 412 555 839', 4, '2026-11-15', '2026-11-20', 'STAY-9052', 'Confirmed', 'Arriving Today', 'Pending', 'Traveling from Melbourne; landing OOL at 1:45 PM.', 0, '2026-11-02T09:15:00Z'],
    ['res-104', 'org-sunbelt', 'prop-timberline', 'Natalie Morales', 'natalie.m@example.com', '+1 (206) 555-0144', 5, '2026-11-12', '2026-11-15', 'STAY-6348', 'Active', 'Checked In', 'Departing Today', 'Checkout reminder automated for 9:00 AM.', 1, '2026-10-28T11:00:00Z'],
    ['res-105', 'org-harborview', 'prop-newport', 'Arthur Pendelton', 'arthur.p@example.com', '+1 (617) 555-0182', 2, '2026-11-14', '2026-11-17', 'STAY-3198', 'Active', 'Checked In', 'Pending', 'Sailing weekend stay.', 1, '2026-11-05T12:00:00Z'],
  ];
  for (const r of reservations) {
    await db.execute(
      `INSERT INTO reservations (id, organization_id, property_id, guest_name, guest_email, guest_phone, guest_count, check_in_date, check_out_date, access_code, status, check_in_status, check_out_status, special_instructions, house_rules_acknowledged, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) ON CONFLICT (id) DO NOTHING`,
      r
    );
  }

  const baseChecklist = [
    { id: 'c1', area: 'Kitchen', label: 'Sanitize counters, induction cooktop & empty refrigerator', done: true },
    { id: 'c2', area: 'Bathrooms', label: 'Scrub showers, restock hotel soaps & fresh folded towels', done: true },
    { id: 'c3', area: 'Bedrooms', label: 'Triple-sheet crisp linens & check under beds', done: true },
    { id: 'c4', area: 'Living Area', label: 'Vacuum rugs, dust timber surfaces & align remotes', done: true },
    { id: 'c5', area: 'Consumables', label: 'Restock Nespresso pods, dishwasher tabs & paper goods', done: true },
  ];

  const cleanings = [
    ['cln-201', 'org-sunbelt', 'prop-barton', 'res-101', 'Pre-Arrival Turnover — Barton Creek Modern', 'usr-cleaner', 'Sofia Alvarez', '2026-11-15T13:30', 'Completed', JSON.stringify(baseChecklist), JSON.stringify(['/images/barton-creek.jpg']), 'All rooms spotless, espresso bar stocked for Ellis arrival.', 'Verified & approved by Marcus Vance.', 'Marcus Vance', '2026-11-15T11:20:00Z', '2026-11-14T16:00:00Z', '2026-11-15T11:25:00Z'],
    ['cln-202', 'org-sunbelt', 'prop-vista', 'res-102', 'Full Turnover + Patio Reset — Vista Chino Villa', 'usr-cleaner', 'Sofia Alvarez', '2026-11-15T16:00', 'Submitted for Review', JSON.stringify(baseChecklist), JSON.stringify(['/images/vista-chino.jpg']), 'Interior turnover finished; noted HVAC thermostat error on master zone.', '', null, '2026-11-15T13:10:00Z', '2026-11-14T18:00:00Z', '2026-11-15T13:10:00Z'],
    ['cln-203', 'org-sunbelt', 'prop-tallebudgera', 'res-103', 'Same-Day Turnover — Tallebudgera Creek House', 'usr-cleaner', 'Sofia Alvarez', '2026-11-15T13:00', 'Submitted for Review', JSON.stringify(baseChecklist), JSON.stringify(['/images/tallebudgera.webp']), 'Coastal timber deck swept, kitchen & baths detailed. Ready for supervisor sign-off.', '', null, '2026-11-15T12:15:00Z', '2026-11-14T20:00:00Z', '2026-11-15T12:15:00Z'],
    ['cln-204', 'org-sunbelt', 'prop-timberline', 'res-104', 'Post-Departure Turnover — Timberline Ridge Cabin', 'usr-cleaner', 'Sofia Alvarez', '2026-11-15T15:30', 'Assigned', JSON.stringify(baseChecklist.map((c) => ({ ...c, done: false }))), JSON.stringify([]), 'Starts right after 11:00 AM guest departure.', '', null, null, '2026-11-14T12:00:00Z', '2026-11-14T12:00:00Z'],
  ];
  for (const c of cleanings) {
    await db.execute(
      `INSERT INTO cleaning_tasks (id, organization_id, property_id, reservation_id, title, assigned_user_id, assigned_name, due_date, status, checklist_json, photo_urls_json, notes, review_notes, reviewed_by, completed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) ON CONFLICT (id) DO NOTHING`,
      c
    );
  }

  const incidents = [
    ['inc-301', 'org-sunbelt', 'prop-vista', 'res-102', 'Cleaning Staff', 'Air conditioning', 'Critical', 'Master Suite HVAC Zone Blowing Warm Air', 'During turnover cleaning, Sofia flagged that the primary wing AC thermostat shows Error E4 and supply vents are blowing 81°F air ahead of tomorrow’s guest arrival.', 'In Progress', 'usr-tech', 'Devon Brooks', 'WO-1042', '2026-11-15T18:00', 'Critical priority triggered immediate SMS + In-App alert to Devon Brooks & Marcus Vance.', '', JSON.stringify(['/images/vista-chino.jpg']), JSON.stringify([]), null, '2026-11-15T12:40:00Z', '2026-11-15T13:05:00Z', null],
    ['inc-302', 'org-sunbelt', 'prop-timberline', 'res-104', 'Guest Portal', 'Wi-Fi', 'Medium', 'Loft Mesh Node Intermittent Signal', 'Guest reported weak signal in upstairs bunk room during evening video call.', 'Awaiting Verification', 'usr-tech', 'Devon Brooks', 'WO-1039', '2026-11-15T17:00', 'Swapped Ethernet backhaul cable and updated firmware.', 'Replaced Cat6 patch cable on upstairs Eero node; verified 420 Mbps throughput in loft.', JSON.stringify([]), JSON.stringify(['/images/timberline-interior.jpg']), null, '2026-11-14T19:20:00Z', '2026-11-15T10:15:00Z', null],
    ['inc-303', 'org-sunbelt', 'prop-barton', null, 'Inspector', 'Plumbing', 'Low', 'Guest Bath Slow Drain Cleared', 'Minor hair trap buildup observed in hallway bath sink.', 'Resolved', 'usr-tech', 'Devon Brooks', 'WO-1035', '2026-11-14T16:00', 'Standard preventative drain clearing.', 'Cleared P-trap and tested high-flow cold/hot drain for 3 minutes.', JSON.stringify([]), JSON.stringify([]), 'Marcus Vance', '2026-11-13T14:00:00Z', '2026-11-14T11:00:00Z', '2026-11-14T11:00:00Z'],
  ];
  for (const i of incidents) {
    await db.execute(
      `INSERT INTO incidents (id, organization_id, property_id, reservation_id, source, category, priority, title, description, status, assigned_to_id, assigned_to_name, work_order_code, deadline, internal_notes, resolution_notes, attachment_urls_json, resolution_urls_json, verified_by, created_at, updated_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) ON CONFLICT (id) DO NOTHING`,
      i
    );
  }

  const assets = [
    ['ast-1', 'org-sunbelt', 'prop-barton', '65" LG OLED Smart TV', 'Electronics', 'Great Room', 'Good', 'Wall-mounted, remote + Apple TV verified', 1800],
    ['ast-2', 'org-sunbelt', 'prop-barton', 'Bosch 800 Induction Range', 'Appliances', 'Kitchen', 'Good', 'Zero scratches on glass top', 2900],
    ['ast-3', 'org-sunbelt', 'prop-barton', 'Walnut Leather Lounge Chair', 'Furniture', 'Living Area', 'Good', 'Conditioned leather, no scuffs', 1450],
    ['ast-4', 'org-sunbelt', 'prop-barton', 'Coyuchi Organic Towel Set (12pc)', 'Linen', 'Linen Closet', 'Good', '6 bath, 4 hand, 4 washcloths accounted for', 320],
    ['ast-5', 'org-sunbelt', 'prop-vista', 'Patio Lounger Set (4x)', 'Furniture', 'Pool Deck', 'Good', 'Sunbrella cushions spotless', 2400],
    ['ast-6', 'org-sunbelt', 'prop-vista', 'Breville Barista Express', 'Kitchen equipment', 'Kitchen Island', 'Good', 'Portafilter, tamper & steam wand clean', 750],
    ['ast-7', 'org-sunbelt', 'prop-tallebudgera', '2x Coastal Touring Kayaks', 'Property assets', 'Boat Rack', 'Good', '2 paddles & 2 PFDs stored on rack', 1600],
    ['ast-8', 'org-sunbelt', 'prop-tallebudgera', 'Miele Induction Cooktop & Oven', 'Appliances', 'Kitchen', 'Good', 'Spotless glass & racks', 3200],
  ];
  for (const [id, orgId, pid, name, cat, loc, cond, notes, cost] of assets) {
    await db.execute(
      `INSERT INTO property_assets (id, organization_id, property_id, name, category, location, condition_status, baseline_notes, replacement_cost, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [id, orgId, pid, name, cat, loc, cond, notes, cost, '2026-11-14T10:00:00Z']
    );
  }

  await db.execute(
    `INSERT INTO inspections (id, organization_id, property_id, type, inspector_name, inspected_at, overall_status, items_json, discrepancies_count, summary_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
    [
      'insp-1',
      'org-sunbelt',
      'prop-barton',
      'Pre-Arrival',
      'Liam O’Connor',
      '2026-11-15T12:00:00Z',
      'Passed',
      JSON.stringify([
        { assetId: 'ast-1', assetName: '65" LG OLED Smart TV', status: 'Intact', notes: 'Tested streaming & HDMI input' },
        { assetId: 'ast-2', assetName: 'Bosch 800 Induction Range', status: 'Intact', notes: 'Clean glass surface' },
        { assetId: 'ast-3', assetName: 'Walnut Leather Lounge Chair', status: 'Intact', notes: 'Matches reference condition' },
        { assetId: 'ast-4', assetName: 'Coyuchi Organic Towel Set (12pc)', status: 'Intact', notes: 'All 12 pieces counted' },
      ]),
      0,
      'Property passes pre-arrival visual, asset, and smart-lock verification.',
    ]
  );

  await db.execute(
    `INSERT INTO inspections (id, organization_id, property_id, type, inspector_name, inspected_at, overall_status, items_json, discrepancies_count, summary_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
    [
      'insp-2',
      'org-sunbelt',
      'prop-tallebudgera',
      'Pre-Arrival',
      'Liam O’Connor',
      '2026-11-15T08:00:00Z',
      'Pending',
      JSON.stringify([
        { assetId: 'ast-7', assetName: '2x Coastal Touring Kayaks', status: 'Intact', notes: 'Awaiting post-clean sign-off' },
        { assetId: 'ast-8', assetName: 'Miele Induction Cooktop & Oven', status: 'Intact', notes: 'Pending inspector walkthrough' },
      ]),
      0,
      'Scheduled right after supervisor approves cln-203.',
    ]
  );

  await db.execute(
    `INSERT INTO support_requests (id, organization_id, property_id, reservation_id, guest_name, subject, message, category, urgency, status, escalated_to_incident_id, attachment_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
    [
      'sup-1',
      'org-sunbelt',
      'prop-barton',
      'res-101',
      'Jordan & Maya Ellis',
      'EV Charger activation question',
      'We are arriving in a Rivian R1S around 2:30 PM—is the garage J1772 charger unlocked for guests?',
      'Equipment',
      'Normal',
      'Resolved',
      null,
      null,
      '2026-11-15T10:30:00Z',
    ]
  );

  await db.execute(
    `INSERT INTO ai_conversations (id, organization_id, property_id, reservation_id, session_id, guest_question, ai_answer, verified_sources_json, confidence, escalated, knowledge_gap_flag, gap_resolved, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
    [
      'ai-1',
      'org-sunbelt',
      'prop-barton',
      'res-101',
      'sess-demo-1',
      'What time is check-in and where do we park?',
      'Check-in at The Barton Creek Modern begins at 4:00 PM. Complimentary private driveway parking is available for up to 2 vehicles in the private carport and driveway.',
      JSON.stringify(['Check-In Instructions', 'Getting Around']),
      'Verified',
      0,
      0,
      0,
      '2026-11-15T09:45:00Z',
    ]
  );

  await db.execute(
    `INSERT INTO ai_conversations (id, organization_id, property_id, reservation_id, session_id, guest_question, ai_answer, verified_sources_json, confidence, escalated, knowledge_gap_flag, gap_resolved, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
    [
      'ai-2',
      'org-sunbelt',
      'prop-tallebudgera',
      'res-103',
      'sess-demo-2',
      'Do you provide a baby travel cot / crib and high chair?',
      'I do not have verified information on file confirming whether a baby travel cot or high chair is currently stocked at Tallebudgera Creek House. I have flagged this as a question for our local host team so they can confirm directly.',
      JSON.stringify([]),
      'Unavailable — Escalated',
      1,
      1,
      0,
      '2026-11-15T11:10:00Z',
    ]
  );

  const rules = [
    ['aut-1', 'org-sunbelt', 'Pre-Arrival Smart Lock Dispatch', 'Upcoming arrival (24h)', 'Email + In-App', 'Guest', 1, 1, 'Sends verified guest portal link & unlocks stay code window 24 hours prior to arrival.'],
    ['aut-2', 'org-sunbelt', 'Same-Day Turnover Dispatch', 'Upcoming departure', 'In-App + SMS', 'Cleaning Staff', 1, 1, 'Auto-assigns room-by-room cleaning checklist when reservation check-out date matches today.'],
    ['aut-3', 'org-sunbelt', 'Critical Incident Urgent Pager', 'Critical incident', 'SMS + Email + In-App', 'Maintenance Technician', 1, 0, 'Bypasses quiet hours to immediately alert Property Manager & Technician on Critical issues.'],
    ['aut-4', 'org-sunbelt', 'Supervisor Review Gate', 'Cleaning completed', 'In-App', 'Property Manager', 1, 1, 'Notifies manager & inspector when cleaning staff submits photo evidence for approval.'],
    ['aut-5', 'org-sunbelt', 'Failed Inspection Hold', 'Property inspection failed', 'Email + In-App', 'Organization Owner', 1, 1, 'Places readiness hold and alerts operations lead if discrepancy blocks readiness.'],
  ];
  for (const r of rules) {
    await db.execute(
      `INSERT INTO automation_rules (id, organization_id, name, trigger_event, channel, recipient_role, enabled, quiet_hours_respected, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      r
    );
  }

  const notifs = [
    ['not-1', 'org-sunbelt', 'prop-vista', 'SMS + In-App', 'Maintenance Technician', 'Devon Brooks', 'Critical', 'CRITICAL INCIDENT WO-1042: Vista Chino Villa HVAC', 'Master Suite HVAC Zone blowing warm air (Error E4). Immediate inspection required ahead of Nov 16 arrival.', 'Delivered', '2026-11-15T12:41:00Z'],
    ['not-2', 'org-sunbelt', 'prop-tallebudgera', 'In-App', 'Property Manager', 'Marcus Vance', 'Normal', 'Cleaning Submitted for Review', 'Sofia Alvarez completed Same-Day Turnover at Tallebudgera Creek House with photo evidence.', 'Delivered', '2026-11-15T12:16:00Z'],
    ['not-3', 'org-sunbelt', 'prop-barton', 'Email', 'Guest', 'Jordan & Maya Ellis', 'Normal', 'Your Barton Creek Modern Welcome Book is Ready', 'No app required. Verify your booking code STAY-4821 to unlock smart lock access.', 'Delivered', '2026-11-14T16:00:00Z'],
  ];
  for (const n of notifs) {
    await db.execute(
      `INSERT INTO notifications (id, organization_id, property_id, channel, recipient_role, recipient_name, urgency, title, body, delivery_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
      n
    );
  }

  const feedbacks = [
    ['fb-1', 'org-sunbelt', 'prop-barton', null, 'Elena & Sam Carter', 5, 5, 5, 5, 'Smart lock instructions and espresso guide were effortless. Zero back-and-forth texts needed!', 0, 'None', '2026-11-10T11:30:00Z'],
    ['fb-2', 'org-sunbelt', 'prop-timberline', null, 'Kevin Nguyen', 5, 4, 5, 3, 'Cabin was immaculate and cozy. Loft Wi-Fi dipped once during an evening Zoom call; happy to see team is upgrading the node.', 1, 'Technician Dispatched', '2026-11-14T10:15:00Z'],
  ];
  for (const f of feedbacks) {
    await db.execute(
      `INSERT INTO feedback (id, organization_id, property_id, reservation_id, guest_name, cleaning_rating, checkin_rating, comfort_rating, maintenance_rating, comments, follow_up_requested, follow_up_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO NOTHING`,
      f
    );
  }

  const audits = [
    ['aud-1', 'org-sunbelt', 'prop-barton', 'Liam O’Connor', 'Inspector', 'INSPECTION_PASSED', 'Inspection', 'insp-1', 'Pre-arrival inspection passed (4/4 assets intact). Property Readiness set to Ready.', '2026-11-15T12:00:00Z'],
    ['aud-2', 'org-sunbelt', 'prop-tallebudgera', 'Sofia Alvarez', 'Cleaning Staff', 'CLEANING_SUBMITTED', 'CleaningTask', 'cln-203', 'Submitted turnover checklist + photos for supervisor review. Property remains Not Ready pending approval.', '2026-11-15T12:15:00Z'],
    ['aud-3', 'org-sunbelt', 'prop-vista', 'Sofia Alvarez', 'Cleaning Staff', 'CRITICAL_INCIDENT_CREATED', 'Incident', 'inc-301', 'Created Critical HVAC incident WO-1042. Property Readiness locked to Not Ready.', '2026-11-15T12:40:00Z'],
  ];
  for (const a of audits) {
    await db.execute(
      `INSERT INTO audit_logs (id, organization_id, property_id, actor_name, actor_role, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      a
    );
  }

  await db.execute(
    `INSERT INTO payment_records (id, organization_id, plan_tier, amount_cents, tax_cents, currency, status, invoice_number, period_label, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
    ['pay-1', 'org-sunbelt', 'Professional', 4900, 0, 'USD', 'Paid', 'INV-2026-1101', 'Nov 2026 Monthly', '2026-11-01T08:00:00Z']
  );
  await db.execute(
    `INSERT INTO payment_records (id, organization_id, plan_tier, amount_cents, tax_cents, currency, status, invoice_number, period_label, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
    ['pay-2', 'org-harborview', 'Starter', 1900, 0, 'USD', 'Paid', 'INV-2026-1102', 'Nov 2026 Monthly', '2026-11-01T08:00:00Z']
  );
}
