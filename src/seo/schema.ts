export const SITE_ORIGIN = 'https://staywise-alpha.vercel.app';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/images/barton-creek-1280.webp`;

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Staywise Software LLC',
    url: SITE_ORIGIN,
    email: 'privacy@staywise.app',
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Staywise',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: SITE_ORIGIN,
    description:
      'Mobile guest welcome books, AES-256 stay-gated door and Wi-Fi vaults, keyword-based guide search, and photo-verified turnover operations for short-term rental hosts.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free Early Access. No credit card required. Payments and external SMS/email notifications are not connected.',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Staywise Software LLC',
      email: 'privacy@staywise.app',
      url: SITE_ORIGIN,
    },
  };
}

export function faqSchema(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function webPageSchema(opts: { path: string; title: string; description: string }) {
  const url = `${SITE_ORIGIN}${opts.path === '/' ? '/' : opts.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.title,
    description: opts.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Staywise',
      url: SITE_ORIGIN,
    },
  };
}

export function collectionPageSchema(opts: {
  path: string;
  title: string;
  description: string;
  items: Array<{ name: string; description: string }>;
}) {
  const url = `${SITE_ORIGIN}${opts.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.title,
    description: opts.description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((item, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: item.name,
        description: item.description,
      })),
    },
  };
}
