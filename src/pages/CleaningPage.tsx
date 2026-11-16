import React, { useEffect, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Camera,
  Clock,
  ShieldAlert,
  CheckSquare,
  Square,
} from 'lucide-react';
import { apiFetch, uploadEvidencePhoto } from '../lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import type { CleaningTask, OrgMember, Property, UserRole } from '../lib/types';

export function CleaningPage({
  orgId,
  actorRole,
  members,
}: {
  orgId: string;
  actorRole: UserRole;
  members: OrgMember[];
}) {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [newPropId, setNewPropId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('Sofia Alvarez');
  const [newDue, setNewDue] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10) + 'T14:00');
  const [newNotes, setNewNotes] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const canManage = ['Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Platform Super Admin'].includes(actorRole);

  const load = async () => {
    const [taskList, propList] = await Promise.all([
      apiFetch<CleaningTask[]>('/api/cleaning'),
      apiFetch<Property[]>('/api/properties'),
    ]);
    setTasks(taskList);
    setProperties(propList);
    if (!newPropId && propList[0]) setNewPropId(propList[0].id);
    if (selectedTask) {
      const refreshed = taskList.find((t) => t.id === selectedTask.id);
      if (refreshed) setSelectedTask(refreshed);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/cleaning', {
      method: 'POST',
      body: JSON.stringify({
        property_id: newPropId,
        title: newTitle,
        assigned_name: newAssignee,
        due_date: newDue,
        notes: newNotes,
      }),
    });
    setCreateOpen(false);
    setNewTitle('');
    setNewNotes('');
    await load();
  };

  const patchTask = async (task: CleaningTask, body: any) => {
    await apiFetch(`/api/cleaning/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    await load();
  };

  const toggleChecklistItem = async (task: CleaningTask, itemId: string) => {
    const nextChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await patchTask(task, {
      checklist: nextChecklist,
      status: task.status === 'Unassigned' || task.status === 'Assigned' ? 'In Progress' : task.status,
    });
  };

  const handlePhotoUpload = (task: CleaningTask, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const uploadedUrl = await uploadEvidencePhoto(dataUrl, 'cleaning');
      await patchTask(task, { photo_urls: [...task.photo_urls, uploadedUrl] });
    };
    reader.readAsDataURL(file);
  };

  const visibleTasks =
    filterStatus === 'ALL' ? tasks : tasks.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cleaning & Turnover Operations"
        description="Room-by-room checklists, photo evidence, and supervisor review gates. Submitting a clean never auto-marks a unit Ready."
        actions={
          canManage && (
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} disabled={properties.length === 0}>
              <Plus className="w-4 h-4" /> Create Cleaning Task
            </Button>
          )
        }
      />

      {properties.length === 0 && (
        <Card className="p-6 text-center text-xs text-slate-600 bg-slate-50/70">
          Add a property under <strong>Properties</strong> first to schedule turnover cleanings and checklists.
        </Card>
      )}

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {['ALL', 'Pending', 'Assigned', 'In Progress', 'Submitted for Review', 'Completed', 'Rejected', 'Overdue'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              filterStatus === st
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? `All (${tasks.length})` : st}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* Task List */}
        <div className="lg:col-span-6 space-y-3">
          {visibleTasks.map((t) => {
            const doneCount = t.checklist.filter((c) => c.done).length;
            const active = selectedTask?.id === t.id;
            return (
              <Card
                key={t.id}
                className={`p-4 cursor-pointer transition-colors ${
                  active ? 'border-slate-900 ring-1 ring-slate-900' : 'hover:border-slate-300'
                }`}
              >
                <div onClick={() => { setSelectedTask(t); setReviewNotes(t.review_notes || ''); }} className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t.property_name} · Assigned: <strong className="text-slate-700">{t.assigned_name}</strong>
                      </div>
                    </div>
                    <Badge variant={statusToBadgeVariant(t.status)}>{t.status}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5" /> Due: {t.due_date.replace('T', ' ')}
                    </span>
                    <span className="font-mono tabular-nums">
                      Checklist {doneCount}/{t.checklist.length} · {t.photo_urls.length} photos
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Property Readiness:</span>
                    <Badge variant={statusToBadgeVariant(t.readiness_status || 'Not Ready')}>
                      {t.readiness_status || 'Not Ready'}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Selected Task Workspace */}
        <div className="lg:col-span-6">
          {!selectedTask ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              Select a turnover task on the left to inspect its room-by-room checklist, upload photo evidence, or complete supervisor review.
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">{selectedTask.title}</h2>
                    <Badge variant={statusToBadgeVariant(selectedTask.status)}>{selectedTask.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedTask.property_name} · Assignee: {selectedTask.assigned_name}
                  </p>
                </div>
                <Badge variant={statusToBadgeVariant(selectedTask.readiness_status || 'Not Ready')}>
                  Unit: {selectedTask.readiness_status || 'Not Ready'}
                </Badge>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{selectedTask.readiness_reason}</span>
              </div>

              {/* Room-by-Room Interactive Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-900">Room-by-Room Turnover Checklist</div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {selectedTask.checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(selectedTask, item.id)}
                      className="w-full p-2.5 flex items-start gap-2.5 text-left hover:bg-slate-50"
                    >
                      {item.done ? (
                        <CheckSquare className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1.5">
                          {item.area}
                        </span>
                        <span className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Before & After Photo Evidence</span>
                  <label className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(selectedTask, e)} />
                  </label>
                </div>
                {selectedTask.photo_urls.length === 0 ? (
                  <div className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-md p-4 text-center">
                    No turnover photos uploaded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTask.photo_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`${selectedTask.property_name} turnover cleaning photo ${idx + 1}`}
                        loading="lazy"
                        className="h-20 w-full object-cover rounded border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Workflow Actions */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedTask.status !== 'In Progress' && selectedTask.status !== 'Completed' && (
                    <Button size="sm" variant="outline" onClick={() => patchTask(selectedTask, { status: 'In Progress' })}>
                      Start Cleaning
                    </Button>
                  )}
                  {selectedTask.status !== 'Submitted for Review' && selectedTask.status !== 'Completed' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => patchTask(selectedTask, { status: 'Submitted for Review' })}
                    >
                      Submit for Supervisor Review
                    </Button>
                  )}
                </div>

                {canManage && selectedTask.status === 'Submitted for Review' && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2.5">
                    <div className="text-xs font-semibold text-amber-900">Supervisor Quality Gate</div>
                    <TextArea
                      placeholder="Optional inspection or approval notes..."
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          patchTask(selectedTask, {
                            status: 'Completed',
                            review_notes: reviewNotes || 'Approved by supervisor.',
                          })
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Cleaning
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          patchTask(selectedTask, {
                            status: 'Rejected',
                            review_notes: reviewNotes || 'Requires touch-up before guest arrival.',
                          })
                        }
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject & Re-Clean
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Cleaning Task">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <Select label="Property" value={newPropId} onChange={(e) => setNewPropId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input label="Task Title" required placeholder="e.g., Pre-Arrival Deep Clean" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Assign Staff" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}>
              <option value="Sofia Alvarez">Sofia Alvarez (Cleaning Staff)</option>
              {members
                .filter((m) => m.name !== 'Sofia Alvarez')
                .map((m) => (
                  <option key={m.membership_id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
            </Select>
            <Input label="Scheduled Deadline" type="datetime-local" required value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          </div>
          <TextArea label="Turnover Notes" rows={2} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Assign Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
