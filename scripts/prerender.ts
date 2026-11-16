import fs from 'fs';
import path from 'path';

interface RouteSpec {
  file: string;
  routePath: string;
  title: string;
  description: string;
  noindex?: boolean;
  is404?: boolean;
  h1: string;
  eyebrow: string;
  lead: string;
  bodyHtml: string;
  jsonLd?: object[];
}

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://staywise-alpha.vercel.app').replace(/\/+$/, '');
const OG_IMAGE = `${SITE_ORIGIN}/images/barton-creek-1280.webp`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSemanticShell(spec: RouteSpec): string {
  return `<div class="sw-prerender" style="font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;background:#fff;min-height:100vh">
  <header style="border-bottom:1px solid #e2e8f0;padding:16px 24px;max-width:1280px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px">
    <a href="/" style="font-weight:700;font-size:18px;color:#0f172a;text-decoration:none">Staywise</a>
    <nav aria-label="Primary" style="display:flex;gap:20px;font-size:14px">
      <a href="/features" style="color:#334155;text-decoration:none">Features</a>
      <a href="/pricing" style="color:#334155;text-decoration:none">Pricing</a>
      <a href="/security" style="color:#334155;text-decoration:none">Security</a>
      <a href="/auth" style="color:#0f172a;font-weight:600;text-decoration:none">Sign In</a>
    </nav>
  </header>
  <main style="max-width:1024px;margin:0 auto;padding:48px 24px">
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#115e59;margin:0 0 10px">${escapeHtml(spec.eyebrow)}</p>
    <h1 style="font-size:36px;line-height:1.15;font-weight:700;margin:0 0 16px">${escapeHtml(spec.h1)}</h1>
    <p style="font-size:17px;line-height:1.6;color:#475569;max-width:680px;margin:0 0 28px">${escapeHtml(spec.lead)}</p>
    ${spec.bodyHtml}
  </main>
  <footer style="border-top:1px solid #e2e8f0;padding:24px;max-width:1280px;margin:40px auto 0;font-size:13px;color:#475569;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <span>© ${new Date().getFullYear()} Staywise Software LLC · privacy@staywise.app</span>
    <span style="display:flex;gap:16px">
      <a href="/features" style="color:#334155">Features</a>
      <a href="/pricing" style="color:#334155">Pricing</a>
      <a href="/security" style="color:#334155">Security</a>
      <a href="/privacy" style="color:#334155">Privacy</a>
      <a href="/terms" style="color:#334155">Terms</a>
    </span>
  </footer>
</div>`;
}

const ROUTES: RouteSpec[] = [
  {
    file: 'index.html',
    routePath: '/',
    title: 'Staywise — Guest Welcome Books & Property Operations',
    description:
      'Mobile guest welcome books, AES-256 stay-gated door codes, grounded guest assistance, and photo-verified turnover checklists for short-term rental hosts.',
    eyebrow: 'Early Access · Guest Welcome Books & Turnover Ops',
    h1: 'Your guests know the Wi-Fi before they park. Your team knows every home is ready.',
    lead: 'Stop answering late-night lockbox texts or guessing whether a turnover actually got done. Staywise puts mobile welcome books, stay-gated door codes, and photo-verified checklists in one calm workspace.',
    bodyHtml: `
      <p><a href="/auth?plan=Starter">Create Free Workspace</a> · <a href="/guest/barton-creek-modern?code=STAY-4821">Open Live Sample Welcome Book</a></p>
      <h2>Core Capabilities</h2>
      <ul>
        <li><strong>No App to Download:</strong> Mobile welcome books open directly in Safari or Chrome from a QR card or booking link.</li>
        <li><strong>AES-256-GCM Door &amp; Wi-Fi Vault:</strong> Entry PINs stay masked until a guest verifies an active stay code inside their arrival window.</li>
        <li><strong>Photo-Verified Turnovers:</strong> Cleaners upload room evidence photos before managers flip readiness status.</li>
        <li><strong>Regional Property Standards:</strong> Configure currency, °F/°C, date formats, and local emergency numbers per property.</li>
      </ul>
      <h2>Interactive Sample Welcome Books</h2>
      <ul>
        <li><a href="/guest/barton-creek-modern?code=STAY-4821">The Barton Creek Modern (Austin, TX)</a></li>
        <li><a href="/guest/vista-chino-villa?code=STAY-7714">Vista Chino Desert Villa (Palm Springs, CA)</a></li>
        <li><a href="/guest/newport-harbor-cottage?code=STAY-3198">Newport Harbor Cottage (Newport, RI)</a></li>
      </ul>
      <h2>Early Access Pricing</h2>
      <p>Starter (up to 2 properties), Professional (up to 10 properties), and Portfolio (up to 25 properties) are $0/month during Early Access with no card required.</p>
    `,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Staywise',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE_ORIGIN,
        description:
          'Mobile guest welcome books, AES-256 stay-gated door codes, and photo-verified turnover operations for short-term rental hosts.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Early Access (Alpha) — Starter, Professional, and Portfolio tiers free with no card required.',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Staywise Software LLC',
          email: 'privacy@staywise.app',
          url: SITE_ORIGIN,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Do guests have to download an app or create a login?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. Every welcome book opens in Safari or Chrome from a booking link or QR card, while smart-lock PINs unlock with a stay code.',
            },
          },
          {
            '@type': 'Question',
            name: 'How are door codes and Wi-Fi passwords protected?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Access secrets are encrypted at rest with AES-256-GCM and stay masked until a guest verifies an active booking code, backed by PostgreSQL rate limiting.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Staywise charge my card during Early Access?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. All tiers activate at $0/month during Early Access without requiring payment details.',
            },
          },
        ],
      },
    ],
  },
  {
    file: 'features.html',
    routePath: '/features',
    title: 'Features — Mobile Welcome Books, Lock Vault & Turnover Ops | Staywise',
    description:
      'Explore Staywise digital guidebooks, QR and printable PDF exports, rate-limited smart-lock vaults, grounded AI assistant, and photo-verified cleaning checklists.',
    eyebrow: 'Platform Overview',
    h1: 'Every workflow between guest check-in and property turnover',
    lead: 'Staywise connects guest-facing welcome books with the internal cleaning, inspection, and maintenance steps your team runs between stays.',
    bodyHtml: `
      <ul>
        <li>8-Section Mobile Welcome Books &amp; Printable QR PDFs</li>
        <li>Time-Gated AES-256-GCM Smart-Lock &amp; Wi-Fi Vault</li>
        <li>Grounded Guest Assistant with Host Schedule Escalation</li>
        <li>Photo-Verified Cleaning Checklists &amp; Room Inspections</li>
        <li>Maintenance Work Orders Linked to Guest Support Tickets</li>
      </ul>
    `,
  },
  {
    file: 'pricing.html',
    routePath: '/pricing',
    title: 'Pricing — Free During Early Access | Staywise',
    description:
      'Starter, Professional, and Portfolio plans activate at $0/month during Staywise Early Access with no credit card required.',
    eyebrow: 'Early Access Pricing',
    h1: 'Free during Alpha. Transparent limits at launch.',
    lead: 'Billing checkout is disabled during Early Access. Choose Starter (2 units), Professional (10 units), or Portfolio (25 units) at $0/month with no card required.',
    bodyHtml: `
      <ul>
        <li><strong>Starter:</strong> $0/mo in Alpha (planned $19/mo) · Up to 2 properties · 100 AI answers/mo</li>
        <li><strong>Professional:</strong> $0/mo in Alpha (planned $49/mo) · Up to 10 properties · 500 AI answers/mo</li>
        <li><strong>Portfolio:</strong> $0/mo in Alpha (planned $99/mo) · Up to 25 properties · 2,000 AI answers/mo</li>
      </ul>
    `,
  },
  {
    file: 'security.html',
    routePath: '/security',
    title: 'Security & Encryption — Staywise Hospitality Ops',
    description:
      'How Staywise protects residential door PINs, Wi-Fi secrets, and multi-tenant workspaces with AES-256-GCM encryption, EdDSA/JWKS auth, and PostgreSQL lockouts.',
    eyebrow: 'Security & Data Protection',
    h1: 'How Staywise protects door codes, guest records, and tenant workspaces',
    lead: 'Property guidebooks carry sensitive residential entry secrets. Staywise enforces encryption at rest, brute-force lockouts, tenant scoping, and self-service erasure.',
    bodyHtml: `
      <ul>
        <li><strong>AES-256-GCM Secret Vault:</strong> Access codes encrypted before storage in Neon PostgreSQL.</li>
        <li><strong>Rate-Limited Stay Codes:</strong> 8-character cryptographic codes with PostgreSQL lockout after 8 invalid guesses.</li>
        <li><strong>Strict Tenant Isolation &amp; RBAC:</strong> Neon Auth EdDSA/JWKS verification and organization/property role scoping.</li>
        <li><strong>JSON Export &amp; Account Erasure:</strong> Self-service export and one-click account deletion in Billing &amp; Settings.</li>
      </ul>
    `,
  },
  {
    file: 'privacy.html',
    routePath: '/privacy',
    title: 'Privacy Policy | Staywise',
    description:
      'Staywise Software LLC privacy notice covering data controller identity, subprocessors (Vercel and Neon), retention schedules, and self-service deletion.',
    eyebrow: 'Legal & Compliance',
    h1: 'Privacy Policy — Staywise Software LLC',
    lead: 'Effective November 15, 2026. Covers operator contact (privacy@staywise.app), AES-256-GCM encryption, Neon/Vercel subprocessors, retention schedules, and GDPR/CCPA rights.',
    bodyHtml: `
      <p>Staywise Software LLC, 600 Congress Ave, Floor 14, Austin, TX 78701, USA. Data Protection contact: privacy@staywise.app.</p>
      <p>Account holders can export organization JSON or permanently delete their account and Neon Auth record from Workspace → Billing &amp; Settings.</p>
    `,
  },
  {
    file: 'terms.html',
    routePath: '/terms',
    title: 'Terms of Service | Staywise',
    description:
      'Commercial Terms of Service, Early Access billing terms, acceptable use, and service liability for Staywise Software LLC.',
    eyebrow: 'Legal & Compliance',
    h1: 'Terms of Service — Staywise Software LLC',
    lead: 'Effective November 15, 2026. Governing law: State of Delaware, USA. Early Access subscriptions operate at $0/month with zero automated charges.',
    bodyHtml: `
      <p>No payment details are collected during Alpha. When paid billing launches, customers receive 30 days written notice and a 14-day refund window on initial paid renewals.</p>
    `,
  },
  {
    file: 'auth.html',
    routePath: '/auth',
    title: 'Sign In or Create Workspace | Staywise',
    description: 'Sign in or register for a Staywise short-term rental operations workspace.',
    noindex: true,
    eyebrow: 'Account Access',
    h1: 'Sign in or create your Staywise workspace',
    lead: 'Create a free Early Access workspace or sign in with your Staywise account.',
    bodyHtml: `<p><a href="/">Back to Staywise home</a></p>`,
  },
  {
    file: '404.html',
    routePath: '/404',
    title: 'Page Not Found (404) | Staywise',
    description: 'The requested Staywise page could not be found.',
    noindex: true,
    is404: true,
    h1: 'Page not found',
    eyebrow: '404 Error',
    lead: 'The page you requested does not exist or may have moved.',
    bodyHtml: `<p><a href="/">Return to Staywise Home</a> · <a href="/features">Features</a> · <a href="/pricing">Pricing</a></p>`,
  },
];

function buildHeadTags(spec: RouteSpec): string {
  const canonicalUrl = `${SITE_ORIGIN}${spec.routePath === '/' ? '/' : spec.routePath}`;
  const lines: string[] = [];
  if (spec.noindex) {
    lines.push('<meta name="robots" content="noindex, nofollow, noarchive" />');
  } else {
    lines.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
    lines.push('<meta name="robots" content="index, follow" />');
  }
  lines.push('<meta property="og:site_name" content="Staywise" />');
  lines.push('<meta property="og:type" content="website" />');
  lines.push(`<meta property="og:title" content="${escapeHtml(spec.title)}" />`);
  lines.push(`<meta property="og:description" content="${escapeHtml(spec.description)}" />`);
  lines.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  lines.push(`<meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />`);
  lines.push('<meta name="twitter:card" content="summary_large_image" />');
  lines.push(`<meta name="twitter:title" content="${escapeHtml(spec.title)}" />`);
  lines.push(`<meta name="twitter:description" content="${escapeHtml(spec.description)}" />`);
  lines.push(`<meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />`);

  if (spec.jsonLd?.length) {
    for (const block of spec.jsonLd) {
      lines.push(`<script type="application/ld+json">${JSON.stringify(block)}</script>`);
    }
  }
  return lines.map((l) => `    ${l}`).join('\n');
}

function injectIntoTemplate(templateHtml: string, spec: RouteSpec): string {
  let out = templateHtml;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(spec.title)}</title>`);
  out = out.replace(
    /<meta\s+name="description"[\s\S]*?\/>/i,
    `<meta name="description" content="${escapeHtml(spec.description)}" />`
  );
  out = out.replace('</head>', `${buildHeadTags(spec)}\n  </head>`);
  out = out.replace('<div id="root"></div>', `<div id="root">${renderSemanticShell(spec)}</div>`);
  return out;
}

function main() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const basePath = path.join(distDir, 'index.html');
  if (!fs.existsSync(basePath)) {
    throw new Error('dist/index.html missing — run vite build before prerender.');
  }
  const baseTemplate = fs.readFileSync(basePath, 'utf-8');

  let notFoundHtml = '';
  const routeHtml: Record<string, string> = {};
  for (const spec of ROUTES) {
    const html = injectIntoTemplate(baseTemplate, spec);
    if (spec.is404) {
      notFoundHtml = html;
      continue;
    }
    fs.writeFileSync(path.join(distDir, spec.file), html, 'utf-8');
    routeHtml[spec.routePath] = html;
  }

  // Emit server/generated-shell.ts so serverless functions (e.g. Vercel /api/index)
  // always have exact prerendered route HTML, hashed SPA shell, and 404 page.
  const appShellHtml = baseTemplate.replace(
    '</head>',
    '    <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>'
  );
  const generatedTs = `/* AUTO-GENERATED by scripts/prerender.ts — do not edit manually */
export const APP_SHELL_HTML = ${JSON.stringify(appShellHtml)};
export const NOT_FOUND_HTML = ${JSON.stringify(notFoundHtml)};
export const ROUTE_HTML: Record<string, string> = ${JSON.stringify(routeHtml)};
`;
  fs.writeFileSync(path.resolve(process.cwd(), 'server', 'generated-shell.ts'), generatedTs, 'utf-8');
  console.log(`Prerendered ${ROUTES.length - 1} static HTML routes + 404 + server/generated-shell.ts`);
}

main();
