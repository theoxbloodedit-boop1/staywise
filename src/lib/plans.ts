export type PlanTier = 'Starter' | 'Professional' | 'Portfolio';

export interface PlanSpec {
  id: 'starter' | 'professional' | 'portfolio';
  tier: PlanTier;
  label: string;
  priceMonthlyUsd: number;
  amountCents: number;
  propertyLimit: number;
  aiMonthlyAllowance: number;
  fullFeatureAccess: true;
  badge?: string;
  summary: string;
  highlights: string[];
}

export const DEFAULT_PLAN_TIER: PlanTier = 'Starter';

export const PLANS: Record<PlanTier, PlanSpec> = {
  Starter: {
    id: 'starter',
    tier: 'Starter',
    label: 'Starter',
    priceMonthlyUsd: 0,
    amountCents: 0,
    propertyLimit: 5,
    aiMonthlyAllowance: 250,
    fullFeatureAccess: true,
    summary: 'Ideal for self-managing hosts launching digital welcome books with full operations.',
    highlights: [
      'Up to 5 active properties (100% free)',
      '250 grounded AI guest replies / month',
      '8-section mobile welcome books & QR PDF export',
      'AES-256-GCM lock & Wi-Fi vault + stay verification',
      'Photo-verified cleaning checklists & work orders',
    ],
  },
  Professional: {
    id: 'professional',
    tier: 'Professional',
    label: 'Professional',
    priceMonthlyUsd: 0,
    amountCents: 0,
    propertyLimit: 15,
    aiMonthlyAllowance: 1000,
    fullFeatureAccess: true,
    badge: 'Most Popular',
    summary: 'Built for growing teams running recurring turnovers, inspections, and field crews.',
    highlights: [
      'Up to 15 active properties (100% free)',
      '1,000 grounded AI guest replies / month',
      'Every feature unlocked: cleaning, inspections & incidents',
      'Multi-role team permissions & live readiness board',
      'Full organization JSON export & audit logs',
    ],
  },
  Portfolio: {
    id: 'portfolio',
    tier: 'Portfolio',
    label: 'Portfolio',
    priceMonthlyUsd: 0,
    amountCents: 0,
    propertyLimit: 50,
    aiMonthlyAllowance: 5000,
    fullFeatureAccess: true,
    summary: 'For multi-market operators standardizing guidebooks, assets, and SLAs across units.',
    highlights: [
      'Up to 50 active properties (100% free)',
      '5,000 grounded AI guest replies / month',
      'Every feature unlocked with high-volume capacity',
      'Guidebook template cloning across units',
      'Multi-region currency, °F/°C & emergency routing',
    ],
  },
};

export const PLAN_LIST: PlanSpec[] = [PLANS.Starter, PLANS.Professional, PLANS.Portfolio];

const SLUG_TO_TIER: Record<string, PlanTier> = {
  starter: 'Starter',
  professional: 'Professional',
  portfolio: 'Portfolio',
};

export function parsePlanTier(value: unknown): PlanTier | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return SLUG_TO_TIER[normalized] ?? null;
}

export function getPlanSpec(tier: PlanTier): PlanSpec {
  return PLANS[tier];
}
