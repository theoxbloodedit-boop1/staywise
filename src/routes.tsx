import React from 'react';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage, PricingPage, SecurityPage } from './pages/PublicPages';
import { GuidebookFeaturePage } from './pages/GuidebookFeaturePage';
import { TurnoverFeaturePage } from './pages/TurnoverFeaturePage';
import { TemplatesPage } from './pages/TemplatesPage';
import { PrivacyPolicyPage, TermsPage } from './pages/LegalPages';
import { NotFoundPage } from './pages/NotFoundPage';
import type { AppRoute } from './components/AppShell';

export const PUBLIC_PAGE_PATHS = [
  '/',
  '/features',
  '/guest-guidebook',
  '/turnover-management',
  '/templates',
  '/pricing',
  '/security',
  '/privacy',
  '/terms',
] as const;

export const KNOWN_APP_SUBROUTES: Record<string, AppRoute> = {
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
  '/app/crm-admin': 'crm-admin',
};

export function isPublicMarketingPath(pathname: string): boolean {
  const clean = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  return (PUBLIC_PAGE_PATHS as readonly string[]).includes(clean);
}

export function renderPublicPage(opts: {
  pathname: string;
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}): React.ReactElement | null {
  const clean = (opts.pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/':
      return (
        <LandingPage
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
          onNavigatePath={opts.onNavigatePath}
        />
      );
    case '/features':
      return (
        <FeaturesPage
          onNavigatePath={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/guest-guidebook':
      return (
        <GuidebookFeaturePage
          onNavigatePath={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/turnover-management':
      return (
        <TurnoverFeaturePage
          onNavigatePath={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/templates':
      return (
        <TemplatesPage
          onNavigatePath={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/pricing':
      return (
        <PricingPage
          onNavigatePath={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/security':
      return (
        <SecurityPage
          onNavigatePath={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/privacy':
      return (
        <PrivacyPolicyPage
          onNavigate={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    case '/terms':
      return (
        <TermsPage
          onNavigate={opts.onNavigatePath}
          onEnterWorkspace={opts.onEnterWorkspace}
          onOpenAuth={opts.onOpenAuth}
        />
      );
    default:
      return null;
  }
}

export function renderFallbackNotFound(onNavigate: (path: string) => void): React.ReactElement {
  return <NotFoundPage onNavigate={onNavigate} />;
}
