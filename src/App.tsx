import React, { Suspense, lazy, useEffect, useState } from 'react';
import { apiFetch, setActiveOrganizationId, setApiContext } from './lib/api';
import { configureNeonAuthUrl, neonSignOut } from './lib/neonAuth';
import { DEFAULT_PLAN_TIER, parsePlanTier } from './lib/plans';
import { AppShell, type AppRoute } from './components/AppShell';
import { CookieBanner } from './components/CookieBanner';
import { Seo } from './seo/Seo';
import { KNOWN_APP_SUBROUTES, renderFallbackNotFound, renderPublicPage } from './routes';
import type { OrgMember, Organization, SessionContext, UserRole } from './lib/types';

// Lazy-loaded Workspace, Guest Portal, Print PDF & Auth chunks (Public marketing pages render synchronously for clean SSR hydration)
const ControlCenterPage = lazy(() => import('./pages/ControlCenterPage').then(m => ({ default: m.ControlCenterPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
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
const PlatformCrmPage = lazy(() => import('./pages/PlatformCrmPage').then((m) => ({ default: m.PlatformCrmPage })));

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
    return parsePlanTier(p) || DEFAULT_PLAN_TIER;
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
    const chosen = parsePlanTier(plan) || DEFAULT_PLAN_TIER;
    setAuthPlan(chosen);
    navigatePath(mode === 'register' ? `/auth?plan=${encodeURIComponent(chosen)}` : '/auth');
  };

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
          isPlatformAdmin: Boolean(res.user.isPlatformAdmin),
        };
        setOnboardingUser(null);
        setSession(nextSess);
        setApiContext(nextSess);
        setOrganizations(res.organizations || []);
        setCurrentOrg(res.organization || null);
        setMembers(res.members || []);
        setAuthenticated(true);
        const mappedSubroute = KNOWN_APP_SUBROUTES[pathname];
        if (mappedSubroute && mappedSubroute !== 'dashboard') {
          setActiveRoute(
            mappedSubroute === 'crm-admin' && !nextSess.isPlatformAdmin
              ? defaultRouteForRole(res.user.role)
              : mappedSubroute
          );
        } else if (pathname === '/app' || pathname === '/app/dashboard') {
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
    if (pathname.startsWith('/app') && pathname !== '/app/control-center') {
      hydrateFromBackend();
    }
  }, [pathname.startsWith('/app'), pathname === '/app/control-center']);

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

  if (pathname === '/app/control-center') return <Suspense fallback={<PageLoader />}><ControlCenterPage onNavigate={navigatePath} /></Suspense>;

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

  // Public Marketing & Legal Pages (synchronous for clean SSR hydration + Seo meta sync)
  const publicView = renderPublicPage({
    pathname,
    onNavigatePath: navigatePath,
    onEnterWorkspace: () => navigatePath('/app'),
    onOpenAuth: openAuth,
  });

  if (publicView) {
    return (
      <>
        <Seo path={pathname} />
        {publicView}
        <CookieBanner onNavigate={navigatePath} />
      </>
    );
  }

  // Authentication & Onboarding Page (Strict Neon Auth)
  if (pathname === '/auth') {
    return (
      <>
        <Seo path="/auth" />
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
      </>
    );
  }

  // Operations Workspace (/app*)
  if (pathname.startsWith('/app')) {
    if (!KNOWN_APP_SUBROUTES[pathname]) {
      return (
        <>
          <Seo path="/404" />
          {renderFallbackNotFound(navigatePath)}
        </>
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
              <GuidebookStudioPage
                orgId={session.organizationId}
                initialPropertyId={guidebookPropId}
                onNavigateProperties={() => setActiveRoute('properties')}
              />
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
              <TeamPage orgId={session.organizationId} />
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
            {activeRoute === 'crm-admin' && session.isPlatformAdmin && (
              <PlatformCrmPage currentOrgId={session.organizationId} />
            )}
          </Suspense>
        </AppShell>
        <CookieBanner onNavigate={navigatePath} />
      </>
    );
  }

  // Fallback Custom 404 Page
  return (
    <>
      <Seo path="/404" />
      {renderFallbackNotFound(navigatePath)}
      <CookieBanner onNavigate={navigatePath} />
    </>
  );
}
