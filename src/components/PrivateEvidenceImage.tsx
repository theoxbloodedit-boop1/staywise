import React, { useEffect, useState } from 'react';
import { buildAuthHeaders, getActiveOrganizationId } from '../lib/api';

export function PrivateEvidenceImage({ mediaId, alt, className }: { mediaId: string; alt: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const orgId = getActiveOrganizationId();
  const [source,setSource] = useState('');
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    let disposed = false, objectUrl = '';
    const controller = new AbortController();
    setSource(''); setFailed(false);
    if (!/^media-[0-9a-f-]{36}$/.test(mediaId)) { setFailed(true); return; }
    void (async () => {
      try {
        const headers = await buildAuthHeaders();
        const response = await fetch(`/api/media/${encodeURIComponent(mediaId)}`, { headers, credentials:'include', cache:'no-store', signal:controller.signal });
        if (!response.ok) throw new Error('Private evidence unavailable');
        const blob = await response.blob();
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob); setSource(objectUrl);
      } catch { if (!disposed) setFailed(true); }
    })();
    return () => { disposed=true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  },[mediaId,orgId]);
  if (failed) return <span role="status" className={className}>Private or historical evidence unavailable</span>;
  if (!source) return <span role="status" className={className}>Loading private evidence…</span>;
  return <img src={source} alt={alt} className={className} />;
}
