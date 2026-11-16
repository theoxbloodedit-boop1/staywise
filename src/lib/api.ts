import { getNeonJwtToken } from './neonAuth';
import type { SessionContext } from './types';

const ORG_STORAGE_KEY = 'staywise_active_org';

let currentContext: SessionContext = {
  organizationId: '',
  userId: '',
  actorName: '',
  actorRole: 'Organization Owner',
};

let activeOrganizationId: string =
  typeof window !== 'undefined' ? window.localStorage.getItem(ORG_STORAGE_KEY) || '' : '';

export function setApiContext(ctx: SessionContext) {
  currentContext = ctx;
  if (ctx.organizationId) {
    setActiveOrganizationId(ctx.organizationId);
  }
}

export function getApiContext(): SessionContext {
  return currentContext;
}

export function setActiveOrganizationId(orgId: string) {
  activeOrganizationId = orgId;
  if (typeof window !== 'undefined') {
    if (orgId) {
      window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
    } else {
      window.localStorage.removeItem(ORG_STORAGE_KEY);
    }
  }
}

export function getActiveOrganizationId(): string {
  return activeOrganizationId;
}

async function buildAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = await getNeonJwtToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (activeOrganizationId) {
    headers['X-Staywise-Org'] = activeOrganizationId;
  }
  return headers;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await buildAuthHeaders(options.headers as Record<string, string> | undefined);

  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    const err: any = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }

  return data as T;
}

export async function downloadWithAuth(path: string, fallbackFilename: string) {
  const headers = await buildAuthHeaders();
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function uploadEvidencePhoto(
  dataUrl: string,
  filename = 'photo',
  guestAuth?: { slug: string; code: string }
): Promise<string> {
  const headers = await buildAuthHeaders();
  const res = await fetch('/api/uploads', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      dataUrl,
      filename,
      ...(guestAuth ? { slug: guestAuth.slug, code: guestAuth.code } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Photo upload failed.');
  }
  return data.url as string;
}
