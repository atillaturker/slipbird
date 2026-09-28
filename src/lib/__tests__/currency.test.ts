import { currencyMatches, currencyOptions, defaultHomeCurrency, ISO_CURRENCIES, isCurrencyCode } from '../currency';

describe('currencyOptions', () => {
  it('pins home first, then TRY/USD/EUR/GBP, without duplicates', () => {
    expect(currencyOptions('CHF').pinned).toEqual(['CHF', 'TRY', 'USD', 'EUR', 'GBP']);
    expect(currencyOptions('USD').pinned).toEqual(['USD', 'TRY', 'EUR', 'GBP']);
  });

  it('lists every other currency once', () => {
    const { pinned, rest } = currencyOptions('TRY');
    expect(pinned.length + rest.length).toBe(ISO_CURRENCIES.length);
    expect(rest).not.toContain('TRY');
  });
});

describe('currencyMatches', () => {
  it('matches code or name, case and accent insensitive', () => {
    expect(currencyMatches('TRY', 'Türk lirası', 'lira')).toBe(true);
    expect(currencyMatches('TRY', 'Türk lirası', 'turk')).toBe(true);
    expect(currencyMatches('EUR', 'Euro', 'eur')).toBe(true);
    expect(currencyMatches('EUR', 'Euro', 'dollar')).toBe(false);
    expect(currencyMatches('EUR', 'Euro', '  ')).toBe(true);
  });
});

describe('defaultHomeCurrency', () => {
  it('uses a supported device currency, else USD', () => {
    expect(defaultHomeCurrency('TRY')).toBe('TRY');
    expect(defaultHomeCurrency('XXX')).toBe('USD');
    expect(defaultHomeCurrency(null)).toBe('USD');
  });

  it('validates codes', () => {
    expect(isCurrencyCode('GBP')).toBe(true);
    expect(isCurrencyCode('gbp')).toBe(false);
  });
});
