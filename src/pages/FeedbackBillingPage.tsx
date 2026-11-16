import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Star,
  CheckCircle2,
  Download,
  DatabaseBackup,
  Trash2,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { apiFetch, downloadWithAuth } from '../lib/api';
import { formatDateTimeShort, formatMoney, REGION_PRESETS } from '../lib/format';
import { Badge, Button, Card, Input, Modal, PageHeader, Select } from '../components/ui';
import type { Organization, RegionCode } from '../lib/types';

export function FeedbackPage({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    setItems(await apiFetch('/api/admin/feedback'));
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const markFollowedUp = async (id: string) => {
    await apiFetch(`/api/admin/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ follow_up_status: 'Followed Up' }),
    });
    await load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Honest Guest Feedback & Sentiment"
        description="Unfiltered stay ratings across cleaning, check-in, comfort, and maintenance. STAYWISE never suppresses or gates honest guest feedback."
      />

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((f) => (
          <Card key={f.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{f.guest_name}</div>
                <div className="text-xs text-slate-500">
                  {f.property_name} · {formatDateTimeShort(f.created_at)}
                </div>
              </div>
              {f.follow_up_requested ? (
                <Badge variant={f.follow_up_status === 'Followed Up' ? 'success' : 'warning'}>
                  {f.follow_up_status}
                </Badge>
              ) : (
                <Badge variant="neutral">Recorded</Badge>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Clean', val: f.cleaning_rating },
                { label: 'Check-In', val: f.checkin_rating },
                { label: 'Comfort', val: f.comfort_rating },
                { label: 'Maint.', val: f.maintenance_rating },
              ].map((m) => (
                <div key={m.label} className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500">{m.label}</div>
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-center gap-0.5 mt-0.5 tabular-nums">
                    {m.val} <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">“{f.comments}”</p>

            {f.follow_up_requested === 1 && f.follow_up_status !== 'Followed Up' && (
              <Button size="sm" variant="outline" onClick={() => markFollowedUp(f.id)}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mark Host Follow-Up Complete
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SettingsBillingAuditPage({
  org,
  onOrgUpdated,
  onOrgDeleted,
}: {
  org: Organization | null;
  onOrgUpdated: () => void;
  onOrgDeleted?: () => void;
}) {
  const [name, setName] = useState(org?.name || '');
  const [email, setEmail] = useState(org?.contact_email || '');
  const [phone, setPhone] = useState(org?.contact_phone || '');
  const [country, setCountry] = useState<RegionCode>(org?.default_country || 'US');
  const [reqClean, setReqClean] = useState(Boolean(org?.require_cleaning_approval));
  const [reqInsp, setReqInsp] = useState(Boolean(org?.require_pre_arrival_inspection));

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [dbOverview, setDbOverview] = useState<any>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false);
  const [confirmAccountEmail, setConfirmAccountEmail] = useState('');
  const [accountDeleteError, setAccountDeleteError] = useState('');

  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refreshGovernance = async () => {
    const [logs, billing, bks] = await Promise.all([
      apiFetch('/api/admin/audit-logs'),
      apiFetch('/api/admin/billing'),
      apiFetch('/api/admin/backups'),
    ]);
    setAuditLogs(logs);
    setBillingInfo(billing);
    setDbOverview(bks.database || null);
  };

  useEffect(() => {
    if (org) {
      setName(org.name);
      setEmail(org.contact_email);
      setPhone(org.contact_phone);
      setCountry(org.default_country);
      setReqClean(Boolean(org.require_cleaning_approval));
      setReqInsp(Boolean(org.require_pre_arrival_inspection));
    }
    refreshGovernance();
  }, [org?.id]);

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiFetch('/api/admin/organization/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          contact_email: email,
          contact_phone: phone,
          default_country: country,
          require_cleaning_approval: reqClean,
          require_pre_arrival_inspection: reqInsp,
        }),
      });
      setNotice('Organization rules & profile saved');
      setTimeout(() => setNotice(''), 3000);
      onOrgUpdated();
      await refreshGovernance();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePlanChange = async (planTier: string) => {
    setErrorMsg('');
    try {
      await apiFetch('/api/admin/organization/billing', {
        method: 'POST',
        body: JSON.stringify({ planTier }),
      });
      setNotice(`Subscription updated to ${planTier} · Invoice generated`);
      setTimeout(() => setNotice(''), 3000);
      onOrgUpdated();
      await refreshGovernance();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRunBackup = async () => {
    setBackupBusy(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/admin/backups/run', { method: 'POST' });
      setDbOverview(res.database || null);
      setNotice('Neon PostgreSQL point-in-time snapshot state verified');
      setTimeout(() => setNotice(''), 3000);
      await refreshGovernance();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBackupBusy(false);
    }
  };

  const handleExportJson = async () => {
    setErrorMsg('');
    try {
      await downloadWithAuth(
        '/api/admin/organization/export',
        `staywise-export-${org?.slug || 'org'}-${new Date().toISOString().slice(0, 10)}.json`
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    try {
      await apiFetch('/api/admin/organization', {
        method: 'DELETE',
        body: JSON.stringify({ confirmName }),
      });
      setDeleteOpen(false);
      onOrgDeleted?.();
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountDeleteError('');
    try {
      await apiFetch('/api/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmEmail: confirmAccountEmail }),
      });
      setAccountDeleteOpen(false);
      onOrgDeleted?.();
    } catch (err: any) {
      setAccountDeleteError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Organization Settings"
        description="Manage subscription tiers, invoices, workspace backups, data exports, readiness preferences, and audit history."
        actions={
          notice && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {notice}
            </span>
          )
        }
      />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-5 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Organization & Readiness Rules</h2>
          <form onSubmit={handleSaveOrg} className="space-y-3">
            <Input label="Company Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Operations Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Emergency / Ops Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Select label="Default Region" value={country} onChange={(e) => setCountry(e.target.value as RegionCode)}>
              {(Object.keys(REGION_PRESETS) as RegionCode[]).map((code) => (
                <option key={code} value={code}>
                  {REGION_PRESETS[code].label}
                </option>
              ))}
            </Select>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reqClean} onChange={(e) => setReqClean(e.target.checked)} />
                Require supervisor approval before cleaning completes Readiness
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={reqInsp} onChange={(e) => setReqInsp(e.target.checked)} />
                Require passed Pre-Arrival inspection before unit is Ready
              </label>
            </div>

            <Button type="submit" variant="primary" size="sm" className="w-full">
              Save Governance Settings
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-7 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Early Access Plan & Monthly Quotas</h2>
              <p className="text-xs text-slate-500">
                Active Plan: <strong className="text-slate-900">{org?.plan_tier}</strong> (Early Access · $0/mo during Alpha) ·{' '}
                <span className="tabular-nums">
                  {billingInfo?.activePropertiesCount ?? '—'} / {org?.property_limit} active units
                </span>{' '}
                ·{' '}
                <span className="tabular-nums">
                  {billingInfo?.aiUsedThisMonth ?? 0} / {billingInfo?.aiMonthlyAllowance ?? 500} AI queries this month
                </span>
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { tier: 'Starter', price: '$0 in Alpha', future: 'Planned $19/mo', cap: 'Up to 2 units · 100 AI/mo' },
              { tier: 'Professional', price: '$0 in Alpha', future: 'Planned $49/mo', cap: 'Up to 10 units · 500 AI/mo' },
              { tier: 'Portfolio', price: '$0 in Alpha', future: 'Planned $99/mo', cap: 'Up to 25 units · 2,000 AI/mo' },
            ].map((p) => {
              const active = org?.plan_tier === p.tier;
              return (
                <div
                  key={p.tier}
                  className={`p-4 rounded-lg border flex flex-col justify-between ${
                    active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{p.tier}</span>
                      {active && <Badge variant="brand">Current</Badge>}
                    </div>
                    <div className="text-base font-bold tabular-nums text-slate-900 mt-1">{p.price}</div>
                    <div className="text-[11px] text-slate-500">{p.future} after GA</div>
                    <div className="text-[11px] text-slate-600 mt-1">{p.cap}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={active ? 'outline' : 'primary'}
                    className="mt-4 w-full"
                    disabled={active}
                    onClick={() => handlePlanChange(p.tier)}
                  >
                    {active ? 'Active Plan' : `Switch to ${p.tier}`}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Invoices + WAL-Safe Backups + GDPR Portability & Deletion */}
      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-900">Billing & Invoice History</h2>
          </div>
          {(billingInfo?.invoices || []).length === 0 ? (
            <div className="text-xs text-slate-400">No invoices recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {billingInfo.invoices.map((inv: any) => (
                <div key={inv.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-semibold text-slate-900">{inv.invoice_number}</div>
                    <div className="text-[11px] text-slate-500">
                      {inv.plan_tier} · {inv.period_label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-slate-900">
                      {formatMoney(inv.amount_cents / 100, inv.currency)}
                    </div>
                    <Badge variant="success">{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-4 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <DatabaseBackup className="w-4 h-4 text-teal-700" />
              <h2 className="text-sm font-semibold text-slate-900">Neon PostgreSQL & Storage</h2>
            </div>
            <Button size="sm" variant="outline" onClick={handleRunBackup} disabled={backupBusy}>
              {backupBusy ? 'Checking...' : 'Verify State'}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Managed by Neon Serverless PostgreSQL with instant branching & point-in-time recovery.
          </p>
          {dbOverview && (
            <div className="space-y-2 text-[11px]">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Media Storage</span>
                <span className="font-medium text-slate-900">{dbOverview.mediaStorage}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Units</div>
                  <div className="font-bold tabular-nums text-slate-900">{dbOverview.counts?.properties ?? 0}</div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Stays</div>
                  <div className="font-bold tabular-nums text-slate-900">{dbOverview.counts?.reservations ?? 0}</div>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Assets</div>
                  <div className="font-bold tabular-nums text-slate-900">{dbOverview.counts?.uploadedAssets ?? 0}</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3 p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Privacy & Account Erasure</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all workspace records in JSON, delete this organization, or permanently delete your personal account.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Button size="sm" variant="outline" className="w-full" onClick={handleExportJson}>
              <Download className="w-3.5 h-3.5" /> Export Organization Data (JSON)
            </Button>
            <Button size="sm" variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete Organization
            </Button>
            <Button size="sm" variant="outline" className="w-full text-red-700 border-red-200 hover:bg-red-50" onClick={() => setAccountDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete My Account
            </Button>
          </div>
        </Card>
      </div>

      {/* Immutable Audit History */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-900">Immutable Organization Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">{auditLogs.length} events recorded</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2 px-4">Timestamp</th>
                <th className="py-2 px-4">Actor & Role</th>
                <th className="py-2 px-4">Action</th>
                <th className="py-2 px-4">Property</th>
                <th className="py-2 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {auditLogs.map((a) => (
                <tr key={a.id}>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatDateTimeShort(a.created_at)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-medium text-slate-900">{a.actor_name}</span>{' '}
                    <span className="text-slate-400">({a.actor_role})</span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-teal-800">{a.action}</td>
                  <td className="py-2.5 px-4 text-slate-600">{a.property_name || 'Organization'}</td>
                  <td className="py-2.5 px-4 text-slate-700">{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Permanently Delete Organization"
        subtitle="This erases all properties, Welcome Books, reservations, cleaning history, incidents, and user memberships for this organization."
      >
        <form onSubmit={handleDeleteOrg} className="space-y-3.5">
          {deleteError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{deleteError}</div>
          )}
          <p className="text-xs text-slate-600">
            Type <strong className="text-slate-900">{org?.name}</strong> below to confirm permanent deletion:
          </p>
          <Input
            required
            placeholder={org?.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Permanently Delete Organization
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={accountDeleteOpen}
        onClose={() => setAccountDeleteOpen(false)}
        title="Delete Personal Staywise Account"
        subtitle="Permanently removes your user login, memberships, and any sole-owned organizations from Staywise and Neon Auth."
      >
        <form onSubmit={handleDeleteAccount} className="space-y-3.5">
          {accountDeleteError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{accountDeleteError}</div>
          )}
          <p className="text-xs text-slate-600">
            Enter your account email (<strong className="text-slate-900">{org?.contact_email || 'your login email'}</strong>) to confirm permanent deletion:
          </p>
          <Input
            type="email"
            required
            placeholder="you@company.com"
            value={confirmAccountEmail}
            onChange={(e) => setConfirmAccountEmail(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setAccountDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Delete Account Permanently
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
