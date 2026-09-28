import { toBase, type Rates } from './currency-convert';
import type { PaymentMethod, ReceiptSource } from './types';

/** The receipts-list filters from the filter sheet (docs/SPEC.md §3): date range, amount range, source, payment. */
export type ReceiptFilters = {
  /** Inclusive YYYY-MM-DD bounds; null = open. */
  from: string | null;
  to: string | null;
  /** Amount bounds in the home currency (minor units); null = open. */
  minMinor: number | null;
  maxMinor: number | null;
  /** Empty = any. */
  sources: ReceiptSource[];
  payments: PaymentMethod[];
};

export const NO_FILTERS: ReceiptFilters = { from: null, to: null, minMinor: null, maxMinor: null, sources: [], payments: [] };

/** How many filter groups are active (date range, amount range, sources, payments each count once). */
export function activeFilterCount(f: ReceiptFilters): number {
  return (
    (f.from || f.to ? 1 : 0) + (f.minMinor !== null || f.maxMinor !== null ? 1 : 0) + (f.sources.length ? 1 : 0) + (f.payments.length ? 1 : 0)
  );
}

export function hasAmountFilter(f: ReceiptFilters): boolean {
  return f.minMinor !== null || f.maxMinor !== null;
}

/**
 * Whether a receipt's amount, in the home currency, is within the bounds. A foreign receipt with no known
 * exchange rate can't be compared, so it is left out while an amount filter is active.
 */
export function matchesAmount(
  receipt: { totalMinor: number; currency: string },
  f: ReceiptFilters,
  rates: Rates | null,
  homeCurrency: string,
): boolean {
  if (!hasAmountFilter(f)) return true;
  const home =
    receipt.currency === homeCurrency ? receipt.totalMinor : rates && rates.base === homeCurrency ? toBase(receipt.totalMinor, receipt.currency, rates) : null;
  if (home === null) return false;
  return (f.minMinor === null || home >= f.minMinor) && (f.maxMinor === null || home <= f.maxMinor);
}

/** Flips a value in a list (multi-select chips). */
export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
