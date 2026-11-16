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
    { label: 'Welcome Books', href: '/#guidebooks' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
  ];

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/#')) {
      if (currentPath !== '/') {
        e.preventDefault();
        onNavigatePath('/');
        setTimeout(() => {
          const el = document.getElementById(href.slice(2));
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
      return;
    }
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

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-[13px] font-medium text-slate-700">
          {navItems.map((item) => {
            const active = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className={`py-2 transition-colors hover:text-slate-950 ${
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
            Create Workspace
          </Button>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <Button variant="primary" size="md" className="min-h-[44px]" onClick={() => onOpenAuth('register', 'Starter')}>
            Get Started
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
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-lg">
          <nav aria-label="Mobile navigation" className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-slate-800 hover:bg-slate-50"
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
  return (
    <footer className="border-t border-slate-200 py-12 bg-slate-50 text-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
        <div className="col-span-2 md:col-span-1 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <QrCode className="w-4 h-4 text-teal-700" />
            Staywise
          </div>
          <p className="text-slate-600 leading-relaxed">
            Mobile guest welcome books, rate-limited door & Wi-Fi access vaults, and turnover coordination for short-term rental teams worldwide.
          </p>
          <p className="text-slate-600">
            Staywise Software LLC · Austin, TX
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900 mb-2">Product</div>
          <ul className="space-y-1">
            <li>
              <a
                href="/features"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath('/features');
                }}
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Features & Workflows
              </a>
            </li>
            <li>
              <a
                href="/pricing"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath('/pricing');
                }}
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Early Access Pricing
              </a>
            </li>
            <li>
              <a
                href="/security"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath('/security');
                }}
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Security & Encryption
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900 mb-2">Live Demos</div>
          <ul className="space-y-1">
            <li>
              <a
                href="/guest/barton-creek-modern?code=STAY-4821"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Unlocked Guest Portal
              </a>
            </li>
            <li>
              <a
                href="/guest/barton-creek-modern"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Pre-Arrival View (Locked)
              </a>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenAuth('register', 'Starter')}
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950 text-left"
              >
                Create Free Workspace
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-1">
          <div className="font-semibold text-slate-900 mb-2">Legal & Contact</div>
          <ul className="space-y-1">
            <li>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath('/privacy');
                }}
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath('/terms');
                }}
                className="inline-flex items-center min-h-[36px] text-slate-600 hover:text-slate-950"
              >
                Terms of Service
              </a>
            </li>
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
