import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  SlidersHorizontal,
  Trash2,
  CalendarClock,
  MessageSquare,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateTimeShort } from '../lib/format';
import { PLAN_LIST } from '../lib/plans';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import type { UserRole } from '../lib/types';

interface CrmOrgRow {
  id: string;
  name: string;
  slug: string;
  default_country: string;
  plan_tier: 'Starter' | 'Professional' | 'Portfolio';
  property_limit: number;
  ai_monthly_allowance: number;
  contact_email: string;
  contact_phone: string;
  crm_stage: string;
  account_status: string;
  crm_notes: string;
  last_contacted_at: string | null;
  created_at: string;
  owner_name: string;
  owner_email: string;
  neon_linked: boolean;
  member_count: number;
  active_properties: number;
  ready_properties: number;
  reservations_count: number;
  open_incidents: number;
  ai_used_month: number;
}

interface CrmUserRow {
  id: string;
  name: string;
  email: string;
  avatar_initials: string;
  neon_linked: boolean;
  created_at: string;
  workspaces: Array<{
    membership_id: string;
    organization_id: string;
    org_name: string;
    role: UserRole;
    status: string;
  }>;
}

interface CrmOverview {
  kpis: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    newOrgsLast7d: number;
    totalUsers: number;
    neonVerifiedUsers: number;
    totalActiveProperties: number;
    totalReservations: number;
    openIncidents: number;
    aiQueriesThisMonth: number;
    openSupportEscalations: number;
  };
  organizations: CrmOrgRow[];
  users: CrmUserRow[];
  supportRequests: any[];
  feedback: any[];
  auditLogs: any[];
  databaseHealth: {
    provider: string;
    mediaStorage: string;
    counts: Record<string, number>;
  };
}

const CRM_STAGES = ['Onboarding', 'Active', 'Power Host', 'VIP', 'At Risk', 'Churned'];
const MEMBER_ROLES: UserRole[] = [
  'Platform Super Admin',
  'Organization Owner',
  'Organization Admin',
  'Property Manager',
  'Concierge',
  'Cleaning Staff',
  'Maintenance Technician',
  'Inspector',
];

function stageToBadge(stage: string): 'brand' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (stage) {
    case 'VIP':
    case 'Power Host':
      return 'brand';
    case 'Active':
      return 'success';
    case 'Onboarding':
      return 'neutral';
    case 'At Risk':
      return 'warning';
    case 'Churned':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function PlatformCrmPage({ currentOrgId }: { currentOrgId: string }) {
  const [data, setData] = useState<CrmOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'orgs' | 'users' | 'activity'>('orgs');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [notice, setNotice] = useState('');

  // Inspector modal state
  const [editingOrg, setEditingOrg] = useState<CrmOrgRow | null>(null);
  const [editPlan, setEditPlan] = useState<'Starter' | 'Professional' | 'Portfolio'>('Starter');
  const [editLimit, setEditLimit] = useState('5');
  const [editAiQuota, setEditAiQuota] = useState('250');
  const [editStage, setEditStage] = useState('Active');
  const [editStatus, setEditStatus] = useState('Active');
  const [editNotes, setEditNotes] = useState('');
  const [markContacted, setMarkContacted] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [modalError, setModalError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<CrmOverview>('/api/platform-crm/overview');
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Founder SaaS CRM Console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const openInspector = (org: CrmOrgRow) => {
    setEditingOrg(org);
    setEditPlan(org.plan_tier);
    setEditLimit(String(org.property_limit));
    setEditAiQuota(String(org.ai_monthly_allowance));
    setEditStage(org.crm_stage || 'Active');
    setEditStatus(org.account_status || 'Active');
    setEditNotes(org.crm_notes || '');
    setMarkContacted(false);
    setDeleteConfirmSlug('');
    setModalError('');
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setSavingOrg(true);
    setModalError('');
    try {
      await apiFetch(`/api/platform-crm/organizations/${editingOrg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          plan_tier: editPlan,
          property_limit: Number(editLimit),
          ai_monthly_allowance: Number(editAiQuota),
          crm_stage: editStage,
          account_status: editStatus,
          crm_notes: editNotes,
          markContactedNow: markContacted,
        }),
      });
      setEditingOrg(null);
      flash(`Updated CRM record for ${editingOrg.name}`);
      await load();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save CRM updates.');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!editingOrg) return;
    setModalError('');
    try {
      await apiFetch(`/api/platform-crm/organizations/${editingOrg.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmSlug: deleteConfirmSlug }),
      });
      setEditingOrg(null);
      flash(`Deleted workspace "${editingOrg.name}"`);
      await load();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to delete workspace.');
    }
  };

  const handleMembershipChange = async (membershipId: string, role: string, status: string) => {
    try {
      await apiFetch(`/api/platform-crm/memberships/${membershipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role, status }),
      });
      flash('Updated member role & status');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to update membership.');
    }
  };

  const filteredOrgs = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.organizations.filter((o) => {
      if (stageFilter === 'Suspended' && o.account_status !== 'Suspended') return false;
      if (stageFilter !== 'ALL' && stageFilter !== 'Suspended' && o.crm_stage !== stageFilter) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.owner_email.toLowerCase().includes(q) ||
        o.owner_name.toLowerCase().includes(q)
      );
    });
  }, [data, search, stageFilter]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.workspaces.some((w) => w.org_name.toLowerCase().includes(q))
    );
  }, [data, search]);

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="SaaS Founder CRM & Platform Admin"
          description="Multi-tenant client CRM, workspace quotas, user directory, support escalations, and Neon DB telemetry."
        />
        <Card className="p-8 text-sm text-slate-500">Loading Founder SaaS CRM Console...</Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="SaaS Founder CRM & Platform Admin" />
        <Card className="p-8 text-center space-y-3 border-red-200 bg-red-50/40">
          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-900">{error}</div>
          <Button size="sm" variant="primary" onClick={load}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: 'Client Workspaces', value: data.kpis.totalOrganizations, sub: `${data.kpis.newOrgsLast7d} new in 7d` },
    { label: 'Active / Suspended', value: `${data.kpis.activeOrganizations} / ${data.kpis.suspendedOrganizations}`, sub: 'Account health' },
    { label: 'Registered Users', value: data.kpis.totalUsers, sub: `${data.kpis.neonVerifiedUsers} Neon-linked` },
    { label: 'Active Properties', value: data.kpis.totalActiveProperties, sub: `${data.kpis.totalReservations} stays` },
    { label: 'AI Queries (Month)', value: data.kpis.aiQueriesThisMonth, sub: 'Platform-wide usage' },
    { label: 'Open Support / Incidents', value: `${data.kpis.openSupportEscalations} / ${data.kpis.openIncidents}`, sub: 'Cross-tenant queue' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="SaaS Founder CRM & Platform Admin"
        description="Central back-office to manage client organizations, lifecycle stages, property/AI quotas, user accounts, and platform health."
        actions={
          <div className="flex items-center gap-2">
            {notice && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" /> {notice}
              </span>
            )}
            <Badge variant="brand">Platform Super Admin</Badge>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Platform Executive KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500">{k.label}</div>
            <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">{k.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Sub-navigation + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
          {[
            { id: 'orgs', label: `Client Workspaces (${data.organizations.length})`, icon: Building2 },
            { id: 'users', label: `Users Directory (${data.users.length})`, icon: Users },
            { id: 'activity', label: `Support, Feedback & Audit`, icon: ShieldCheck },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search org, slug, owner or email..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {tab === 'orgs' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {['ALL', ...CRM_STAGES, 'Suspended'].map((st) => (
              <button
                key={st}
                onClick={() => setStageFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  stageFilter === st
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st === 'ALL' ? 'All Clients' : st}
              </button>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Workspace</th>
                    <th className="py-2.5 px-4">Owner / Contact</th>
                    <th className="py-2.5 px-4">Plan & Quotas</th>
                    <th className="py-2.5 px-4">Usage</th>
                    <th className="py-2.5 px-4">CRM Stage</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">CRM Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {org.name}
                          {org.id === currentOrgId && <Badge variant="brand">Your Workspace</Badge>}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {org.slug} · {org.default_country}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{org.owner_name}</div>
                        <div className="text-xs text-slate-500">{org.owner_email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-slate-900">{org.plan_tier} ($0)</div>
                        <div className="text-slate-500 tabular-nums">
                          {org.property_limit} props · {org.ai_monthly_allowance} AI/mo
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-700">
                        <div>
                          {org.active_properties}/{org.property_limit} props · {org.member_count} staff
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {org.reservations_count} stays · {org.ai_used_month} AI · {org.open_incidents} open inc
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={stageToBadge(org.crm_stage)}>{org.crm_stage}</Badge>
                        {org.crm_notes && (
                          <div className="text-[11px] text-slate-500 mt-1 max-w-[190px] truncate" title={org.crm_notes}>
                            {org.crm_notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={org.account_status === 'Suspended' ? 'danger' : 'success'}>
                          {org.account_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => openInspector(org)}>
                          <SlidersHorizontal className="w-3.5 h-3.5" /> Manage CRM
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No workspaces match the current CRM filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">User Account</th>
                  <th className="py-2.5 px-4">Auth Verification</th>
                  <th className="py-2.5 px-4">Workspaces & Role Control</th>
                  <th className="py-2.5 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {u.avatar_initials}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.neon_linked ? 'success' : 'neutral'}>
                        {u.neon_linked ? 'Neon Auth Linked' : 'Seed / Invited'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 space-y-1.5">
                      {u.workspaces.map((w) => (
                        <div key={w.membership_id} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-slate-800">{w.org_name}</span>
                          <select
                            value={w.role}
                            onChange={(e) => handleMembershipChange(w.membership_id, e.target.value, w.status)}
                            className="h-7 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-800"
                          >
                            {MEMBER_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <select
                            value={w.status}
                            onChange={(e) => handleMembershipChange(w.membership_id, w.role, e.target.value)}
                            className="h-7 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-800"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                      {formatDateTimeShort(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'activity' && (
        <div className="grid lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-6 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-700" /> Cross-Tenant Support &amp; Guest Feedback
              </h2>
            </div>
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
              {data.supportRequests.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {s.org_name} {s.property_name ? `· ${s.property_name}` : ''}
                    </span>
                    <Badge variant={statusToBadgeVariant(s.status)}>{s.status}</Badge>
                  </div>
                  <div className="text-xs font-medium text-slate-800">{s.subject}</div>
                  <div className="text-[11px] text-slate-600">{s.message}</div>
                </div>
              ))}
              {data.feedback.slice(0, 6).map((f) => (
                <div key={f.id} className="p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {f.org_name} · {f.guest_name}
                    </span>
                    <Badge variant="neutral">
                      Avg {((f.cleaning_rating + f.checkin_rating + f.comfort_rating + f.maintenance_rating) / 4).toFixed(1)}/5
                    </Badge>
                  </div>
                  {f.comments && <div className="text-[11px] text-slate-600">“{f.comments}”</div>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-6 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-teal-700" /> Neon DB &amp; Global Audit Stream
              </h2>
              <Badge variant="success">{data.databaseHealth.provider}</Badge>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 flex items-center justify-between">
              <span>Media backend: {data.databaseHealth.mediaStorage}</span>
              <span className="font-mono text-[11px]">
                {data.databaseHealth.counts.properties || 0} props · {data.databaseHealth.counts.reservations || 0} stays
              </span>
            </div>
            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {data.auditLogs.map((a) => (
                <div key={a.id} className="p-2.5 rounded border border-slate-100 text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-slate-900">{a.action}</span>
                    <span className="text-[11px] text-slate-400">{formatDateTimeShort(a.created_at)}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>{a.org_name}</strong> · {a.actor_name} ({a.actor_role}) — {a.details}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* CRM Organization Editor Modal */}
      <Modal
        open={Boolean(editingOrg)}
        onClose={() => setEditingOrg(null)}
        title={editingOrg ? `CRM Account — ${editingOrg.name}` : 'CRM Account'}
        maxWidth="max-w-xl"
      >
        {editingOrg && (
          <form onSubmit={handleSaveOrg} className="space-y-4">
            {modalError && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{modalError}</div>
            )}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-900">
                Owner: {editingOrg.owner_name} ({editingOrg.owner_email})
              </div>
              <div className="text-slate-500">
                Created {formatDateTimeShort(editingOrg.created_at)} ·{' '}
                {editingOrg.last_contacted_at
                  ? `Last contacted ${formatDateTimeShort(editingOrg.last_contacted_at)}`
                  : 'No founder touchpoint logged yet'}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Select label="CRM Lifecycle Stage" value={editStage} onChange={(e) => setEditStage(e.target.value)}>
                {CRM_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                label="Workspace Account Status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={editingOrg.id === currentOrgId}
              >
                <option value="Active">Active (Normal access)</option>
                <option value="Suspended">Suspended (Blocked non-admin access)</option>
              </Select>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Select
                label="Plan Tier ($0 Free)"
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as any)}
              >
                {PLAN_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Property Limit Quota"
                type="number"
                min={1}
                max={5000}
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
              />
              <Input
                label="AI Allowance / Mo"
                type="number"
                min={0}
                max={100000}
                value={editAiQuota}
                onChange={(e) => setEditAiQuota(e.target.value)}
              />
            </div>

            <TextArea
              label="Founder CRM Notes (internal only — invisible to client)"
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Onboarding call notes, portfolio count, priority follow-up..."
            />

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={markContacted}
                onChange={(e) => setMarkContacted(e.target.checked)}
                className="rounded border-slate-300 text-teal-700"
              />
              <CalendarClock className="w-3.5 h-3.5 text-teal-700" />
              Log founder contact timestamp as now
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button type="button" variant="ghost" onClick={() => setEditingOrg(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingOrg}>
                {savingOrg ? 'Saving...' : 'Save CRM Record'}
              </Button>
            </div>

            {editingOrg.id !== currentOrgId && (
              <div className="pt-4 border-t border-red-200 space-y-2">
                <div className="text-xs font-semibold text-red-700">Danger Zone — Remove Test or Spam Workspace</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    value={deleteConfirmSlug}
                    onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                    placeholder={`Type "${editingOrg.slug}" to confirm`}
                    className="flex-1 min-w-[200px] h-8 px-2.5 text-xs bg-white border border-red-200 rounded-md"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={deleteConfirmSlug.trim() !== editingOrg.slug && deleteConfirmSlug.trim() !== editingOrg.name}
                    onClick={handleDeleteOrg}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Workspace
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
