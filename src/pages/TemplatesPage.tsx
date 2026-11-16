import React, { useState } from 'react';
import { ArrowRight, BedDouble, CheckCircle2, Globe, KeyRound, Sparkles } from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';

export interface GuidebookTemplateSpec {
  id: string;
  name: string;
  category: 'Coastal & Lake' | 'Mountain & Rural' | 'Urban & Condo' | 'Luxury & Pool';
  typicalBeds: string;
  regionHint: string;
  summary: string;
  sectionsHighlighted: string[];
  turnoverFocus: string;
}

export const GUIDEBOOK_TEMPLATES: GuidebookTemplateSpec[] = [
  {
    id: 'coastal-beach-house',
    name: 'Coastal Beach House',
    category: 'Coastal & Lake',
    typicalBeds: '3–5 Beds',
    regionHint: 'US / AU / EU Coastal',
    summary: 'Built for beachfront homes with outdoor showers, sand-rinse stations, tide safety notes, and smart-lock deck entries.',
    sectionsHighlighted: ['Outdoor Shower & Gear Shed', 'Tide & Rip-Current Safety', 'Sand-Free Check-Out Checklist'],
    turnoverFocus: 'Patio salt-spray rinse & exterior lock check',
  },
  {
    id: 'mountain-timber-cabin',
    name: 'Mountain Timber Cabin',
    category: 'Mountain & Rural',
    typicalBeds: '2–4 Beds',
    regionHint: 'Mountain / Rural',
    summary: 'Covers fireplace and woodstove controls, steep driveway snow-plow guidance, wildlife trash locks, and offline print PDF.',
    sectionsHighlighted: ['Fireplace & Thermostat Guide', 'Snow Chain & Driveway Map', 'Bear-Proof Trash Rules'],
    turnoverFocus: 'Chimney ash check, humidifier refill & heater audit',
  },
  {
    id: 'downtown-urban-loft',
    name: 'Downtown Urban Loft',
    category: 'Urban & Condo',
    typicalBeds: '1–2 Beds',
    regionHint: 'City Centers',
    summary: 'Simplifies building callbox buzzer entry, key fob pickup, street/garage parking permits, and strict condo quiet hours.',
    sectionsHighlighted: ['Building Buzzer & Elevator Fob', 'Garage Clearance & Parking Pass', 'Condo Quiet Hours'],
    turnoverFocus: 'Fob inventory verification & smart-lock battery check',
  },
  {
    id: 'desert-pool-villa',
    name: 'Desert Pool Villa',
    category: 'Luxury & Pool',
    typicalBeds: '3–5 Beds',
    regionHint: 'Warm Climates',
    summary: 'Explains heated pool/spa controls, retractable shade awnings, outdoor misting systems, and poolside glass safety rules.',
    sectionsHighlighted: ['Pool Heater & Spa Timer', 'EV Charger Instructions', 'Glass-Free Pool Patio Rules'],
    turnoverFocus: 'Pool gate latch inspection & AC filter check',
  },
  {
    id: 'lakefront-family-cottage',
    name: 'Lakefront Family Cottage',
    category: 'Coastal & Lake',
    typicalBeds: '3–4 Beds',
    regionHint: 'Lake Regions',
    summary: 'Details boat dock mooring limits, kayak & lifejacket storage, firepit embers protocol, and local marina hours.',
    sectionsHighlighted: ['Dock & Kayak Locker PIN', 'Lifejacket Sizing & Safety', 'Outdoor Firepit Rules'],
    turnoverFocus: 'Paddle & lifejacket count + dock safety walk',
  },
  {
    id: 'ski-in-ski-out-condo',
    name: 'Ski-In / Ski-Out Condo',
    category: 'Mountain & Rural',
    typicalBeds: '1–3 Beds',
    regionHint: 'Alpine Resorts',
    summary: 'Covers ski locker room combinations, boot dryer switches, mountain shuttle loops, and altitude hydration tips.',
    sectionsHighlighted: ['Ski Locker Room Access', 'Boot Dryer & Gear Closet', 'Base Village Shuttle Schedule'],
    turnoverFocus: 'Humidifier sanitization & wet-entry floor inspection',
  },
  {
    id: 'historic-city-townhouse',
    name: 'Historic City Townhouse',
    category: 'Urban & Condo',
    typicalBeds: '2–4 Beds',
    regionHint: 'GB / EU / US Historic',
    summary: 'Helps guests operate radiator valves, European/UK plug adapters, multi-flight stair lighting, and residential transit passes.',
    sectionsHighlighted: ['Radiator & Boiler Controls', 'Transit Card & Walking Map', 'Historic Fixture Care'],
    turnoverFocus: 'Boiler pressure & sash window lock verification',
  },
  {
    id: 'suburban-family-home',
    name: 'Suburban Family Home',
    category: 'Luxury & Pool',
    typicalBeds: '3–5 Beds',
    regionHint: 'Metro Suburbs',
    summary: 'Clear driveway parking boundaries, Pack-n-Play and high-chair setup, municipal trash/recycling bins, and park walking paths.',
    sectionsHighlighted: ['Trash & Recycling Day Guide', 'Baby Gear & Laundry Room', 'Driveway Parking Zones'],
    turnoverFocus: 'Toy/baby-gear sanitization & garage keypad reset',
  },
  {
    id: 'boutique-studio-suite',
    name: 'Boutique Studio Suite',
    category: 'Urban & Condo',
    typicalBeds: 'Studio',
    regionHint: 'Global',
    summary: 'Compact guidebook focused on self-check-in keypad, Murphy bed or sofa sleeper setup, espresso machine steps, and café picks.',
    sectionsHighlighted: ['Self Check-In Keypad', 'Espresso Bar & Kitchenette', 'Neighborhood Coffee Picks'],
    turnoverFocus: 'Fast 90-minute turnover checklist & linen photo check',
  },
  {
    id: 'countryside-farmhouse',
    name: 'Countryside Farmhouse',
    category: 'Mountain & Rural',
    typicalBeds: '3–6 Beds',
    regionHint: 'Rural Estates',
    summary: 'Includes GPS gate coordinates, septic system care notes, pasture fence etiquette, and printable backup guide for low-signal stays.',
    sectionsHighlighted: ['Front Gate Code & GPS Pin', 'Well Water & Septic Rules', 'Offline Printable PDF Guide'],
    turnoverFocus: 'Gate battery check, well pump & outdoor perimeter walk',
  },
  {
    id: 'harbor-marina-cottage',
    name: 'Harbor Marina Cottage',
    category: 'Coastal & Lake',
    typicalBeds: '2–3 Beds',
    regionHint: 'Harbor Towns',
    summary: 'Highlights narrow cobblestone drop-off windows, municipal harbor lot permits, seafood markets, and ferry timetable links.',
    sectionsHighlighted: ['Drop-Off Zone & Lot Permit', 'Ferry & Harbor Walk Map', 'Dehumidifier Settings'],
    turnoverFocus: 'Parking permit return check & dehumidifier empty',
  },
  {
    id: 'resort-amenities-condo',
    name: 'Resort Amenities Condo',
    category: 'Luxury & Pool',
    typicalBeds: '2–3 Beds',
    regionHint: 'Resort Communities',
    summary: 'Organizes HOA wristband registration, gym/tennis court reservations, bell-cart storage, and on-site security contact numbers.',
    sectionsHighlighted: ['Resort Pass & Gate QR', 'Pool, Gym & Tennis Hours', 'Front Desk Security Line'],
    turnoverFocus: 'HOA wristband & amenity pass inventory verification',
  },
];

const CATEGORIES = ['All', 'Coastal & Lake', 'Mountain & Rural', 'Urban & Condo', 'Luxury & Pool'] as const;

export function TemplatesPage({
  onNavigatePath,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const visible =
    category === 'All' ? GUIDEBOOK_TEMPLATES : GUIDEBOOK_TEMPLATES.filter((t) => t.category === category);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader
        currentPath="/templates"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />

      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-10">
        <div className="max-w-3xl space-y-3">
          <Badge variant="brand">12 Property Templates · Free in Every Workspace</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            12 welcome book and turnover templates built for real properties
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Every template maps cleanly onto Staywise’s 8-section digital guidebook, stay-gated lock vault, and room-by-room cleaning checklist—ready to customize in your free workspace.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[40px] px-4 rounded-full text-xs font-semibold border transition-colors ${
                category === cat
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 12 Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((tpl) => (
            <Card key={tpl.id} className="p-6 rounded-2xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="neutral">{tpl.category}</Badge>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                    <BedDouble className="w-3.5 h-3.5" /> {tpl.typicalBeds}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{tpl.name}</h2>
                <p className="text-[13px] text-slate-600 leading-relaxed">{tpl.summary}</p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-teal-800" /> Key Guidebook Blocks
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {tpl.sectionsHighlighted.map((sec) => (
                      <li key={sec} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                        <span>{sec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-800 shrink-0 mt-0.5" />
                  <span>
                    <strong>Turnover Check:</strong> {tpl.turnoverFocus}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                  <Globe className="w-3.5 h-3.5" /> {tpl.regionHint}
                </span>
                <Button variant="primary" size="sm" onClick={() => onOpenAuth('register', 'Starter')}>
                  Use Template <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}
