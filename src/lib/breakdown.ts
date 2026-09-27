import type { Category } from '@/theme';

export type BreakdownSegment<T> = T & { share: number };

/**
 * Prepares CategoryBreakdown rows: drops empty categories, keeps the caller's order
 * (largest first) but always puts `other` last, and adds each row's share of the total (0…1).
 */
export function breakdownSegments<T extends { category: Category; value: number }>(items: T[]): BreakdownSegment<T>[] {
  const visible = items.filter((item) => item.value > 0);
  const total = visible.reduce((sum, item) => sum + item.value, 0);
  const ordered = [...visible.filter((item) => item.category !== 'other'), ...visible.filter((item) => item.category === 'other')];
  return ordered.map((item) => ({ ...item, share: total > 0 ? item.value / total : 0 }));
}
