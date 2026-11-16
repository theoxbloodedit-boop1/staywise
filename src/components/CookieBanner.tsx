import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from './ui';

const CONSENT_KEY = 'staywise_cookie_consent_v1';

export function CookieBanner({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  const choose = (choice: 'essential' | 'accepted') => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, savedAt: new Date().toISOString() }));
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie and Privacy Notice"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          Cookies & Session Privacy
        </div>
        <button
          onClick={() => choose('essential')}
          aria-label="Dismiss cookie notice"
          className="text-slate-400 hover:text-slate-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        STAYWISE uses strictly necessary encrypted <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">HttpOnly</code> cookies to secure workspace sessions—never third-party ad trackers. Review our{' '}
        <button onClick={() => onNavigate('/privacy')} className="text-teal-700 font-medium hover:underline">
          Privacy Policy
        </button>{' '}
        and{' '}
        <button onClick={() => onNavigate('/terms')} className="text-teal-700 font-medium hover:underline">
          Terms of Service
        </button>
        .
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => choose('essential')}>
          Essential Only
        </Button>
        <Button size="sm" variant="primary" onClick={() => choose('accepted')}>
          Accept
        </Button>
      </div>
    </div>
  );
}
