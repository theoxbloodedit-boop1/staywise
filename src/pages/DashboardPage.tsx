import { OwnerBrief } from '../components/OwnerBrief';
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wrench,
  CalendarClock,
  Bot,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { OperationalStatus } from '../components/ui/OperationalStatus';
import { apiFetch } from '../lib/api';
import { formatMetricPercent, formatMetricScore } from '../lib/metrics';
import { Badge, Button, Card, PageHeader, statusToBadgeVariant } from '../components/ui';
import type { AppRoute } from '../components/AppShell';

export function DashboardPage({
  orgId,
  onNavigate,
  onOpenGuidebook,
}: {
  orgId: string;
  onNavigate: (route: AppRoute) => void;
  onOpenGuidebook: (propertyId: string) => void;
}) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/admin/dashboard?range=${range}`);
      setData(res);
    } catch {
      setError('We could not load your operations. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId, range]);

  if (error) return <Card className="p-8 space-y-4"><h1 className="text-xl font-semibold">Operations unavailable</h1><p role="alert" className="text-sm text-slate-600">{error}</p><Button onClick={load}>Try again</Button></Card>;

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-14 bg-slate-200/70 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200/70 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const ind = data.indicators;
  const an = data.analytics;
  const maxCat = Math.max(1, ...(an.categoryBreakdown || []).map((c: any) => c.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your operations, at a glance"
        description={`Recorded stays, turnovers, and reported issues · ${data.dateWindowLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-sm font-medium rounded ${
                    range === r ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <Button size="sm" variant="primary" onClick={() => onNavigate('properties')}>
              Manage Properties
            </Button>
          </div>
        }
      />

      <OwnerBrief indicators={ind} onNavigate={onNavigate} />

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Upcoming arrivals / departures', value: `${ind.upcomingArrivals} / ${ind.upcomingDepartures}`, sub: 'Upcoming turnover window', route: 'reservations' as AppRoute, tone: 'text-slate-900' },
          { label: 'Properties needing review', value: ind.notReadyProperties, sub: 'Open the recorded checks and blockers', route: 'properties' as AppRoute, tone: ind.notReadyProperties > 0 ? 'text-amber-800' : 'text-slate-900' },
          { label: 'Recorded Ready', value: ind.readyProperties, sub: 'Server record, not a safety certification', route: 'inspections' as AppRoute, tone: 'text-slate-900' },
        ].map((kpi) => (
          <Card
            key={kpi.label}
            className="p-4 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <button onClick={() => onNavigate(kpi.route)} className="w-full text-left">
              <div className="text-sm font-medium text-slate-500">{kpi.label}</div>
              <div className={`text-2xl font-bold tabular-nums mt-1 ${kpi.tone || 'text-slate-900'}`}>
                {kpi.value}
              </div>
              <div className="text-sm text-slate-500 mt-1">{kpi.sub}</div>
            </button>
          </Card>
        ))}
      </div>

      {/* Property Readiness Matrix */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Property Operations Status</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Recorded server status and checks. Final readiness validation is under development; this is not a safety certification.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="success">{ind.readyProperties} recorded Ready</Badge>
            <Badge variant="danger">{ind.notReadyProperties} Not Ready</Badge>
          </div>
        </div>

        {data.propertyReadinessMatrix.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-800">No properties added yet</div>
            <p className="text-sm text-slate-500 mt-1 mb-3">Create your first property to generate its Digital Welcome Book & operations board.</p>
            <Button size="sm" onClick={() => onNavigate('properties')}>Add Property</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Property</th>
                  <th className="py-2.5 px-4">Region</th>
                  <th className="py-2.5 px-4">Cleaning</th>
                  <th className="py-2.5 px-4">Inspection</th>
                  <th className="py-2.5 px-4">Safety</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {data.propertyReadinessMatrix.map((prop: any) => (
                  <tr key={prop.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prop.cover_image}
                          alt={`${prop.name} property thumbnail`}
                          loading="lazy"
                          className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{prop.name}</div>
                          <div className="text-sm text-slate-500">
                            {prop.city}, {prop.state}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono">
                      {prop.country} · {prop.currency} · {prop.emergency_number}
                    </td>
                    <td className="py-3 px-4">
                      {prop.gates?.cleaningApproved ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> No open tasks
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigate('cleaning')}
                          className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium hover:underline"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Pending Review
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {prop.gates?.inspectionPassed ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigate('inspections')}
                          className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium hover:underline"
                        >
                          <CalendarClock className="w-3.5 h-3.5" /> Inspect Required
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {prop.gates?.incidentsClear ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> No critical reports
                        </span>
                      ) : (
                        <button
                          onClick={() => onNavigate('incidents')}
                          className="inline-flex items-center gap-1 text-sm text-red-700 font-medium hover:underline"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Critical Blocker
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <OperationalStatus status={prop.readiness_status === 'Ready' ? undefined : prop.readiness_status} reason={prop.readiness_status === 'Ready' ? `Server record: Ready. Final validation unavailable. ${prop.readiness_reason || ''}` : prop.readiness_reason} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => onOpenGuidebook(prop.id)}>
                          Edit Guidebook
                        </Button>
                        <a
                          href={`/guest/${prop.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center h-8 px-2.5 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          Guest URL
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Operational Analytics Row */}
      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Operational Performance Indicators</h3>
              <p className="text-sm text-slate-500">Calculated directly from recorded cleaning, maintenance, guide & review logs</p>
            </div>
            <Badge variant="neutral">{data.dateWindowLabel}</Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5">
            {[
              {
                label: 'Property Readiness Rate',
                value: formatMetricPercent(an.readinessRate),
                icon: CheckCircle2,
              },
              {
                label: 'Cleaning Completion Rate',
                value: formatMetricPercent(an.cleaningCompletionRate),
                icon: Sparkles,
              },
              {
                label: 'Avg Incident Resolution Time',
                value: an.avgResolutionHours === null || an.avgResolutionHours === undefined ? '—' : `${an.avgResolutionHours} hrs`,
                icon: Wrench,
              },
              {
                label: 'Questions Not Escalated',
                value: formatMetricPercent(an.aiDeflectionRate),
                icon: Bot,
              },
              { label: 'Guest Inquiry Volume', value: `${an.guestInquiryVolume ?? 0} msgs`, icon: MessageSquare },
              {
                label: 'Avg Guest Satisfaction',
                value: formatMetricScore(an.avgFeedbackScore),
                icon: CheckCircle2,
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">{m.label}</div>
                    <div className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">{m.value}</div>
                  </div>
                  <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recurring Incident Categories</h3>
                <p className="text-sm text-slate-500">Distribution across active and resolved work orders</p>
              </div>
              <button
                onClick={() => onNavigate('incidents')}
                className="text-sm font-medium text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                Work orders <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {(an.categoryBreakdown || []).length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-600">No recorded incidents in this window.</div>
            ) : (
              <div className="space-y-3">
                {an.categoryBreakdown.map((cat: any) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{cat.category}</span>
                      <span className="font-mono text-slate-500 tabular-nums">{cat.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full"
                        style={{ width: `${Math.round((cat.count / maxCat) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {an.knowledgeGapsOpen > 0 && (
            <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{an.knowledgeGapsOpen}</strong> unanswered guide question(s) need Welcome Book updates.
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigate('ai-console')}>
                Review
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
