import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button, Card } from '../components/ui';

export function NotFoundPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center mx-auto">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-mono font-semibold text-teal-700 uppercase tracking-wider">HTTP 404</div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Page Not Found</h1>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            The requested URL does not match an active STAYWISE workspace view, public page, or published property Welcome Book.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button variant="primary" size="sm" onClick={() => onNavigate('/')}>
            <ArrowLeft className="w-3.5 h-3.5" /> Return Home
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('/app')}>
            Open Operations Workspace
          </Button>
        </div>
      </Card>
    </div>
  );
}
