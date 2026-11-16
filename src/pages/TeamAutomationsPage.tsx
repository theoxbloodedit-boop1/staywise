import React, { useEffect, useState } from 'react';
import { UserPlus, BellRing } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateTimeShort } from '../lib/format';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, statusToBadgeVariant } from '../components/ui';
import type { OrgMember } from '../lib/types';

export function TeamPage({ orgId, onRefreshContext }: { orgId: string; onRefreshContext: () => void }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Cleaning Staff');
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');

  const load = async () => {
    const list = await apiFetch<OrgMember[]>('/api/admin/team');
    setMembers(list);
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    try {
      await apiFetch('/api/admin/team/invite', {
        method: 'POST',
        body: JSON.stringify({ name, email, role }),
      });
      setInviteOpen(false);
      setInviteNotice(`Invited ${name} (${email}) as ${role}. They can sign up via Neon Auth with this email to join automatically.`);
      setTimeout(() => setInviteNotice(''), 6000);
      setName('');
      setEmail('');
      await load();
      onRefreshContext();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite team member.');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team, Concierge & RBAC Permissions"
        description="Assign role-based permissions and property scopes. Employees only see modules and units required for their role."
        actions={
          <div className="flex items-center gap-2">
            {inviteNotice && (
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {inviteNotice}
              </span>
            )}
            <Button size="sm" variant="primary" onClick={() => { setInviteError(''); setInviteOpen(true); }}>
              <UserPlus className="w-4 h-4" /> Invite Team Member
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Team Member</th>
                <th className="py-2.5 px-4">RBAC Role</th>
                <th className="py-2.5 px-4">Property Scope</th>
                <th className="py-2.5 px-4">Task Performance</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {members.map((m) => (
                <tr key={m.membership_id}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
                        {m.avatar_initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{m.name}</div>
                        <div className="text-xs text-slate-500">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="brand">{m.role}</Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                    {m.assigned_property_ids?.includes('*')
                      ? 'All Organization Units'
                      : `${m.assigned_property_ids?.length || 0} assigned unit(s)`}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700 tabular-nums">
                    {m.workload_total ? `${m.workload_completed}/${m.workload_total} tasks completed` : 'Operational oversight'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="success">{m.status}</Badge>
                      {m.neon_linked ? (
                        <Badge variant="neutral">Neon Auth Linked</Badge>
                      ) : (
                        <Badge variant="warning">Pending Sign-In</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} className="space-y-3.5">
          {inviteError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{inviteError}</div>
          )}
          <Input label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Work Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            {[
              'Organization Admin',
              'Property Manager',
              'Concierge',
              'Cleaning Staff',
              'Maintenance Technician',
              'Inspector',
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Send Invite</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AutomationsPage({ orgId }: { orgId: string }) {
  const [rules, setRules] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const load = async () => {
    const res = await apiFetch('/api/admin/automations');
    setRules(res.rules);
    setNotifications(res.notifications);
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const toggleRule = async (r: any) => {
    await apiFetch(`/api/admin/automations/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    await load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Automation Rules & Notification Delivery"
        description="Event-driven triggers with role-based routing, quiet hours respect, critical urgency overrides, and duplicate prevention."
      />

      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-6 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Event-Driven Automation Triggers</h2>
          <div className="divide-y divide-slate-100">
            {rules.map((r) => (
              <div key={r.id} className="py-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">{r.name}</span>
                    <Badge variant="neutral">{r.channel}</Badge>
                  </div>
                  <p className="text-xs text-slate-600">{r.description}</p>
                  <div className="text-[11px] text-slate-400">
                    Trigger: {r.trigger_event} · Target: {r.recipient_role} ·{' '}
                    {r.quiet_hours_respected ? 'Quiet Hours Respected' : '24/7 Urgent Override'}
                  </div>
                </div>
                <button
                  onClick={() => toggleRule(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    r.enabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {r.enabled ? 'Enabled' : 'Paused'}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-teal-700" /> Recent Notification Delivery Log
          </h2>
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={statusToBadgeVariant(n.urgency)}>{n.urgency}</Badge>
                    <Badge variant={statusToBadgeVariant(n.delivery_status)}>{n.delivery_status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-600">{n.body}</p>
                <div className="text-[11px] text-slate-400">
                  {n.channel} → {n.recipient_name} ({n.recipient_role}) · {formatDateTimeShort(n.created_at)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
