import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { app, injectNoIndexMeta, isKnownSpaRoute, isNoIndexRoute } from './app.js';

// Local static images directory (Vercel serves public/images directly from dist/images via CDN)
app.use(
  '/images',
  express.static(path.resolve(process.cwd(), 'public', 'images'), {
    maxAge: '7d',
    etag: true,
  })
);

const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexHtmlTemplate = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    app.use(
      express.static(distDir, {
        index: false,
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      if (/^\/(assets|images)\//.test(req.path)) {
        return res.status(404).type('text/plain').send('Asset not found');
      }
      const status = isKnownSpaRoute(req.path) ? 200 : 404;
      const shouldNoIndex = status === 404 || isNoIndexRoute(req.path);
      if (shouldNoIndex) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
      }
      res.setHeader('Cache-Control', 'no-cache');
      const html = shouldNoIndex ? injectNoIndexMeta(indexHtmlTemplate) : indexHtmlTemplate;
      res.status(status).type('text/html').send(html);
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true,
      },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      const p = req.path;
      const isInternalOrAsset =
        p.startsWith('/@') ||
        p.startsWith('/src/') ||
        p.startsWith('/node_modules/') ||
        p.startsWith('/images/') ||
        p === '/favicon.svg' ||
        p === '/robots.txt' ||
        p === '/sitemap.xml' ||
        /\.[a-zA-Z0-9]{2,6}$/.test(p);

      if (req.method === 'GET' && !isInternalOrAsset) {
        const known = isKnownSpaRoute(p);
        const shouldNoIndex = !known || isNoIndexRoute(p);
        if (shouldNoIndex) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        }
        if (!known) {
          try {
            const template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
            const html = injectNoIndexMeta(await vite.transformIndexHtml(req.originalUrl, template));
            res.status(404).set({ 'Content-Type': 'text/html' }).end(html);
            return;
          } catch (e) {
            return next(e);
          }
        }
      }
      next();
    });

    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`STAYWISE listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start STAYWISE server:', err);
  process.exit(1);
});
