import fs from 'fs';
import path from 'path';

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://staywise-alpha.vercel.app').replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);

const INDEXABLE_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/features', changefreq: 'weekly', priority: '0.9' },
  { path: '/guest-guidebook', changefreq: 'weekly', priority: '0.9' },
  { path: '/turnover-management', changefreq: 'weekly', priority: '0.9' },
  { path: '/templates', changefreq: 'weekly', priority: '0.9' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.9' },
  { path: '/security', changefreq: 'monthly', priority: '0.8' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'monthly', priority: '0.5' },
];

const urlsXml = INDEXABLE_ROUTES.map(
  (r) =>
    `  <url>\n    <loc>${SITE_ORIGIN}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
).join('\n');

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;

const distDir = path.resolve(process.cwd(), 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
console.log(`Generated dist/sitemap.xml with ${INDEXABLE_ROUTES.length} URLs.`);
