import type { Rates } from '../currency-convert';
import {
  averageReceipt,
  budgetAlertsDue,
  budgetsNearLimit,
  categoryTotals,
  countedSpend,
  linkedInfoSlips,
  monthlyTotals,
  pendingCount,
  periodRange,
  periodSummary,
  previousRange,
  topMerchants,
  totalIn,
  type Budget,
  type SpendRow,
} from '../spending';

let n = 0;
const row = (patch: Partial<SpendRow>): SpendRow => ({
  id: `r${(n += 1)}`,
  merchant: 'Migros Ticaret A.Ş.',
  merchantDisplay: 'Migros',
  merchantNormalized: 'migros',
  documentType: 'receipt',
  date: '2026-10-10',
  totalMinor: 10000,
  currency: 'TRY',
  category: 'groceries',
  status: 'saved',
  ...patch,
});

const rates: Rates = { base: 'TRY', date: '2026-10-12', rates: { USD: 0.025 } };
const today = new Date(2026, 9, 12); // Mon 12 Oct 2026

describe('what counts', () => {
  it('counts saved receipts only and reports the rest as pending', () => {
    const rows = [row({}), row({ status: 'needs_review' }), row({ status: 'queued' }), row({ status: 'failed' })];
    expect(countedSpend(rows, rates, 'TRY')).toHaveLength(1);
    expect(pendingCount(rows)).toBe(2); // needs_review + queued; failed needs a retake, not a wait
  });

  it('does not count an info slip twice when its invoice is saved', () => {
    const invoice = row({ documentType: 'invoice', totalMinor: 66329, merchantNormalized: 'cagri magazacilik' });
    const slip = row({ documentType: 'info_slip', totalMinor: 66329, merchantNormalized: 'cagri magazacilik' });
    const lonelySlip = row({ documentType: 'info_slip', totalMinor: 5000, date: '2026-10-11' });
    expect([...linkedInfoSlips([invoice, slip, lonelySlip])]).toEqual([slip.id]);
    expect(countedSpend([invoice, slip, lonelySlip], rates, 'TRY').map((s) => s.id)).toEqual([invoice.id, lonelySlip.id]);
  });

  it('links a slip without a merchant, but not one from another shop', () => {
    const invoice = row({ documentType: 'invoice', merchantNormalized: 'migros' });
    expect(linkedInfoSlips([invoice, row({ documentType: 'info_slip', merchantNormalized: null })]).size).toBe(1);
    expect(linkedInfoSlips([invoice, row({ documentType: 'info_slip', merchantNormalized: 'bim' })]).size).toBe(0);
  });

  it('converts foreign receipts and leaves unknown currencies out, visibly', () => {
    const items = countedSpend([row({ currency: 'USD', totalMinor: 1000 }), row({ currency: 'GBP', totalMinor: 1000 })], rates, 'TRY');
    expect(items.map((s) => s.homeMinor)).toEqual([40000, null]);
    expect(totalIn(items, periodRange('month', today))).toEqual({ totalMinor: 40000, count: 1, unconverted: 1 });
  });

  it('without rates, only home-currency receipts are converted', () => {
    expect(countedSpend([row({}), row({ currency: 'USD' })], null, 'TRY').map((s) => s.homeMinor)).toEqual([10000, null]);
  });
});

describe('periods', () => {
  it('covers this week (from Monday), month and year so far', () => {
    expect(periodRange('week', today)).toEqual({ start: '2026-10-12', end: '2026-10-12' });
    expect(periodRange('month', today)).toEqual({ start: '2026-10-01', end: '2026-10-12' });
    expect(periodRange('year', today)).toEqual({ start: '2026-01-01', end: '2026-10-12' });
  });

  it('compares with the same point in the previous period', () => {
    expect(previousRange('month', today)).toEqual({ start: '2026-09-01', end: '2026-09-12' });
    expect(previousRange('week', today)).toEqual({ start: '2026-10-05', end: '2026-10-05' });
    expect(previousRange('year', today)).toEqual({ start: '2025-01-01', end: '2025-10-12' });
    expect(previousRange('month', new Date(2026, 2, 31))).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('summarises the month against the same day last month', () => {
    const items = countedSpend(
      [row({ date: '2026-10-05', totalMinor: 30000 }), row({ date: '2026-09-10', totalMinor: 10000 }), row({ date: '2026-09-20', totalMinor: 99999 })],
      rates,
      'TRY',
    );
    const s = periodSummary(items, 'month', today);
    expect(s.current.totalMinor).toBe(30000);
    expect(s.previous.totalMinor).toBe(10000); // 20 Sep is after "the same day"
    expect(s.delta).toEqual({ amountMinor: 20000, direction: 'up' });
    expect(periodSummary([], 'month', today).delta).toBeNull();
  });
});

describe('insights', () => {
  const items = countedSpend(
    [
      row({ date: '2026-10-01', totalMinor: 30000 }),
      row({ date: '2026-10-02', totalMinor: 12000, category: 'dining', merchant: 'Kahve Dünyası', merchantDisplay: null, merchantNormalized: 'kahve dunyasi' }),
      row({ date: '2026-10-03', totalMinor: 8000, category: 'dining', merchant: 'Kahve Dünyası', merchantDisplay: null, merchantNormalized: 'kahve dunyasi' }),
      row({ date: '2026-08-15', totalMinor: 50000 }),
      row({ date: '2026-04-30', totalMinor: 1000 }),
    ],
    rates,
    'TRY',
  );
  const month = periodRange('month', today);

  it('totals categories, largest first', () => {
    expect(categoryTotals(items, month)).toEqual([
      { category: 'groceries', totalMinor: 30000 },
      { category: 'dining', totalMinor: 20000 },
    ]);
  });

  it('gives the last 6 months, this month last', () => {
    expect(monthlyTotals(items, today)).toEqual([
      { month: '2026-05', totalMinor: 0, current: false },
      { month: '2026-06', totalMinor: 0, current: false },
      { month: '2026-07', totalMinor: 0, current: false },
      { month: '2026-08', totalMinor: 50000, current: false },
      { month: '2026-09', totalMinor: 0, current: false },
      { month: '2026-10', totalMinor: 50000, current: true },
    ]);
  });

  it('ranks merchants by total with their receipt count, using the display name', () => {
    expect(topMerchants(items, month)).toEqual([
      { name: 'Migros', count: 1, totalMinor: 30000 },
      { name: 'Kahve Dünyası', count: 2, totalMinor: 20000 },
    ]);
  });

  it('averages receipts', () => {
    expect(averageReceipt(items, month)).toBe(16667);
    expect(averageReceipt([], month)).toBeNull();
  });
});

describe('budgets', () => {
  const budgets: Budget[] = [
    { category: 'groceries', limitMinor: 100000, currency: 'TRY', active: true },
    { category: 'dining', limitMinor: 50000, currency: 'TRY', active: true },
    { category: 'home', limitMinor: 20000, currency: 'TRY', active: true },
  ];

  it('shows only budgets at or past 80% on Home', () => {
    expect(budgetsNearLimit(budgets, { groceries: 79999, dining: 40000, home: 25000 }).map((b) => b.category)).toEqual(['dining', 'home']);
  });

  it('alerts once at 80% and once at 100% per category per month', () => {
    const first = budgetAlertsDue(budgets, { groceries: 85000, dining: 10000 }, '2026-10', new Set());
    expect(first.send).toEqual([{ category: 'groceries', threshold: 80, key: '2026-10:groceries:80' }]);
    expect(budgetAlertsDue(budgets, { groceries: 90000 }, '2026-10', new Set(first.markSent)).send).toEqual([]);
    const over = budgetAlertsDue(budgets, { groceries: 100000 }, '2026-10', new Set(first.markSent));
    expect(over.send.map((a) => a.threshold)).toEqual([100]);
    // A new month starts over.
    expect(budgetAlertsDue(budgets, { groceries: 85000 }, '2026-11', new Set([...first.markSent, ...over.markSent])).send).toHaveLength(1);
  });

  it('sends only the 100% alert when a receipt jumps straight past the limit', () => {
    const due = budgetAlertsDue(budgets, { home: 30000 }, '2026-10', new Set());
    expect(due.send.map((a) => a.threshold)).toEqual([100]);
    expect(due.markSent.sort()).toEqual(['2026-10:home:100', '2026-10:home:80']);
  });
});
