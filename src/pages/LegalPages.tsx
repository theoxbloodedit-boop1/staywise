import React from 'react';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';
import { Card } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/PublicChrome';

export function PrivacyPolicyPage({
  onNavigate,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigate: (path: string) => void;
  onEnterWorkspace?: () => void;
  onOpenAuth?: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {onEnterWorkspace && onOpenAuth && (
        <PublicHeader
          currentPath="/privacy"
          onNavigatePath={onNavigate}
          onEnterWorkspace={onEnterWorkspace}
          onOpenAuth={onOpenAuth}
        />
      )}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Staywise
          </button>

          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 mb-1.5">
                  <ShieldCheck className="w-4 h-4" /> Legal & Data Protection
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Staywise Privacy Policy</h1>
                <p className="text-xs text-slate-600 mt-1">
                  Effective Date: November 15, 2026 · Controller: Staywise Software LLC (Austin, TX, USA)
                </p>
              </div>
            </div>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">1. Data Controller & Scope</h2>
              <p className="text-slate-700">
                Staywise Software LLC (“Staywise”, “we”) operates a hospitality workspace platform for short-term rental managers, boutique hosts, and turnover staff. We process account registration data (name, work email), property documentation, guest stay codes, cleaning/inspection records, and guest support requests strictly to deliver the service. Every organization’s workspace data is strictly isolated at the PostgreSQL database query layer by <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">organization_id</code>.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">2. Protection of Smart-Lock PINs & Wi-Fi Secrets</h2>
              <p className="text-slate-700">
                Smart-lock entry codes, lockbox backup instructions, and property Wi-Fi passwords are encrypted at rest using authenticated AES-256-GCM encryption prior to storage. In the Guest Portal, restricted credentials stay hidden until a visitor presents an active booking code within the stay window (48 hours pre-arrival through 24 hours post-departure). Verification endpoints enforce PostgreSQL-backed rate limiting and temporary IP+property lockout after repeated invalid code attempts.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">3. Authentication, Subprocessors & Infrastructure</h2>
              <p className="text-slate-700">
                Workspace authentication uses Neon Auth issuing short-lived EdDSA/JWKS-verified JWTs. Staywise relies on vetted infrastructure subprocessors: <strong>Neon, Inc.</strong> (managed PostgreSQL database and authentication in US East) and <strong>Vercel Inc.</strong> (application hosting, serverless runtime, and optional Blob asset storage). We do not sell personal data or run third-party advertising trackers.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">4. Retention, Portability & Account Erasure</h2>
              <p className="text-slate-700">
                Active workspace records are retained while your organization remains open. Audit logs and uploaded turnover evidence photos are deleted automatically upon organization or account deletion. Organization Owners can download a complete JSON archive, delete an organization, or permanently delete their personal Staywise account directly inside <strong>Billing & Settings</strong>—or contact our Data Protection Officer at <strong>privacy@staywise.app</strong> (requests processed within 30 days under GDPR, CCPA/CPRA, and equivalent laws).
              </p>
            </section>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>Staywise Software LLC · 600 Congress Ave, Austin, TX 78701 · privacy@staywise.app</span>
              <button onClick={() => onNavigate('/terms')} className="text-teal-800 font-medium hover:underline">
                View Terms of Service →
              </button>
            </div>
          </Card>
        </div>
      </main>
      {onEnterWorkspace && onOpenAuth && (
        <PublicFooter onNavigatePath={onNavigate} onOpenAuth={onOpenAuth} />
      )}
    </div>
  );
}

export function TermsPage({
  onNavigate,
  onEnterWorkspace,
  onOpenAuth,
}: {
  onNavigate: (path: string) => void;
  onEnterWorkspace?: () => void;
  onOpenAuth?: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {onEnterWorkspace && onOpenAuth && (
        <PublicHeader
          currentPath="/terms"
          onNavigatePath={onNavigate}
          onEnterWorkspace={onEnterWorkspace}
          onOpenAuth={onOpenAuth}
        />
      )}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Staywise
          </button>

          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 mb-1.5">
                <FileText className="w-4 h-4" /> SaaS Subscription Agreement
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Staywise Terms of Service</h1>
              <p className="text-xs text-slate-600 mt-1">
                Effective Date: November 15, 2026 · Staywise Software LLC (Austin, TX, USA)
              </p>
            </div>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">1. Service Scope & Operator Responsibility</h2>
              <p className="text-slate-700">
                Staywise provides mobile digital welcome books, time-gated guest access vaults, cleaning turnover checklists, maintenance work orders, and inspection logs. Operators remain responsible for keeping local emergency numbers (such as 911, 112, 999, or 000), property safety rules, and team permissions accurate for every property.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">2. Early Access Tiers, Billing & Cancellation</h2>
              <p className="text-slate-700">
                During Early Access (Alpha), Starter (up to 2 active properties), Professional (up to 10 properties), and Portfolio (up to 25 properties) tiers operate at $0/month without requiring a payment card. Paid billing will only activate with explicit prior notice and opt-in checkout. When commercial billing launches, subscriptions may be cancelled at any time before renewal, with prorated refunds available within 14 days of any initial paid charge by writing to billing@staywise.app.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">3. Guest Assistant & Safety Disclaimer</h2>
              <p className="text-slate-700">
                The Staywise Guest Assistant retrieves answers strictly from operator-authored guidebook sections and escalates unverified custom requests or emergency terms to the host team. It is not a substitute for local emergency services or on-site safety checks.
              </p>
            </section>

            <section className="space-y-2 text-sm leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">4. Governing Law & Liability</h2>
              <p className="text-slate-700">
                These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. To the maximum extent permitted by law, Staywise’s aggregate liability under these Terms shall not exceed amounts paid by the customer in the preceding 12 months.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Staywise Software LLC · legal@staywise.app
              </span>
              <button onClick={() => onNavigate('/privacy')} className="text-teal-800 font-medium hover:underline">
                View Privacy Policy →
              </button>
            </div>
          </Card>
        </div>
      </main>
      {onEnterWorkspace && onOpenAuth && (
        <PublicFooter onNavigatePath={onNavigate} onOpenAuth={onOpenAuth} />
      )}
    </div>
  );
}
