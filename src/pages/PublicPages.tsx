import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Camera,
  Check,
  ClipboardCheck,
  Database,
  KeyRound,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';
import { PLAN_LIST } from '../lib/plans';

export function FeaturesPage({
  onNavigatePath,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  const modules = [
    {
      icon: BookOpen,
      title: '8-Section Mobile Welcome Books',
      desc: 'Publish structured guides covering welcome notes, step-by-step arrival, house rules, Wi-Fi & appliances, local spots, emergency details, transit, and check-out.',
      href: '/guest-guidebook',
      linkText: 'Explore Welcome Books',
    },
    {
      icon: QrCode,
      title: 'QR Cards & Printable PDF Export',
      desc: 'Generate a scannable QR card and formatted print layout for every unit so guests can access house info even offline.',
      href: '/templates',
      linkText: 'View 12 Property Templates',
    },
    {
      icon: KeyRound,
      title: 'Time-Gated Smart-Lock & Wi-Fi Vault',
      desc: 'Door PINs and Wi-Fi passwords stay encrypted at rest (AES-256-GCM) and masked until a guest verifies an active stay code inside their arrival window.',
      href: '/security',
      linkText: 'Inspect Security Controls',
    },
    {
      icon: Bot,
      title: 'Grounded Guest Assistant + Escalation',
      desc: 'Answers routine questions strictly from your approved property guide and routes unverified requests—such as early check-in or emergency leaks—to your team.',
      href: '/guest-guidebook',
      linkText: 'See Guest AI Workflow',
    },
    {
      icon: Camera,
      title: 'Photo-Verified Cleaning Checklists',
      desc: 'Room-by-room checklists with photo uploads and supervisor review sign-off before a unit moves to Ready.',
      href: '/turnover-management',
      linkText: 'See Turnover Gates',
    },
    {
      icon: ClipboardCheck,
      title: 'Pre-Arrival Inspections & Work Orders',
      desc: 'Track property inventory items, flag discrepancies neutrally, and link guest support tickets straight to maintenance work orders.',
      href: '/turnover-management',
      linkText: 'Explore Work Orders',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader
        currentPath="/features"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />
      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="max-w-2xl space-y-4">
          <Badge variant="brand">Platform Overview · 100% Free Full Access</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Every workflow between guest check-in and property turnover
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Staywise connects guest-facing welcome books with the internal cleaning, inspection, and maintenance steps your team runs between stays—completely free right now with all capabilities unlocked.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="primary" size="lg" className="min-h-[44px]" onClick={() => onOpenAuth('register', 'Starter')}>
              Create Free Workspace <ArrowRight className="w-4 h-4" />
            </Button>
            <a
              href="/guest/barton-creek-modern?code=STAY-4821"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-md border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Try Unlocked Guest Demo
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.title} className="p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{m.title}</h2>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{m.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigatePath(m.href)}
                  className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1 text-left"
                >
                  {m.linkText} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Card>
            );
          })}
        </div>
      </main>
      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}

export function PricingPage({
  onNavigatePath,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader
        currentPath="/pricing"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />
      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-10">
        <div className="max-w-2xl space-y-3">
          <Badge variant="brand">100% Free Full Access</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Free full access to every Staywise feature — no credit card required
          </h1>
          <p className="text-base text-slate-600">
            Billing checkout is completely disabled while we’re in Early Access. Every workspace gets full access to guidebooks, encrypted lock vaults, grounded AI replies, cleaning checklists, inspections, and work orders at $0/month.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_LIST.map((t) => {
            const highlight = t.tier === 'Professional';
            return (
              <Card
                key={t.tier}
                className={`p-6 rounded-2xl flex flex-col justify-between space-y-6 ${
                  highlight ? 'border-slate-900 ring-1 ring-slate-900 shadow-md' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">{t.label}</h2>
                    {t.badge && <Badge variant="brand">{t.badge}</Badge>}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">$0</span>
                    <span className="text-xs text-teal-800 font-medium">/ month · Full Access</span>
                  </div>
                  <p className="text-xs text-slate-600">{t.summary}</p>
                  <ul className="space-y-2 text-xs text-slate-700 pt-3 border-t border-slate-100">
                    {t.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  variant={highlight ? 'primary' : 'outline'}
                  size="lg"
                  className="w-full min-h-[44px]"
                  onClick={() => onOpenAuth('register', t.tier)}
                >
                  Start {t.label} Free
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 rounded-2xl bg-slate-50 border-slate-200 space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Pricing Questions</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Can I switch capacity tiers later? Yes—Organization Owners can switch between Starter (5 units), Professional (15 units), and Portfolio (50 units) anytime in Workspace → Billing & Settings at $0 with instant JSON data export and self-service deletion.
          </p>
        </Card>
      </main>
      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}

export function SecurityPage({
  onNavigatePath,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  const controls = [
    {
      icon: Lock,
      title: 'AES-256-GCM Secret Vault',
      desc: 'Smart-lock PINs, backup lockbox notes, and property Wi-Fi credentials are encrypted server-side using authenticated AES-256-GCM before storage in Neon PostgreSQL.',
    },
    {
      icon: ShieldCheck,
      title: 'Anti-Brute-Force Stay Verification',
      desc: 'Newly created reservations receive 8-character high-entropy alphanumeric stay codes. Both GET and POST guest verification routes enforce PostgreSQL-backed IP+property lockouts after 8 invalid attempts.',
    },
    {
      icon: Database,
      title: 'Strict Tenant Isolation & RBAC',
      desc: 'Every workspace API route authenticates EdDSA/JWKS tokens from Neon Auth and filters queries by organization_id and property assignment scope.',
    },
    {
      icon: Sparkles,
      title: 'Data Portability & Instant Erasure',
      desc: 'Organization Owners can export their complete workspace as JSON or delete organizations and personal accounts directly inside Billing & Settings.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader
        currentPath="/security"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />
      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-10">
        <div className="max-w-2xl space-y-3">
          <Badge variant="brand">Security & Data Protection</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            How Staywise protects door codes, guest records, and tenant workspaces
          </h1>
          <p className="text-base text-slate-600">
            Property guidebooks carry sensitive residential entry secrets. Here are the concrete technical controls enforced across our API and database layer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {controls.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.title} className="p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{c.title}</h2>
                <p className="text-[13px] text-slate-600 leading-relaxed">{c.desc}</p>
              </Card>
            );
          })}
        </div>

        <Card className="p-6 rounded-2xl bg-slate-50 border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Subprocessors & Privacy Contact</h2>
            <p className="text-xs text-slate-600 mt-1">
              Hosted on Vercel (US East) with Neon PostgreSQL & Neon Auth · Security & privacy inquiries: privacy@staywise.app
            </p>
          </div>
          <Button variant="outline" size="md" onClick={() => onNavigatePath('/privacy')}>
            Read Privacy Policy
          </Button>
        </Card>
      </main>
      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}
