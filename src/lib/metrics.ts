export function ratio(numerator: number, denominator: number, decimals = 2): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  const factor = Math.pow(10, decimals);
  return Math.round((numerator / denominator) * factor) / factor;
}

export function percentRatio(completed: number, total: number): number | null {
  const r = ratio(completed, total, 4);
  if (r === null) return null;
  return Math.round(r * 100);
}

export function formatMetricPercent(value: number | null | undefined, emptyLabel = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return emptyLabel;
  }
  return `${value}%`;
}

export function formatMetricScore(
  value: number | null | undefined,
  suffix = ' / 5.0',
  emptyLabel = '—'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return emptyLabel;
  }
  return `${value}${suffix}`;
}
