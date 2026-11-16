import { useEffect } from 'react';
import {
  DEFAULT_OG_IMAGE,
  SITE_ORIGIN,
  collectionPageSchema,
  faqSchema,
  softwareApplicationSchema,
  webPageSchema,
} from './schema';

export interface SeoRouteMeta {
  path: string;
  file: string;
  title: string;
  description: string;
  noindex?: boolean;
  is404?: boolean;
  priority?: string;
  changefreq?: string;
  schemas?: object[];
}

export const HOME_FAQS = [
  {
    q: 'Is Staywise really free right now?',
    a: 'Yes. Staywise is currently 100% free during Early Access with full feature access unlocked—including digital welcome books, AES-256 lock vaults, AI guest assistance, cleaning checklists, inspections, and work orders—with no credit card required.',
  },
  {
    q: 'Do guests have to download an app or create a login?',
    a: 'No. Every welcome book opens in Safari or Chrome from a booking link or nightstand QR card. Basic property details show immediately, while smart-lock PINs and Wi-Fi credentials unlock once a guest verifies their stay code.',
  },
  {
    q: 'How are door codes and Wi-Fi passwords protected?',
    a: 'Access secrets are encrypted at rest with AES-256-GCM before storage and masked on public views until a guest presents an active booking code inside their arrival window. Verification endpoints enforce PostgreSQL-backed rate limiting after 8 invalid attempts.',
  },
  {
    q: 'What happens if a guest asks the assistant something not in our guide?',
    a: 'The Guest Assistant retrieves facts only from sections you approved. If a guest asks about an undocumented item or requests a special exception (such as a 9 AM early check-in), it escalates the request to your host team instead of inventing an answer.',
  },
  {
    q: 'Can we export or delete our organization and account data?',
    a: 'Yes. Inside Billing & Settings, you can download a complete machine-readable JSON export of your organization, delete an organization, or permanently delete your personal account and Neon Auth login anytime.',
  },
];

export const PUBLIC_SEO_META: Record<string, SeoRouteMeta> = {
  '/': {
    path: '/',
    file: 'index.html',
    title: 'Staywise — Free Guest Welcome Books & Property Operations',
    description:
      'Mobile guest welcome books, AES-256 stay-gated door codes, grounded guest AI assistance, and photo-verified turnover checklists—100% free with full access.',
    priority: '1.0',
    changefreq: 'weekly',
    schemas: [softwareApplicationSchema(), faqSchema(HOME_FAQS)],
  },
  '/features': {
    path: '/features',
    file: 'features.html',
    title: 'Features — Guest Welcome Books, Lock Vault & Turnover Ops | Staywise',
    description:
      'Explore Staywise 8-section digital guidebooks, QR and printable PDF exports, rate-limited smart-lock vaults, grounded AI assistant, and photo-verified checklists.',
    priority: '0.9',
    changefreq: 'weekly',
    schemas: [
      webPageSchema({
        path: '/features',
        title: 'Features — Guest Welcome Books, Lock Vault & Turnover Ops | Staywise',
        description:
          'Complete platform suite connecting guest welcome books with property cleaning, inspection, and maintenance operations.',
      }),
    ],
  },
  '/guest-guidebook': {
    path: '/guest-guidebook',
    file: 'guest-guidebook.html',
    title: 'Digital Guest Welcome Books & Stay-Gated Access Vault | Staywise',
    description:
      'Publish mobile short-term rental welcome books with QR cards, printable PDFs, AES-256 smart-lock PIN protection, and a grounded guest AI assistant.',
    priority: '0.9',
    changefreq: 'weekly',
    schemas: [
      webPageSchema({
        path: '/guest-guidebook',
        title: 'Digital Guest Welcome Books & Stay-Gated Access Vault | Staywise',
        description:
          'Mobile-first 8-section digital welcome books with time-gated smart-lock & Wi-Fi security.',
      }),
    ],
  },
  '/turnover-management': {
    path: '/turnover-management',
    file: 'turnover-management.html',
    title: 'Short-Term Rental Turnover Management & Readiness Gates | Staywise',
    description:
      'Enforce cleaning photo proof, supervisor sign-off, pre-arrival inspections, and maintenance work orders before marking any rental Ready.',
    priority: '0.9',
    changefreq: 'weekly',
    schemas: [
      webPageSchema({
        path: '/turnover-management',
        title: 'Short-Term Rental Turnover Management & Readiness Gates | Staywise',
        description:
          'Photo-verified cleaning checklists, inspections, and work orders powering automated property readiness.',
      }),
    ],
  },
  '/templates': {
    path: '/templates',
    file: 'templates.html',
    title: '12 Free Vacation Rental Welcome Book Templates | Staywise',
    description:
      'Browse 12 structured welcome book and turnover templates—from Beach Houses and Mountain Cabins to Urban Lofts and Desert Pool Villas—free in Staywise.',
    priority: '0.9',
    changefreq: 'weekly',
    schemas: [
      collectionPageSchema({
        path: '/templates',
        title: '12 Free Vacation Rental Welcome Book Templates | Staywise',
        description:
          '12 property-specific welcome book and turnover checklist presets built on Staywise 8-section guidebooks.',
        items: [
          { name: 'Coastal Beach House', description: 'Tide safety, outdoor shower, sand-free rules, and patio lock notes.' },
          { name: 'Mountain Timber Cabin', description: 'Fireplace/woodstove guide, snow plow access, and wildlife safety.' },
          { name: 'Downtown Urban Loft', description: 'Callbox buzzer codes, elevator fobs, and street/garage parking.' },
          { name: 'Desert Pool Villa', description: 'Heated pool controls, spa timer, shade awnings, and EV charger.' },
          { name: 'Lakefront Family Cottage', description: 'Dock rules, kayak storage, lifejackets, and firepit safety.' },
          { name: 'Ski-In / Ski-Out Condo', description: 'Gear locker PINs, boot dryers, shuttle times, and humidifier.' },
          { name: 'Historic City Townhouse', description: 'Radiator climate guide, narrow stair notes, and transit map.' },
          { name: 'Suburban Family Home', description: 'Driveway parking, kid-safe kitchen locks, and trash pickup schedule.' },
          { name: 'Boutique Studio Suite', description: 'Compact kitchenette guide, self-checkin keypad, and coffee bar.' },
          { name: 'Countryside Farmhouse', description: 'Well/septic notes, gate keypad, gravel road directions, and farm rules.' },
          { name: 'Harbor Marina Cottage', description: 'Boardwalk walking map, harbor parking permit, and coastal weather.' },
          { name: 'Resort Amenities Condo', description: 'Wristband pass instructions, gym/pool hours, and concierge desk.' },
        ],
      }),
    ],
  },
  '/pricing': {
    path: '/pricing',
    file: 'pricing.html',
    title: 'Pricing — 100% Free Full Access During Early Access | Staywise',
    description:
      'Staywise is completely free right now with full access to every feature across Starter, Professional, and Portfolio capacity tiers—no credit card required.',
    priority: '0.9',
    changefreq: 'weekly',
    schemas: [
      webPageSchema({
        path: '/pricing',
        title: 'Pricing — 100% Free Full Access During Early Access | Staywise',
        description:
          'Every Staywise feature unlocked at $0/month with transparent property capacity tiers and zero payment card required.',
      }),
    ],
  },
  '/security': {
    path: '/security',
    file: 'security.html',
    title: 'Security & Encryption Architecture | Staywise',
    description:
      'AES-256-GCM door and Wi-Fi encryption, PostgreSQL brute-force lockouts, 8-character cryptographic stay codes, EdDSA/JWKS auth, and instant JSON erasure.',
    priority: '0.8',
    changefreq: 'monthly',
    schemas: [
      webPageSchema({
        path: '/security',
        title: 'Security & Encryption Architecture | Staywise',
        description: 'Concrete security controls protecting guest access codes and tenant workspaces.',
      }),
    ],
  },
  '/privacy': {
    path: '/privacy',
    file: 'privacy.html',
    title: 'Privacy Policy | Staywise',
    description:
      'Staywise Software LLC privacy notice covering controller details, AES-256 encryption, Vercel and Neon subprocessors, retention, and self-service deletion.',
    priority: '0.5',
    changefreq: 'monthly',
  },
  '/terms': {
    path: '/terms',
    file: 'terms.html',
    title: 'Terms of Service | Staywise',
    description:
      'Terms of Service for Staywise Software LLC covering free full-access Early Access terms, operator duties, and governing law.',
    priority: '0.5',
    changefreq: 'monthly',
  },
  '/auth': {
    path: '/auth',
    file: 'auth.html',
    title: 'Sign In or Create Free Workspace | Staywise',
    description: 'Sign in or create a free full-access Staywise hospitality operations workspace.',
    noindex: true,
  },
  '/404': {
    path: '/404',
    file: '404.html',
    title: 'Page Not Found (404) | Staywise',
    description: 'The requested Staywise page could not be found.',
    noindex: true,
    is404: true,
  },
};

export function getSeoMetaForPath(rawPath: string): SeoRouteMeta {
  const clean = (rawPath || '/').split('?')[0].replace(/\/+$/, '') || '/';
  return PUBLIC_SEO_META[clean] || PUBLIC_SEO_META['/404'];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function Seo({ path }: { path: string }) {
  useEffect(() => {
    const meta = getSeoMetaForPath(path);
    const canonicalUrl = `${SITE_ORIGIN}${meta.path === '/' ? '/' : meta.path}`;

    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta('name', 'robots', meta.noindex ? 'noindex, nofollow, noarchive' : 'index, follow');

    upsertMeta('property', 'og:site_name', 'Staywise');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);

    const existingCanon = document.querySelector('link[rel="canonical"]');
    if (meta.noindex) {
      existingCanon?.remove();
    } else if (existingCanon) {
      existingCanon.setAttribute('href', canonicalUrl);
    } else {
      const link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      document.head.appendChild(link);
    }

    document.querySelectorAll('script[data-staywise-seo="true"]').forEach((n) => n.remove());
    if (meta.schemas?.length) {
      for (const schema of meta.schemas) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-staywise-seo', 'true');
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
      }
    }
  }, [path]);

  return null;
}
