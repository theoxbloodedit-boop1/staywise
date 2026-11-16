import React, { useState } from 'react';
import { Wifi, KeyRound, ShieldAlert, Utensils, Car, LogOut, Sparkles, Lock, Phone } from 'lucide-react';
import type { Guidebook, GuidebookSection, Property } from '../lib/types';

export function MobileGuidePreview({
  property,
  guidebook,
  sections,
}: {
  property: Property;
  guidebook: Guidebook;
  sections: GuidebookSection[];
}) {
  const visibleSections = sections.filter((s) => s.is_visible);
  const [activeKey, setActiveKey] = useState<string>(visibleSections[0]?.section_key || 'welcome');

  const activeSection = visibleSections.find((s) => s.section_key === activeKey) || visibleSections[0];
  const accent = guidebook.accent_color || '#0F766E';

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

  const fontClass =
    guidebook.typography_style === 'Editorial Serif'
      ? 'font-serif'
      : guidebook.typography_style === 'Classic Hospitality'
        ? 'font-display tracking-wide'
        : 'font-sans';

  return (
    <div className="w-[330px] mx-auto bg-slate-900 rounded-[36px] p-2.5 shadow-xl border border-slate-800">
      <div className={`bg-white rounded-[28px] overflow-hidden h-[610px] flex flex-col ${fontClass}`}>
        {/* Top cover */}
        <div className="relative h-36 shrink-0 bg-slate-800">
          <img
            src={guidebook.cover_image || property.cover_image}
            alt={property.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/20 to-transparent" />
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-900">
            STAYWISE · {property.country}
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="text-sm font-bold leading-tight">{guidebook.brand_name || property.name}</div>
            <div className="text-[11px] text-slate-200 mt-0.5">
              {property.city}, {property.state} · {property.bedrooms}bd · {property.bathrooms}ba
            </div>
          </div>
        </div>

        {/* Pill navigation */}
        <div className="px-3 py-2.5 border-b border-slate-200 flex gap-1.5 overflow-x-auto shrink-0 bg-slate-50">
          {visibleSections.map((sec) => {
            const Icon = iconFor(sec.section_key);
            const active = activeSection?.section_key === sec.section_key;
            return (
              <button
                key={sec.section_key}
                onClick={() => setActiveKey(sec.section_key)}
                style={active ? { backgroundColor: accent, borderColor: accent } : undefined}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors ${
                  active ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                {sec.title.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Section Body Preview */}
        <div className="flex-1 overflow-y-auto p-3.5 text-xs text-slate-700 space-y-2.5">
          {activeSection ? (
            <>
              <div className="text-[13px] font-semibold text-slate-900">{activeSection.title}</div>
              {activeSection.section_key === 'welcome' && (
                <div className="space-y-2">
                  <p className="leading-relaxed">{activeSection.content.welcomeMessage}</p>
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
                    <div className="font-semibold text-slate-900">Host: {activeSection.content.hostName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{activeSection.content.hostPhone}</div>
                  </div>
                </div>
              )}
              {activeSection.section_key === 'checkin' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="font-medium text-slate-600">Check-in</span>
                    <span className="font-semibold text-slate-900">{activeSection.content.checkInTime}</span>
                  </div>
                  {activeSection.content.accessRestricted && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-1.5 text-[11px]">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      Smart lock PIN ({activeSection.content.smartLockCode}#) hidden until booking verification
                    </div>
                  )}
                  <p className="text-[11px] text-slate-600">{activeSection.content.parkingInstructions}</p>
                </div>
              )}
              {activeSection.section_key === 'wifi_home' && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-md bg-slate-900 text-white font-mono text-[11px]">
                    <div>SSID: {activeSection.content.wifiNetwork}</div>
                    <div className="text-teal-300 mt-0.5">
                      PASS: {activeSection.content.restrictWifiUntilVerified ? '••••• (Stay gated)' : activeSection.content.wifiPassword}
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed">{activeSection.content.acInstructions}</p>
                </div>
              )}
              {activeSection.section_key === 'rules' && (
                <ul className="space-y-1.5 text-[11px]">
                  <li><strong>Quiet hours:</strong> {activeSection.content.quietHours}</li>
                  <li><strong>Smoking:</strong> {activeSection.content.smokingPolicy}</li>
                  <li><strong>Pets:</strong> {activeSection.content.petPolicy}</li>
                  <li><strong>Parties:</strong> {activeSection.content.partyPolicy}</li>
                </ul>
              )}
              {activeSection.section_key === 'local_picks' && (
                <div className="space-y-1.5">
                  {(activeSection.content.items || []).slice(0, 3).map((item: any) => (
                    <div key={item.id} className="p-2 rounded border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        {item.isOwnerPick && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
                            Host Pick
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
              {activeSection.section_key === 'emergency' && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-900 font-semibold flex items-center justify-between">
                    <span>Emergency Dispatch</span>
                    <span className="font-mono text-sm">{activeSection.content.primaryNumber}</span>
                  </div>
                  <p className="text-[11px]">{activeSection.content.waterShutoffProcedure}</p>
                </div>
              )}
              {activeSection.section_key === 'getting_around' && (
                <div className="space-y-1.5 text-[11px]">
                  <p><strong>Airport:</strong> {activeSection.content.airportDirections}</p>
                  <p><strong>Transit:</strong> {activeSection.content.publicTransit}</p>
                  <p><strong>Rideshare:</strong> {activeSection.content.taxiRideshare}</p>
                </div>
              )}
              {activeSection.section_key === 'checkout' && (
                <div className="space-y-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between font-medium">
                    <span>Check-out Time</span>
                    <span>{activeSection.content.checkOutTime}</span>
                  </div>
                  <p>{activeSection.content.keyReturn}</p>
                  <p>{activeSection.content.wasteInstructions}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400">No visible sections.</div>
          )}
        </div>
      </div>
    </div>
  );
}
