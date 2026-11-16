import React from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { Badge, Button, Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';

export function TurnoverFeaturePage({
  onNavigatePath,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  const gates = [
    {
      icon: Sparkles,
      title: '1. Cleaning Checklist + Photo Proof',
      desc: 'Cleaners work through room-by-room tasks, upload verification photos, and submit turnovers for supervisor approval.',
    },
    {
      icon: ClipboardCheck,
      title: '2. Pre-Arrival Room & Asset Inspection',
      desc: 'Inspectors verify property condition and furniture/amenity inventory before arrival, flagging missing or damaged items cleanly.',
    },
    {
      icon: Wrench,
      title: '3. Zero Open Critical Work Orders',
      desc: 'Guest-reported maintenance tickets or inspector issues become tracked work orders. Critical blockers automatically mark a property Not Ready.',
    },
  ];

  const roles = [
    { role: 'Organization Owner / Admin', scope: 'Full governance, property limits, regional setup, JSON exports, and audit history.' },
    { role: 'Property Manager', scope: 'Property guidebooks, reservations, cleaning approvals, work orders, and readiness board.' },
    { role: 'Cleaning Staff', scope: 'Scoped exclusively to assigned turnovers, room checklists, and evidence photo uploads.' },
    { role: 'Inspector & Maintenance Tech', scope: 'Role-focused views for asset inspections, work-order resolution notes, and fix photos.' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader
        currentPath="/turnover-management"
        onNavigatePath={onNavigatePath}
        onEnterWorkspace={onEnterWorkspace}
        onOpenAuth={onOpenAuth}
      />

      <main className="flex-1 py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-14">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <Badge variant="brand">Turnover Accountability · Free Full Access</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Know every property is genuinely Ready before your next guest turns the key
            </h1>
            <p className="text-base text-slate-600 leading-relaxed">
              Replace scattered group chats with structured readiness gates. Staywise tracks cleaning completion, inspection sign-off, and emergency repairs in one shared operational board.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="lg" className="min-h-[44px]" onClick={() => onOpenAuth('register', 'Starter')}>
                Set Up Free Turnover Board <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg" className="min-h-[44px]" onClick={onEnterWorkspace}>
                Open Operations Workspace
              </Button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <Card className="overflow-hidden rounded-2xl border-slate-200">
              <picture>
                <source
                  type="image/avif"
                  srcSet="/images/timberline-interior-640.avif 640w, /images/timberline-interior-1280.avif 1280w"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
                <source
                  type="image/webp"
                  srcSet="/images/timberline-interior-640.webp 640w, /images/timberline-interior-1280.webp 1280w"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
                <img
                  src="/images/timberline-interior.jpg"
                  alt="Prepared living area after turnover checklist and inspection"
                  width={640}
                  height={427}
                  className="w-full h-72 object-cover"
                />
              </picture>
              <div className="p-5 grid sm:grid-cols-3 gap-3 text-xs bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <Camera className="w-4 h-4 text-teal-800 shrink-0" /> Room Photo Proof
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-800 shrink-0" /> 3 Readiness Gates
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <ShieldAlert className="w-4 h-4 text-teal-800 shrink-0" /> Critical Blocker Flags
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 3 Readiness Gates */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Three concrete checks behind every Ready badge</h2>
            <p className="text-sm text-slate-600 mt-1">
              Each property status updates automatically whenever a cleaning task, inspection, or critical incident changes state.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {gates.map((g) => {
              const Icon = g.icon;
              return (
                <Card key={g.title} className="p-6 rounded-2xl space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{g.title}</h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">{g.desc}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Role-Scoped Team Permissions */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-800" />
            <h2 className="text-2xl font-bold text-slate-900">Role-scoped views for owners, cleaners, inspectors, and techs</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((r) => (
              <Card key={r.role} className="p-5 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{r.role}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{r.scope}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-8 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">Run your entire turnover crew in Staywise—free</h2>
            <p className="text-xs text-slate-200">
              Full cleaning checklists, pre-arrival inspections, work orders, and RBAC team roles unlocked at $0/month.
            </p>
          </div>
          <Button variant="inverted" size="lg" onClick={() => onOpenAuth('register', 'Starter')}>
            Create Free Workspace
          </Button>
        </Card>
      </main>

      <PublicFooter onNavigatePath={onNavigatePath} onOpenAuth={onOpenAuth} />
    </div>
  );
}
