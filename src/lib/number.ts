/** Plain decimals that aren't money: quantities (0,45 kg) and tax rates (%10). */

/** "0,45", "2", "1.5", "%10" → number; null when it isn't a plain non-negative decimal. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace('%', '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** 0.45 → "0,45" (tr) / "0.45" (en); up to 3 decimals, no grouping. */
export function formatDecimal(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3, useGrouping: false }).format(value);
}
