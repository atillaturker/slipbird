import { format, startOfMonth, startOfWeek, startOfYear, subMonths, subWeeks, subYears } from 'date-fns';

import { categoryOrder, type Category } from '@/theme';

import { BUDGET_NEAR_RATIO } from './budget';
import { toBase, type Rates } from './currency-convert';
import { toISODate } from './dates';
import type { DocumentType, ReceiptStatus } from './types';

/** The columns spending needs from a receipt. */
export type SpendRow = {
  id: string;
  merchant: string | null;
  merchantDisplay: string | null;
  merchantNormalized: string | null;
  documentType: DocumentType | null;
  date: string; // YYYY-MM-DD
  totalMinor: number;
  currency: string;
  category: Category;
  status: ReceiptStatus;
};

/** A counted receipt with its amount in the home currency (null when no rate is known). */
export type Spend = SpendRow & { homeMinor: number | null };

export type Period = 'week' | 'month' | 'year';
/** Inclusive YYYY-MM-DD bounds. */
export type DateRange = { start: string; end: string };

const PENDING: readonly ReceiptStatus[] = ['processing', 'queued', 'needs_review'];

/**
 * Info slips ("BİLGİ FİŞİ") printed next to a saved invoice/receipt for the same purchase: same date, total and
 * currency, and the same merchant (or one side without a merchant). Those slips are not counted again.
 */
export function linkedInfoSlips(rows: SpendRow[]): Set<string> {
  const saved = rows.filter((r) => r.status === 'saved');
  const documents = saved.filter((r) => r.documentType !== 'info_slip');
  const linked = new Set<string>();
  for (const slip of saved.filter((r) => r.documentType === 'info_slip')) {
    const match = documents.some(
      (d) =>
        d.date === slip.date &&
        d.totalMinor === slip.totalMinor &&
        d.currency === slip.currency &&
        (!d.merchantNormalized || !slip.merchantNormalized || d.merchantNormalized === slip.merchantNormalized),
    );
    if (match) linked.add(slip.id);
  }
  return linked;
}

/** What counts toward spending: saved receipts only, minus info slips linked to their invoice; in home currency. */
export function countedSpend(rows: SpendRow[], rates: Rates | null, homeCurrency: string): Spend[] {
  const linked = linkedInfoSlips(rows);
  return rows
    .filter((r) => r.status === 'saved' && !linked.has(r.id))
    .map((r) => ({ ...r, homeMinor: r.currency === homeCurrency ? r.totalMinor : rates && rates.base === homeCurrency ? toBase(r.totalMinor, r.currency, rates) : null }));
}

/** Receipts that exist but don't count yet (still being read or waiting for review). */
export function pendingCount(rows: SpendRow[]): number {
  return rows.filter((r) => PENDING.includes(r.status)).length;
}

function weekStart(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/** This week / month / year so far. */
export function periodRange(period: Period, today: Date): DateRange {
  const start = period === 'week' ? weekStart(today) : period === 'month' ? startOfMonth(today) : startOfYear(today);
  return { start: toISODate(start), end: toISODate(today) };
}

/**
 * The same point in the previous period, so partial periods compare fairly: 12 Oct → 1–12 Sep;
 * 31 Mar → 1–28/29 Feb (date-fns clamps the day).
 */
export function previousRange(period: Period, today: Date): DateRange {
  const then = period === 'week' ? subWeeks(today, 1) : period === 'month' ? subMonths(today, 1) : subYears(today, 1);
  return periodRange(period, then);
}

function inRange(date: string, range: DateRange) {
  return date >= range.start && date <= range.end;
}

/** Converted total and count in a range; receipts without a rate are counted separately. */
export function totalIn(items: Spend[], range: DateRange): { totalMinor: number; count: number; unconverted: number } {
  let totalMinor = 0;
  let count = 0;
  let unconverted = 0;
  for (const s of items) {
    if (!inRange(s.date, range)) continue;
    if (s.homeMinor === null) unconverted += 1;
    else {
      totalMinor += s.homeMinor;
      count += 1;
    }
  }
  return { totalMinor, count, unconverted };
}

/** This period vs the same point last period: `direction` up = spending more. Null delta when nothing to compare. */
export function periodSummary(items: Spend[], period: Period, today: Date) {
  const current = totalIn(items, periodRange(period, today));
  const previous = totalIn(items, previousRange(period, today));
  const diff = current.totalMinor - previous.totalMinor;
  return {
    current,
    previous,
    delta: previous.count === 0 && current.count === 0 ? null : { amountMinor: Math.abs(diff), direction: diff > 0 ? ('up' as const) : ('down' as const) },
  };
}

/** Converted totals per category in a range, largest first, empty categories left out. */
export function categoryTotals(items: Spend[], range: DateRange): { category: Category; totalMinor: number }[] {
  const totals = new Map<Category, number>();
  for (const s of items) {
    if (s.homeMinor === null || !inRange(s.date, range)) continue;
    totals.set(s.category, (totals.get(s.category) ?? 0) + s.homeMinor);
  }
  return categoryOrder
    .map((category) => ({ category, totalMinor: totals.get(category) ?? 0 }))
    .filter((c) => c.totalMinor > 0)
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

/** Totals for the last `months` calendar months (this one last), for the monthly bar chart. */
export function monthlyTotals(items: Spend[], today: Date, months = 6): { month: string; totalMinor: number; current: boolean }[] {
  const out: { month: string; totalMinor: number; current: boolean }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const monthDate = subMonths(startOfMonth(today), i);
    const month = format(monthDate, 'yyyy-MM');
    const totalMinor = items.filter((s) => s.homeMinor !== null && s.date.startsWith(month)).reduce((sum, s) => sum + (s.homeMinor ?? 0), 0);
    out.push({ month, totalMinor, current: i === 0 });
  }
  return out;
}

/** Top merchants in a range by converted total: the shop's display name, how many receipts, how much. */
export function topMerchants(items: Spend[], range: DateRange, limit = 5): { name: string; count: number; totalMinor: number }[] {
  const byKey = new Map<string, { name: string; count: number; totalMinor: number }>();
  for (const s of items) {
    if (s.homeMinor === null || !inRange(s.date, range)) continue;
    const name = s.merchantDisplay?.trim() || s.merchant?.trim();
    if (!name) continue;
    const key = s.merchantNormalized ?? name.toLowerCase();
    const entry = byKey.get(key) ?? { name, count: 0, totalMinor: 0 };
    entry.count += 1;
    entry.totalMinor += s.homeMinor;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => b.totalMinor - a.totalMinor || b.count - a.count).slice(0, limit);
}

/** Average converted receipt in a range (rounded to minor units); null without receipts. */
export function averageReceipt(items: Spend[], range: DateRange): number | null {
  const { totalMinor, count } = totalIn(items, range);
  return count ? Math.round(totalMinor / count) : null;
}

// ─── Budgets ────────────────────────────────────────────────────────────────────────────────────────────

export type Budget = { category: Category; limitMinor: number; currency: string; active: boolean };
export type BudgetAlert = { category: Category; threshold: 80 | 100; key: string };

/** Budgets at or past 80% this month (Home shows only these). */
export function budgetsNearLimit(budgets: Budget[], spentByCategory: Partial<Record<Category, number>>): Budget[] {
  return budgets.filter((b) => b.active && b.limitMinor > 0 && (spentByCategory[b.category] ?? 0) >= b.limitMinor * BUDGET_NEAR_RATIO);
}

/**
 * Alerts to send now: once at 80% and once at 100% per category per month (docs/SPEC.md §3). `sent` holds the
 * keys already sent. When both thresholds were crossed at once, only the 100% alert goes out (and 80% is marked).
 */
export function budgetAlertsDue(
  budgets: Budget[],
  spentByCategory: Partial<Record<Category, number>>,
  month: string,
  sent: ReadonlySet<string>,
): { send: BudgetAlert[]; markSent: string[] } {
  const send: BudgetAlert[] = [];
  const markSent: string[] = [];
  for (const b of budgets) {
    if (!b.active || b.limitMinor <= 0) continue;
    const spent = spentByCategory[b.category] ?? 0;
    const key = (t: 80 | 100) => `${month}:${b.category}:${t}`;
    const over = spent >= b.limitMinor;
    const near = spent >= b.limitMinor * BUDGET_NEAR_RATIO;
    if (over && !sent.has(key(100))) {
      send.push({ category: b.category, threshold: 100, key: key(100) });
      markSent.push(key(100));
      if (!sent.has(key(80))) markSent.push(key(80));
    } else if (near && !over && !sent.has(key(80))) {
      send.push({ category: b.category, threshold: 80, key: key(80) });
      markSent.push(key(80));
    }
  }
  return { send, markSent };
}
