import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Wrench,
  Bot,
  QrCode,
  Globe,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Button, Badge, Card } from '../components/ui';

export function LandingPage({
  onEnterWorkspace,
  onOpenAuth,
  onNavigatePath,
}: {
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
  onNavigatePath: (path: string) => void;
}) {
  const [market, setMarket] = useState<'US' | 'AU'>('US');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              SW
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">STAYWISE</span>
            <span className="hidden sm:inline-block text-xs text-slate-400 border-l border-slate-200 pl-2.5 ml-1">
              Guest Experience & Property Operations
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-slate-600">
            <a href="#platform" className="hover:text-slate-900">Platform</a>
            <a href="#readiness" className="hover:text-slate-900">Readiness Engine</a>
            <a href="#markets" className="hover:text-slate-900">US & Australia</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => onOpenAuth('login')}>
              Sign in
            </Button>
            <Button variant="outline" size="sm" onClick={onEnterWorkspace}>
              Operations Workspace
            </Button>
            <Button variant="primary" size="sm" onClick={() => onOpenAuth('register', 'Professional')}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                Built for US & Australian Short-Term Rental Operators
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.08]">
                From guest welcome to property readiness.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Stop managing guest questions, cleaning tasks, and property issues across disconnected tools. STAYWISE connects your mobile Welcome Book, verified-fact AI assistant, and field turnover workflows in one multi-tenant SaaS.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button size="lg" variant="primary" onClick={onEnterWorkspace}>
                  Open Operations Workspace
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <a
                  href="/guest/barton-creek-modern?code=STAY-4821"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                >
                  <ExternalLink className="w-4 h-4 text-teal-700" />
                  Try Mobile Guest Portal
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Every guest question</div>
                  <div className="text-slate-500 mt-0.5">Verified answer or escalation</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Every property task</div>
                  <div className="text-slate-500 mt-0.5">Named owner & photo proof</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Every incident</div>
                  <div className="text-slate-500 mt-0.5">Tracked to verified closure</div>
                </div>
              </div>
            </div>

            {/* Right Architectural Product Preview */}
            <div className="lg:col-span-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Sunbelt Stays Management · Live Readiness Board
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">US + AU Portfolio</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                      <div className="text-[11px] text-slate-500">Ready Units</div>
                      <div className="text-xl font-bold text-emerald-700 tabular-nums mt-0.5">1 / 4</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                      <div className="text-[11px] text-slate-500">Critical Blockers</div>
                      <div className="text-xl font-bold text-red-700 tabular-nums mt-0.5">1</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                      <div className="text-[11px] text-slate-500">Pending Review</div>
                      <div className="text-xl font-bold text-amber-700 tabular-nums mt-0.5">2</div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-3 flex items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="/images/barton-creek.jpg"
                          alt="The Barton Creek Modern luxury rental exterior in Austin, Texas"
                          loading="lazy"
                          className="w-11 h-11 rounded-md object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">The Barton Creek Modern</div>
                          <div className="text-[11px] text-slate-500">Austin, TX · USD · °F · 911</div>
                        </div>
                      </div>
                      <Badge variant="success">Ready</Badge>
                    </div>

                    <div className="p-3 flex items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="/images/vista-chino.jpg"
                          alt="Vista Chino Desert Villa pool patio in Palm Springs, California"
                          loading="lazy"
                          className="w-11 h-11 rounded-md object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">Vista Chino Desert Villa</div>
                          <div className="text-[11px] text-red-600 truncate">Blocked: Critical HVAC WO-1042</div>
                        </div>
                      </div>
                      <Badge variant="danger">Not Ready</Badge>
                    </div>

                    <div className="p-3 flex items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="/images/tallebudgera.webp"
                          alt="Tallebudgera Creek House waterfront residence on Gold Coast, Australia"
                          loading="lazy"
                          className="w-11 h-11 rounded-md object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">Tallebudgera Creek House</div>
                          <div className="text-[11px] text-amber-700 truncate">Gold Coast, QLD · AUD · °C · 000</div>
                        </div>
                      </div>
                      <Badge variant="warning">Awaiting Inspection</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Modules */}
      <section id="platform" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">
            Unified Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Everything your guests need. Everything your property team needs.
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Designed around the full 7-stage hospitality lifecycle: before arrival, check-in, in-stay support, check-out, post-stay inspection, and turnover readiness.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: BookOpen,
              title: 'No-Code Digital Welcome Book',
              desc: 'All 8 essential guidebook sections—Check-in, Rules, Wi-Fi & Appliances, Local Picks, Emergency, Transit & Check-out—with QR cards & PDF export.',
            },
            {
              icon: Lock,
              title: 'Stay-Gated Access Credentials',
              desc: 'Smart-lock PINs, lockbox codes & private Wi-Fi credentials are encrypted at rest and stay masked until the guest verifies an active stay window.',
            },
            {
              icon: Bot,
              title: 'Verified-Fact AI Concierge',
              desc: 'Zero hallucination safeguards: retrieves strictly from that property’s approved guidebook, blocks restricted codes, and escalates emergencies & gaps.',
            },
            {
              icon: Sparkles,
              title: 'Cleaning & Turnover Dispatch',
              desc: '7-stage task workflow with room-by-room checklists, before/after photo evidence, supervisor review gates, and automatic overdue detection.',
            },
            {
              icon: Wrench,
              title: 'Incident & Maintenance Work Orders',
              desc: 'Turns guest reports or cleaner flags into tracked work orders across 12 categories with technician assignment and manager verification.',
            },
            {
              icon: ShieldCheck,
              title: 'Multi-Tenant RBAC & Audit Logs',
              desc: 'Strict organization isolation across 9 user roles plus immutable audit logs, WAL-safe database backups, and GDPR/Privacy Act data export.',
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <Card key={feat.title} className="p-5">
                <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-900 flex items-center justify-center mb-3.5">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{feat.title}</h3>
                <p className="text-[13px] text-slate-600 mt-1.5 leading-relaxed">{feat.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Readiness & Localization Spotlight */}
      <section id="markets" className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 items-center">
          <div id="readiness" className="space-y-4">
            <Badge variant="brand">Operational Integrity</Badge>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              A property isn’t Ready just because a cleaner tapped Complete.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              STAYWISE enforces a deterministic 3-gate readiness engine. Every property must clear supervisor cleaning approval, pre-arrival asset inspection after the latest turnover, and zero unresolved critical incidents before transitioning to Ready.
            </p>
            <ul className="space-y-2 text-[13px] text-slate-700 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                Gate 1: Turnover cleaning submitted with photo evidence & approved
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                Gate 2: Pre-arrival inventory inspection passed without failed discrepancies
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                Gate 3: Zero unresolved Critical maintenance or safety incidents
              </li>
            </ul>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-700" />
                <span className="text-sm font-semibold text-slate-900">Property-Level Localization</span>
              </div>
              <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
                <button
                  onClick={() => setMarket('US')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    market === 'US' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  United States
                </button>
                <button
                  onClick={() => setMarket('AU')}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    market === 'AU' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Australia
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 text-xs">
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Emergency Dispatch</div>
                <div className="font-mono font-bold text-red-700 text-base mt-1">
                  {market === 'US' ? '911' : '000'}
                </div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Currency & Pricing</div>
                <div className="font-mono font-semibold text-slate-900 text-base mt-1">
                  {market === 'US' ? 'USD ($)' : 'AUD (A$)'}
                </div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Climate & Date Format</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {market === 'US' ? '72°F · MM/DD/YYYY' : '22°C · DD/MM/YYYY'}
                </div>
              </div>
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Address & Phone</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {market === 'US' ? 'ZIP · +1 (XXX) XXX-XXXX' : 'Postcode · +61 4XX XXX XXX'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Simple pricing scaled to your property portfolio
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Start with digital Welcome Books and expand into AI guest support, cleaning dispatch, and full portfolio operations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              tier: 'Starter',
              price: '$19',
              cap: 'Up to 2 properties · 100 AI queries/mo',
              desc: 'For independent hosts upgrading from static welcome PDFs.',
              features: [
                'Mobile-first Digital Welcome Books',
                'Instant QR code & printable PDF export',
                'Stay-gated Guest Portal (no app required)',
                'Basic guest support requests',
                'Property management & US/AU settings',
              ],
              highlight: false,
            },
            {
              tier: 'Professional',
              price: '$49',
              cap: 'Up to 10 properties · 500 AI queries/mo',
              desc: 'Commercial beachhead for growing hospitality operators.',
              features: [
                'Everything in Starter',
                'Verified-fact AI Guest Assistant',
                'Cleaning & room-by-room turnover dispatch',
                'Incident & maintenance work orders',
                'Team RBAC roles & operational dashboard',
              ],
              highlight: true,
            },
            {
              tier: 'Portfolio',
              price: '$99',
              cap: 'Up to 25 properties · 2,000 AI queries/mo',
              desc: 'Standardized multi-property governance & accountability.',
              features: [
                'Everything in Professional',
                'Expanded permissions & multi-team ops',
                'Pre-arrival & post-departure inspections',
                'Guidebook template duplication & bulk tools',
                'Portfolio analytics, backups & audit history',
              ],
              highlight: false,
            },
          ].map((plan) => (
            <Card
              key={plan.tier}
              className={`p-6 flex flex-col justify-between ${
                plan.highlight ? 'border-slate-900 ring-1 ring-slate-900' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">{plan.tier}</h3>
                  {plan.highlight && <Badge variant="brand">Most Popular</Badge>}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums text-slate-900">{plan.price}</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <div className="text-xs font-medium text-teal-700 mt-1">{plan.cap}</div>
                <p className="text-[13px] text-slate-600 mt-3">{plan.desc}</p>

                <ul className="mt-5 space-y-2.5 text-[13px] text-slate-700 border-t border-slate-100 pt-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full mt-6"
                variant={plan.highlight ? 'primary' : 'outline'}
                onClick={() => onOpenAuth('register', plan.tier)}
              >
                Select {plan.tier}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <QrCode className="w-4 h-4 text-teal-700" />
            STAYWISE — One platform. Every stay. Every task. Every resolution.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => onNavigatePath('/privacy')} className="hover:text-slate-900">
              Privacy Policy
            </button>
            <button onClick={() => onNavigatePath('/terms')} className="hover:text-slate-900">
              Terms of Service
            </button>
            <span>US & Australian Hospitality Standards</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
