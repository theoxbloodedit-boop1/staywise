import React from 'react';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';
import { Card } from '../components/ui';

export function PrivacyPolicyPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Staywise
        </button>

        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 mb-1.5">
                <ShieldCheck className="w-4 h-4" /> Legal & Data Protection
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Staywise Privacy Policy</h1>
              <p className="text-xs text-slate-500 mt-1">
                Effective Date: November 15, 2026 · Aligned with international data privacy standards (CCPA, GDPR & regional equivalents)
              </p>
            </div>
          </div>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">1. Organization Data Isolation</h2>
            <p className="text-slate-600">
              Staywise processes hospitality operations data on behalf of short-term rental teams and property managers worldwide. Every organization’s properties, bookings, inspections, incidents, and welcome books are partitioned by organization identifier at the database layer.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">2. Protection of Property Access Secrets</h2>
            <p className="text-slate-600">
              Smart-lock PINs, backup lockbox instructions, and private property Wi-Fi credentials are encrypted at rest using authenticated AES-256-GCM encryption. In the Guest Portal, these credentials stay hidden until a visitor verifies an active booking code within the stay window (48 hours pre-arrival through 24 hours post-departure).
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">3. Authentication & Session Security</h2>
            <p className="text-slate-600">
              Operator and staff accounts are authenticated via managed Neon Auth with cryptographically signed short-lived JWT tokens verified against rotating EdDSA public JWKS keys. Staywise does not run third-party advertising trackers.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">4. Data Portability & Right to Erasure</h2>
            <p className="text-slate-600">
              Organization Owners can export a complete machine-readable JSON archive of all organization records or permanently delete their workspace and associated data at any time from <strong>Billing & Settings</strong> inside the application.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Privacy Contact: privacy@staywise.app</span>
            <button onClick={() => onNavigate('/terms')} className="text-teal-700 font-medium hover:underline">
              View Terms of Service →
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TermsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Staywise
        </button>

        <Card className="p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 mb-1.5">
              <FileText className="w-4 h-4" /> SaaS Subscription Agreement
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Staywise Terms of Service</h1>
            <p className="text-xs text-slate-500 mt-1">
              Effective Date: November 15, 2026 · Applicable to Staywise Hospitality Workspaces Worldwide
            </p>
          </div>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">1. Service Scope & Account Responsibility</h2>
            <p className="text-slate-600">
              Staywise provides digital property welcome books, approved-fact guest assistance, turnover checklists, maintenance tracking, and inspection workflows. Operators are responsible for keeping local emergency numbers (such as 911, 112, 999, or 000), house rules, and staff permissions accurate within each property.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">2. Subscription Tiers & Property Limits</h2>
            <p className="text-slate-600">
              Plans (Starter: up to 2 properties, Professional: up to 10 properties, Portfolio: up to 25 properties) govern active non-archived properties and monthly AI guest query allowances. Plan downgrades require archiving surplus active properties prior to switching tiers.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">3. Guest Assistant & Safety Disclaimer</h2>
            <p className="text-slate-600">
              The Staywise Guest Assistant answers solely from operator-approved property sections and flags safety or emergency keywords for immediate human escalation. The assistant is not a substitute for local emergency services or licensed safety inspections.
            </p>
          </section>

          <section className="space-y-2 text-sm leading-relaxed">
            <h2 className="text-base font-semibold text-slate-900">4. Neutral Asset Inspection Records</h2>
            <p className="text-slate-600">
              Inventory and discrepancy logs record physical condition neutrally for operational review and never automatically adjudicate guest damage claims or legal liability.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Staywise Inc. Commercial Terms
            </span>
            <button onClick={() => onNavigate('/privacy')} className="text-teal-700 font-medium hover:underline">
              View Privacy Policy →
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
