import { gibDate, parseGibQr } from '../gib-qr';

import { earsivDotDecimal, efaturaDecimalComma, foreignCurrency, missingOptionalKeys, oddKeyCasing } from '../__fixtures__/gib-qr';

describe('parseGibQr', () => {
  it('reads an e-Arşiv payload with dot decimals', () => {
    expect(parseGibQr(earsivDotDecimal)).toEqual({
      ettn: '3f2b8c1e-7a4d-4f6e-9b2a-1c5d8e9f0a12',
      documentNumber: 'GIB2026000000123',
      date: '2026-10-12',
      totalMinor: 118000,
      currency: 'TRY',
      taxes: [
        { rate: 10, amountMinor: 2000 },
        { rate: 20, amountMinor: 16000 },
      ],
      sellerTaxId: '1234567890',
      scenario: 'EARSIVFATURA',
      type: 'SATIS',
    });
  });

  it('reads decimal commas, DD.MM.YYYY dates and TL', () => {
    const qr = parseGibQr(efaturaDecimalComma);
    expect(qr).toMatchObject({ date: '2026-03-05', totalMinor: 252500, currency: 'TRY', taxes: [{ rate: 1, amountMinor: 2500 }] });
  });

  it('falls back to vergidahil and tolerates missing keys', () => {
    expect(parseGibQr(missingOptionalKeys)).toMatchObject({
      ettn: null,
      documentNumber: null,
      date: '2026-09-30',
      totalMinor: 4590,
      currency: 'TRY',
      taxes: [],
    });
  });

  it('keeps a foreign currency', () => {
    expect(parseGibQr(foreignCurrency)).toMatchObject({ currency: 'EUR', totalMinor: 6000, taxes: [{ rate: 20, amountMinor: 1000 }] });
  });

  it('normalises key casing and spaces', () => {
    expect(parseGibQr(oddKeyCasing)).toMatchObject({ date: '2026-07-14', totalMinor: 2040, taxes: [{ rate: 20, amountMinor: 340 }] });
  });

  it('rejects QR codes that are not GİB invoices', () => {
    expect(parseGibQr('https://example.com/menu')).toBeNull();
    expect(parseGibQr('{not json')).toBeNull();
    expect(parseGibQr('[1,2,3]')).toBeNull();
    expect(parseGibQr(JSON.stringify({ tarih: '2026-01-01', odenecek: '10.00' }))).toBeNull(); // no identifying key
    expect(parseGibQr(JSON.stringify({ ettn: 'x', tarih: '2026-02-31', odenecek: '10.00' }))).toBeNull(); // bad date
    expect(parseGibQr(JSON.stringify({ ettn: 'x', tarih: '2026-01-01', odenecek: '0.00' }))).toBeNull(); // no total
  });
});

describe('gibDate', () => {
  it('accepts common layouts', () => {
    expect(gibDate('2026-10-12')).toBe('2026-10-12');
    expect(gibDate('12-10-2026')).toBe('2026-10-12');
    expect(gibDate('12/10/2026')).toBe('2026-10-12');
    expect(gibDate('2026-10-12T14:32:00')).toBe('2026-10-12');
    expect(gibDate('1.2.2026')).toBe('2026-02-01');
    expect(gibDate('')).toBeNull();
    expect(gibDate('yesterday')).toBeNull();
  });
});
