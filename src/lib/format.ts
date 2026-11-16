export function formatDateByCountry(dateStr: string | null | undefined, country: 'US' | 'AU' = 'US') {
  if (!dateStr) return '—';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  if (country === 'AU') {
    return `${d}/${m}/${y}`;
  }
  return `${m}/${d}/${y}`;
}

export function formatMoney(amount: number, currency: 'USD' | 'AUD' = 'USD') {
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
