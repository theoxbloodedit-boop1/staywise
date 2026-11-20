import React, { useEffect, useState } from 'react';
import {
  Plus,
  QrCode,
  BookOpen,
  ExternalLink,
  Archive,
  MapPin,
  BedDouble,
  Bath,
  Users,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { REGION_PRESETS } from '../lib/format';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import { QRModal } from '../components/QRModal';
import type { Organization, Property, RegionCode } from '../lib/types';

export function PropertiesPage({
  org,
  onOpenGuidebook,
  onNavigateSettings,
}: {
  org: Organization | null;
  onOpenGuidebook: (propertyId: string) => void;
  onNavigateSettings: () => void;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [qrProp, setQrProp] = useState<Property | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState<RegionCode>('US');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('2');
  const [maxOccupancy, setMaxOccupancy] = useState('6');
  const [description, setDescription] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await apiFetch<Property[]>('/api/properties');
      setProperties(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [org?.id]);

  const openCreate = () => {
    setEditing(null);
    setError('');
    setName('');
    setAddressLine('');
    setCity('');
    setStateCode('');
    setPostalCode('');
    setCountry(org?.default_country || 'US');
    setBedrooms('3');
    setBathrooms('2');
    setMaxOccupancy('6');
    setDescription('');
    setParkingInfo('');
    setInternalNotes('');
    setModalOpen(true);
  };

  const openEdit = (p: Property) => {
    setEditing(p);
    setError('');
    setName(p.name);
    setAddressLine(p.address_line);
    setCity(p.city);
    setStateCode(p.state);
    setPostalCode(p.postal_code);
    setCountry(p.country);
    setBedrooms(String(p.bedrooms));
    setBathrooms(String(p.bathrooms));
    setMaxOccupancy(String(p.max_occupancy));
    setDescription(p.description);
    setParkingInfo(p.parking_info);
    setInternalNotes(p.internal_notes);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name,
        address_line: addressLine,
        city,
        state: stateCode,
        postal_code: postalCode,
        country,
        currency: country === 'AU' ? 'AUD' : 'USD',
        temp_unit: country === 'AU' ? 'C' : 'F',
        timezone: country === 'AU' ? 'Australia/Brisbane' : 'America/Chicago',
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        max_occupancy: Number(maxOccupancy),
        description,
        parking_info: parkingInfo,
        internal_notes: internalNotes,
      };
      if (editing) {
        await apiFetch(`/api/properties/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/properties', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (prop: Property) => {
    await apiFetch(`/api/properties/${prop.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: 1 }),
    });
    await load();
  };

  const limitReached = org ? properties.length >= org.property_limit : false;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Property Portfolio"
        description="Each property maintains its own welcome book, regional formatting, access details, and readiness log."
        actions={
          <div className="flex items-center gap-2.5">
            {org && (
              <div className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 tabular-nums">
                Plan Quota: <strong className="text-slate-900">{properties.length} / {org.property_limit}</strong> ({org.plan_tier})
              </div>
            )}
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          </div>
        }
      />

      {limitReached && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Your <strong>{org?.plan_tier}</strong> plan limit ({org?.property_limit} active properties) is reached. Upgrade plan to add more properties.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={onNavigateSettings}>
            Manage Billing Plan
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 bg-slate-200/60 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {properties.map((prop) => (
            <Card key={prop.id} className="overflow-hidden flex flex-col">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-44 h-44 sm:h-auto shrink-0 bg-slate-100 relative">
                  {prop.cover_image ? <img
                    src={prop.cover_image}
                    alt={`${prop.name} short-term rental in ${prop.city}, ${prop.state}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  /> : <div className="h-full min-h-44 grid place-items-center text-xs text-slate-500">No property photo</div>}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/95 text-slate-900 shadow-xs">
                    {prop.country} · {prop.currency} · {prop.emergency_number}
                  </span>
                </div>

                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{prop.name}</h3>
                      <Badge variant={statusToBadgeVariant(prop.readiness_status)}>{prop.readiness_status}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {prop.address_line}, {prop.city}, {prop.state} {prop.postal_code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{prop.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" /> {prop.bedrooms} bd
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5 text-slate-400" /> {prop.bathrooms} ba
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Max {prop.max_occupancy}
                      </span>
                      <span className="text-slate-400">· °{prop.temp_unit}</span>
                    </div>
                    <div className="mt-2.5 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1 truncate">
                      {prop.readiness_reason}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-slate-100">
                    <Button size="sm" variant="primary" onClick={() => onOpenGuidebook(prop.id)}>
                      <BookOpen className="w-3.5 h-3.5" />
                      Welcome Book
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setQrProp(prop)}>
                      <QrCode className="w-3.5 h-3.5" />
                      QR & PDF
                    </Button>
                    <a
                      href={`/guest/${prop.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Portal
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(prop)} title="Edit Property">
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchive(prop)}
                      title="Archive Property"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add New Property'}
        subtitle="Automatically generates a Welcome Book matched to your property’s local standards."
        maxWidth="max-w-xl"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
            <span>{error}</span>
            {error.includes('Plan limit') && (
              <Button size="sm" variant="outline" onClick={() => { setModalOpen(false); onNavigateSettings(); }}>
                Upgrade Plan
              </Button>
            )}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Property Name"
              required
              placeholder="e.g., Oakwood Garden Loft"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Select
              label="Region & Standards"
              value={country}
              onChange={(e) => setCountry(e.target.value as RegionCode)}
            >
              {(Object.keys(REGION_PRESETS) as RegionCode[]).map((code) => (
                <option key={code} value={code}>
                  {REGION_PRESETS[code].label}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Street Address"
            required
            placeholder="742 Evergreen Terrace"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="City" required value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State / Region" required placeholder="TX / ON / IDF" value={stateCode} onChange={(e) => setStateCode(e.target.value)} />
            <Input label={REGION_PRESETS[country].postalLabel} required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Bedrooms" type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            <Input label="Bathrooms" type="number" step="0.5" min="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            <Input label="Max Guests" type="number" min="1" value={maxOccupancy} onChange={(e) => setMaxOccupancy(e.target.value)} />
          </div>
          <TextArea
            label="Property Description (Guest-Facing)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input label="Parking Summary" value={parkingInfo} onChange={(e) => setParkingInfo(e.target.value)} />
          <TextArea
            label="Internal Staff Notes (Never shown to Guests)"
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Property' : 'Create Property & Guidebook'}
            </Button>
          </div>
        </form>
      </Modal>

      <QRModal open={Boolean(qrProp)} onClose={() => setQrProp(null)} property={qrProp} />
    </div>
  );
}
