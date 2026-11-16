import React, { Suspense, lazy, useEffect, useState } from 'react';
import { apiFetch, setActiveOrganizationId, setApiContext } from './lib/api';
import { configureNeonAuthUrl, neonSignOut } from './lib/neonAuth';
import { AppShell, type AppRoute } from './components/AppShell';
import { CookieBanner } from './components/CookieBanner';
import type { OrgMember, Organization, SessionContext, UserRole } from './lib/types';

// Route-based Code Splitting via React.lazy()
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const FeaturesPage = lazy(() => import('./pages/PublicPages').then((m) => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import('./pages/PublicPages').then((m) => ({ default: m.PricingPage })));
const SecurityPage = lazy(() => import('./pages/PublicPages').then((m) => ({ default: m.SecurityPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const GuestPortalPage = lazy(() => import('./pages/GuestPortalPage').then((m) => ({ default: m.GuestPortalPage })));
const PrintableGuidePage = lazy(() => import('./pages/PrintableGuidePage').then((m) => ({ default: m.PrintableGuidePage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage').then((m) => ({ default: m.PropertiesPage })));
const GuidebookStudioPage = lazy(() => import('./pages/GuidebookStudioPage').then((m) => ({ default: m.GuidebookStudioPage })));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage').then((m) => ({ default: m.ReservationsPage })));
const CleaningPage = lazy(() => import('./pages/CleaningPage').then((m) => ({ default: m.CleaningPage })));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })));
const InspectionsPage = lazy(() => import('./pages/InspectionsPage').then((m) => ({ default: m.InspectionsPage })));
const AiConsolePage = lazy(() => import('./pages/AiConsolePage').then((m) => ({ default: m.AiConsolePage })));
const TeamPage = lazy(() => import('./pages/TeamAutomationsPage').then((m) => ({ default: m.TeamPage })));
const AutomationsPage = lazy(() => import('./pages/TeamAutomationsPage').then((m) => ({ default: m.AutomationsPage })));
const FeedbackPage = lazy(() => import('./pages/FeedbackBillingPage').then((m) => ({ default: m.FeedbackPage })));
const SettingsBillingAuditPage = lazy(() =>
  import('./pages/FeedbackBillingPage').then((m) => ({ default: m.SettingsBillingAuditPage }))
);

function defaultRouteForRole(role: UserRole): AppRoute {
  switch (role) {
    case 'Cleaning Staff':
      return 'cleaning';
    case 'Maintenance Technician':
      return 'incidents';
    case 'Inspector':
      return 'inspections';
    default:
      return 'dashboard';
  }
}

const KNOWN_APP_SUBROUTES: Record<string, AppRoute> = {
  '/app': 'dashboard',
  '/app/dashboard': 'dashboard',
  '/app/properties': 'properties',
  '/app/guidebooks': 'guidebooks',
  '/app/reservations': 'reservations',
  '/app/cleaning': 'cleaning',
  '/app/incidents': 'incidents',
  '/app/inspections': 'inspections',
  '/app/ai-console': 'ai-console',
  '/app/team': 'team',
  '/app/automations': 'automations',
  '/app/feedback': 'feedback',
  '/app/audit-logs': 'settings',
};

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
      Loading Staywise...
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot' | 'reset'>('login');
  const [authPlan, setAuthPlan] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search).get('plan');
    return p === 'Starter' || p === 'Professional' || p === 'Portfolio' ? p : 'Starter';
  });

  const [session, setSession] = useState<SessionContext>({
    organizationId: '',
    userId: '',
    actorName: '',
    actorRole: 'Organization Owner',
  });
  const [onboardingUser, setOnboardingUser] = useState<{ email: string; name: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [organizations, setOrganizations] = useState<
    Array<Pick<Organization, 'id' | 'name' | 'plan_tier' | 'default_country'>>
  >([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [activeRoute, setActiveRoute] = useState<AppRoute>(() => KNOWN_APP_SUBROUTES[window.location.pathname] || 'dashboard');
  const [guidebookPropId, setGuidebookPropId] = useState<string | null>(null);

  useEffect(() => {
    const onPop = () => {
      setPathname(window.location.pathname);
      if (KNOWN_APP_SUBROUTES[window.location.pathname]) {
        setActiveRoute(KNOWN_APP_SUBROUTES[window.location.pathname]);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigatePath = (nextPath: string) => {
    const cleanNext = nextPath.split('?')[0];
    if (nextPath !== `${pathname}${window.location.search}`) {
      window.history.pushState({}, '', nextPath);
      setPathname(cleanNext);
      if (KNOWN_APP_SUBROUTES[cleanNext]) {
        setActiveRoute(KNOWN_APP_SUBROUTES[cleanNext]);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openAuth = (mode: 'register' | 'login' | 'forgot' | 'reset', plan?: string) => {
    setAuthMode(mode);
    const chosen = plan && ['Starter', 'Professional', 'Portfolio'].includes(plan) ? plan : 'Starter';
    setAuthPlan(chosen);
    navigatePath(mode === 'register' ? `/auth?plan=${encodeURIComponent(chosen)}` : '/auth');
  };

  useEffect(() => {
    const TITLES: Record<string, [string, string]> = {
      '/': [
        'Staywise — Guest Welcome Books & Property Operations',
        'Mobile guest welcome books, AES-256 stay-gated door codes, and photo-verified cleaning checklists for short-term rental hosts.',
      ],
      '/features': [
        'Features — Mobile Welcome Books, Lock Vault & Turnover Ops | Staywise',
        'Explore Staywise digital guidebooks, rate-limited door and Wi-Fi access, grounded guest assistance, and photo-verified checklists.',
      ],
      '/pricing': [
        'Pricing — Free During Early Access | Staywise',
        'Starter, Professional, and Portfolio tiers are $0/month during Staywise Early Access with no card required.',
      ],
      '/security': [
        'Security & Encryption — Staywise Hospitality Ops',
        'AES-256-GCM credential encryption, PostgreSQL brute-force protection, EdDSA/JWKS auth, and instant JSON export or account erasure.',
      ],
      '/privacy': [
        'Privacy Policy | Staywise',
        'Staywise Software LLC privacy notice covering access secret encryption, subprocessors, retention, and GDPR/CCPA rights.',
      ],
      '/terms': [
        'Terms of Service | Staywise',
        'Commercial terms and Early Access billing details for Staywise Software LLC.',
      ],
      '/auth': [
        'Sign In or Create Workspace | Staywise',
        'Sign in or create your Staywise hospitality operations workspace.',
      ],
    };
    const match = TITLES[pathname];
    if (match) {
      document.title = match[0];
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', match[1]);
    }
  }, [pathname]);

  const hydrateFromBackend = async () => {
    setAuthReady(false);
    try {
      const res = await apiFetch('/api/auth/context');
      if (res?.neonAuthUrl) {
        configureNeonAuthUrl(res.neonAuthUrl);
      }

      if (res.authenticated && res.needsOnboarding && res.neonUser) {
        setOnboardingUser({ email: res.neonUser.email, name: res.neonUser.name });
        setAuthenticated(false);
        return;
      }

      if (res.authenticated && res.user) {
        const nextSess: SessionContext = {
          organizationId: res.user.organizationId,
          userId: res.user.id,
          actorName: res.user.name,
          actorRole: res.user.role,
        };
        setOnboardingUser(null);
        setSession(nextSess);
        setApiContext(nextSess);
        setOrganizations(res.organizations || []);
        setCurrentOrg(res.organization || null);
        setMembers(res.members || []);
        setAuthenticated(true);
        if (pathname === '/app' || pathname === '/app/dashboard') {
          setActiveRoute(defaultRouteForRole(res.user.role));
        }
      } else {
        setOnboardingUser(null);
        setAuthenticated(false);
      }
    } catch {
      setOnboardingUser(null);
      setAuthenticated(false);
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    if (pathname.startsWith('/app')) {
      hydrateFromBackend();
    }
  }, [pathname.startsWith('/app')]);

  const handleSwitchOrg = async (orgId: string) => {
    setActiveOrganizationId(orgId);
    await hydrateFromBackend();
    setActiveRoute('dashboard');
  };

  const handleSignOut = async () => {
    await neonSignOut();
    setActiveOrganizationId('');
    setOnboardingUser(null);
    setAuthenticated(false);
    setAuthMode('login');
    navigatePath('/auth');
  };

  // Standalone Guest Portal (zero operational chrome)
  if (pathname.startsWith('/guest/')) {
    const slug = pathname.replace('/guest/', '').split('/')[0];
    return (
      <Suspense fallback={<PageLoader />}>
        <GuestPortalPage slug={slug} />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  // Standalone Printable Welcome Book PDF view
  if (pathname.startsWith('/print/')) {
    const propId = pathname.replace('/print/', '').split('/')[0];
    return (
      <Suspense fallback={<PageLoader />}>
        <PrintableGuidePage propertyId={propId} />
      </Suspense>
    );
  }

  // Legal & Public SEO Pages
  if (pathname === '/privacy') {
    return (
      <Suspense fallback={<PageLoader />}>
        <PrivacyPolicyPage
          onNavigate={navigatePath}
          onEnterWorkspace={() => navigatePath('/app')}
          onOpenAuth={openAuth}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  if (pathname === '/terms') {
    return (
      <Suspense fallback={<PageLoader />}>
        <TermsPage
          onNavigate={navigatePath}
          onEnterWorkspace={() => navigatePath('/app')}
          onOpenAuth={openAuth}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  if (pathname === '/features') {
    return (
      <Suspense fallback={<PageLoader />}>
        <FeaturesPage
          onNavigatePath={navigatePath}
          onEnterWorkspace={() => navigatePath('/app')}
          onOpenAuth={openAuth}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  if (pathname === '/pricing') {
    return (
      <Suspense fallback={<PageLoader />}>
        <PricingPage
          onNavigatePath={navigatePath}
          onEnterWorkspace={() => navigatePath('/app')}
          onOpenAuth={openAuth}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  if (pathname === '/security') {
    return (
      <Suspense fallback={<PageLoader />}>
        <SecurityPage
          onNavigatePath={navigatePath}
          onEnterWorkspace={() => navigatePath('/app')}
          onOpenAuth={openAuth}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  // Landing Page
  if (pathname === '/') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage
          onEnterWorkspace={() => navigatePath('/app')}
          onOpenAuth={openAuth}
          onNavigatePath={navigatePath}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  // Authentication & Onboarding Page (Strict Neon Auth)
  if (pathname === '/auth') {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthPage
          initialMode={authMode}
          defaultPlan={authPlan}
          onboardingUser={onboardingUser}
          onBack={() => navigatePath('/')}
          onNavigate={navigatePath}
          onSignedOut={() => setOnboardingUser(null)}
          onSuccess={async (newSession) => {
            setOnboardingUser(null);
            setSession(newSession);
            setApiContext(newSession);
            await hydrateFromBackend();
            setActiveRoute(defaultRouteForRole(newSession.actorRole));
            navigatePath('/app');
          }}
        />
        <CookieBanner onNavigate={navigatePath} />
      </Suspense>
    );
  }

  // Operations Workspace (/app*)
  if (pathname.startsWith('/app')) {
    if (!KNOWN_APP_SUBROUTES[pathname]) {
      return (
        <Suspense fallback={<PageLoader />}>
          <NotFoundPage onNavigate={navigatePath} />
        </Suspense>
      );
    }

    if (!authReady) {
      return <PageLoader />;
    }

    if (!authenticated) {
      return (
        <Suspense fallback={<PageLoader />}>
          <AuthPage
            initialMode="login"
            onboardingUser={onboardingUser}
            onBack={() => navigatePath('/')}
            onNavigate={navigatePath}
            onSignedOut={() => setOnboardingUser(null)}
            onSuccess={async (newSession) => {
              setOnboardingUser(null);
              setSession(newSession);
              setApiContext(newSession);
              await hydrateFromBackend();
              setActiveRoute(defaultRouteForRole(newSession.actorRole));
            }}
          />
          <CookieBanner onNavigate={navigatePath} />
        </Suspense>
      );
    }

    return (
      <>
        <AppShell
          activeRoute={activeRoute}
          onNavigate={(r) => setActiveRoute(r)}
          onNavigateMarketing={() => navigatePath('/')}
          onNavigatePath={navigatePath}
          onSignOut={handleSignOut}
          organizations={organizations}
          currentOrg={currentOrg}
          session={session}
          onSwitchOrg={handleSwitchOrg}
        >
          <Suspense fallback={<PageLoader />}>
            {activeRoute === 'dashboard' && (
              <DashboardPage
                orgId={session.organizationId}
                onNavigate={setActiveRoute}
                onOpenGuidebook={(pid) => {
                  setGuidebookPropId(pid);
                  setActiveRoute('guidebooks');
                }}
              />
            )}
            {activeRoute === 'properties' && (
              <PropertiesPage
                org={currentOrg}
                onOpenGuidebook={(pid) => {
                  setGuidebookPropId(pid);
                  setActiveRoute('guidebooks');
                }}
                onNavigateSettings={() => setActiveRoute('settings')}
              />
            )}
            {activeRoute === 'guidebooks' && (
              <GuidebookStudioPage orgId={session.organizationId} initialPropertyId={guidebookPropId} />
            )}
            {activeRoute === 'reservations' && <ReservationsPage orgId={session.organizationId} />}
            {activeRoute === 'cleaning' && (
              <CleaningPage orgId={session.organizationId} actorRole={session.actorRole} members={members} />
            )}
            {activeRoute === 'incidents' && (
              <IncidentsPage orgId={session.organizationId} actorRole={session.actorRole} members={members} />
            )}
            {activeRoute === 'inspections' && <InspectionsPage orgId={session.organizationId} />}
            {activeRoute === 'ai-console' && <AiConsolePage orgId={session.organizationId} />}
            {activeRoute === 'team' && (
              <TeamPage orgId={session.organizationId} onRefreshContext={hydrateFromBackend} />
            )}
            {activeRoute === 'automations' && <AutomationsPage orgId={session.organizationId} />}
            {activeRoute === 'feedback' && <FeedbackPage orgId={session.organizationId} />}
            {activeRoute === 'settings' && (
              <SettingsBillingAuditPage
                org={currentOrg}
                onOrgUpdated={hydrateFromBackend}
                onOrgDeleted={async () => {
                  await handleSignOut();
                  navigatePath('/');
                }}
              />
            )}
          </Suspense>
        </AppShell>
        <CookieBanner onNavigate={navigatePath} />
      </>
    );
  }

  // Fallback Custom 404 Page
  return (
    <Suspense fallback={<PageLoader />}>
      <NotFoundPage onNavigate={navigatePath} />
      <CookieBanner onNavigate={navigatePath} />
    </Suspense>
  );
}
