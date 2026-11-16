import crypto from 'crypto';
import { put } from '@vercel/blob';
import { db } from './db.js';

const MIME_MAP: Record<string, { ext: string; mime: string }> = {
  png: { ext: 'png', mime: 'image/png' },
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
};

export async function saveUploadedImage(
  dataUrl: string,
  opts: { prefix?: string; organizationId?: string | null; propertyId?: string | null } = {}
): Promise<string> {
  const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('Only PNG, JPEG, WEBP, or GIF image uploads are supported.');
  }

  const fmt = MIME_MAP[match[1].toLowerCase()];
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) {
    throw new Error('Uploaded image exceeds 5 MB limit.');
  }

  const safePrefix = (opts.prefix || 'ev').replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'ev';
  const filename = `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fmt.ext}`;

  // Primary: Vercel Blob when BLOB_READ_WRITE_TOKEN is configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`staywise/${filename}`, buf, {
      access: 'public',
      contentType: fmt.mime,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  // Fallback: Serverless-safe binary BYTEA storage in Neon PostgreSQL
  const id = `astimg-${crypto.randomUUID().slice(0, 12)}`;
  await db.execute(
    `INSERT INTO uploaded_assets (id, organization_id, property_id, filename, mime_type, size_bytes, data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      opts.organizationId || null,
      opts.propertyId || null,
      filename,
      fmt.mime,
      buf.length,
      buf,
      new Date().toISOString(),
    ]
  );

  return `/api/uploads/${id}`;
}

export async function readUploadedAsset(id: string): Promise<{
  id: string;
  filename: string;
  mime_type: string;
  data: Buffer;
} | undefined> {
  return db.queryOne(`SELECT id, filename, mime_type, data FROM uploaded_assets WHERE id = $1`, [id]);
}

export async function getNeonDatabaseOverview(organizationId: string) {
  const [props, resv, clean, inc, insp, assets] = await Promise.all([
    db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM properties WHERE organization_id = $1', [organizationId]),
    db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM reservations WHERE organization_id = $1', [organizationId]),
    db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM cleaning_tasks WHERE organization_id = $1', [organizationId]),
    db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM incidents WHERE organization_id = $1', [organizationId]),
    db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM inspections WHERE organization_id = $1', [organizationId]),
    db.queryOne<{ c: number }>('SELECT COUNT(*)::int as c FROM uploaded_assets WHERE organization_id = $1', [organizationId]),
  ]);

  return {
    provider: 'Neon Serverless PostgreSQL',
    pointInTimeRecovery: true,
    mediaStorage: process.env.BLOB_READ_WRITE_TOKEN ? 'Vercel Blob' : 'Neon PostgreSQL BYTEA',
    counts: {
      properties: props?.c ?? 0,
      reservations: resv?.c ?? 0,
      cleaningTasks: clean?.c ?? 0,
      incidents: inc?.c ?? 0,
      inspections: insp?.c ?? 0,
      uploadedAssets: assets?.c ?? 0,
    },
    checkedAt: new Date().toISOString(),
  };
}
