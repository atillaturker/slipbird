import type { Rates } from '../currency-convert';
import { activeFilterCount, matchesAmount, NO_FILTERS, toggle, type ReceiptFilters } from '../receipt-filters';

const rates: Rates = { base: 'TRY', date: '2026-10-12', rates: { USD: 0.025 } };
const f = (patch: Partial<ReceiptFilters>): ReceiptFilters => ({ ...NO_FILTERS, ...patch });

describe('activeFilterCount', () => {
  it('counts each group once', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount(f({ from: '2026-01-01', to: '2026-02-01' }))).toBe(1);
    expect(activeFilterCount(f({ minMinor: 100, maxMinor: 500, sources: ['scan', 'manual'], payments: ['card'] }))).toBe(3);
    expect(activeFilterCount(f({ to: '2026-02-01', maxMinor: 0 }))).toBe(2);
  });
});

describe('matchesAmount', () => {
  it('passes everything without an amount filter', () => {
    expect(matchesAmount({ totalMinor: 5, currency: 'GBP' }, NO_FILTERS, null, 'TRY')).toBe(true);
  });

  it('compares home-currency receipts directly, inclusive at both ends', () => {
    const filters = f({ minMinor: 10000, maxMinor: 50000 });
    expect(matchesAmount({ totalMinor: 10000, currency: 'TRY' }, filters, null, 'TRY')).toBe(true);
    expect(matchesAmount({ totalMinor: 50000, currency: 'TRY' }, filters, null, 'TRY')).toBe(true);
    expect(matchesAmount({ totalMinor: 9999, currency: 'TRY' }, filters, null, 'TRY')).toBe(false);
    expect(matchesAmount({ totalMinor: 50001, currency: 'TRY' }, filters, null, 'TRY')).toBe(false);
  });

  it('converts foreign receipts to the home currency', () => {
    // $10.00 = ₺400.00
    expect(matchesAmount({ totalMinor: 1000, currency: 'USD' }, f({ minMinor: 39000, maxMinor: 41000 }), rates, 'TRY')).toBe(true);
    expect(matchesAmount({ totalMinor: 1000, currency: 'USD' }, f({ maxMinor: 30000 }), rates, 'TRY')).toBe(false);
  });

  it('leaves out foreign receipts it cannot convert', () => {
    expect(matchesAmount({ totalMinor: 1000, currency: 'USD' }, f({ minMinor: 1 }), null, 'TRY')).toBe(false);
    expect(matchesAmount({ totalMinor: 1000, currency: 'GBP' }, f({ minMinor: 1 }), rates, 'TRY')).toBe(false);
  });

  it('supports one-sided bounds', () => {
    expect(matchesAmount({ totalMinor: 999999, currency: 'TRY' }, f({ minMinor: 100 }), null, 'TRY')).toBe(true);
    expect(matchesAmount({ totalMinor: 50, currency: 'TRY' }, f({ maxMinor: 100 }), null, 'TRY')).toBe(true);
  });
});

describe('toggle', () => {
  it('adds and removes', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });
});
