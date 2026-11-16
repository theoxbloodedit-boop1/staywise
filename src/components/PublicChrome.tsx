import React, { useState } from 'react';
import { Menu, X, QrCode } from 'lucide-react';
import { Button } from './ui';

export function PublicHeader({
  currentPath,
  onNavigatePath,
  onEnterWorkspace,
  onOpenAuth,
}: {
  currentPath: string;
  onNavigatePath: (path: string) => void;
  onEnterWorkspace: () => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Features', href: '/features' },
    { label: 'Welcome Books', href: '/guest-guidebook' },
    { label: 'Turnovers', href: '/turnover-management' },
    { label: 'Templates', href: '/templates' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
  ];

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    setMobileOpen(false);
    e.preventDefault();
    onNavigatePath(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setMobileOpen(false);
            onNavigatePath('/');
          }}
          className="flex items-center gap-2.5 min-h-[44px]"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 9.5V20a1 1 0 001 1h11a1 1 0 001-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="14" r="2" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-[15px] tracking-tight text-slate-900 block leading-none">
              Staywise
            </span>
            <span className="text-[11px] text-slate-600 hidden sm:block mt-0.5">
              Guest Guides & Property Ops
            </span>
          </div>
        </a>

        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-5 text-[13px] font-medium text-slate-700">
          {navItems.map((item) => {
            const active = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`py-2 transition-colors hover:text-slate-950 whitespace-nowrap ${
                  active ? 'text-teal-800 font-semibold' : ''
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={() => onOpenAuth('login')}>
            Sign in
          </Button>
          <Button variant="outline" size="md" onClick={onEnterWorkspace}>
            Workspace
          </Button>
          <Button variant="primary" size="md" onClick={() => onOpenAuth('register', 'Starter')}>
            Start Free
          </Button>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <Button
            variant="primary"
            size="md"
            className="md:hidden min-h-[44px]"
            onClick={() => onOpenAuth('register', 'Starter')}
          >
            Start Free
          </Button>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="w-11 h-11 rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium ${
                  currentPath === item.href
                    ? 'bg-teal-50 text-teal-900 font-semibold'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] w-full"
              onClick={() => {
                setMobileOpen(false);
                onOpenAuth('login');
              }}
            >
              Sign in
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-[44px] w-full"
              onClick={() => {
                setMobileOpen(false);
                onEnterWorkspace();
              }}
            >
              Workspace
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter({
  onNavigatePath,
  onOpenAuth,
}: {
  onNavigatePath: (path: string) => void;
  onOpenAuth: (mode: 'register' | 'login', defaultPlan?: string) => void;
}) {
  const linkClass = 'inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950';

  const navLink = (href: string, label: string) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigatePath(href);
      }}
      className={linkClass}
    >
      {label}
    </a>
  );

  return (
    <footer className="border-t border-slate-200 py-12 bg-slate-50 text-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
        <div className="col-span-2 md:col-span-1 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <QrCode className="w-4 h-4 text-teal-700" />
            Staywise
          </div>
          <p className="text-slate-600 leading-relaxed">
            Mobile guest welcome books, rate-limited door & Wi-Fi access vaults, and turnover coordination—100% free during Early Access.
          </p>
          <p className="text-slate-600">Staywise Software LLC · Austin, TX</p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900 mb-2">Platform</div>
          <ul className="space-y-1">
            <li>{navLink('/features', 'All Features')}</li>
            <li>{navLink('/guest-guidebook', 'Guest Welcome Books')}</li>
            <li>{navLink('/turnover-management', 'Turnover Management')}</li>
            <li>{navLink('/templates', '12 Guidebook Templates')}</li>
          </ul>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900 mb-2">Explore & Access</div>
          <ul className="space-y-1">
            <li>{navLink('/pricing', 'Free Early Access Plans')}</li>
            <li>{navLink('/security', 'Security Architecture')}</li>
            <li>
              <a href="/guest/barton-creek-modern?code=STAY-4821" target="_blank" rel="noreferrer" className={linkClass}>
                Unlocked Guest Demo
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenAuth('register', 'Starter')}
                className={`${linkClass} text-left`}
              >
                Create Free Workspace
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900 mb-2">Legal & Contact</div>
          <ul className="space-y-1">
            <li>{navLink('/privacy', 'Privacy Policy')}</li>
            <li>{navLink('/terms', 'Terms of Service')}</li>
            <li className="py-1.5 text-slate-600">privacy@staywise.app</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <span>© 2026 Staywise Software LLC. All rights reserved.</span>
        <span>Built for hospitality operators worldwide</span>
      </div>
    </footer>
  );
}
