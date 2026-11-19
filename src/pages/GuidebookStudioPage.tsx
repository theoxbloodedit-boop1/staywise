import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Building2,
  QrCode,
  Printer,
  Copy,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Badge, Button, Card, Input, Modal, PageHeader, Select, TextArea } from '../components/ui';
import { MobileGuidePreview } from '../components/MobileGuidePreview';
import { QRModal } from '../components/QRModal';
import type { Guidebook, GuidebookSection, Property } from '../lib/types';

export function GuidebookStudioPage({
  orgId,
  initialPropertyId,
  onNavigateProperties,
}: {
  orgId: string;
  initialPropertyId?: string | null;
  onNavigateProperties?: () => void;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string>(initialPropertyId || '');
  const [property, setProperty] = useState<Property | null>(null);
  const [guidebook, setGuidebook] = useState<Guidebook | null>(null);
  const [sections, setSections] = useState<GuidebookSection[]>([]);
  const [activeKey, setActiveKey] = useState<string>('welcome');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupTargetId, setDupTargetId] = useState('');

  const loadWorkspaceProperties = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await apiFetch<Property[]>('/api/properties');
      setProperties(list);
      const nextId =
        initialPropertyId && list.some((p) => p.id === initialPropertyId)
          ? initialPropertyId
          : list[0]?.id || '';
      setSelectedPropId(nextId);
      if (!nextId) {
        setProperty(null);
        setGuidebook(null);
        setSections([]);
        setLoading(false);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load workspace properties.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceProperties();
  }, [orgId, initialPropertyId]);

  const loadGuidebook = async (propId: string) => {
    if (!propId) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch(`/api/guidebooks/${propId}`);
      setProperty(res.property);
      setGuidebook(res.guidebook);
      setSections(res.sections);
      if (!res.sections.some((s: GuidebookSection) => s.section_key === activeKey)) {
        setActiveKey(res.sections[0]?.section_key || 'welcome');
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load Welcome Book studio for this property.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPropId) loadGuidebook(selectedPropId);
  }, [selectedPropId]);

  const activeSection = sections.find((s) => s.section_key === activeKey) || sections[0];

  const notifySaved = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const updateLocalSectionContent = (field: string, value: any) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_key === activeKey ? { ...s, content: { ...s.content, [field]: value } } : s
      )
    );
  };

  const handleSaveSection = async () => {
    if (!property || !activeSection) return;
    setSaving(true);
    try {
      await apiFetch(`/api/guidebooks/${property.id}/sections/${activeSection.section_key}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: activeSection.title,
          is_visible: activeSection.is_visible,
          content: activeSection.content,
        }),
      });
      notifySaved(`Saved "${activeSection.title}"`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async (patch: Partial<Guidebook>) => {
    if (!property || !guidebook) return;
    const next = { ...guidebook, ...patch };
    setGuidebook(next);
    await apiFetch(`/api/guidebooks/${property.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    notifySaved('Updated Welcome Book appearance');
  };

  const handleToggleVisible = async (sec: GuidebookSection) => {
    if (!property) return;
    const nextVis = !sec.is_visible;
    setSections((prev) =>
      prev.map((s) => (s.section_key === sec.section_key ? { ...s, is_visible: nextVis } : s))
    );
    await apiFetch(`/api/guidebooks/${property.id}/sections/${sec.section_key}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_visible: nextVis }),
    });
    notifySaved(`${sec.title} ${nextVis ? 'visible' : 'hidden'} in Guest Portal`);
  };

  const handleMoveSection = async (index: number, delta: -1 | 1) => {
    if (!property || !guidebook) return;
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= sections.length) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIdx, 0, moved);
    setSections(reordered);
    const orderKeys = reordered.map((s) => s.section_key);
    await handleSaveBranding({ section_order: orderKeys });
  };

  const handleDuplicate = async () => {
    if (!property || !dupTargetId) return;
    await apiFetch(`/api/guidebooks/${property.id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ targetPropertyId: dupTargetId }),
    });
    setDupOpen(false);
    notifySaved('Template duplicated cleanly (credentials preserved)');
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Digital Welcome Book Studio"
          description="No-code structured guidebook editor covering all 8 stay sections with live mobile preview, QR access, and PDF export."
        />
        <Card className="p-8 text-sm text-slate-500">Loading Welcome Book Studio...</Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Digital Welcome Book Studio"
          description="No-code structured guidebook editor covering all 8 stay sections with live mobile preview, QR access, and PDF export."
        />
        <Card className="p-8 text-center space-y-3 border-red-200 bg-red-50/40">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-900">Unable to load Welcome Book Studio</div>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{loadError}</p>
          <Button size="sm" variant="primary" onClick={loadWorkspaceProperties}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (properties.length === 0 || !property || !guidebook) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Digital Welcome Book Studio"
          description="No-code structured guidebook editor covering all 8 stay sections with live mobile preview, QR access, and PDF export."
          actions={
            onNavigateProperties && (
              <Button size="sm" variant="primary" onClick={onNavigateProperties}>
                <Plus className="w-4 h-4" /> Add Your First Property
              </Button>
            )
          }
        />
        <Card className="p-10 text-center space-y-3 max-w-xl mx-auto">
          <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No properties in this workspace yet</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            Add your first rental unit in Properties. Staywise automatically provisions a ready-to-edit 8-section
            mobile Welcome Book, QR link, printable PDF, and AES-256-GCM lock &amp; Wi-Fi vault for every property.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {onNavigateProperties && (
              <Button size="sm" variant="primary" onClick={onNavigateProperties}>
                <Building2 className="w-4 h-4" /> Go to Properties &amp; Add Unit
              </Button>
            )}
            <a
              href="/guest/barton-creek-modern?code=STAY-4821"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="w-3.5 h-3.5 text-teal-700" /> View Example Welcome Book
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Digital Welcome Book Studio"
        description="No-code structured guidebook editor covering all 8 stay sections with live mobile preview, QR access, and PDF export."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" /> {savedNotice}
              </span>
            )}
            <select
              value={selectedPropId}
              onChange={(e) => setSelectedPropId(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-900"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.country})
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => setDupOpen(true)} disabled={properties.length < 2}>
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>
              <QrCode className="w-3.5 h-3.5" /> QR Code
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`/print/${property.id}`, '_blank')}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <a
              href={`/guest/${property.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Live Guest URL
            </a>
          </div>
        }
      />

      <div className="grid xl:grid-cols-12 gap-5 items-start">
        {/* Left column: Branding + Section List */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-900">Brand & Cover Style</div>
            <Input
              label="Guidebook Title"
              value={guidebook.brand_name}
              onChange={(e) => setGuidebook({ ...guidebook, brand_name: e.target.value })}
              onBlur={() => handleSaveBranding({ brand_name: guidebook.brand_name })}
            />
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Brand Accent Color</span>
              <div className="flex items-center gap-2">
                {['#0F766E', '#0F172A', '#B45309', '#1E3A8A', '#0E7490'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSaveBranding({ accent_color: c })}
                    className={`w-6 h-6 rounded-full border-2 ${
                      guidebook.accent_color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Select
              label="Typography Style"
              value={guidebook.typography_style || 'Modern Sans'}
              onChange={(e) => handleSaveBranding({ typography_style: e.target.value })}
            >
              <option value="Modern Sans">Modern Sans (Clean SaaS)</option>
              <option value="Editorial Serif">Editorial Serif (Boutique)</option>
              <option value="Classic Hospitality">Classic Hospitality (Warm)</option>
            </Select>
            <Select
              label="Cover Photography"
              value={guidebook.cover_image}
              onChange={(e) => handleSaveBranding({ cover_image: e.target.value })}
            >
              <option value="/images/barton-creek.jpg">Mid-Century Living Pavilion</option>
              <option value="/images/vista-chino.jpg">Desert Courtyard & Pool</option>
              <option value="/images/tallebudgera.webp">Coastal Timber House</option>
              <option value="/images/timberline-ridge.jpg">Alpine Cedar Cabin</option>
              <option value="/images/timberline-interior.jpg">Timber Great Room</option>
              <option value="/images/newport-harbor.webp">Harbor Shingle Architecture</option>
            </Select>
          </Card>

          <Card className="p-3 space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              8 Guidebook Sections (Order & Visibility)
            </div>
            {sections.map((sec, idx) => {
              const selected = activeKey === sec.section_key;
              return (
                <div
                  key={sec.section_key}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-md text-xs ${
                    selected ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <button
                    onClick={() => setActiveKey(sec.section_key)}
                    className="flex-1 text-left font-medium truncate"
                  >
                    {idx + 1}. {sec.title}
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMoveSection(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 opacity-70 hover:opacity-100 disabled:opacity-25"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveSection(idx, 1)}
                      disabled={idx === sections.length - 1}
                      className="p-1 opacity-70 hover:opacity-100 disabled:opacity-25"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleToggleVisible(sec)}
                      className="p-1 opacity-75 hover:opacity-100"
                      title={sec.is_visible ? 'Hide from guests' : 'Show to guests'}
                    >
                      {sec.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Center column: Structured Editor for Active Section */}
        <div className="xl:col-span-5">
          {activeSection && (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{activeSection.title}</h2>
                  <div className="text-xs text-slate-500">
                    Section key: <code className="font-mono">{activeSection.section_key}</code>
                  </div>
                </div>
                <Button size="sm" variant="primary" onClick={handleSaveSection} disabled={saving}>
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Section'}
                </Button>
              </div>

              {activeSection.section_key === 'welcome' && (
                <div className="space-y-3">
                  <TextArea label="Welcome Message" rows={2} value={activeSection.content.welcomeMessage || ''} onChange={(e) => updateLocalSectionContent('welcomeMessage', e.target.value)} />
                  <TextArea label="Property Introduction" rows={2} value={activeSection.content.propertyIntro || ''} onChange={(e) => updateLocalSectionContent('propertyIntro', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Host / Concierge Name" value={activeSection.content.hostName || ''} onChange={(e) => updateLocalSectionContent('hostName', e.target.value)} />
                    <Input label="Host Phone" value={activeSection.content.hostPhone || ''} onChange={(e) => updateLocalSectionContent('hostPhone', e.target.value)} />
                  </div>
                  <Input label="Host Email" value={activeSection.content.hostEmail || ''} onChange={(e) => updateLocalSectionContent('hostEmail', e.target.value)} />
                  <TextArea label="Property Announcements" rows={2} value={activeSection.content.announcements || ''} onChange={(e) => updateLocalSectionContent('announcements', e.target.value)} />
                  <TextArea label="Important Notes (Used by Guide Search)" rows={3} value={activeSection.content.importantNotes || ''} onChange={(e) => updateLocalSectionContent('importantNotes', e.target.value)} />
                </div>
              )}

              {activeSection.section_key === 'checkin' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Restrict Smart Lock & Lockbox codes until guest verifies stay code</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(activeSection.content.accessRestricted)}
                      onChange={(e) => updateLocalSectionContent('accessRestricted', e.target.checked)}
                      className="h-4 w-4 accent-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Check-In Time" value={activeSection.content.checkInTime || ''} onChange={(e) => updateLocalSectionContent('checkInTime', e.target.value)} />
                    <Input label="Smart Lock Stay PIN (Protected)" value={activeSection.content.smartLockCode || ''} onChange={(e) => updateLocalSectionContent('smartLockCode', e.target.value)} />
                  </div>
                  <Input label="Full Property Address" value={activeSection.content.fullAddress || ''} onChange={(e) => updateLocalSectionContent('fullAddress', e.target.value)} />
                  <TextArea label="Parking Instructions" rows={2} value={activeSection.content.parkingInstructions || ''} onChange={(e) => updateLocalSectionContent('parkingInstructions', e.target.value)} />
                  <TextArea label="Smart-Lock / Keyless Entry Instructions" rows={2} value={activeSection.content.smartLockInstructions || ''} onChange={(e) => updateLocalSectionContent('smartLockInstructions', e.target.value)} />
                  <TextArea label="Backup Lockbox Instructions (Protected)" rows={2} value={activeSection.content.lockboxInstructions || ''} onChange={(e) => updateLocalSectionContent('lockboxInstructions', e.target.value)} />
                  <TextArea
                    label="Step-by-Step Arrival Steps (one step per line)"
                    rows={4}
                    value={(activeSection.content.entrySteps || []).join('\n')}
                    onChange={(e) =>
                      updateLocalSectionContent(
                        'entrySteps',
                        e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                  <TextArea label="Access Troubleshooting" rows={2} value={activeSection.content.accessTroubleshooting || ''} onChange={(e) => updateLocalSectionContent('accessTroubleshooting', e.target.value)} />
                </div>
              )}

              {activeSection.section_key === 'rules' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Quiet Hours" value={activeSection.content.quietHours || ''} onChange={(e) => updateLocalSectionContent('quietHours', e.target.value)} />
                    <Input label="Smoking Policy" value={activeSection.content.smokingPolicy || ''} onChange={(e) => updateLocalSectionContent('smokingPolicy', e.target.value)} />
                  </div>
                  <Input label="Pet Policy" value={activeSection.content.petPolicy || ''} onChange={(e) => updateLocalSectionContent('petPolicy', e.target.value)} />
                  <Input label="Party & Events Policy" value={activeSection.content.partyPolicy || ''} onChange={(e) => updateLocalSectionContent('partyPolicy', e.target.value)} />
                  <Input label="Visitor & Occupancy Policy" value={activeSection.content.visitorPolicy || ''} onChange={(e) => updateLocalSectionContent('visitorPolicy', e.target.value)} />
                  <Input label="Waste Disposal Rules" value={activeSection.content.wasteDisposal || ''} onChange={(e) => updateLocalSectionContent('wasteDisposal', e.target.value)} />
                  <Input label="Pool / Patio Policy" value={activeSection.content.poolPolicy || ''} onChange={(e) => updateLocalSectionContent('poolPolicy', e.target.value)} />
                  <label className="flex items-center gap-2 text-xs text-slate-700 pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(activeSection.content.requireAcknowledgment)}
                      onChange={(e) => updateLocalSectionContent('requireAcknowledgment', e.target.checked)}
                    />
                    Require guest acknowledgment checkbox inside Guest Portal
                  </label>
                </div>
              )}

              {activeSection.section_key === 'wifi_home' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Wi-Fi Network (SSID)" value={activeSection.content.wifiNetwork || ''} onChange={(e) => updateLocalSectionContent('wifiNetwork', e.target.value)} />
                    <Input label="Wi-Fi Password" value={activeSection.content.wifiPassword || ''} onChange={(e) => updateLocalSectionContent('wifiPassword', e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(activeSection.content.restrictWifiUntilVerified)}
                      onChange={(e) => updateLocalSectionContent('restrictWifiUntilVerified', e.target.checked)}
                    />
                    Hide Wi-Fi password until guest verifies booking code
                  </label>
                  <TextArea label={`Air Conditioning (${property.country === 'AU' ? '°C' : '°F'})`} rows={2} value={activeSection.content.acInstructions || ''} onChange={(e) => updateLocalSectionContent('acInstructions', e.target.value)} />
                  <TextArea label="Heating" rows={2} value={activeSection.content.heatingInstructions || ''} onChange={(e) => updateLocalSectionContent('heatingInstructions', e.target.value)} />
                  <TextArea label="TV & Streaming Services" rows={2} value={activeSection.content.tvStreaming || ''} onChange={(e) => updateLocalSectionContent('tvStreaming', e.target.value)} />
                  <TextArea label="Kitchen Appliances & Coffee" rows={2} value={activeSection.content.kitchenAppliances || ''} onChange={(e) => updateLocalSectionContent('kitchenAppliances', e.target.value)} />
                  <TextArea label="Laundry (Washer / Dryer)" rows={2} value={activeSection.content.washerDryer || ''} onChange={(e) => updateLocalSectionContent('washerDryer', e.target.value)} />
                  <TextArea label="Pool, Spa & Smart Home" rows={2} value={activeSection.content.poolSpa || ''} onChange={(e) => updateLocalSectionContent('poolSpa', e.target.value)} />
                </div>
              )}

              {activeSection.section_key === 'local_picks' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Curated restaurants, cafes, groceries & attractions</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const next = [
                          ...(activeSection.content.items || []),
                          {
                            id: `lp-${Date.now()}`,
                            name: 'New Local Recommendation',
                            category: 'Restaurants',
                            description: 'Local favorite within 10 minutes.',
                            address: property.city,
                            website: 'https://example.com',
                            mapLink: `https://maps.google.com/?q=${encodeURIComponent(property.city)}`,
                            phone: '',
                            isOwnerPick: true,
                          },
                        ];
                        updateLocalSectionContent('items', next);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Place
                    </Button>
                  </div>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {(activeSection.content.items || []).map((item: any, i: number) => (
                      <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={item.name}
                            onChange={(e) => {
                              const next = [...activeSection.content.items];
                              next[i] = { ...item, name: e.target.value };
                              updateLocalSectionContent('items', next);
                            }}
                            className="flex-1 h-8 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const next = [...activeSection.content.items];
                              next[i] = { ...item, category: e.target.value };
                              updateLocalSectionContent('items', next);
                            }}
                            className="h-8 px-2 text-xs bg-white border border-slate-200 rounded"
                          >
                            {['Restaurants', 'Cafes', 'Supermarkets', 'Pharmacies', 'Hospitals', 'Beaches', 'Attractions'].map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const next = activeSection.content.items.filter((_: any, idx: number) => idx !== i);
                              updateLocalSectionContent('items', next);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          value={item.description}
                          onChange={(e) => {
                            const next = [...activeSection.content.items];
                            next[i] = { ...item, description: e.target.value };
                            updateLocalSectionContent('items', next);
                          }}
                          placeholder="Short recommendation description"
                          className="w-full h-8 px-2.5 text-xs bg-white border border-slate-200 rounded"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <input
                            value={item.address}
                            onChange={(e) => {
                              const next = [...activeSection.content.items];
                              next[i] = { ...item, address: e.target.value };
                              updateLocalSectionContent('items', next);
                            }}
                            placeholder="Street address"
                            className="w-2/3 h-7 px-2 text-[11px] bg-white border border-slate-200 rounded"
                          />
                          <label className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={Boolean(item.isOwnerPick)}
                              onChange={(e) => {
                                const next = [...activeSection.content.items];
                                next[i] = { ...item, isOwnerPick: e.target.checked };
                                updateLocalSectionContent('items', next);
                              }}
                            />
                            Host Pick
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection.section_key === 'emergency' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-md bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-900">
                    <span>Jurisdiction Emergency Number ({property.country})</span>
                    <Badge variant="danger">{activeSection.content.primaryNumber}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Manager 24/7 Phone" value={activeSection.content.managerEmergencyPhone || ''} onChange={(e) => updateLocalSectionContent('managerEmergencyPhone', e.target.value)} />
                    <Input label="Nearest Hospital" value={activeSection.content.nearestHospital || ''} onChange={(e) => updateLocalSectionContent('nearestHospital', e.target.value)} />
                  </div>
                  <TextArea label="Fire Evacuation Instructions" rows={2} value={activeSection.content.fireProcedure || ''} onChange={(e) => updateLocalSectionContent('fireProcedure', e.target.value)} />
                  <TextArea label="Water Shutoff Procedure" rows={2} value={activeSection.content.waterShutoffProcedure || ''} onChange={(e) => updateLocalSectionContent('waterShutoffProcedure', e.target.value)} />
                  <TextArea label="Electrical & Breaker Panel Procedure" rows={2} value={activeSection.content.electricalProcedure || ''} onChange={(e) => updateLocalSectionContent('electricalProcedure', e.target.value)} />
                  <TextArea label="Lockout Procedure" rows={2} value={activeSection.content.lockoutProcedure || ''} onChange={(e) => updateLocalSectionContent('lockoutProcedure', e.target.value)} />
                </div>
              )}

              {activeSection.section_key === 'getting_around' && (
                <div className="space-y-3">
                  <TextArea label="Airport Directions" rows={2} value={activeSection.content.airportDirections || ''} onChange={(e) => updateLocalSectionContent('airportDirections', e.target.value)} />
                  <TextArea label="Public Transportation & Stations" rows={2} value={activeSection.content.publicTransit || ''} onChange={(e) => updateLocalSectionContent('publicTransit', e.target.value)} />
                  <Input label="Taxi & Rideshare Pickup" value={activeSection.content.taxiRideshare || ''} onChange={(e) => updateLocalSectionContent('taxiRideshare', e.target.value)} />
                  <Input label="Parking & EV Charging" value={activeSection.content.parkingDetails || ''} onChange={(e) => updateLocalSectionContent('parkingDetails', e.target.value)} />
                  <TextArea label="Driving Notes" rows={2} value={activeSection.content.drivingNotes || ''} onChange={(e) => updateLocalSectionContent('drivingNotes', e.target.value)} />
                </div>
              )}

              {activeSection.section_key === 'checkout' && (
                <div className="space-y-3">
                  <Input label="Check-Out Time" value={activeSection.content.checkOutTime || ''} onChange={(e) => updateLocalSectionContent('checkOutTime', e.target.value)} />
                  <TextArea label="Key Return / Smart Lock" rows={2} value={activeSection.content.keyReturn || ''} onChange={(e) => updateLocalSectionContent('keyReturn', e.target.value)} />
                  <TextArea label="Trash & Recycling Instructions" rows={2} value={activeSection.content.wasteInstructions || ''} onChange={(e) => updateLocalSectionContent('wasteInstructions', e.target.value)} />
                  <Input label="Dishwasher Instructions" value={activeSection.content.dishwasherInstructions || ''} onChange={(e) => updateLocalSectionContent('dishwasherInstructions', e.target.value)} />
                  <Input label="Towels & Laundry Instructions" value={activeSection.content.laundryInstructions || ''} onChange={(e) => updateLocalSectionContent('laundryInstructions', e.target.value)} />
                  <Input label="Lights & Thermostat Closing" value={activeSection.content.lightsEquipment || ''} onChange={(e) => updateLocalSectionContent('lightsEquipment', e.target.value)} />
                  <TextArea
                    label="Closing Checklist (one item per line)"
                    rows={4}
                    value={(activeSection.content.closingChecklist || []).join('\n')}
                    onChange={(e) =>
                      updateLocalSectionContent(
                        'closingChecklist',
                        e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                  <TextArea label="Forgotten Belongings Reminder" rows={2} value={activeSection.content.forgottenItemsNote || ''} onChange={(e) => updateLocalSectionContent('forgottenItemsNote', e.target.value)} />
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right column: Live Mobile Preview */}
        <div className="xl:col-span-4 space-y-2">
          <div className="text-center text-xs font-medium text-slate-500">
            Live Mobile Guest Preview (No App Required)
          </div>
          <MobileGuidePreview property={property} guidebook={guidebook} sections={sections} />
        </div>
      </div>

      <QRModal open={qrOpen} onClose={() => setQrOpen(false)} property={property} />

      <Modal
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        title="Duplicate Welcome Book Template"
        subtitle={`Copy section layouts, policies, and local template structure from "${property.name}" while preserving target lock PINs & Wi-Fi credentials.`}
      >
        <div className="space-y-4">
          <Select label="Target Property" value={dupTargetId} onChange={(e) => setDupTargetId(e.target.value)}>
            <option value="">Select target property...</option>
            {properties
              .filter((p) => p.id !== property.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDupOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!dupTargetId} onClick={handleDuplicate}>
              Duplicate Welcome Book
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
