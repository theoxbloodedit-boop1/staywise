import type { RegionCode } from './types';

export function formatDateByCountry(dateStr: string | null | undefined, country: RegionCode | string = 'US') {
  if (!dateStr) return '—';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  if (country === 'US') {
    return `${m}/${d}/${y}`;
  }
  return `${d}/${m}/${y}`;
}

export function formatMoney(amount: number, currency: 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD' | string = 'USD') {
  if (currency === 'EUR') return `€${amount.toLocaleString('en-IE')}`;
  if (currency === 'GBP') return `£${amount.toLocaleString('en-GB')}`;
  if (currency === 'CAD') return `CA$${amount.toLocaleString('en-CA')}`;
  if (currency === 'AUD') return `A$${amount.toLocaleString('en-AU')}`;
  return `$${amount.toLocaleString('en-US')}`;
}

export function formatTemp(val: number, unit: 'F' | 'C' = 'F') {
  return `${val}°${unit}`;
}

export function formatDateTimeShort(iso: string | null | undefined) {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const REGION_PRESETS: Record<
  RegionCode,
  {
    label: string;
    shortLabel: string;
    currency: 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD';
    tempUnit: 'F' | 'C';
    emergencyNumber: string;
    timezone: string;
    dateExample: string;
    postalLabel: string;
  }
> = {
  US: {
    label: 'United States (USD · °F · 911)',
    shortLabel: 'United States',
    currency: 'USD',
    tempUnit: 'F',
    emergencyNumber: '911',
    timezone: 'America/Chicago',
    dateExample: 'MM/DD/YYYY',
    postalLabel: 'ZIP Code',
  },
  CA: {
    label: 'Canada (CAD · °C · 911)',
    shortLabel: 'Canada',
    currency: 'CAD',
    tempUnit: 'C',
    emergencyNumber: '911',
    timezone: 'America/Toronto',
    dateExample: 'DD/MM/YYYY',
    postalLabel: 'Postal Code',
  },
  GB: {
    label: 'United Kingdom (GBP · °C · 999)',
    shortLabel: 'United Kingdom',
    currency: 'GBP',
    tempUnit: 'C',
    emergencyNumber: '999',
    timezone: 'Europe/London',
    dateExample: 'DD/MM/YYYY',
    postalLabel: 'Postcode',
  },
  EU: {
    label: 'European Union (EUR · °C · 112)',
    shortLabel: 'Europe',
    currency: 'EUR',
    tempUnit: 'C',
    emergencyNumber: '112',
    timezone: 'Europe/Paris',
    dateExample: 'DD/MM/YYYY',
    postalLabel: 'Postal Code',
  },
  AU: {
    label: 'Australia / Pacific (AUD · °C · 000)',
    shortLabel: 'Asia-Pacific',
    currency: 'AUD',
    tempUnit: 'C',
    emergencyNumber: '000',
    timezone: 'Australia/Sydney',
    dateExample: 'DD/MM/YYYY',
    postalLabel: 'Postcode',
  },
  INTL: {
    label: 'Global / Other (USD · °C · 112)',
    shortLabel: 'Global',
    currency: 'USD',
    tempUnit: 'C',
    emergencyNumber: '112',
    timezone: 'UTC',
    dateExample: 'DD/MM/YYYY',
    postalLabel: 'Postal Code',
  },
};
