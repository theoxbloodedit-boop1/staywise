import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, ExternalLink, Printer } from 'lucide-react';
import { Button, Modal } from './ui';
import type { Property } from '../lib/types';

export function QRModal({
  open,
  onClose,
  property,
}: {
  open: boolean;
  onClose: () => void;
  property: Property | null;
}) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const guestUrl = property ? `${window.location.origin}/guest/${property.slug}` : '';

  useEffect(() => {
    if (!open || !guestUrl) return;
    QRCode.toString(guestUrl, {
      type: 'svg',
      width: 220,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((svg) => setSvgMarkup(svg))
      .catch(() => setSvgMarkup(''));
  }, [open, guestUrl]);

  if (!property) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${property.slug}-qr-welcome-book.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`QR Access Card — ${property.name}`}
      subtitle="Guests scan to open the mobile-first Welcome Book instantly — zero app download required."
    >
      <div className="space-y-4">
        <div className="border border-slate-200 rounded-lg p-6 bg-slate-50 flex flex-col items-center text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 mb-1">
            STAYWISE DIGITAL WELCOME BOOK
          </div>
          <div className="text-base font-semibold text-slate-900">{property.name}</div>
          <div className="text-xs text-slate-500 mb-4">
            {property.city}, {property.state} ({property.country})
          </div>
          <div
            className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs"
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
          <p className="text-xs text-slate-600 mt-3 max-w-xs">
            Scan with your phone camera for Wi-Fi, check-in steps, house rules, local dining & instant concierge support.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={guestUrl}
            className="flex-1 h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-700"
          />
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadSvg}>
              <Download className="w-3.5 h-3.5" />
              Download SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/print/${property.id}`, '_blank')}
            >
              <Printer className="w-3.5 h-3.5" />
              Printable PDF View
            </Button>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open(`/guest/${property.slug}`, '_blank')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Guest Portal
          </Button>
        </div>
      </div>
    </Modal>
  );
}
