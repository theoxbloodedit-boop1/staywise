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
import { PLAN_LIST } from '../lib/plans';
import { GuestProductPreview, OperationsProductPreview } from '../components/ProductPreview';
import { HOME_FAQS } from '../seo/Seo';

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
    <div className="marketing-page min-h-screen bg-white text-slate-900">
      <PublicHeader
        currentPath="/"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />

      <main id="main-content">
        {/* Editorial Photographic Hero + Floating Interactive Guest Portal Launcher */}
        <section className="pt-4 sm:pt-6 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 items-center gap-8 lg:gap-12 py-8 sm:py-12">
            <div className="min-w-0 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900"><span className="h-1.5 w-1.5 rounded-full bg-brand-600" />Short-term rental operations, simplified</div>
              <h1 className="text-[38px] sm:text-5xl xl:text-[58px] font-semibold tracking-[-0.045em] text-brand-navy leading-[1.08]">Your rentals.<br /><span className="text-brand-600">One clear workspace.</span></h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg">Manage guest guides, cleaning, inspections, and reported issues in one place. Know what needs attention—and what to do next.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" variant="secondary" onClick={() => onOpenAuth('register','Starter')}>Create Free Workspace <ArrowRight className="w-4 h-4" /></Button>
                <a href="#product-preview" className="inline-flex min-h-[48px] items-center justify-center gap-2 px-5 rounded-md border border-slate-300 font-medium text-sm hover:bg-slate-50">Explore the product <ArrowRight className="w-4 h-4" /></a>
              </div>
              <p className="text-xs text-slate-600">$0 during Early Access · No credit card required</p>
              <button type="button" onClick={onEnterWorkspace} className="min-h-[44px] text-sm text-slate-700 underline underline-offset-4">Already on the team? Open your workspace</button>
            </div>
            <GuestProductPreview />
          </div>

          {/* Floating Live Guest Portal Launcher Bar */}
          <form
            onSubmit={handleOpenPreview}
            className="relative z-20 mt-4 bg-white rounded-2xl border border-slate-200 shadow-[0_14px_40px_-14px_rgba(15,23,42,0.18)] p-3 sm:p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5 flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="hero-prop-select" className="block text-[11px] font-medium text-slate-600">
                    Sample property welcome book
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
                    Public demo code · sample stay only
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

        <section id="features" className="py-12 border-y border-slate-200 bg-brand-cloud">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
            <div><p className="text-xs uppercase tracking-widest font-semibold text-teal-800">One connected workspace</p><h2 className="text-2xl sm:text-3xl font-semibold mt-3">From guest questions<br className="hidden sm:block" /> to the next turnover.</h2><p className="text-sm text-slate-600 mt-4">Explore the tools already in Staywise. Keep the guest experience and the work behind it in view.</p></div>
            <div className="grid sm:grid-cols-2 gap-x-8">{[
              {icon:BookOpen,title:'Guest experience',text:'Mobile welcome books, arrival notes and local picks.',path:'/guest-guidebook'},
              {icon:Sparkles,title:'Turnover management',text:'Assigned cleaning tasks and recorded progress.',path:'/turnover-management'},
              {icon:Camera,title:'Inspections & evidence',text:'Inspection records and supporting photos.',path:'/features'},
              {icon:Wrench,title:'Maintenance & incidents',text:'Reported issues and work-order follow-up.',path:'/features'},
              {icon:Users,title:'Team coordination',text:'Property assignments and role-scoped views.',path:'/features'},
              {icon:Building2,title:'Property operations',text:'Recorded checks and status, with context.',path:'/turnover-management'},
              {icon:ShieldCheck,title:'Security & access',text:'Read the architecture and access-control documentation.',path:'/security'},
            ].map(({icon:Icon,title,text,path})=><a key={title} href={path} onClick={event=>{event.preventDefault();onNavigatePath(path);}} className="group flex gap-3 py-5 border-b border-slate-200 min-w-0"><Icon aria-hidden="true" className="w-5 h-5 text-teal-800 shrink-0 mt-1" /><div><h3 className="text-sm font-semibold group-hover:text-teal-800 flex gap-2 items-center">{title}<ArrowRight aria-hidden="true" className="w-3.5 h-3.5" /></h3><p className="text-sm text-slate-600 mt-1">{text}</p></div></a>)}</div>
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
                The work between checkout and the next arrival needs its own workspace. Bring property instructions, assigned tasks and reported issues into view.
              </p>
              <ul className="space-y-3 text-sm text-slate-700 pt-1">
                {[
                  'One mobile welcome book with parking, Wi-Fi, appliances, and local picks',
                  'Private guide search for verified guests',
                  'Property-scoped cleaning, inspection and incident views',
                  'Recorded activity and work orders for follow-up',
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

            <div id="product-preview" className="lg:col-span-7 scroll-mt-24"><OperationsProductPreview /></div>
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
                  A welcome book guests can explore
                </h2>
              </div>
              <a
                href="/guest/barton-creek-modern?code=STAY-4821"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1 min-h-[36px]"
              >
                Open sample guest stay <ArrowRight className="w-3.5 h-3.5" />
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
                        Sample · {prop.tag}
                      </span>
                      <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/90 backdrop-blur-sm text-[11px] font-mono text-white">
                        Demo: {prop.code}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900">{prop.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {prop.location}
                      </div>
                      <p className="text-[13px] text-slate-600 mt-2.5 leading-relaxed">{prop.summary}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
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
                      Open Sample Welcome Book
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
              Review cleaning, inspection and incident records in one place. Operational status is not a safety certification; final readiness validation is still being strengthened.
            </p>
            <div className="space-y-2.5 text-[13px] text-slate-700 pt-1">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Sparkles className="w-4 h-4 text-teal-800 shrink-0" />
                <span><strong>Cleaning review:</strong> review the recorded checklist and supporting photos.</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0" />
                <span><strong>Inspection records:</strong> inspect recorded room and inventory results.</span>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <Wrench className="w-4 h-4 text-teal-800 shrink-0" />
                <span><strong>Incident visibility:</strong> review unresolved issues before an arrival.</span>
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
                Build your first guest experience
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
                  desc: 'Send guests a booking-specific link or print a framed QR card. Guests verify their stay in the guest portal.',
                },
                {
                  step: '03',
                  icon: MessageSquare,
                  title: 'Run turnovers & fixes together',
                  desc: 'Assign cleaners, review submitted photos, handle guest escalations, and track repairs in one shared workspace.',
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
                <ShieldCheck className="w-4 h-4" /> Security & data controls
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Understand the controls behind your workspace
              </h3>
              <p className="text-xs text-slate-600">
                Review the documented architecture, access controls and data export options.
              </p>
            </div>
            <Button variant="outline" size="md" className="shrink-0 min-h-[44px]" onClick={() => onNavigatePath('/security')}>
              Read Security Architecture
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Pricing (100% Free Full Access) */}
        <section id="pricing" className="py-14 sm:py-16 bg-slate-50/60 border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <Badge variant="brand">Free during Early Access</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-3">
                Your portfolio size. One clear starting point.
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                No credit card required, no paywalled modules, and zero hidden charges. Pick the property capacity tier that fits your portfolio today.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PLAN_LIST.map((plan) => {
                const highlight = plan.tier === 'Professional';
                return (
                  <Card
                    key={plan.tier}
                    className={`p-6 rounded-2xl flex flex-col justify-between ${
                      highlight ? 'border-slate-900 ring-1 ring-slate-900 shadow-md' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">{plan.label}</h3>
                        {highlight && <Badge variant="brand">For growing teams</Badge>}
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums text-slate-900">$0</span>
                        <span className="text-xs font-medium text-teal-800">during Early Access</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-1">
                        Up to {plan.propertyLimit} properties · {plan.aiMonthlyAllowance.toLocaleString()} guide search answers / month
                      </div>
                      <p className="text-[13px] text-slate-600 mt-3">{plan.summary}</p>

                      <ul className="mt-5 space-y-2.5 text-[13px] text-slate-700 border-t border-slate-100 pt-4">
                        {plan.highlights.map((f) => (
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
                      variant={highlight ? 'primary' : 'outline'}
                      onClick={() => onOpenAuth('register', plan.tier)}
                    >
                      Start {plan.label} Free
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
                {HOME_FAQS.map((item, idx) => {
                  const open = openFaq === idx;
                  return (
                    <div key={item.q} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        id={`faq-question-${idx}`}
                        aria-controls={`faq-answer-${idx}`}
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
                        <div id={`faq-answer-${idx}`} role="region" aria-labelledby={`faq-question-${idx}`} className="px-5 pb-4 text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
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
                alt="Pool terrace at a sample property"
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
