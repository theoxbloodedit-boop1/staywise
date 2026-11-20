import React, { useState } from 'react';
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

  const visibleItems = NAV_ITEMS.filter(
    (i) => i.roles.includes(session.actorRole) && (!i.requiresPlatformAdmin || Boolean(session.isPlatformAdmin))
  );

  const renderNavSection = (title: string, sectionKey: 'core' | 'ops' | 'org' | 'platform') => {
    const items = visibleItems.filter((i) => i.section === sectionKey);
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md transition-colors text-left',
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
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
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
            <div className="text-[10px] text-slate-500 mt-0.5">Property & Guest Ops</div>
          </div>
        </button>
        <Badge variant="brand">{currentOrg?.plan_tier || 'Pro'}</Badge>
      </div>

      {/* Organization Switcher (Multi-tenant isolation) */}
      {organizations.length > 0 && (
        <div className="p-3 border-b border-slate-200 bg-slate-50/70">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Workspace
          </div>
          <div className="relative">
            <select
              value={session.organizationId}
              disabled={organizations.length <= 1}
              onChange={(e) => onSwitchOrg(e.target.value)}
              className="w-full h-8 pl-2.5 pr-7 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-900 appearance-none focus:outline-none focus:border-slate-400 disabled:opacity-80"
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

      <nav className="flex-1 overflow-y-auto px-2.5 py-4">
        {renderNavSection('Portfolio & Guest', 'core')}
        {renderNavSection('Field Operations', 'ops')}
          {renderNavSection('Governance & Growth', 'org')}
          {renderNavSection('Founder SaaS Control', 'platform')}
        </nav>

      {/* Active Actor & Session Controls */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
              {session.actorName
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate">{session.actorName}</div>
              <div className="text-[11px] text-teal-700 font-medium truncate">
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

        <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-68 max-w-[82vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-800">{currentOrg?.name}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Neon Auth · Tenant Isolated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/guest/barton-creek-modern?code=STAY-4821"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="w-3.5 h-3.5 text-teal-700" />
              Guest Portal Preview
            </a>
            <button
              onClick={onNavigateMarketing}
              className="hidden sm:inline-flex items-center h-8 px-3 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              Product & Pricing Site
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
