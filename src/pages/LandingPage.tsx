import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Wrench,
  QrCode,
  Globe,
  CheckCircle2,
  ExternalLink,
  Lock,
  Smartphone,
  Camera,
  MapPin,
  BedDouble,
  Bath,
  Users,
  KeyRound,
  MessageSquare,
  ChevronDown,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { Button, Badge, Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';

type ShowcaseRegion = 'US' | 'EU' | 'GB' | 'APAC';

const SAMPLE_PORTALS = [
  {
    slug: 'barton-creek-modern',
    name: 'The Barton Creek Modern',
    location: 'Austin, Texas',
    code: 'STAY-4821',
    stem: 'barton-creek',
    fallback: '/images/barton-creek.jpg',
    beds: 3,
    baths: 2.5,
    guests: 6,
    tag: 'Live Welcome Book',
    summary: 'Keyless smart lock, courtyard spa & curated neighborhood picks.',
  },
  {
    slug: 'vista-chino-villa',
    name: 'Vista Chino Desert Villa',
    location: 'Palm Springs, California',
    code: 'STAY-7714',
    stem: 'vista-chino',
    fallback: '/images/vista-chino.jpg',
    beds: 4,
    baths: 3,
    guests: 8,
    tag: 'Pool & Thermostat Guide',
    summary: 'Heated pool controls, shaded outdoor dining & EV charging notes.',
  },
  {
    slug: 'newport-harbor-cottage',
    name: 'Newport Harbor Cottage',
    location: 'Newport, Rhode Island',
    code: 'STAY-3198',
    stem: 'newport-harbor',
    fallback: '/images/newport-harbor.webp',
    beds: 2,
    baths: 1.5,
    guests: 4,
    tag: 'Coastal Check-In',
    summary: 'Walk-to-harbor parking guide, keypad entry & local dining list.',
  },
];

const REGION_SPECS: Record<
  ShowcaseRegion,
  {
    label: string;
    emergency: string;
    currency: string;
    climate: string;
    format: string;
    sampleCity: string;
  }
> = {
  US: {
    label: 'United States',
    emergency: '911',
    currency: 'USD ($)',
    climate: '72°F · MM/DD/YYYY',
    format: 'ZIP · +1 (512) 555-0194',
    sampleCity: 'Austin, TX',
  },
  EU: {
    label: 'Europe',
    emergency: '112',
    currency: 'EUR (€)',
    climate: '22°C · DD/MM/YYYY',
    format: 'Postal · +351 21 555 0140',
    sampleCity: 'Lisbon, PT',
  },
  GB: {
    label: 'United Kingdom',
    emergency: '999',
    currency: 'GBP (£)',
    climate: '20°C · DD/MM/YYYY',
    format: 'Postcode · +44 20 7946 0192',
    sampleCity: 'Edinburgh, UK',
  },
  APAC: {
    label: 'Asia-Pacific',
    emergency: '000',
    currency: 'AUD (A$)',
    climate: '24°C · DD/MM/YYYY',
    format: 'Postcode · +61 7 5550 8412',
    sampleCity: 'Gold Coast, QLD',
  },
};

const FAQS = [
  {
    q: 'Do guests have to download an app or create a login?',
    a: 'No. Every welcome book opens in Safari or Chrome from a booking link or nightstand QR card. Basic property details show immediately, while smart-lock PINs and Wi-Fi credentials unlock once a guest verifies their stay code.',
  },
  {
    q: 'How are door codes and Wi-Fi passwords protected?',
    a: 'Access secrets are encrypted at rest with AES-256-GCM before storage and masked on public views until a guest presents an active booking code inside the check-in window (48 hours pre-arrival through 24 hours post-departure). Verification endpoints enforce PostgreSQL-backed rate limiting after repeated invalid guesses.',
  },
  {
    q: 'What happens if a guest asks the assistant something not in our guide?',
    a: 'The Guest Assistant only retrieves facts from sections you approved. If a guest asks about an undocumented item or requests a special exception (like a 9 AM early check-in), it clearly escalates the request to your host team instead of inventing an answer.',
  },
  {
    q: 'Does Staywise charge my card during Early Access?',
    a: 'No. Billing checkout is not active yet during Alpha—every tier (Starter, Professional, Portfolio) activates at $0/month without requiring a credit card so you can test multi-property quotas, QR exports, and team workflows freely.',
  },
  {
    q: 'Can we export or delete our organization and account data?',
    a: 'Yes. Inside Billing & Settings, you can export a complete machine-readable JSON archive of your organization, delete an organization, or permanently delete your personal account and Neon Auth login at any time.',
  },
];

export function LandingPage({
  onEnterWorkspace,
  onOpenAuth,
  onNavigatePath,
}: {
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
  onNavigatePath: (path: string) => void;
}) {
  const [region, setRegion] = useState<ShowcaseRegion>('US');
  const [selectedSlug, setSelectedSlug] = useState(SAMPLE_PORTALS[0].slug);
  const [stayCode, setStayCode] = useState(SAMPLE_PORTALS[0].code);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const selectedProperty = SAMPLE_PORTALS.find((p) => p.slug === selectedSlug) || SAMPLE_PORTALS[0];
  const regionInfo = REGION_SPECS[region];

  const handleSelectProperty = (slug: string) => {
    setSelectedSlug(slug);
    const match = SAMPLE_PORTALS.find((p) => p.slug === slug);
    if (match) setStayCode(match.code);
  };

  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = stayCode.trim();
    const url = `/guest/${selectedSlug}${cleanCode ? `?code=${encodeURIComponent(cleanCode)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicHeader
        currentPath="/"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />

      <main>
        {/* Editorial Photographic Hero + Floating Interactive Guest Portal Launcher */}
        <section className="pt-4 sm:pt-6 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]">
            <picture>
              <source
                type="image/avif"
                srcSet="/images/barton-creek-640.avif 640w, /images/barton-creek-1280.avif 1280w"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
              <source
                type="image/webp"
                srcSet="/images/barton-creek-640.webp 640w, /images/barton-creek-1280.webp 1280w"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
              <img
                src="/images/barton-creek.jpg"
                alt="Sunlit architectural vacation rental home managed with Staywise"
                width={1280}
                height={853}
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/70 to-slate-900/30" />

            <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 lg:py-20 pb-24 sm:pb-28">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-medium text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Early Access · Live welcome books & turnover ops
                </div>

                <a
                  href="/guest/barton-creek-modern?code=STAY-4821"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-900 shadow-sm transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-slate-900">3 interactive sample properties</div>
                    <div className="text-slate-600">AES-256 stay-code lock vault · Try live demo →</div>
                  </div>
                </a>
              </div>

              <div className="max-w-2xl space-y-5">
                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
                  Your guests know the Wi-Fi before they park. Your team knows every home is ready.
                </h1>
                <p className="text-base sm:text-lg text-slate-100 leading-relaxed max-w-xl">
                  Stop answering late-night lockbox texts or guessing whether a turnover actually got done. Staywise puts mobile welcome books, stay-gated door codes, and photo-verified checklists in one calm workspace.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="shadow-sm min-h-[44px]"
                    onClick={() => onOpenAuth('register', 'Starter')}
                  >
                    Create Free Workspace
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-medium rounded-md bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm transition-colors"
                  >
                    Open Operations Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Live Guest Portal Launcher Bar */}
          <form
            onSubmit={handleOpenPreview}
            className="relative z-20 -mt-12 sm:-mt-14 mx-2 sm:mx-8 bg-white rounded-2xl border border-slate-200 shadow-[0_14px_40px_-14px_rgba(15,23,42,0.18)] p-3 sm:p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5 flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="hero-prop-select" className="block text-[11px] font-medium text-slate-600">
                    Live Property Welcome Book
                  </label>
                  <select
                    id="hero-prop-select"
                    value={selectedSlug}
                    onChange={(e) => handleSelectProperty(e.target.value)}
                    className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer truncate min-h-[32px]"
                  >
                    {SAMPLE_PORTALS.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name} — {p.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-4 flex items-center gap-3 px-2 py-1 md:border-l border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="hero-code-input" className="block text-[11px] font-medium text-slate-600">
                    Sample Stay Code (unlocks PIN & Wi-Fi)
                  </label>
                  <input
                    id="hero-code-input"
                    value={stayCode}
                    onChange={(e) => setStayCode(e.target.value)}
                    placeholder={selectedProperty.code}
                    className="w-full text-sm font-mono font-semibold text-slate-900 bg-transparent focus:outline-none min-h-[32px]"
                  />
                </div>
              </div>

              <div className="md:col-span-3 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  className="w-full min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-4 h-4 text-teal-300" />
                  Open Guest Portal
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 4-Card Trust & Value Strip */}
        <section id="features" className="py-8 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Smartphone,
                accent: 'bg-teal-50 text-teal-800',
                title: 'No App to Download',
                desc: 'Guests scan a nightstand QR card or tap a link straight in Safari or Chrome.',
              },
              {
                icon: Lock,
                accent: 'bg-slate-100 text-slate-800',
                title: 'Protected Door & Wi-Fi',
                desc: 'Smart-lock PINs stay encrypted and hidden until a guest verifies an active stay code.',
              },
              {
                icon: Camera,
                accent: 'bg-emerald-50 text-emerald-800',
                title: 'Photo-Verified Turnovers',
                desc: 'Cleaners submit room-by-room check photos before managers mark a home ready.',
              },
              {
                icon: Globe,
                accent: 'bg-amber-50 text-amber-800',
                title: 'Regional Standards Built In',
                desc: 'Configure currency, °F or °C, date formats, and local emergency numbers per home.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 hover:border-slate-300 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 ${item.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                  <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Editorial Story Section */}
        <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-800">
                Built for real turnover days
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Fewer late-night messages. Fewer Sunday surprises.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Most rental software stops at the booking calendar. The real work happens between checkout at 11 AM and the next family pulling into the driveway at 4 PM.
              </p>
              <ul className="space-y-3 text-sm text-slate-700 pt-1">
                {[
                  'One mobile welcome book with parking, Wi-Fi, appliances, and local picks',
                  'A guest assistant grounded only in facts you approved—and honest when unsure',
                  'Cleaners, inspectors, and maintenance techs working from one live schedule',
                  'Clear audit trails: every reported issue becomes a tracked work order',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button variant="primary" size="lg" onClick={() => onOpenAuth('register', 'Starter')}>
                  Create Free Workspace
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => onNavigatePath('/features')}>
                  Explore All Features
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                <picture>
                  <source
                    type="image/avif"
                    srcSet="/images/timberline-interior-640.avif 640w, /images/timberline-interior-1280.avif 1280w"
                    sizes="(max-width: 1024px) 100vw, 720px"
                  />
                  <source
                    type="image/webp"
                    srcSet="/images/timberline-interior-640.webp 640w, /images/timberline-interior-1280.webp 1280w"
                    sizes="(max-width: 1024px) 100vw, 720px"
                  />
                  <img
                    src="/images/timberline-interior.jpg"
                    alt="Warm timber living room prepared for arriving guests"
                    loading="lazy"
                    width={1280}
                    height={853}
                    className="w-full h-[360px] sm:h-[420px] object-cover"
                  />
                </picture>
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200/80 shadow-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        Sample Turnover Workflow · 5/5 checks passed
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Photo evidence attached · Supervisor sign-off
                      </div>
                    </div>
                  </div>
                  <Badge variant="success">Ready</Badge>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Live Welcome Books */}
        <section id="guidebooks" className="py-14 sm:py-16 bg-slate-50/80 border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1.5">
                  Interactive Guest Experience
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  See what your guests actually open
                </h2>
              </div>
              <a
                href="/guest/barton-creek-modern?code=STAY-4821"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1 min-h-[36px]"
              >
                Open unlocked demo stay <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {SAMPLE_PORTALS.map((prop) => (
                <div
                  key={prop.slug}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_30px_-10px_rgba(15,23,42,0.12)] transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-52 overflow-hidden">
                      <picture>
                        <source
                          type="image/avif"
                          srcSet={`/images/${prop.stem}-640.avif 640w, /images/${prop.stem}-1280.avif 1280w`}
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                        <source
                          type="image/webp"
                          srcSet={`/images/${prop.stem}-640.webp 640w, /images/${prop.stem}-1280.webp 1280w`}
                          sizes="(max-width: 768px) 100vw, 400px"
                        />
                        <img
                          src={prop.fallback}
                          alt={prop.name}
                          loading="lazy"
                          width={640}
                          height={427}
                          className="w-full h-full object-cover"
                        />
                      </picture>
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-semibold text-slate-900 shadow-xs">
                        {prop.tag}
                      </span>
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/90 backdrop-blur-sm text-[11px] font-mono text-white">
                        Code: {prop.code}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900">{prop.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {prop.location}
                      </div>
                      <p className="text-[13px] text-slate-600 mt-2.5 leading-relaxed">{prop.summary}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5" /> {prop.beds} Beds
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Bath className="w-3.5 h-3.5" /> {prop.baths} Baths
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {prop.guests} Guests
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <a
                      href={`/guest/${prop.slug}?code=${prop.code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Open Welcome Book
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Readiness & Global Property Standards */}
        <section id="readiness" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <Badge variant="brand">Turnover Accountability</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              A home isn’t ready just because a text said “all clean.”
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Staywise holds each property to three concrete checks before flipping its status to Ready. If an AC issue is open or an inspection hasn’t happened yet, your entire team sees why right on the board.
            </p>
            <div className="space-y-2.5 text-[13px] text-slate-700 pt-1">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Sparkles className="w-4 h-4 text-teal-800 shrink-0" />
                <span><strong>Cleaning approved:</strong> checklist completed with photo proof and supervisor sign-off.</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0" />
                <span><strong>Inspection passed:</strong> pre-arrival room & inventory walk shows no missing or damaged items.</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Wrench className="w-4 h-4 text-teal-800 shrink-0" />
                <span><strong>Zero critical blockers:</strong> no unresolved safety, plumbing, lock, or HVAC emergencies open.</span>
              </div>
            </div>
          </div>

          <Card className="lg:col-span-6 p-6 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-800" />
                <span className="text-sm font-semibold text-slate-900">Per-Property Regional Standards</span>
              </div>
              <div className="inline-flex flex-wrap rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                {(Object.keys(REGION_SPECS) as ShowcaseRegion[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRegion(key)}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                      region === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {REGION_SPECS[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-slate-600">Emergency Line</div>
                <div className="font-mono font-bold text-red-700 text-lg mt-1">{regionInfo.emergency}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-slate-600">Currency</div>
                <div className="font-mono font-semibold text-slate-900 text-lg mt-1">{regionInfo.currency}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-slate-600">Climate & Date Format</div>
                <div className="font-semibold text-slate-900 mt-1">{regionInfo.climate}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-slate-600">Phone & Postal Format</div>
                <div className="font-semibold text-slate-900 mt-1">{regionInfo.format}</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Example property market: <strong className="text-slate-900">{regionInfo.sampleCity}</strong></span>
              <span>UI currently in English (US)</span>
            </div>
          </Card>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-14 bg-slate-50/70 border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-10">
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1.5">
                How It Works
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Live with your first property in ten minutes
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  icon: BookOpen,
                  title: 'Build your welcome book',
                  desc: 'Add Wi-Fi, door PINs, appliance quirks, parking notes, and favorite neighborhood picks across 8 clean sections.',
                },
                {
                  step: '02',
                  icon: QrCode,
                  title: 'Share one QR or stay link',
                  desc: 'Send guests a booking-specific link or print a framed QR card. Codes unlock automatically for active stays.',
                },
                {
                  step: '03',
                  icon: MessageSquare,
                  title: 'Run turnovers & fixes together',
                  desc: 'Assign cleaners, review photo proofs, handle guest escalations, and track repairs in one shared workspace.',
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-500">{s.step}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                    <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Grounded Use-Case Scenarios & Security Architecture */}
        <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Who Staywise is built for</h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Practical workflows designed for hosts and operations teams running real turnovers every week.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Building2,
                title: 'Multi-Unit Urban Managers',
                tag: '2–25 Properties',
                desc: 'Keep building entry instructions, parking passes, and quiet hours accurate across every unit while routing maintenance tickets by property.',
              },
              {
                icon: KeyRound,
                title: 'Self-Managing Vacation Hosts',
                tag: '1–4 Homes',
                desc: 'Replace scattered PDFs and midnight Wi-Fi messages with one mobile welcome book and stay-gated lockbox instructions.',
              },
              {
                icon: ShieldAlert,
                title: 'Turnover & Inspection Teams',
                tag: 'Field Crews',
                desc: 'Give cleaners and inspectors role-scoped views for checklists, photo evidence uploads, and inventory discrepancies without exposing billing.',
              },
            ].map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.title} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-teal-800 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      {u.tag}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{u.title}</h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{u.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Transparent Security & Data Architecture Strip */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                <ShieldCheck className="w-4 h-4" /> Security & Architecture Built In
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Door PINs encrypted with AES-256-GCM · Rate-limited stay verification · Full JSON export
              </h3>
              <p className="text-xs text-slate-600">
                Strict organization isolation in PostgreSQL, EdDSA/JWKS session verification, and one-click account erasure.
              </p>
            </div>
            <Button variant="outline" size="md" className="shrink-0 min-h-[44px]" onClick={() => onNavigatePath('/security')}>
              Read Security Architecture
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Pricing (Transparent Early Access) */}
        <section id="pricing" className="py-14 sm:py-16 bg-slate-50/60 border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <Badge variant="brand">Early Access (Alpha)</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-3">
                Free during Early Access — clear limits when billing launches
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                No credit card required and no automated charges during Alpha. Choose a tier below to set your workspace property and AI query allowance right away.
              </p>

              <div className="inline-flex items-center gap-2 mt-5 p-1 rounded-xl bg-white border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAnnualBilling(false)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    !annualBilling ? 'bg-slate-900 text-white' : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  Monthly (Planned)
                </button>
                <button
                  type="button"
                  onClick={() => setAnnualBilling(true)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    annualBilling ? 'bg-slate-900 text-white' : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  Annual (-20% Planned)
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  tier: 'Starter',
                  monthly: 19,
                  annual: 15,
                  cap: 'Up to 2 properties · 100 AI answers/mo',
                  desc: 'Great for independent hosts replacing static PDFs.',
                  features: [
                    'Mobile digital welcome books',
                    'QR code & printable PDF export',
                    'Rate-limited stay-code lock vault',
                    'Guest support tickets & ratings',
                    'Custom local currency, °F/°C & emergency info',
                  ],
                  highlight: false,
                },
                {
                  tier: 'Professional',
                  monthly: 49,
                  annual: 39,
                  cap: 'Up to 10 properties · 500 AI answers/mo',
                  desc: 'Built for growing teams running weekly turnovers.',
                  features: [
                    'Everything in Starter',
                    'Grounded AI guest assistant + escalation',
                    'Cleaning & room-by-room photo checklists',
                    'Maintenance work orders & verification',
                    'Multi-role team access & live ops board',
                  ],
                  highlight: true,
                },
                {
                  tier: 'Portfolio',
                  monthly: 99,
                  annual: 79,
                  cap: 'Up to 25 properties · 2,000 AI answers/mo',
                  desc: 'For operators standardizing turnovers across multiple properties.',
                  features: [
                    'Everything in Professional',
                    'Pre-arrival & post-stay asset inspections',
                    'Guidebook template cloning across units',
                    'Custom automation alerts & audit logs',
                    'Full organization JSON export & erasure',
                  ],
                  highlight: false,
                },
              ].map((plan) => {
                const plannedRate = annualBilling ? plan.annual : plan.monthly;
                return (
                  <Card
                    key={plan.tier}
                    className={`p-6 rounded-2xl flex flex-col justify-between ${
                      plan.highlight ? 'border-slate-900 ring-1 ring-slate-900 shadow-md' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">{plan.tier}</h3>
                        {plan.highlight && <Badge variant="brand">Most Popular</Badge>}
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums text-slate-900">$0</span>
                        <span className="text-xs font-medium text-teal-800">during Alpha</span>
                        <span className="text-xs text-slate-500 line-through tabular-nums ml-auto">
                          ${plannedRate}/mo
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-1">{plan.cap}</div>
                      <p className="text-[13px] text-slate-600 mt-3">{plan.desc}</p>

                      <ul className="mt-5 space-y-2.5 text-[13px] text-slate-700 border-t border-slate-100 pt-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      size="lg"
                      className="w-full mt-6 min-h-[44px]"
                      variant={plan.highlight ? 'primary' : 'outline'}
                      onClick={() => onOpenAuth('register', plan.tier)}
                    >
                      Start {plan.tier} Free in Alpha
                    </Button>
                  </Card>
                );
              })}
            </div>

            {/* FAQ */}
            <div className="mt-14 max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 text-center mb-6">
                Frequently asked questions
              </h2>
              <div className="space-y-2.5">
                {FAQS.map((item, idx) => {
                  const open = openFaq === idx;
                  return (
                    <div key={item.q} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(open ? null : idx)}
                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 min-h-[52px]"
                      >
                        <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {open && (
                        <div className="px-5 pb-4 text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Dark Architectural Closing CTA Banner */}
        <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white px-6 py-10 sm:px-12 sm:py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <picture>
              <source
                type="image/avif"
                srcSet="/images/vista-chino-640.avif 640w, /images/vista-chino-1280.avif 1280w"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
              <source
                type="image/webp"
                srcSet="/images/vista-chino-640.webp 640w, /images/vista-chino-1280.webp 1280w"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
              <img
                src="/images/vista-chino.jpg"
                alt="Evening pool terrace at a Staywise-managed home"
                loading="lazy"
                width={1280}
                height={853}
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
            </picture>
            <div className="relative z-10 max-w-xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Ready to give every guest a smoother arrival?
              </h2>
              <p className="text-sm text-slate-200">
                Set up your first property welcome book in minutes—free during Early Access with no card required.
              </p>
            </div>
            <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
              <Button
                size="lg"
                variant="inverted"
                className="min-h-[44px] font-semibold"
                onClick={() => onOpenAuth('register', 'Starter')}
              >
                Create Free Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}
