import React from 'react';
import { ArrowRight, Building2, CalendarClock, MessageSquare, ShieldAlert, Sparkles } from 'lucide-react';
import type { AppRoute } from './AppShell';

export interface OwnerIndicators {
  totalProperties?: number;
  criticalIncidents?: number;
  overdueCleaning?: number;
  notReadyProperties?: number;
  unresolvedGuestRequests?: number;
  upcomingArrivals?: number;
}
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

export function ownerNextStep(indicators: OwnerIndicators): { title: string; detail: string; action: string; route: AppRoute; urgent: boolean } {
  if ((count(indicators.criticalIncidents) ?? 0) > 0) return { title: 'Start with your critical incidents.', detail: 'Review the reported issue and coordinate with your team. External emergency paging is not connected.', action: 'Review incidents', route: 'incidents', urgent: true };
  if ((count(indicators.overdueCleaning) ?? 0) > 0) return { title: 'Your next move: catch up on turnovers.', detail: 'Open the overdue tasks, confirm who is assigned, and check progress before the next arrival.', action: 'Review cleaning', route: 'cleaning', urgent: true };
  if (count(indicators.totalProperties) === 0) return { title: 'Your first property. Your clearer day.', detail: 'Add a property, review its welcome book, then bring your team into the same workspace.', action: 'Add your first property', route: 'properties', urgent: false };
  if ((count(indicators.notReadyProperties) ?? 0) > 0) return { title: 'See what is holding your properties back.', detail: 'Review recorded cleaning, inspection and maintenance checks. A status is not a safety certification.', action: 'Review properties', route: 'properties', urgent: false };
  if ((count(indicators.unresolvedGuestRequests) ?? 0) > 0) return { title: 'Your guests have questions to review.', detail: 'Read open requests and guide questions. Internal notifications do not send email or SMS.', action: 'Review guest requests', route: 'ai-console', urgent: false };
  if ([indicators.totalProperties, indicators.criticalIncidents, indicators.overdueCleaning, indicators.notReadyProperties, indicators.unresolvedGuestRequests].some(value => count(value) === null)) return { title: 'Your summary needs a closer look.', detail: 'Some activity counts are unavailable. Review the underlying records before making an operational decision.', action: 'Review properties', route: 'properties', urgent: false };
  return { title: 'Your portfolio, in one clear view.', detail: 'Review upcoming stays and recorded checks below. No critical incidents or overdue cleaning are recorded in the available summary.', action: 'Review upcoming stays', route: 'reservations', urgent: false };
}

export function OwnerBrief({ indicators, onNavigate }: { indicators: OwnerIndicators; onNavigate: (route: AppRoute) => void }) {
  const next = ownerNextStep(indicators);
  const items = [
    { label: 'Properties', value: count(indicators.totalProperties), icon: Building2 },
    { label: 'Critical incidents', value: count(indicators.criticalIncidents), icon: ShieldAlert },
    { label: 'Overdue cleanings', value: count(indicators.overdueCleaning), icon: Sparkles },
    { label: 'Guest requests', value: count(indicators.unresolvedGuestRequests), icon: MessageSquare },
  ];
  return <section aria-labelledby="owner-brief-title" className="owner-brief overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-sm">
    <div className="grid lg:grid-cols-[1.3fr_1fr]">
      <div className="p-6 sm:p-8 lg:p-9">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200"><span className={`h-2 w-2 rounded-full ${next.urgent ? 'bg-amber-300' : 'bg-teal-300'}`} />Owner briefing</p>
        <h2 id="owner-brief-title" className="mt-4 max-w-xl text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{next.title}</h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-slate-300">{next.detail}</p>
        <button onClick={() => onNavigate(next.route)} className="mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-50 transition-colors">{next.action}<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>
      <div className="border-t border-white/10 lg:border-t-0 lg:border-l bg-white/[0.03] p-6 sm:p-8 flex flex-col justify-center">
        <p className="flex items-center gap-2 text-sm text-slate-300"><CalendarClock aria-hidden="true" className="h-4 w-4 text-teal-200" />Recorded activity. Clear priorities.</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6">{items.map(({ label, value, icon: Icon }) => <div key={label}>
          <dt className="flex items-center gap-2 text-sm text-slate-300"><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-200" />{label}</dt>
          <dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value ?? '—'}</dd>
        </div>)}</dl>
      </div>
    </div>
  </section>;
}
