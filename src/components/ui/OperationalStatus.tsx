import React from 'react';
import { CheckCircle2, ShieldAlert, Clock3, CircleHelp } from 'lucide-react';

/** Presentation only. Status/reason must come from the server; never infer a pass. */
export function OperationalStatus({ status, reason }: { status?: string | null; reason?: string | null }) {
  const known = {
    Ready: { label: 'READY', icon: CheckCircle2, style: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    BLOCKED: { label: 'BLOCKED', icon: ShieldAlert, style: 'bg-red-50 border-red-200 text-red-800' },
    Blocked: { label: 'BLOCKED', icon: ShieldAlert, style: 'bg-red-50 border-red-200 text-red-800' },
    'Not Ready': { label: 'NOT READY', icon: ShieldAlert, style: 'bg-amber-50 border-amber-200 text-amber-900' },
    'In Progress': { label: 'IN PROGRESS', icon: Clock3, style: 'bg-blue-50 border-blue-200 text-blue-800' },
    'Needs Review': { label: 'NEEDS REVIEW', icon: Clock3, style: 'bg-amber-50 border-amber-200 text-amber-900' },
  };
  const state = known[status as keyof typeof known] || { label: status || 'STATUS UNAVAILABLE', icon: CircleHelp, style: 'bg-slate-50 border-slate-200 text-slate-700' };
  const Icon = state.icon;
  return <div className="space-y-2 min-w-0">
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${state.style}`}><Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{state.label}</span>
    {reason && <p className="text-xs leading-relaxed text-slate-600 max-w-sm whitespace-normal break-words">{reason}</p>}
  </div>;
}
