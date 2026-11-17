import { AuthorizationError } from './lib/authorization.js';
import { FieldEncryptionError } from './lib/field-encryption.js';
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { db, ensureDbReady, isDatabaseConfigured } from './db.js';
import { ah, isOperationalRole, resolveGuestVerification, resolveSessionActor } from './domain.js';
import { type MediaPrincipal } from './lib/private-media.js';
import { createMediaRouter } from './routes/media.js';
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
import { createControlCenterRouter } from './routes/controlCenter.js';
import { platformCrmRouter } from './routes/platformCrm.js';
import { APP_SHELL_HTML, NOT_FOUND_HTML, ROUTE_HTML } from './generated-shell.js';

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
    frameguard: isProd ? { action: 'deny' } : false,
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
            frameAncestors: ["'none'"],
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

// Dynamic host-aware SEO fallback files (CDN also serves dist/robots.txt & dist/sitemap.xml)
app.get('/robots.txt', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  res
    .type('text/plain')
    .send(
      `User-agent: *\nAllow: /\nAllow: /features\nAllow: /guest-guidebook\nAllow: /turnover-management\nAllow: /templates\nAllow: /pricing\nAllow: /security\nAllow: /privacy\nAllow: /terms\nDisallow: /app/\nDisallow: /auth\nDisallow: /guest/\nDisallow: /print/\nDisallow: /api/\nDisallow: /uploads/\n\nSitemap: ${origin}/sitemap.xml\n`
    );
});

app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const urls = [
    ['/', 'weekly', '1.0'],
    ['/features', 'weekly', '0.9'],
    ['/guest-guidebook', 'weekly', '0.9'],
    ['/turnover-management', 'weekly', '0.9'],
    ['/templates', 'weekly', '0.9'],
    ['/pricing', 'weekly', '0.9'],
    ['/security', 'monthly', '0.8'],
    ['/privacy', 'monthly', '0.5'],
    ['/terms', 'monthly', '0.5'],
  ]
    .map(([p, freq, prio]) => `  <url><loc>${origin}${p}</loc><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`)
    .join('\n');
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

// Minimal public health probe (never exposes internal config flags)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Ensure Neon PostgreSQL schema & initial seed exist on first API call
app.use(
  '/api',
  ah(async (req, res, next) => {
    if (req.path === '/health' || req.path === '/control-center' || req.path.startsWith('/control-center/')) return next();
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

async function resolveMediaPrincipal(req: express.Request): Promise<MediaPrincipal> {
  const actor = await resolveSessionActor(req);
  if (actor) return { actor };
  const slug = req.body?.slug || req.headers['x-staywise-guest-slug'];
  const code = req.body?.code || req.headers['x-staywise-guest-code'];
  if (typeof slug !== 'string' || typeof code !== 'string') throw new AuthorizationError(403, 'MEDIA_AUTH_REQUIRED');
  const prop = await db.queryOne<any>('SELECT id,organization_id,timezone FROM properties WHERE slug=$1 AND archived=0',[slug]);
  if (!prop) throw new AuthorizationError(404,'MEDIA_NOT_FOUND');
  const verified = await resolveGuestVerification(prop,code);
  if (!verified.valid) throw new AuthorizationError(403,'MEDIA_AUTH_REQUIRED');
  return { guest: { organizationId:prop.organization_id,propertyId:prop.id,reservationId:verified.reservation.id } };
}

app.use('/api', createMediaRouter(db,resolveMediaPrincipal,uploadLimiter));

app.use('/api/auth', authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/guidebooks', guidebooksRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/cleaning', operationsRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/inspections', inspectionsRouter);
app.use('/api/guest', guestRouter);
app.use('/api/admin', adminRouter);
app.use('/api/control-center', createControlCenterRouter(db));
app.use('/api/platform-crm', platformCrmRouter);

// Strict HTTP 404 for unknown API endpoints
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

export function isKnownSpaRoute(urlPath: string): boolean {
  const clean = urlPath.split('?')[0];
  if (
    clean === '/' ||
    clean === '/features' ||
    clean === '/guest-guidebook' ||
    clean === '/turnover-management' ||
    clean === '/templates' ||
    clean === '/pricing' ||
    clean === '/security' ||
    clean === '/auth' ||
    clean === '/privacy' ||
    clean === '/terms'
  ) {
    return true;
  }
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
    '/app/crm-admin',
    '/app/control-center',
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
  if (html.includes('name="robots"')) return html;
  return html.replace('</head>', '  <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>');
}

export function serveSpaOr404(req: express.Request, res: express.Response) {
  const clean = req.path.replace(/\/+$/, '') || '/';
  if (/^\/(assets|images)\//.test(req.path)) {
    return res.status(404).type('text/plain').send('Asset not found');
  }
  const known = isKnownSpaRoute(clean);
  const shouldNoIndex = !known || isNoIndexRoute(clean);
  if (shouldNoIndex) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  res.setHeader('Cache-Control', 'no-cache');

  if (!known) {
    return res
      .status(404)
      .type('text/html')
      .send(NOT_FOUND_HTML || '<!doctype html><html><head><meta name="robots" content="noindex, nofollow" /><title>404 Not Found | Staywise</title></head><body><h1>Page not found</h1><p><a href="/">Return home</a></p></body></html>');
  }

  const html = ROUTE_HTML[clean] || APP_SHELL_HTML;
  return res.status(200).type('text/html').send(html);
}

// In Vercel serverless mode, serve dynamic SPA routes (/app*, /guest/*, /print/*) & real HTTP 404s
if (process.env.VERCEL === '1') {
  app.get('*', serveSpaOr404);
}

// Structured JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload too large (max 10 MB).' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON request body.' });
  }
  if (err instanceof AuthorizationError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err instanceof FieldEncryptionError) {
    return res.status(503).json({ error: err.message, code: err.code });
  }
  // Never log request bodies, SQL parameters, bearer tokens or decrypted values.
  console.error('[STAYWISE ERROR]', { name: err?.name || 'Error' });
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default app;
