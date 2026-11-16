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
  Wrench,
} from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';

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
    },
    {
      icon: QrCode,
      title: 'QR Cards & Printable PDF Export',
      desc: 'Generate a scannable QR card and formatted print layout for every unit so guests can access house info even offline.',
    },
    {
      icon: KeyRound,
      title: 'Time-Gated Smart-Lock & Wi-Fi Vault',
      desc: 'Door PINs and Wi-Fi passwords stay encrypted at rest (AES-256-GCM) and masked until a guest verifies an active stay code inside their arrival window.',
    },
    {
      icon: Bot,
      title: 'Grounded Guest Assistant + Escalation',
      desc: 'Answers routine questions strictly from your approved property guide and routes unverified requests—such as early check-in or emergency leaks—to your team.',
    },
    {
      icon: Camera,
      title: 'Photo-Verified Cleaning Checklists',
      desc: 'Room-by-room checklists with photo uploads and supervisor review sign-off before a unit moves to Ready.',
    },
    {
      icon: ClipboardCheck,
      title: 'Pre-Arrival Inspections & Work Orders',
      desc: 'Track property inventory items, flag discrepancies neutrally, and link guest support tickets straight to maintenance work orders.',
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
          <Badge variant="brand">Platform Overview</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Every workflow between guest check-in and property turnover
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Staywise connects guest-facing welcome books with the internal cleaning, inspection, and maintenance steps your team actually runs between stays.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="primary" size="lg" onClick={() => onOpenAuth('register', 'Starter')}>
              Create Free Workspace <ArrowRight className="w-4 h-4" />
            </Button>
            <a
              href="/guest/barton-creek-modern?code=STAY-4821"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Try Unlocked Guest Demo
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.title} className="p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{m.title}</h2>
                <p className="text-[13px] text-slate-600 leading-relaxed">{m.desc}</p>
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
  const tiers = [
    {
      tier: 'Starter',
      planned: '$19/mo',
      units: 'Up to 2 active units',
      ai: '100 AI answers / month',
      summary: 'Independent hosts replacing static house PDFs.',
    },
    {
      tier: 'Professional',
      planned: '$49/mo',
      units: 'Up to 10 active units',
      ai: '500 AI answers / month',
      summary: 'Small teams coordinating weekly turnovers & fixes.',
    },
    {
      tier: 'Portfolio',
      planned: '$99/mo',
      units: 'Up to 25 active units',
      ai: '2,000 AI answers / month',
      summary: 'Multi-city portfolios standardizing checklists & inspections.',
    },
  ];

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
          <Badge variant="brand">Early Access Pricing</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Free during Alpha. Transparent limits at launch.
          </h1>
          <p className="text-base text-slate-600">
            Stripe checkout is intentionally disabled during Early Access—choose any tier below to provision your workspace at $0/month with no card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <Card key={t.tier} className="p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">{t.tier}</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">$0</span>
                  <span className="text-xs text-teal-800 font-medium">in Alpha</span>
                  <span className="text-xs text-slate-500 line-through ml-auto">{t.planned}</span>
                </div>
                <p className="text-xs text-slate-600">{t.summary}</p>
                <ul className="space-y-2 text-xs text-slate-700 pt-3 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-800" /> {t.units}</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-800" /> {t.ai}</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-800" /> Full JSON export & deletion</li>
                </ul>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={() => onOpenAuth('register', t.tier)}>
                Start {t.tier} Free
              </Button>
            </Card>
          ))}
        </div>
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
