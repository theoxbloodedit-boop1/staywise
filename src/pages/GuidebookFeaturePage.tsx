import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  ExternalLink,
  KeyRound,
  Lock,
  Printer,
  QrCode,
  ShieldAlert,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';

const EIGHT_SECTIONS = [
  { num: '01', title: 'Welcome Note & Property Intro', desc: 'Personal greeting, host contact info, and quick stay summary.' },
  { num: '02', title: 'Check-In & Entry Instructions', desc: 'Step-by-step driveway directions, parking rules, and stay-gated smart-lock PIN.' },
  { num: '03', title: 'House Rules & Acknowledgment', desc: 'Quiet hours, pets, smoking, and one-tap guest rule acknowledgment logged per booking.' },
  { num: '04', title: 'Wi-Fi & Home Appliances', desc: 'Network name, stay-gated password copy button, thermostat, pool, and kitchen instructions.' },
  { num: '05', title: 'Local Recommendations', desc: 'Host-curated dining, grocery stores, coffee shops, and neighborhood favorites.' },
  { num: '06', title: 'Emergency & Safety Info', desc: 'Region-matched emergency dial code (911/112/999/000), breaker box, and water shut-off.' },
  { num: '07', title: 'Getting Around & Transit', desc: 'EV chargers, ferry/bus stops, airport ride times, and garage clearance notes.' },
  { num: '08', title: 'Before You Go / Check-Out', desc: 'Linen & trash instructions plus one-tap departure confirmation that alerts cleaners.' },
];

export function GuidebookFeaturePage({
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
        currentPath="/guest-guidebook"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />

      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-14">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <Badge variant="brand">Mobile Welcome Books · Free Full Access</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Digital guest welcome books that protect your door codes and cut midnight questions
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              Give every guest a clean mobile guidebook in Safari or Chrome—no app download or login needed. Public arrival tips show immediately, while smart-lock PINs and Wi-Fi credentials unlock automatically for verified stays.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" className="min-h-[44px]" onClick={() => onOpenAuth('register', 'Starter')}>
                Create Your Free Welcome Book <ArrowRight className="w-4 h-4" />
              </Button>
              <a
                href="/guest/barton-creek-modern?code=STAY-4821"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-md border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Open Live Sample Portal <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <Card className="overflow-hidden rounded-2xl border-slate-200">
              <picture>
                <source
                  type="image/avif"
                  srcSet="/images/newport-harbor-640.avif 640w, /images/newport-harbor-1280.avif 1280w"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
                <source
                  type="image/webp"
                  srcSet="/images/newport-harbor-640.webp 640w, /images/newport-harbor-1280.webp 1280w"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
                <img
                  src="/images/newport-harbor.webp"
                  alt="Coastal cottage welcome book sample property"
                  width={640}
                  height={427}
                  className="w-full h-72 object-cover"
                />
              </picture>
              <div className="p-5 grid sm:grid-cols-3 gap-3 text-xs bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <Smartphone className="w-4 h-4 text-teal-800 shrink-0" /> Works in Safari & Chrome
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <Lock className="w-4 h-4 text-teal-800 shrink-0" /> AES-256 PIN Encryption
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <QrCode className="w-4 h-4 text-teal-800 shrink-0" /> Printable QR & PDF
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 8-Section Architecture */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Every guidebook organized into 8 practical sections</h2>
            <p className="text-sm text-slate-600 mt-1">
              Toggle section visibility, customize branding per home, and print a clean PDF or framed nightstand QR card anytime.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EIGHT_SECTIONS.map((s) => (
              <Card key={s.num} className="p-5 rounded-xl space-y-2">
                <span className="text-xs font-mono font-bold text-teal-800">{s.num}</span>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Access Security & Grounded AI */}
        <section className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-2xl space-y-2.5">
            <KeyRound className="w-5 h-5 text-teal-800" />
            <h2 className="text-base font-bold text-slate-900">Time-Gated Door & Wi-Fi Access</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Entry PINs and lockbox instructions stay hidden behind an active stay-code window (48 hours before arrival through 24 hours after departure) with PostgreSQL rate limiting against guessing.
            </p>
          </Card>
          <Card className="p-6 rounded-2xl space-y-2.5">
            <Bot className="w-5 h-5 text-teal-800" />
            <h2 className="text-base font-bold text-slate-900">Grounded Guest Assistant</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Answers Wi-Fi, thermostat, parking, and checkout questions strictly from your approved guidebook—and escalates early check-in requests or emergency leaks directly to your team.
            </p>
          </Card>
          <Card className="p-6 rounded-2xl space-y-2.5">
            <Printer className="w-5 h-5 text-teal-800" />
            <h2 className="text-base font-bold text-slate-900">Nightstand QR & Offline Print PDF</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export a scannable QR card and formatted print welcome book for guests in rural or mountain properties with weak cell reception.
            </p>
          </Card>
        </section>

        {/* Bottom CTA */}
        <Card className="p-8 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">Launch your first welcome book today—100% free</h2>
            <p className="text-xs text-slate-200">
              Start from one of 12 property templates with every guidebook, QR, and AI feature unlocked.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="inverted" size="lg" onClick={() => onOpenAuth('register', 'Starter')}>
              Create Free Workspace
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/10 text-white border-white/25 hover:bg-white/20"
              onClick={() => onNavigatePath('/templates')}
            >
              Browse 12 Templates
            </Button>
          </div>
        </Card>
      </main>

      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}
