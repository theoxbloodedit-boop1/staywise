import React, { useEffect, useState } from 'react';
import { Plus, Wrench, CheckCircle2, RotateCcw, Camera, ShieldAlert } from 'lucide-react';
import { apiFetch, uploadEvidencePhoto } from '../lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import type { Incident, OrgMember, Property, UserRole } from '../lib/types';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Heating',
  'Air conditioning',
  'Wi-Fi',
  'Appliances',
  'Furniture',
  'Access and locks',
  'Cleaning',
  'Noise',
  'Safety',
  'Other',
];

export function IncidentsPage({
  orgId,
  actorRole,
  members,
}: {
  orgId: string;
  actorRole: UserRole;
  members: OrgMember[];
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [propId, setPropId] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Devon Brooks');

  const [resolutionNotes, setResolutionNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canVerify = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Inspector', 'Platform Super Admin'].includes(actorRole);
  const canDispatch = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'].includes(actorRole);

  const load = async () => {
    const [incList, propList] = await Promise.all([
      apiFetch<Incident[]>('/api/incidents'),
      apiFetch<Property[]>('/api/properties'),
    ]);
    setIncidents(incList);
    setProperties(propList);
    if (!propId && propList[0]) setPropId(propList[0].id);
    if (selected) {
      const updated = incList.find((i) => i.id === selected.id);
      if (updated) setSelected(updated);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        property_id: propId,
        category,
        priority,
        title,
        description,
        assigned_to_name: assignee,
      }),
    });
    setCreateOpen(false);
    setTitle('');
    setDescription('');
    await load();
  };

  const patchIncident = async (inc: Incident, body: any) => {
    setErrorMsg('');
    try {
      await apiFetch(`/api/incidents/${inc.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      await load();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResolutionPhoto = (inc: Incident, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const uploadedUrl = await uploadEvidencePhoto(reader.result as string, 'incident');
      await patchIncident(inc, {
        resolution_urls: [...inc.resolution_urls, uploadedUrl],
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Incidents & Maintenance Work Orders"
        description="Track every guest complaint and property issue from New → Assigned → In Progress → Awaiting Verification → Resolved."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Log Incident / Work Order
          </Button>
        }
      />

      <div className="grid lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-2.5">
          {incidents.map((inc) => {
            const active = selected?.id === inc.id;
            return (
              <Card
                key={inc.id}
                className={`p-4 cursor-pointer transition-colors ${
                  active ? 'border-slate-900 ring-1 ring-slate-900' : 'hover:border-slate-300'
                }`}
              >
                <div
                  onClick={() => {
                    setSelected(inc);
                    setResolutionNotes(inc.resolution_notes || '');
                    setErrorMsg('');
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-500">{inc.work_order_code}</span>
                        <Badge variant={statusToBadgeVariant(inc.priority)}>{inc.priority}</Badge>
                        <Badge variant="neutral">{inc.category}</Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 pt-0.5">{inc.title}</h3>
                    </div>
                    <Badge variant={statusToBadgeVariant(inc.status)}>{inc.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2">{inc.description}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>
                      {inc.property_name} · Tech: <strong className="text-slate-700">{inc.assigned_to_name}</strong>
                    </span>
                    <span>Source: {inc.source}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-5">
          {!selected ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              Select a work order to assign a technician, upload resolution evidence, or verify and close the incident.
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">{selected.work_order_code}</span>
                    <Badge variant={statusToBadgeVariant(selected.priority)}>{selected.priority}</Badge>
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900 mt-1">{selected.title}</h2>
                  <p className="text-xs text-slate-500">{selected.property_name}</p>
                </div>
                <Badge variant={statusToBadgeVariant(selected.status)}>{selected.status}</Badge>
              </div>

              {selected.priority === 'Critical' && selected.status !== 'Resolved' && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Critical priority locks property readiness to Not Ready until verified & resolved.
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">{errorMsg}</div>
              )}

              <p className="text-xs text-slate-700 leading-relaxed">{selected.description}</p>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Assign Technician"
                  disabled={!canDispatch}
                  value={selected.assigned_to_name}
                  onChange={(e) =>
                    patchIncident(selected, {
                      assigned_to_name: e.target.value,
                      status: selected.status === 'Reported' ? 'Assigned' : selected.status,
                    })
                  }
                >
                  <option value="Unassigned">Unassigned</option>
                  <option value="Devon Brooks">Devon Brooks (Technician)</option>
                  {members
                    .filter((m) => m.name !== 'Devon Brooks')
                    .map((m) => (
                      <option key={m.membership_id} value={m.name}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                </Select>
                <Input label="Target Deadline" value={selected.deadline.replace('T', ' ')} readOnly />
              </div>

              {/* Resolution Evidence */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Technician Resolution Evidence</span>
                  <label className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" /> Add Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleResolutionPhoto(selected, e)} />
                  </label>
                </div>
                <TextArea
                  placeholder="Describe repair work performed, parts replaced, and test verification..."
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
                {selected.resolution_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {selected.resolution_urls.map((u, idx) => (
                      <img
                        key={idx}
                        src={u}
                        alt={`${selected.work_order_code} repair resolution evidence ${idx + 1}`}
                        loading="lazy"
                        className="h-16 w-full object-cover rounded border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Lifecycle Controls */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                {selected.status !== 'In Progress' && selected.status !== 'Resolved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patchIncident(selected, { status: 'In Progress', resolution_notes: resolutionNotes })}
                  >
                    <Wrench className="w-3.5 h-3.5" /> Mark In Progress
                  </Button>
                )}
                {selected.status !== 'Awaiting Verification' && selected.status !== 'Resolved' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      patchIncident(selected, {
                        status: 'Awaiting Verification',
                        resolution_notes: resolutionNotes || 'Repair completed and tested; submitted for verification.',
                      })
                    }
                  >
                    Submit Resolution Evidence
                  </Button>
                )}
                {canVerify && selected.status !== 'Resolved' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      patchIncident(selected, {
                        status: 'Resolved',
                        resolution_notes: resolutionNotes || selected.resolution_notes || 'Verified & resolved.',
                      })
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Close
                  </Button>
                )}
                {selected.status === 'Resolved' && (
                  <Button size="sm" variant="danger" onClick={() => patchIncident(selected, { status: 'Reopened' })}>
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen Incident
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Incident / Work Order">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <Select label="Property" value={propId} onChange={(e) => setPropId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="Critical">Critical (Locks Readiness)</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
          </div>
          <Input label="Incident Summary" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea label="Detailed Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select label="Assign Technician" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="Unassigned">Unassigned</option>
            <option value="Devon Brooks">Devon Brooks (Maintenance Technician)</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Work Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
