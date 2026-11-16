import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateTimeShort } from '../lib/format';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import type { Property } from '../lib/types';

export function InspectionsPage({ orgId }: { orgId: string }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assetModal, setAssetModal] = useState(false);
  const [inspModal, setInspModal] = useState(false);

  const [assetPropId, setAssetPropId] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('Furniture');
  const [assetLocation, setAssetLocation] = useState('Living Room');
  const [assetCost, setAssetCost] = useState('500');

  const [inspPropId, setInspPropId] = useState('');
  const [inspType, setInspType] = useState<'Pre-Arrival' | 'Post-Departure'>('Pre-Arrival');
  const [inspNotes, setInspNotes] = useState('');
  const [itemStates, setItemStates] = useState<Record<string, { status: string; notes: string }>>({});

  const load = async () => {
    const [res, props] = await Promise.all([
      apiFetch('/api/inspections'),
      apiFetch<Property[]>('/api/properties'),
    ]);
    setAssets(res.assets);
    setInspections(res.inspections);
    setProperties(props);
    if (!assetPropId && props[0]) setAssetPropId(props[0].id);
    if (!inspPropId && props[0]) setInspPropId(props[0].id);
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const openInspectionRunner = (propId: string) => {
    const target = propId || properties[0]?.id || '';
    setInspPropId(target);
    const propAssets = assets.filter((a) => a.property_id === target);
    const map: Record<string, { status: string; notes: string }> = {};
    for (const a of propAssets) {
      map[a.id] = { status: 'Intact', notes: '' };
    }
    setItemStates(map);
    setInspNotes('');
    setInspModal(true);
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/inspections/assets', {
      method: 'POST',
      body: JSON.stringify({
        property_id: assetPropId,
        name: assetName,
        category: assetCategory,
        location: assetLocation,
        replacement_cost: Number(assetCost),
      }),
    });
    setAssetModal(false);
    setAssetName('');
    await load();
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    const propAssets = assets.filter((a) => a.property_id === inspPropId);
    const items = propAssets.map((a) => ({
      assetId: a.id,
      assetName: a.name,
      status: itemStates[a.id]?.status || 'Intact',
      notes: itemStates[a.id]?.notes || '',
    }));

    await apiFetch('/api/inspections', {
      method: 'POST',
      body: JSON.stringify({
        property_id: inspPropId,
        type: inspType,
        items,
        summary_notes: inspNotes,
      }),
    });
    setInspModal(false);
    await load();
  };

  const propAssetsForRunner = assets.filter((a) => a.property_id === inspPropId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory & Property Inspections"
        description="Document asset conditions and pre-arrival / post-departure discrepancies neutrally without automatically assigning legal blame."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setAssetModal(true)}>
              <Plus className="w-4 h-4" /> Register Asset
            </Button>
            <Button size="sm" variant="primary" onClick={() => openInspectionRunner(properties[0]?.id || '')}>
              <ClipboardCheck className="w-4 h-4" /> Run Inspection
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Inspection History & Readiness Impact</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {inspections.map((ins) => (
              <div key={ins.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {ins.type} Inspection — {ins.property_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      Inspector: {ins.inspector_name} · {formatDateTimeShort(ins.inspected_at)}
                    </div>
                  </div>
                  <Badge variant={statusToBadgeVariant(ins.overall_status)}>{ins.overall_status}</Badge>
                </div>
                <p className="text-xs text-slate-600">{ins.summary_notes}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ins.items.map((it: any, idx: number) => (
                    <span
                      key={idx}
                      className={`text-[11px] px-2 py-0.5 rounded border ${
                        it.status === 'Intact'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {it.assetName}: {it.status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Tracked Property Inventory Assets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-4">Asset</th>
                  <th className="py-2 px-4">Property</th>
                  <th className="py-2 px-4">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{a.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {a.category} · {a.location}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{a.property_name}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant={statusToBadgeVariant(a.condition_status === 'Good' ? 'Ready' : a.condition_status)}>
                        {a.condition_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={assetModal} onClose={() => setAssetModal(false)} title="Register Property Asset">
        <form onSubmit={handleAddAsset} className="space-y-3.5">
          <Select label="Property" value={assetPropId} onChange={(e) => setAssetPropId(e.target.value)}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Input label="Asset Name" required value={assetName} onChange={(e) => setAssetName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={assetCategory} onChange={(e) => setAssetCategory(e.target.value)}>
              {['Furniture', 'Appliances', 'Kitchen equipment', 'Electronics', 'Linen', 'Property assets'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Input label="Room / Location" value={assetLocation} onChange={(e) => setAssetLocation(e.target.value)} />
          </div>
          <Input label="Reference Replacement Cost" type="number" value={assetCost} onChange={(e) => setAssetCost(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setAssetModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Asset</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={inspModal}
        onClose={() => setInspModal(false)}
        title="Run Property Inspection"
        subtitle="Pre-arrival Pass unlocks property readiness if cleaning and incidents are also clear."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitInspection} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Property"
              value={inspPropId}
              onChange={(e) => {
                const pid = e.target.value;
                setInspPropId(pid);
                const map: Record<string, { status: string; notes: string }> = {};
                assets.filter((a) => a.property_id === pid).forEach((a) => {
                  map[a.id] = { status: 'Intact', notes: '' };
                });
                setItemStates(map);
              }}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Select label="Inspection Type" value={inspType} onChange={(e) => setInspType(e.target.value as any)}>
              <option value="Pre-Arrival">Pre-Arrival</option>
              <option value="Post-Departure">Post-Departure</option>
            </Select>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
            {propAssetsForRunner.length === 0 ? (
              <div className="text-xs text-slate-500">No tracked assets registered for this unit yet — inspection will record visual walkthrough.</div>
            ) : (
              propAssetsForRunner.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-none">
                  <div className="text-xs">
                    <div className="font-medium text-slate-900">{a.name}</div>
                    <div className="text-[11px] text-slate-500">{a.location}</div>
                  </div>
                  <select
                    value={itemStates[a.id]?.status || 'Intact'}
                    onChange={(e) =>
                      setItemStates((prev) => ({
                        ...prev,
                        [a.id]: { status: e.target.value, notes: prev[a.id]?.notes || '' },
                      }))
                    }
                    className="h-8 px-2 text-xs bg-white border border-slate-200 rounded"
                  >
                    <option value="Intact">Intact</option>
                    <option value="Wear Noted">Wear Noted</option>
                    <option value="Missing">Missing</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
              ))
            )}
          </div>

          <TextArea
            label="Neutral Inspection Summary"
            rows={2}
            placeholder="Document any observed condition differences objectively..."
            value={inspNotes}
            onChange={(e) => setInspNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setInspModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Submit Inspection</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
