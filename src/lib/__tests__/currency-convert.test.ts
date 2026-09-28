import { parseRates, ratesAreFresh, RATES_TTL_MS, toBase, type Rates } from '../currency-convert';

// TRY base: 1 TRY = 0.0243 USD, 0.0221 EUR, 3.6 JPY, 0.0075 KWD
const rates: Rates = { base: 'TRY', date: '2026-10-12', rates: { USD: 0.0243, EUR: 0.0221, JPY: 3.6, KWD: 0.0075 } };

describe('toBase', () => {
  it('keeps home-currency amounts as they are', () => {
    expect(toBase(123456, 'TRY', rates)).toBe(123456);
  });

  it('converts to home minor units with exact rounding', () => {
    // $10.00 / 0.0243 = ₺411.5226… → 41152 kuruş
    expect(toBase(1000, 'USD', rates)).toBe(41152);
    // €1,234.56 / 0.0221 = ₺55,862.44…
    expect(toBase(123456, 'EUR', rates)).toBe(5586244);
  });

  it('handles currencies with other minor units', () => {
    // ¥1,500 (0 decimals) / 3.6 = ₺416.67
    expect(toBase(1500, 'JPY', rates)).toBe(41667);
    // 1.500 KWD (3 decimals) / 0.0075 = ₺200.00
    expect(toBase(1500, 'KWD', rates)).toBe(20000);
  });

  it('returns null when the rate is unknown', () => {
    expect(toBase(1000, 'GBP', rates)).toBeNull();
    expect(toBase(1000, 'USD', { ...rates, rates: { USD: 0 } })).toBeNull();
  });

  it('handles refunds (negative amounts)', () => {
    expect(toBase(-1000, 'USD', rates)).toBe(-41152);
  });
});

describe('parseRates', () => {
  it('reads Frankfurter v2', () => {
    const v2 = [
      { date: '2026-10-12', base: 'TRY', quote: 'USD', rate: 0.0243 },
      { date: '2026-10-12', base: 'TRY', quote: 'EUR', rate: 0.0221 },
    ];
    expect(parseRates(v2, 'TRY')).toEqual({ base: 'TRY', date: '2026-10-12', rates: { USD: 0.0243, EUR: 0.0221 } });
  });

  it('reads Frankfurter v1', () => {
    expect(parseRates({ amount: 1, base: 'TRY', date: '2026-10-12', rates: { USD: 0.0243 } }, 'TRY')).toEqual({
      base: 'TRY',
      date: '2026-10-12',
      rates: { USD: 0.0243 },
    });
  });

  it('rejects other bases and garbage', () => {
    expect(parseRates([{ date: 'x', base: 'USD', quote: 'EUR', rate: 1 }], 'TRY')).toBeNull();
    expect(parseRates({ base: 'USD', rates: {} }, 'TRY')).toBeNull();
    expect(parseRates('nope', 'TRY')).toBeNull();
  });
});

describe('ratesAreFresh', () => {
  it('keeps rates for 24 hours', () => {
    expect(ratesAreFresh(0, RATES_TTL_MS - 1)).toBe(true);
    expect(ratesAreFresh(0, RATES_TTL_MS)).toBe(false);
  });
});
