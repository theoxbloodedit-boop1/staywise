import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  CalendarRange,
  Sparkles,
  Wrench,
  ClipboardCheck,
  Bot,
  Users,
  BellRing,
  MessageSquareHeart,
  ShieldCheck,
  BriefcaseBusiness,
  ExternalLink,
  Menu,
  X,
  ChevronDown,
  Lock,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { cn, Badge } from './ui';
import type { Organization, SessionContext, UserRole } from '../lib/types';

export type AppRoute =
  | 'dashboard'
  | 'properties'
  | 'guidebooks'
  | 'reservations'
  | 'cleaning'
  | 'incidents'
  | 'inspections'
  | 'ai-console'
  | 'team'
  | 'automations'
  | 'feedback'
  | 'settings'
  | 'crm-admin';

interface NavItem {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  section: 'core' | 'ops' | 'org' | 'platform';
  requiresPlatformAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Inspector'],
    section: 'core',
  },
  {
    id: 'properties',
    label: 'Properties',
    icon: Building2,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Inspector', 'Cleaning Staff', 'Maintenance Technician'],
    section: 'core',
  },
  {
    id: 'guidebooks',
    label: 'Welcome Books',
    icon: BookOpen,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'],
    section: 'core',
  },
  {
    id: 'reservations',
    label: 'Stays & Check-In',
    icon: CalendarRange,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'],
    section: 'core',
  },
  {
    id: 'cleaning',
    label: 'Cleaning & Turnovers',
    icon: Sparkles,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Cleaning Staff'],
    section: 'ops',
  },
  {
    id: 'incidents',
    label: 'Incidents & Maintenance',
    icon: Wrench,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge', 'Maintenance Technician', 'Cleaning Staff'],
    section: 'ops',
  },
  {
    id: 'inspections',
    label: 'Inventory & Inspections',
    icon: ClipboardCheck,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Inspector'],
    section: 'ops',
  },
  {
    id: 'ai-console',
    label: 'Guide Search',
    icon: Bot,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'],
    section: 'ops',
  },
  {
    id: 'team',
    label: 'Team & Roles',
    icon: Users,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'],
    section: 'org',
  },
  {
    id: 'automations',
    label: 'Automations & Alerts',
    icon: BellRing,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'],
    section: 'org',
  },
  {
    id: 'feedback',
    label: 'Guest Feedback',
    icon: MessageSquareHeart,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager', 'Concierge'],
    section: 'org',
  },
  {
    id: 'settings',
    label: 'Billing & Settings',
    icon: ShieldCheck,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin'],
    section: 'org',
  },
  {
    id: 'crm-admin',
    label: 'SaaS CRM Admin',
    icon: BriefcaseBusiness,
    roles: ['Platform Super Admin', 'Organization Owner', 'Organization Admin', 'Property Manager'],
    section: 'platform',
    requiresPlatformAdmin: true,
  },
];

export function AppShell({
  activeRoute,
  onNavigate,
  onNavigateMarketing,
  onNavigatePath,
  onSignOut,
  organizations,
  currentOrg,
  session,
  onSwitchOrg,
  children,
}: {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onNavigateMarketing: () => void;
  onNavigatePath: (path: string) => void;
  onSignOut: () => void;
  organizations: Array<Pick<Organization, 'id' | 'name' | 'plan_tier' | 'default_country'>>;
  currentOrg: Organization | null;
  session: SessionContext;
  onSwitchOrg: (orgId: string) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNav = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const items = () => Array.from(mobileNav.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), a[href]') || []).filter(item => item.getClientRects().length > 0);
    (mobileNav.current?.querySelector<HTMLElement>('[aria-current="page"]') || items()[0])?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); }
      if (event.key !== 'Tab') return;
      const targets = items(); const first = targets[0], last = targets[targets.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, [mobileOpen]);

  const visibleItems = NAV_ITEMS.filter(
    (i) => i.roles.includes(session.actorRole) && (!i.requiresPlatformAdmin || Boolean(session.isPlatformAdmin))
  );

  const renderNavSection = (title: string, sectionKey: 'core' | 'ops' | 'org' | 'platform') => {
    const items = visibleItems.filter((i) => i.section === sectionKey);
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <div className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-3 text-sm font-medium rounded-md transition-colors text-left',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-teal-300' : 'text-slate-400')} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
        <button
          onClick={onNavigateMarketing}
          className="flex items-center gap-2 text-left group"
          title="Return to Public SaaS Overview"
        >
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-tight">
            SW
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">Staywise</div>
            <div className="text-xs text-slate-500 mt-0.5">Property & Guest Ops</div>
          </div>
        </button>
        <Badge variant="brand">{currentOrg?.plan_tier || 'Pro'}</Badge>
      </div>

      {/* Organization Switcher (Multi-tenant isolation) */}
      {organizations.length > 0 && (
        <div className="p-3 border-b border-slate-200 bg-slate-50/70">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Workspace
          </div>
          <div className="relative">
            <select
              aria-label="Active workspace"
              value={session.organizationId}
              disabled={organizations.length <= 1}
              onChange={(e) => onSwitchOrg(e.target.value)}
              className="w-full h-11 pl-3 pr-8 text-sm font-medium bg-white border border-slate-200 rounded-md text-slate-900 appearance-none focus:outline-none focus:border-slate-400 disabled:opacity-80"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.default_country})
                </option>
              ))}
            </select>
            {organizations.length > 1 && (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            )}
          </div>
        </div>
      )}

      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-2.5 py-4">
        {renderNavSection('Your portfolio', 'core')}
        {renderNavSection('Daily operations', 'ops')}
          {renderNavSection('Workspace', 'org')}
          {renderNavSection('Founder SaaS Control', 'platform')}
        </nav>

      {/* Active Actor & Session Controls */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {session.actorName
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate">{session.actorName}</div>
              <div className="text-xs text-teal-700 font-medium truncate">
                {session.isPlatformAdmin ? `${session.actorRole} · Founder` : session.actorRole}
              </div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <button onClick={() => onNavigatePath('/privacy')} className="hover:text-slate-700">
            Privacy
          </button>
          <button onClick={() => onNavigatePath('/terms')} className="hover:text-slate-700">
            Terms
          </button>
          <button onClick={onSignOut} className="hover:text-slate-700">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="workspace-shell min-h-screen bg-slate-50 flex">
      <a href="#workspace-content" className="skip-link">Skip to workspace content</a>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 sticky top-0 h-screen">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <button aria-label="Close navigation menu" className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div ref={mobileNav} role="dialog" aria-modal="true" aria-label="Workspace menu" className="relative w-72 max-w-[88vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-800">{currentOrg?.name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Signed-in workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate('properties')}
              className="inline-flex items-center gap-2 min-h-11 px-3 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Building2 aria-hidden="true" className="w-4 h-4 text-teal-700" />
              Your properties
            </button>
            <button
              onClick={onNavigateMarketing}
              className="hidden sm:inline-flex items-center h-8 px-3 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              Product & Pricing Site
            </button>
          </div>
        </header>

        <main id="workspace-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
