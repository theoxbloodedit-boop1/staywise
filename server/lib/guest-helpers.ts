export function sortGuidebookSections<T extends { section_key: string; sort_order?: number }>(
  sections: T[],
  sectionOrderJson?: string | string[] | null
): T[] {
  let orderArr: string[] = [];
  if (Array.isArray(sectionOrderJson)) {
    orderArr = sectionOrderJson;
  } else if (typeof sectionOrderJson === 'string' && sectionOrderJson.trim()) {
    try {
      const parsed = JSON.parse(sectionOrderJson);
      if (Array.isArray(parsed)) orderArr = parsed;
    } catch {
      orderArr = [];
    }
  }

  if (orderArr.length === 0) {
    return [...sections].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }

  const indexMap = new Map<string, number>();
  orderArr.forEach((key, idx) => indexMap.set(key, idx));

  return [...sections].sort((a, b) => {
    const idxA = indexMap.has(a.section_key) ? indexMap.get(a.section_key)! : 900 + (a.sort_order ?? 99);
    const idxB = indexMap.has(b.section_key) ? indexMap.get(b.section_key)! : 900 + (b.sort_order ?? 99);
    return idxA - idxB;
  });
}

export function parseFeedbackRating(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return 5;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}
