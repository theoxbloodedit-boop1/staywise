import React, { useEffect, useState } from 'react';
import { Bot, AlertTriangle, CheckCircle2, ShieldCheck, Send } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateTimeShort } from '../lib/format';
import { Badge, Button, Card, Input, PageHeader, statusToBadgeVariant } from '../components/ui';

export function AiConsolePage({ orgId }: { orgId: string }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const load = async () => {
    const [convos, sup] = await Promise.all([
      apiFetch('/api/admin/ai-console'),
      apiFetch('/api/admin/support-requests'),
    ]);
    setConversations(convos);
    setSupportRequests(sup);
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleResolveGap = async (id: string) => {
    const note = answers[id];
    if (!note?.trim()) return;
    await apiFetch(`/api/admin/ai-console/gaps/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ answerNote: note }),
    });
    setAnswers((prev) => ({ ...prev, [id]: '' }));
    await load();
  };

  const handleResolveSupport = async (id: string) => {
    await apiFetch(`/api/admin/support-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Resolved' }),
    });
    await load();
  };

  const gaps = conversations.filter((c) => c.knowledge_gap_flag === 1 && c.gap_resolved === 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Guest Assistant & Escalation Console"
        description="Monitor verified property-grounded answers, safeguard compliance, unanswered knowledge gaps, and human escalations."
      />

      {/* Mandatory Safeguards Banner */}
      <Card className="p-4 bg-slate-900 text-white border-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold">Mandatory AI Grounding & Safety Safeguards Active</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Zero cross-property data bleed · Restricted access codes masked until verified · Unverified gaps & emergencies auto-escalate
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-teal-300 tabular-nums">
            {conversations.length} total queries · {gaps.length} open knowledge gaps
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Knowledge Gaps Queue */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Internal Knowledge-Gap Queue ({gaps.length})
          </h2>
          {gaps.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-500">
              All property questions are currently covered by verified Welcome Book data.
            </Card>
          ) : (
            gaps.map((g) => (
              <Card key={g.id} className="p-4 space-y-2.5 border-amber-200 bg-amber-50/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{g.property_name}</span>
                  <Badge variant="warning">Knowledge Gap</Badge>
                </div>
                <div className="text-xs font-medium text-slate-800">Guest asked: “{g.guest_question}”</div>
                <div className="text-[11px] text-slate-600">AI refused to invent an answer and escalated to host team.</div>
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Publish verified fact into Welcome Book..."
                    value={answers[g.id] || ''}
                    onChange={(e) => setAnswers((p) => ({ ...p, [g.id]: e.target.value }))}
                  />
                  <Button size="sm" variant="primary" onClick={() => handleResolveGap(g.id)}>
                    <Send className="w-3.5 h-3.5" /> Publish
                  </Button>
                </div>
              </Card>
            ))
          )}

          {/* Human Support Requests */}
          <h2 className="text-sm font-semibold text-slate-900 pt-2">Guest Support Queue ({supportRequests.length})</h2>
          <div className="space-y-2.5">
            {supportRequests.map((s) => (
              <Card key={s.id} className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{s.subject}</span>
                  <Badge variant={statusToBadgeVariant(s.status)}>{s.status}</Badge>
                </div>
                <div className="text-[11px] text-slate-500">
                  {s.property_name} · {s.guest_name} · {s.category}
                </div>
                <p className="text-xs text-slate-700">{s.message}</p>
                {s.status !== 'Resolved' && (
                  <div className="pt-1">
                    <Button size="sm" variant="outline" onClick={() => handleResolveSupport(s.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mark Resolved
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Conversation Transcripts */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-teal-700" /> Recent AI Guest Conversations
          </h2>
          {conversations.map((c) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-900">
                  {c.property_name}{' '}
                  <span className="text-slate-400 font-normal">· {formatDateTimeShort(c.created_at)}</span>
                </div>
                <Badge variant={statusToBadgeVariant(c.confidence)}>{c.confidence}</Badge>
              </div>
              <div className="p-2.5 rounded bg-slate-100 text-xs text-slate-900">
                <strong>Guest:</strong> {c.guest_question}
              </div>
              <div className="p-2.5 rounded bg-teal-50/70 border border-teal-100 text-xs text-slate-800">
                <strong>STAYWISE AI:</strong> {c.ai_answer}
              </div>
              {c.verified_sources.length > 0 && (
                <div className="text-[11px] text-slate-500">
                  Verified Sources: {c.verified_sources.join(' · ')}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
