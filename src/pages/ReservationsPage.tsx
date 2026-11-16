import React, { useEffect, useState } from 'react';
import { Plus, ExternalLink, KeyRound, Copy, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateByCountry } from '../lib/format';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import type { Property, Reservation } from '../lib/types';

export function ReservationsPage({ orgId }: { orgId: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [checkInDate, setCheckInDate] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [autoTurnover, setAutoTurnover] = useState(true);

  const load = async () => {
    const [resList, propList] = await Promise.all([
      apiFetch<Reservation[]>('/api/reservations'),
      apiFetch<Property[]>('/api/properties'),
    ]);
    setReservations(resList);
    setProperties(propList);
    if (!propertyId && propList[0]) setPropertyId(propList[0].id);
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        property_id: propertyId,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        guest_count: Number(guestCount),
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        special_instructions: specialInstructions,
        create_turnover_task: autoTurnover,
      }),
    });
    setModalOpen(false);
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setSpecialInstructions('');
    await load();
  };

  const handleStatusUpdate = async (res: Reservation, patch: Partial<Reservation>) => {
    await apiFetch(`/api/reservations/${res.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await load();
  };

  const copyGuestPass = (r: Reservation) => {
    const url = `${window.location.origin}/guest/${r.property_slug}?code=${r.access_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reservations & Stay Access"
        description="Associate guest stays, generate stay-gated access links, and link automated turnover cleaning tasks."
        actions={
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)} disabled={properties.length === 0}>
            <Plus className="w-4 h-4" /> New Manual Reservation
          </Button>
        }
      />

      {properties.length === 0 && (
        <Card className="p-6 text-center text-xs text-slate-600 bg-slate-50/70">
          Add at least one property under <strong>Properties</strong> first before issuing guest stay access codes.
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Guest & Stay</th>
                <th className="py-2.5 px-4">Property</th>
                <th className="py-2.5 px-4">Local Dates</th>
                <th className="py-2.5 px-4">Access Code</th>
                <th className="py-2.5 px-4">Check-In / Out</th>
                <th className="py-2.5 px-4">Rules Ack</th>
                <th className="py-2.5 px-4 text-right">Guest Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{r.guest_name}</div>
                    <div className="text-xs text-slate-500">
                      {r.guest_count} guests · {r.guest_email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{r.property_name}</div>
                    <div className="text-[11px] text-slate-400">{r.property_country || 'US'} format</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700">
                    {formatDateByCountry(r.check_in_date, r.property_country)} →{' '}
                    {formatDateByCountry(r.check_out_date, r.property_country)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs font-semibold text-slate-900">
                      <KeyRound className="w-3 h-3 text-teal-700" />
                      {r.access_code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={r.check_in_status}
                        onChange={(e) => handleStatusUpdate(r, { check_in_status: e.target.value })}
                        className="h-7 px-2 text-xs bg-white border border-slate-200 rounded"
                      >
                        <option>Pending</option>
                        <option>Arriving Today</option>
                        <option>Checked In</option>
                      </select>
                      <Badge variant={statusToBadgeVariant(r.check_out_status)}>{r.check_out_status}</Badge>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {r.house_rules_acknowledged ? (
                      <Badge variant="success">Signed</Badge>
                    ) : (
                      <Badge variant="neutral">Pending</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => copyGuestPass(r)}>
                        {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === r.id ? 'Copied' : 'Copy Link'}
                      </Button>
                      <a
                        href={`/guest/${r.property_slug}?code=${r.access_code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Manual Reservation">
        <form onSubmit={handleCreate} className="space-y-3.5">
          <Select label="Property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Guest Full Name" required value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <Input label="Guest Count" type="number" min="1" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Guest Email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            <Input label="Guest Phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Arrival Date" type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
            <Input label="Departure Date" type="date" required value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          </div>
          <TextArea label="Guest-Specific Instructions" rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={autoTurnover} onChange={(e) => setAutoTurnover(e.target.checked)} />
            Automatically create linked pre-arrival turnover cleaning task
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Reservation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
