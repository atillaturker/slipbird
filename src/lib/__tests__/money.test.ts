import { currencyExponent, currencySymbol, formatAmountInput, formatMoney, parseAmount } from '../money';

// Intl may use narrow/no-break spaces; compare with plain spaces.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('currencyExponent', () => {
  it('knows 0-, 2- and 3-decimal currencies', () => {
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('try')).toBe(2);
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('KWD')).toBe(3);
  });
});

describe('parseAmount', () => {
  it('parses Turkish format', () => {
    expect(parseAmount('1.234,56', 'TRY')).toBe(123456);
    expect(parseAmount('12,50', 'TRY')).toBe(1250);
    expect(parseAmount('1.234.567,89', 'TRY')).toBe(123456789);
  });

  it('parses English format', () => {
    expect(parseAmount('1,234.56', 'USD')).toBe(123456);
    expect(parseAmount('12.50', 'USD')).toBe(1250);
    expect(parseAmount('1,234,567.89', 'USD')).toBe(123456789);
  });

  it('treats a single separator followed by exactly 2 digits as decimal', () => {
    expect(parseAmount('45,90', 'EUR')).toBe(4590);
    expect(parseAmount('45.90', 'EUR')).toBe(4590);
  });

  it('treats one separator followed by 1 digit as decimal', () => {
    expect(parseAmount('12,5', 'TRY')).toBe(1250);
    expect(parseAmount('12.5', 'USD')).toBe(1250);
  });

  it('treats a single separator followed by 3 digits as thousands', () => {
    expect(parseAmount('1.234', 'TRY')).toBe(123400);
    expect(parseAmount('1,234', 'USD')).toBe(123400);
  });

  it('lets the receipt style decide for 3-decimal currencies, over the locale', () => {
    expect(parseAmount('1.234', 'KWD', { style: 'dot', locale: 'tr' })).toBe(1234);
    expect(parseAmount('1.234', 'KWD', { style: 'comma', locale: 'en' })).toBe(1234000);
    expect(parseAmount('1,234', 'KWD', { locale: 'tr' })).toBe(1234);
    expect(parseAmount('1,234', 'KWD', { locale: 'en' })).toBe(1234000);
  });

  it('ignores currency symbols, codes, spaces and receipt asterisks', () => {
    expect(parseAmount('₺1.234,56', 'TRY')).toBe(123456);
    expect(parseAmount('*1.234,56', 'TRY')).toBe(123456);
    expect(parseAmount('TRY 45,00', 'TRY')).toBe(4500);
    expect(parseAmount(' $ 3.20 ', 'USD')).toBe(320);
    expect(parseAmount('1 234,56 €', 'EUR')).toBe(123456);
    expect(parseAmount("1'234.56", 'CHF')).toBe(123456);
  });

  it('parses whole numbers and trailing separators', () => {
    expect(parseAmount('45', 'TRY')).toBe(4500);
    expect(parseAmount('45,', 'TRY')).toBe(4500);
    expect(parseAmount('0', 'TRY')).toBe(0);
    expect(parseAmount('1500', 'JPY')).toBe(1500);
    expect(parseAmount('1,500', 'JPY')).toBe(1500);
  });

  it('handles negative amounts (refunds, discounts)', () => {
    expect(parseAmount('-12,50', 'TRY')).toBe(-1250);
    expect(parseAmount('−3.20', 'USD')).toBe(-320);
    expect(parseAmount('(3.20)', 'USD')).toBe(-320);
    expect(parseAmount('12,50-', 'TRY')).toBe(-1250);
  });

  it('rejects things that are not amounts', () => {
    expect(parseAmount('', 'TRY')).toBeNull();
    expect(parseAmount('abc', 'TRY')).toBeNull();
    expect(parseAmount(',', 'TRY')).toBeNull();
    expect(parseAmount('1.2345', 'USD')).toBeNull();
    expect(parseAmount('1.5', 'JPY')).toBeNull();
    expect(parseAmount('9999999999999999', 'USD')).toBeNull();
  });

  it('never produces floating point drift', () => {
    expect(parseAmount('0,29', 'TRY')).toBe(29);
    expect(parseAmount('1.005', 'KWD', { style: 'dot' })).toBe(1005);
    expect(parseAmount('19,99', 'EUR')).toBe(1999);
  });
});

describe('formatMoney', () => {
  it('formats in Turkish', () => {
    expect(plain(formatMoney(123456, 'TRY', 'tr'))).toBe('₺1.234,56');
    expect(plain(formatMoney(-1250, 'TRY', 'tr'))).toBe('-₺12,50');
  });

  it('formats in English', () => {
    expect(plain(formatMoney(123456, 'USD', 'en'))).toBe('$1,234.56');
    expect(plain(formatMoney(123456, 'TRY', 'en'))).toBe('₺1,234.56');
  });

  it('respects the currency exponent', () => {
    expect(plain(formatMoney(1500, 'JPY', 'en'))).toBe('¥1,500');
    expect(plain(formatMoney(1234, 'KWD', 'en'))).toMatch(/1\.234$/);
  });

  it('round-trips through parseAmount', () => {
    for (const minor of [0, 1, 99, 100, 123456, 987654321]) {
      expect(parseAmount(formatMoney(minor, 'TRY', 'tr'), 'TRY')).toBe(minor);
      expect(parseAmount(formatMoney(minor, 'USD', 'en'), 'USD')).toBe(minor);
    }
  });
});

describe('formatAmountInput', () => {
  it('formats for editing without a symbol', () => {
    expect(plain(formatAmountInput(123456, 'TRY', 'tr'))).toBe('1.234,56');
    expect(plain(formatAmountInput(123456, 'USD', 'en'))).toBe('1,234.56');
  });
});

describe('currencySymbol', () => {
  it('returns the narrow symbol', () => {
    expect(currencySymbol('TRY', 'tr')).toBe('₺');
    expect(currencySymbol('USD', 'en')).toBe('$');
    expect(currencySymbol('EUR', 'tr')).toBe('€');
  });
});
