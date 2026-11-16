import React, { useEffect, useState } from 'react';
import {
  Search,
  Lock,
  Unlock,
  Wifi,
  KeyRound,
  ShieldAlert,
  Utensils,
  Phone,
  Car,
  LogOut,
  Sparkles,
  Bot,
  LifeBuoy,
  MessageSquareHeart,
  Send,
  Copy,
  Check,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Badge, Button, Card, Input, Select, TextArea, statusToBadgeVariant } from '../components/ui';
import { uploadEvidencePhoto } from '../lib/api';
import type { GuidebookSection } from '../lib/types';

export function GuestPortalPage({ slug }: { slug: string }) {
  const params = new URLSearchParams(window.location.search);
  const initialCode = params.get('code') || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [accessCode, setAccessCode] = useState(initialCode);
  const [codeInput, setCodeInput] = useState(initialCode);
  const [verifyMsg, setVerifyMsg] = useState('');

  const [tab, setTab] = useState<'guide' | 'ai' | 'support' | 'feedback'>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedWifi, setCopiedWifi] = useState(false);

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'ai'; text: string; meta?: any }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Support / Issue reporting state
  const [requests, setRequests] = useState<any[]>([]);
  const [supSubject, setSupSubject] = useState('');
  const [supCategory, setSupCategory] = useState('Plumbing');
  const [supUrgency, setSupUrgency] = useState<'Normal' | 'High' | 'Critical'>('High');
  const [supMessage, setSupMessage] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(Boolean(initialCode));
  const [supPhoto, setSupPhoto] = useState<string>('');
  const [supSuccess, setSupSuccess] = useState('');
  const [supError, setSupError] = useState('');

  // Feedback state
  const [cleanRating, setCleanRating] = useState(5);
  const [checkinRating, setCheckinRating] = useState(5);
  const [comfortRating, setComfortRating] = useState(5);
  const [maintRating, setMaintRating] = useState(5);
  const [fbComments, setFbComments] = useState('');
  const [fbFollowUp, setFbFollowUp] = useState(false);
  const [fbSent, setFbSent] = useState(false);
  const [fbError, setFbError] = useState('');

  const loadPortal = async (codeOverride?: string) => {
    setLoading(true);
    setError('');
    try {
      const activeCode = codeOverride !== undefined ? codeOverride : accessCode;
      const res = await fetch(`/api/guest/${slug}${activeCode ? `?code=${encodeURIComponent(activeCode)}` : ''}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Property Welcome Book not found.');
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async (codeOverride?: string) => {
    const activeCode = codeOverride !== undefined ? codeOverride : accessCode;
    const res = await fetch(
      `/api/guest/${slug}/requests${activeCode ? `?code=${encodeURIComponent(activeCode)}` : ''}`
    );
    if (res.ok) setRequests(await res.json());
  };

  useEffect(() => {
    loadPortal();
    loadRequests();
  }, [slug]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyMsg('');
    const res = await fetch(`/api/guest/${slug}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput }),
    });
    if (!res.ok) {
      const err = await res.json();
      setVerifyMsg(err.error || 'Invalid stay access code.');
      return;
    }
    const clean = codeInput.trim();
    setAccessCode(clean);
    setIsMaintenance(true);
    setSupError('');
    await loadPortal(clean);
    await loadRequests(clean);
  };

  const handleLockSession = async () => {
    setAccessCode('');
    setCodeInput('');
    setVerifyMsg('');
    setIsMaintenance(false);
    await loadPortal('');
    await loadRequests('');
  };

  const handleAckRules = async () => {
    await fetch(`/api/guest/${slug}/acknowledge-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: accessCode }),
    });
    await loadPortal();
  };

  const handleConfirmDeparture = async () => {
    await fetch(`/api/guest/${slug}/confirm-departure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: accessCode }),
    });
    await loadPortal();
  };

  const sendAiQuestion = async (qText?: string) => {
    const text = (qText ?? aiInput).trim();
    if (!text) return;
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    if (!qText) setAiInput('');
    setAiLoading(true);
    try {
      const res = await fetch(`/api/guest/${slug}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, code: accessCode }),
      });
      const ans = await res.json();
      setAiMessages((prev) => [...prev, { role: 'ai', text: ans.answer, meta: ans }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSupPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSupError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const uploadedUrl = await uploadEvidencePhoto(reader.result as string, 'guest-issue', {
          slug,
          code: accessCode,
        });
        setSupPhoto(uploadedUrl);
      } catch (err: any) {
        setSupPhoto('');
        setSupError(err?.message || 'Unable to upload photo. Verify your stay code first or use a smaller image (max 5 MB).');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupSuccess('');
    setSupError('');
    try {
      const res = await fetch(`/api/guest/${slug}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: accessCode,
          subject: supSubject,
          category: supCategory,
          urgency: isVerified ? supUrgency : 'Normal',
          message: supMessage,
          report_as_maintenance: isVerified ? isMaintenance : false,
          attachment_url: supPhoto || null,
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        setSupError(out.error || 'Unable to submit support request. Please check your stay details and try again.');
        return;
      }
      setSupSubject('');
      setSupMessage('');
      setSupPhoto('');
      setSupSuccess(
        out.workOrderCode
          ? `Submitted! Maintenance Work Order ${out.workOrderCode} dispatched to operations.`
          : 'Support request sent to your host team.'
      );
      await loadRequests();
    } catch {
      setSupError('Network error while submitting request. Please retry.');
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbError('');
    try {
      const res = await fetch(`/api/guest/${slug}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: accessCode,
          cleaning_rating: cleanRating,
          checkin_rating: checkinRating,
          comfort_rating: comfortRating,
          maintenance_rating: maintRating,
          comments: fbComments,
          follow_up_requested: fbFollowUp,
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        setFbError(out.error || 'Unable to record feedback right now. Please try again.');
        return;
      }
      setFbSent(true);
    } catch {
      setFbError('Network error while sending feedback. Please retry.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Loading Guest Welcome Book...</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-red-600">{error}</div>;
  }

  const { property, guidebook, isVerified, reservation, sections } = data as {
    property: any;
    guidebook: any;
    isVerified: boolean;
    reservation: any;
    sections: GuidebookSection[];
  };

  const filteredSections = searchQuery.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(s.content).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  const iconFor = (key: string) => {
    switch (key) {
      case 'welcome':
        return Sparkles;
      case 'checkin':
        return KeyRound;
      case 'rules':
        return ShieldAlert;
      case 'wifi_home':
        return Wifi;
      case 'local_picks':
        return Utensils;
      case 'emergency':
        return Phone;
      case 'getting_around':
        return Car;
      case 'checkout':
        return LogOut;
      default:
        return Sparkles;
    }
  };

  const coverSrc: string = guidebook?.cover_image || property.cover_image || '';
  const localStemMatch = coverSrc.match(/^\/images\/([a-z0-9-]+)\.(jpg|jpeg|png|webp)$/i);
  const localStem = localStemMatch ? localStemMatch[1] : null;
  const fontClass =
    guidebook?.typography_style === 'Editorial Serif'
      ? 'font-serif'
      : guidebook?.typography_style === 'Classic Hospitality'
        ? 'font-display tracking-wide'
        : 'font-sans';

  return (
    <div className={`min-h-screen bg-slate-100 pb-20 ${fontClass}`}>
      {/* Mobile-first Centered Shell */}
      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-sm border-x border-slate-200 flex flex-col">
        {/* Hero Cover */}
        <div className="relative h-52 bg-slate-900 shrink-0">
          {localStem ? (
            <picture>
              <source
                type="image/avif"
                srcSet={`/images/${localStem}-640.avif 640w, /images/${localStem}-1280.avif 1280w`}
                sizes="(max-width: 640px) 100vw, 576px"
              />
              <source
                type="image/webp"
                srcSet={`/images/${localStem}-640.webp 640w, /images/${localStem}-1280.webp 1280w`}
                sizes="(max-width: 640px) 100vw, 576px"
              />
              <img
                src={coverSrc}
                alt={`${guidebook?.brand_name || property.name} welcome book cover photo`}
                {...({ fetchpriority: 'high' } as any)}
                width={640}
                height={427}
                className="w-full h-full object-cover opacity-85"
              />
            </picture>
          ) : (
            <img
              src={coverSrc}
              alt={`${guidebook?.brand_name || property.name} welcome book cover photo`}
              {...({ fetchpriority: 'high' } as any)}
              className="w-full h-full object-cover opacity-85"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />
          <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-slate-900">
              STAYWISE Guest Portal · No App Needed
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-red-600 text-white">
              Emergency: {property.emergency_number}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h1 className="text-xl font-bold leading-tight">{guidebook?.brand_name || property.name}</h1>
            <p className="text-xs text-slate-200 mt-1">
              {property.address_line} · {property.bedrooms} bd · {property.bathrooms} ba · Up to {property.max_occupancy} guests
            </p>
          </div>
        </div>

        {/* Stay Access Verification Gate */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          {isVerified && reservation ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900">
                    Verified Stay: {reservation.guest_name} ({reservation.access_code})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Smart-lock PIN, lockbox details & Wi-Fi password unlocked
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleLockSession}>
                Lock Preview
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Smart-lock PINs, exact street address & Wi-Fi passwords are protected until booking verification.</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Enter booking code (e.g. STAY-4821)"
                  className="flex-1 h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
                <Button type="submit" size="sm" variant="primary">
                  Unlock Stay Access
                </Button>
              </div>
              {verifyMsg && <div className="text-[11px] text-red-600">{verifyMsg}</div>}
            </form>
          )}
        </div>

        {/* Main Content Switcher */}
        <div className="flex-1 p-4 space-y-4">
          {tab === 'guide' && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Wi-Fi, parking, thermostat, dining, checkout..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-4">
                {filteredSections.map((sec) => {
                  const Icon = iconFor(sec.section_key);
                  return (
                    <Card key={sec.section_key} className="p-4 space-y-2.5">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-900 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm font-semibold text-slate-900">{sec.title}</h2>
                      </div>

                      {sec.section_key === 'welcome' && (
                        <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                          <p>{sec.content.welcomeMessage}</p>
                          <p className="text-slate-600">{sec.content.propertyIntro}</p>
                          {sec.content.importantNotes && (
                            <div className="p-2.5 rounded bg-teal-50/70 border border-teal-200 text-teal-900 whitespace-pre-line">
                              {sec.content.importantNotes}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 pt-1">
                            Host: <strong>{sec.content.hostName}</strong> · {sec.content.hostPhone}
                          </div>
                        </div>
                      )}

                      {sec.section_key === 'checkin' && (
                        <div className="text-xs text-slate-700 space-y-2.5">
                          <div className="flex justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                            <span className="text-slate-500">Check-In Time</span>
                            <span className="font-semibold text-slate-900">{sec.content.checkInTime}</span>
                          </div>
                          {sec.content.smartLockCode ? (
                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                              <div>
                                <div className="text-[11px] font-medium text-emerald-800">Verified Smart-Lock PIN</div>
                                <div className="text-lg font-mono font-bold text-emerald-950 tracking-wider">
                                  {sec.content.smartLockCode}#
                                </div>
                              </div>
                              <Badge variant="success">Unlocked</Badge>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
                              <Lock className="w-4 h-4 shrink-0" />
                              <span>Smart-lock PIN & backup lockbox instructions are hidden until stay code verification.</span>
                            </div>
                          )}
                          <p><strong>Instructions:</strong> {sec.content.smartLockInstructions}</p>
                          <p><strong>Parking:</strong> {sec.content.parkingInstructions}</p>
                          <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                            {(sec.content.entrySteps || []).map((st: string, idx: number) => (
                              <li key={idx}>{st}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {sec.section_key === 'rules' && (
                        <div className="text-xs text-slate-700 space-y-2">
                          <ul className="space-y-1.5">
                            <li><strong>Quiet Hours:</strong> {sec.content.quietHours}</li>
                            <li><strong>Smoking:</strong> {sec.content.smokingPolicy}</li>
                            <li><strong>Pets:</strong> {sec.content.petPolicy}</li>
                            <li><strong>Parties:</strong> {sec.content.partyPolicy}</li>
                            <li><strong>Waste:</strong> {sec.content.wasteDisposal}</li>
                            <li><strong>Pool / Patio:</strong> {sec.content.poolPolicy}</li>
                          </ul>
                          {isVerified && reservation && sec.content.requireAcknowledgment && (
                            <div className="pt-2">
                              {reservation.house_rules_acknowledged ? (
                                <div className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-4 h-4" /> House Rules Acknowledged
                                </div>
                              ) : (
                                <Button size="sm" variant="secondary" onClick={handleAckRules}>
                                  Acknowledge House Rules
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {sec.section_key === 'wifi_home' && (
                        <div className="text-xs text-slate-700 space-y-2.5">
                          <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between gap-2">
                            <div className="font-mono">
                              <div className="text-[11px] text-slate-400">Wi-Fi Network</div>
                              <div className="font-semibold">{sec.content.wifiNetwork}</div>
                              <div className="text-[11px] text-slate-400 mt-1">Password</div>
                              <div className="text-teal-300 font-semibold">
                                {sec.content.wifiPassword || 'Locked — Verify stay code above'}
                              </div>
                            </div>
                            {sec.content.wifiPassword && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(sec.content.wifiPassword);
                                  setCopiedWifi(true);
                                  setTimeout(() => setCopiedWifi(false), 1800);
                                }}
                              >
                                {copiedWifi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedWifi ? 'Copied' : 'Copy'}
                              </Button>
                            )}
                          </div>
                          <p><strong>AC & Climate ({property.temp_unit}°):</strong> {sec.content.acInstructions}</p>
                          <p><strong>Heating:</strong> {sec.content.heatingInstructions}</p>
                          <p><strong>TV & Streaming:</strong> {sec.content.tvStreaming}</p>
                          <p><strong>Kitchen:</strong> {sec.content.kitchenAppliances}</p>
                          <p><strong>Laundry:</strong> {sec.content.washerDryer}</p>
                        </div>
                      )}

                      {sec.section_key === 'local_picks' && (
                        <div className="space-y-2">
                          {(sec.content.items || []).map((item: any) => (
                            <div key={item.id} className="p-2.5 rounded-md border border-slate-200 bg-slate-50/70">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-900">{item.name}</span>
                                <div className="flex items-center gap-1">
                                  {item.isOwnerPick && <Badge variant="brand">Host Pick</Badge>}
                                  <Badge variant="neutral">{item.category}</Badge>
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                              <div className="text-[11px] text-slate-500 mt-1">{item.address}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {sec.section_key === 'emergency' && (
                        <div className="text-xs text-slate-700 space-y-2">
                          <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-900 font-semibold flex items-center justify-between">
                            <span>Emergency Services ({property.country})</span>
                            <span className="font-mono text-base">{sec.content.primaryNumber}</span>
                          </div>
                          <p><strong>24/7 Manager Line:</strong> {sec.content.managerEmergencyPhone}</p>
                          <p><strong>Nearest Hospital:</strong> {sec.content.nearestHospital}</p>
                          <p><strong>Fire:</strong> {sec.content.fireProcedure}</p>
                          <p><strong>Water Shutoff:</strong> {sec.content.waterShutoffProcedure}</p>
                          <p><strong>Electrical:</strong> {sec.content.electricalProcedure}</p>
                        </div>
                      )}

                      {sec.section_key === 'getting_around' && (
                        <div className="text-xs text-slate-700 space-y-1.5">
                          <p><strong>Airport:</strong> {sec.content.airportDirections}</p>
                          <p><strong>Public Transit:</strong> {sec.content.publicTransit}</p>
                          <p><strong>Rideshare & Taxis:</strong> {sec.content.taxiRideshare}</p>
                          <p><strong>Driving Notes:</strong> {sec.content.drivingNotes}</p>
                        </div>
                      )}

                      {sec.section_key === 'checkout' && (
                        <div className="text-xs text-slate-700 space-y-2">
                          <div className="flex justify-between p-2 rounded bg-slate-50 border border-slate-200 font-medium">
                            <span>Check-Out Time</span>
                            <span>{sec.content.checkOutTime}</span>
                          </div>
                          <p>{sec.content.keyReturn}</p>
                          <p><strong>Trash:</strong> {sec.content.wasteInstructions}</p>
                          <p><strong>Dishwasher & Towels:</strong> {sec.content.dishwasherInstructions} {sec.content.laundryInstructions}</p>
                          {isVerified && reservation && sec.content.departureConfirmEnabled && (
                            <div className="pt-1">
                              {reservation.check_out_status === 'Departed' ? (
                                <Badge variant="success">Departure Confirmed — Safe Travels!</Badge>
                              ) : (
                                <Button size="sm" variant="primary" onClick={handleConfirmDeparture}>
                                  Confirm Early / On-Time Departure
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'ai' && (
            <div className="space-y-4">
              <Card className="p-4 bg-slate-900 text-white border-slate-900">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Bot className="w-4 h-4 text-teal-400" />
                  {property.name} · Property Assistant
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Answers directly from your host’s house guide and lets the team know right away if something needs attention.
                </p>
              </Card>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'What is the Wi-Fi password?',
                  'What is the smart lock code?',
                  'Where do we park?',
                  'There is a water leak under the sink!',
                  'Is there a baby crib available?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendAiQuestion(q)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="space-y-3 min-h-[240px]">
                {aiMessages.length === 0 && (
                  <div className="text-center py-10 text-xs text-slate-400">
                    Ask any question about check-in, Wi-Fi, appliances, local food, or emergencies.
                  </div>
                )}
                {aiMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] rounded-lg p-3 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : m.meta?.emergencyAlert
                            ? 'bg-red-50 border border-red-200 text-red-900'
                            : 'bg-slate-50 border border-slate-200 text-slate-800'
                      }`}
                    >
                      {m.meta?.emergencyAlert && (
                        <div className="font-bold text-red-700 flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Urgent Escalation Protocol
                        </div>
                      )}
                      <div>{m.text}</div>
                      {m.meta?.sources?.length > 0 && (
                        <div className="text-[10px] text-teal-700 font-medium mt-1.5">
                          Verified source: {m.meta.sources.join(' · ')}
                        </div>
                      )}
                      {m.meta?.escalated && !m.meta?.emergencyAlert && (
                        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-amber-800">Escalated to Concierge</span>
                          <Button size="sm" variant="outline" onClick={() => setTab('support')}>
                            Open Support Ticket
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && <div className="text-xs text-slate-400">Checking verified property facts...</div>}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendAiQuestion();
                }}
                className="flex gap-2"
              >
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask about check-in, Wi-Fi, AC, checkout..."
                  className="flex-1 h-9 px-3 text-xs border border-slate-300 rounded-md"
                />
                <Button type="submit" size="sm" variant="primary" disabled={aiLoading}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          )}

          {tab === 'support' && (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Report Maintenance Issue or Request Host Help</h2>
                {supError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-800">
                    {supError}
                  </div>
                )}
                {supSuccess && (
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    {supSuccess}
                  </div>
                )}
                {!isVerified && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    General inquiries are open below. Verify your booking access code above to attach photos or dispatch a priority maintenance work order.
                  </div>
                )}
                <form onSubmit={handleSubmitSupport} className="space-y-3">
                  <Input
                    label="Summary"
                    required
                    placeholder="e.g., Kitchen sink pipe dripping"
                    value={supSubject}
                    onChange={(e) => setSupSubject(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Category" value={supCategory} onChange={(e) => setSupCategory(e.target.value)}>
                      {['Plumbing', 'Electrical', 'Air conditioning', 'Heating', 'Wi-Fi', 'Appliances', 'Access and locks', 'Cleaning', 'Other'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                    <Select
                      label="Urgency"
                      value={isVerified ? supUrgency : 'Normal'}
                      disabled={!isVerified}
                      onChange={(e) => setSupUrgency(e.target.value as any)}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical (Immediate Dispatch)</option>
                    </Select>
                  </div>
                  <TextArea
                    label="Details"
                    required
                    rows={3}
                    value={supMessage}
                    onChange={(e) => setSupMessage(e.target.value)}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className={`flex items-center gap-2 text-xs ${isVerified ? 'text-slate-700' : 'text-slate-400'}`}>
                      <input
                        type="checkbox"
                        checked={isVerified && isMaintenance}
                        disabled={!isVerified}
                        onChange={(e) => setIsMaintenance(e.target.checked)}
                      />
                      Create tracked maintenance work order
                    </label>
                    {isVerified && (
                      <label className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 cursor-pointer">
                        <Camera className="w-3.5 h-3.5" /> {supPhoto ? 'Photo Attached' : 'Attach Photo'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleSupPhoto} />
                      </label>
                    )}
                  </div>
                  <Button type="submit" variant="primary" className="w-full">
                    Submit to Operations Team
                  </Button>
                </form>
              </Card>

              <Card className="p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900">Your Support & Work Order Tracker</div>
                {requests.length === 0 ? (
                  <div className="text-xs text-slate-400">No requests submitted for this property.</div>
                ) : (
                  requests.map((r) => (
                    <div key={r.id} className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{r.subject}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.category} {r.work_order_code ? `· ${r.work_order_code}` : ''}
                        </div>
                      </div>
                      <Badge variant={statusToBadgeVariant(r.incident_status || r.status)}>
                        {r.incident_status || r.status}
                      </Badge>
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}

          {tab === 'feedback' && (
            <Card className="p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Honest Stay Feedback</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Share candid feedback on cleaning, check-in, comfort & maintenance—all ratings help our operations team improve.
                </p>
              </div>
              {fbError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-800">{fbError}</div>
              )}
              {fbSent ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  Thank you! Your feedback has been recorded directly for the host & operations team.
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-3">
                  {[
                    { label: 'Cleaning Quality', val: cleanRating, set: setCleanRating },
                    { label: 'Check-In Experience', val: checkinRating, set: setCheckinRating },
                    { label: 'Property Comfort', val: comfortRating, set: setComfortRating },
                    { label: 'Maintenance & Equipment', val: maintRating, set: setMaintRating },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button type="button" key={n} onClick={() => row.set(n)} className="p-0.5">
                            <Star
                              className={`w-4 h-4 ${
                                n <= row.val ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <TextArea
                    label="Comments"
                    rows={3}
                    placeholder="Tell us what went well or what we should fix..."
                    value={fbComments}
                    onChange={(e) => setFbComments(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={fbFollowUp} onChange={(e) => setFbFollowUp(e.target.checked)} />
                    Request host follow-up on my stay
                  </label>
                  <Button type="submit" variant="primary" className="w-full">
                    Submit Honest Feedback
                  </Button>
                </form>
              )}
            </Card>
          )}
        </div>

        {/* Sticky Mobile Bottom Tab Bar */}
        <nav className="sticky bottom-0 bg-white border-t border-slate-200 grid grid-cols-4 text-[11px] font-medium">
          {[
            { id: 'guide' as const, label: 'Welcome Book', icon: Sparkles },
            { id: 'ai' as const, label: 'AI Assistant', icon: Bot },
            { id: 'support' as const, label: 'Help & Issues', icon: LifeBuoy },
            { id: 'feedback' as const, label: 'Feedback', icon: MessageSquareHeart },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`py-2.5 flex flex-col items-center gap-1 ${
                  active ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
