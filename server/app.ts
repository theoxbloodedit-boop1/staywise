import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { db, ensureDbReady, isDatabaseConfigured } from './db.js';
import { ah, isOperationalRole, resolveGuestVerification, resolveSessionActor } from './domain.js';
import { readUploadedAsset, saveUploadedImage } from './backup.js';
import { createRateLimiter, getNeonAuthBaseUrl } from './security.js';
import { authRouter } from './routes/auth.js';
import { propertiesRouter } from './routes/properties.js';
import { guidebooksRouter } from './routes/guidebooks.js';
import { reservationsRouter } from './routes/reservations.js';
import { operationsRouter } from './routes/operations.js';
import { incidentsRouter } from './routes/incidents.js';
import { inspectionsRouter } from './routes/inspections.js';
import { guestRouter } from './routes/guest.js';
import { adminRouter } from './routes/admin.js';

export const app = express();
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production';

// Enforce HTTPS in production behind reverse proxy
if (isProd && process.env.FORCE_HTTPS !== 'false') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
}

// Security Headers (compatible with Neon Auth endpoints, Vercel Blob, and bundled local assets)
app.use(
  helmet({
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https://*.public.blob.vercel-storage.com'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", 'https://*.neon.tech', 'https://*.neon.build'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: null,
            upgradeInsecureRequests: null,
          },
        }
      : false,
  })
);

app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Global gentle API rate limit
const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 240,
  prefix: 'api',
});
app.use('/api', apiLimiter);

const uploadLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  prefix: 'uploads',
});

// Dynamic host-aware SEO files
app.get('/robots.txt', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nAllow: /privacy\nAllow: /terms\nDisallow: /app/\nDisallow: /auth\nDisallow: /guest/\nDisallow: /print/\nDisallow: /api/\nDisallow: /uploads/\n\nSitemap: ${origin}/sitemap.xml\n`
    );
});

app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res
    .type('application/xml')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>${origin}/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n  <url><loc>${origin}/terms</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n</urlset>\n`
    );
});

// Health & deployment readiness probe (never requires DB connection to respond)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'STAYWISE API',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node',
    databaseConfigured: isDatabaseConfigured(),
    neonAuthConfigured: Boolean(getNeonAuthBaseUrl()),
    blobStorageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    timestamp: new Date().toISOString(),
  });
});

// Ensure Neon PostgreSQL schema & initial seed exist on first API call
app.use(
  '/api',
  ah(async (req, res, next) => {
    if (req.path === '/health') return next();
    if (!isDatabaseConfigured()) {
      return res.status(503).json({
        error: 'Database is not configured. Set DATABASE_URL to your Neon PostgreSQL connection string.',
        code: 'DATABASE_NOT_CONFIGURED',
      });
    }
    await ensureDbReady();
    next();
  })
);

// Serve uploaded images stored in Neon PostgreSQL BYTEA fallback
app.get(
  '/api/uploads/:id',
  ah(async (req, res) => {
    const asset = await readUploadedAsset(String(req.params.id));
    if (!asset) return res.status(404).type('text/plain').send('Asset not found');
    res.setHeader('Content-Type', asset.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.send(asset.data);
  })
);

// Dedicated image upload endpoint (Vercel Blob primary, Neon PostgreSQL BYTEA fallback)
app.post(
  '/api/uploads',
  uploadLimiter,
  ah(async (req, res) => {
    const actor = await resolveSessionActor(req);
    const { dataUrl, filename, slug, code } = req.body || {};

    let authorized = Boolean(actor && isOperationalRole(actor.actorRole));
    let orgId = actor?.organizationId || null;
    let propId: string | null = null;

    if (!authorized && slug && code) {
      const prop = await db.queryOne<any>(
        'SELECT id, organization_id, timezone FROM properties WHERE slug = $1 AND archived = 0',
        [String(slug)]
      );
      if (prop) {
        const verification = await resolveGuestVerification(prop, String(code));
        if (verification.valid) {
          authorized = true;
          orgId = prop.organization_id;
          propId = prop.id;
        }
      }
    }

    if (!authorized) {
      return res.status(401).json({
        error: 'Authentication or verified active stay code required to upload evidence photos.',
      });
    }

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Image dataUrl is required.' });
    }

    try {
      const url = await saveUploadedImage(dataUrl, {
        prefix: typeof filename === 'string' ? filename : 'photo',
        organizationId: orgId,
        propertyId: propId,
      });
      res.status(201).json({ url });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Invalid image upload.' });
    }
  })
);

app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/guidebooks', guidebooksRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/cleaning', operationsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/guest', guestRouter);
app.use('/api/admin', adminRouter);

// Strict HTTP 404 for unknown API endpoints
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

export function isKnownSpaRoute(urlPath: string): boolean {
  const clean = urlPath.split('?')[0];
  if (clean === '/' || clean === '/auth' || clean === '/privacy' || clean === '/terms') return true;
  if (/^\/guest\/[^/]+$/.test(clean)) return true;
  if (/^\/print\/[^/]+$/.test(clean)) return true;
  const knownAppPaths = [
    '/app',
    '/app/dashboard',
    '/app/properties',
    '/app/guidebooks',
    '/app/reservations',
    '/app/cleaning',
    '/app/incidents',
    '/app/inspections',
    '/app/ai-console',
    '/app/team',
    '/app/automations',
    '/app/feedback',
    '/app/audit-logs',
  ];
  return knownAppPaths.includes(clean);
}

export function isNoIndexRoute(urlPath: string): boolean {
  const clean = urlPath.split('?')[0];
  return (
    clean === '/auth' ||
    clean.startsWith('/app') ||
    clean.startsWith('/guest/') ||
    clean.startsWith('/print/')
  );
}

export function injectNoIndexMeta(html: string): string {
  return html.replace('</head>', '  <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>');
}

// Structured JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large (max 10 MB).' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON request body.' });
  }
  console.error('[STAYWISE ERROR]', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default app;
