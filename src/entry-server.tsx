import React from 'react';
import { renderToString } from 'react-dom/server';
import { renderFallbackNotFound, renderPublicPage } from './routes';

const noop = () => {};

export function renderRouteHtml(routePath: string): string {
  const clean = (routePath || '/').split('?')[0].replace(/\/+$/, '') || '/';

  if (clean === '/auth') {
    return renderToString(
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6">
        <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-lg p-6 space-y-3">
          <h1 className="text-base font-bold text-slate-900">Sign In or Create Free Staywise Workspace</h1>
          <p className="text-xs text-slate-600">
            100% free full access to guest welcome books, AES-256 lock vaults, and turnover checklists—no card required.
          </p>
          <p className="text-xs">
            <a href="/" className="text-teal-800 underline">Return to Staywise home</a>
          </p>
        </div>
      </div>
    );
  }

  const publicEl = renderPublicPage({
    pathname: clean,
    onNavigatePath: noop,
    onEnterWorkspace: noop,
    onOpenAuth: noop,
  });

  if (publicEl) {
    return renderToString(publicEl);
  }

  return renderToString(renderFallbackNotFound(noop));
}
