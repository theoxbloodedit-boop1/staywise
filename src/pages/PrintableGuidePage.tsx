import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui';
import type { Guidebook, GuidebookSection, Property } from '../lib/types';

export function PrintableGuidePage({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<{
    property: Property;
    guidebook: Guidebook;
    sections: GuidebookSection[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiFetch(`/api/guidebooks/${propertyId}`)
      .then(setData)
      .catch((err) => setErrorMsg(err.message || 'Sign in to view printable property Welcome Book.'));
  }, [propertyId]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm bg-white border border-slate-200 rounded-lg p-6 text-center space-y-3">
          <div className="text-sm font-semibold text-slate-900">Operator Sign-In Required</div>
          <p className="text-xs text-slate-600">{errorMsg}</p>
          <a
            href="/auth"
            className="inline-flex items-center justify-center h-8 px-4 rounded-md bg-slate-900 text-white text-xs font-medium"
          >
            Sign in to STAYWISE
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-10 text-sm text-slate-500">Preparing printable Welcome Book...</div>;
  }

  const { property, guidebook, sections } = data;
  const visible = sections.filter((s) => s.is_visible);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between no-print">
        <div className="text-xs text-slate-600">
          Printable Welcome Book Export · Use Save as PDF in print dialog
        </div>
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </Button>
      </div>

      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-none">
        <div className="relative h-56 bg-slate-900">
          <img
            src={guidebook.cover_image || property.cover_image}
            alt={`${property.name} printable welcome book header`}
            loading="lazy"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-6 left-8 right-8 text-white">
            <div className="text-xs font-semibold uppercase tracking-widest text-teal-300">
              STAYWISE DIGITAL WELCOME BOOK
            </div>
            <h1 className="text-3xl font-bold mt-1">{guidebook.brand_name || property.name}</h1>
            <p className="text-sm text-slate-200 mt-1">
              {property.address_line}, {property.city}, {property.state} {property.postal_code} ({property.country})
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {visible.map((sec) => (
            <section key={sec.section_key} className="pb-5 border-b border-slate-200 last:border-none print-break-inside-avoid">
              <h2 className="text-base font-bold text-slate-900 mb-2">{sec.title}</h2>
              {sec.section_key === 'welcome' && (
                <div className="text-sm text-slate-700 space-y-1.5">
                  <p>{sec.content.welcomeMessage}</p>
                  <p>{sec.content.propertyIntro}</p>
                  <p className="text-xs text-slate-500">
                    Host: {sec.content.hostName} · {sec.content.hostPhone} · {sec.content.hostEmail}
                  </p>
                </div>
              )}
              {sec.section_key === 'checkin' && (
                <div className="text-sm text-slate-700 space-y-1.5">
                  <p><strong>Check-in:</strong> {sec.content.checkInTime}</p>
                  <p><strong>Parking:</strong> {sec.content.parkingInstructions}</p>
                  <p><strong>Entry:</strong> {sec.content.smartLockInstructions}</p>
                  <p className="text-xs text-slate-500">Note: Stay-specific lockbox/PIN credentials are verified digitally via Guest Portal.</p>
                </div>
              )}
              {sec.section_key === 'rules' && (
                <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                  <li>Quiet Hours: {sec.content.quietHours}</li>
                  <li>Smoking: {sec.content.smokingPolicy}</li>
                  <li>Pets: {sec.content.petPolicy}</li>
                  <li>Parties: {sec.content.partyPolicy}</li>
                  <li>Waste: {sec.content.wasteDisposal}</li>
                </ul>
              )}
              {sec.section_key === 'wifi_home' && (
                <div className="text-sm text-slate-700 space-y-1.5">
                  <p><strong>Wi-Fi Network:</strong> {sec.content.wifiNetwork} (Password shown in verified guest pass)</p>
                  <p><strong>Climate:</strong> {sec.content.acInstructions}</p>
                  <p><strong>Kitchen & Laundry:</strong> {sec.content.kitchenAppliances} {sec.content.washerDryer}</p>
                </div>
              )}
              {sec.section_key === 'local_picks' && (
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {(sec.content.items || []).map((item: any) => (
                    <div key={item.id} className="p-2.5 rounded border border-slate-200">
                      <div className="font-semibold text-slate-900">{item.name} ({item.category})</div>
                      <div className="text-slate-600 mt-0.5">{item.description}</div>
                      <div className="text-slate-400 mt-0.5">{item.address}</div>
                    </div>
                  ))}
                </div>
              )}
              {sec.section_key === 'emergency' && (
                <div className="text-sm text-slate-700 space-y-1.5">
                  <p className="text-red-700 font-semibold">Emergency Services: {sec.content.primaryNumber} · Manager 24/7: {sec.content.managerEmergencyPhone}</p>
                  <p><strong>Water Shutoff:</strong> {sec.content.waterShutoffProcedure}</p>
                  <p><strong>Fire:</strong> {sec.content.fireProcedure}</p>
                </div>
              )}
              {sec.section_key === 'getting_around' && (
                <div className="text-sm text-slate-700 space-y-1">
                  <p><strong>Airport:</strong> {sec.content.airportDirections}</p>
                  <p><strong>Transit & Rideshare:</strong> {sec.content.publicTransit} {sec.content.taxiRideshare}</p>
                </div>
              )}
              {sec.section_key === 'checkout' && (
                <div className="text-sm text-slate-700 space-y-1">
                  <p><strong>Check-out Time:</strong> {sec.content.checkOutTime}</p>
                  <p>{sec.content.keyReturn}</p>
                  <p>{sec.content.wasteInstructions}</p>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
