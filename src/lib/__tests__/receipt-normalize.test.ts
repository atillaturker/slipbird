import { parseGibQr } from '../gib-qr';
import type { ParsedReceipt } from '../parsed-receipt';
import { firstLowField, gibQrConfidence, hasLowField, mergeGibQr, normalizeParsedReceipt } from '../receipt-normalize';

import { earsivDotDecimal } from '../__fixtures__/gib-qr';
import { cagriParsed, infoSlipParsed, longParsed } from '../__fixtures__/parsed-receipts';

const ctx = { today: '2026-10-12', deviceCurrency: 'TRY', locale: 'tr' };

const parsed = (patch: Partial<ParsedReceipt> = {}): ParsedReceipt => ({
  merchant: { value: 'Migros Ticaret A.Ş.', confidence: 'high' },
  merchantDisplay: 'Migros',
  date: { value: '2026-10-11', time: '18:42', confidence: 'high' },
  total: { value: '1.234,56', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [{ rate: 10, amount: '112,23' }],
  items: [
    { name: 'Süt', qty: 2, unit: 'pcs', amount: '1.000,00' },
    { name: 'Ekmek', qty: null, unit: null, amount: '234,56' },
  ],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'high' },
  documentType: 'receipt',
  ...patch,
});

describe('normalizeParsedReceipt', () => {
  it('parses a clean Turkish receipt with everything high', () => {
    const r = normalizeParsedReceipt(parsed(), ctx);
    expect(r).toMatchObject({ merchant: 'Migros Ticaret A.Ş.', merchantDisplay: 'Migros', documentType: 'receipt', date: '2026-10-11', time: '18:42', totalMinor: 123456, currency: 'TRY', category: 'groceries', paymentMethod: 'card' });
    expect(r.items).toEqual([
      { name: 'Süt', qty: 2, unit: 'pcs', amountMinor: 100000 },
      { name: 'Ekmek', qty: null, unit: null, amountMinor: 23456 },
    ]);
    expect(r.taxes).toEqual([{ rate: 10, amountMinor: 11223 }]);
    expect(hasLowField(r.fieldConfidence)).toBe(false);
  });

  it("uses the receipt's own number format over the device locale", () => {
    const en = normalizeParsedReceipt(
      parsed({ total: { value: '1,234.56', confidence: 'high' }, currency: { value: 'USD', confidence: 'high' }, items: [], tax: [] }),
      { ...ctx, locale: 'tr' },
    );
    expect(en.totalMinor).toBe(123456);
  });

  it('keeps model uncertainty as low', () => {
    const r = normalizeParsedReceipt(parsed({ merchant: { value: 'M1gros', confidence: 'low' } }), ctx);
    expect(r.fieldConfidence.merchant).toEqual({ confidence: 'low', reason: 'uncertain' });
    expect(firstLowField(r.fieldConfidence)).toBe('merchant');
  });

  it('flags a missing merchant without inventing one', () => {
    const r = normalizeParsedReceipt(parsed({ merchant: { value: '  ', confidence: 'high' } }), ctx);
    expect(r.merchant).toBeNull();
    expect(r.fieldConfidence.merchant).toEqual({ confidence: 'low', reason: 'missing' });
  });

  it('downgrades future and old dates', () => {
    expect(normalizeParsedReceipt(parsed({ date: { value: '2026-10-13', time: null, confidence: 'high' } }), ctx).fieldConfidence.date?.reason).toBe('dateFuture');
    expect(normalizeParsedReceipt(parsed({ date: { value: '2025-10-11', time: null, confidence: 'high' } }), ctx).fieldConfidence.date?.reason).toBe('dateOld');
    expect(normalizeParsedReceipt(parsed({ date: { value: '2025-10-12', time: null, confidence: 'high' } }), ctx).fieldConfidence.date?.confidence).toBe('high');
  });

  it('falls back to today when the date is missing or invalid', () => {
    const r = normalizeParsedReceipt(parsed({ date: { value: '2026-02-31', time: '25:00', confidence: 'high' } }), ctx);
    expect(r.date).toBe('2026-10-12');
    expect(r.time).toBeNull();
    expect(r.fieldConfidence.date?.reason).toBe('missing');
  });

  it('downgrades totals that are missing, not positive, or disagree with the items by over 1%', () => {
    expect(normalizeParsedReceipt(parsed({ total: { value: null, confidence: 'high' } }), ctx).fieldConfidence.total?.reason).toBe('missing');
    expect(normalizeParsedReceipt(parsed({ total: { value: '0,00', confidence: 'high' }, items: [] }), ctx).fieldConfidence.total?.reason).toBe('totalNotPositive');
    expect(normalizeParsedReceipt(parsed({ total: { value: '1.300,00', confidence: 'high' } }), ctx).fieldConfidence.total?.reason).toBe('itemsMismatch');
    // Within 1%: 1.240,00 vs items 1.234,56
    expect(normalizeParsedReceipt(parsed({ total: { value: '1.240,00', confidence: 'high' } }), ctx).fieldConfidence.total?.confidence).toBe('high');
  });

  it('uses the device currency but flags it when none was found', () => {
    const r = normalizeParsedReceipt(parsed({ currency: { value: null, confidence: 'high' } }), { ...ctx, deviceCurrency: 'EUR' });
    expect(r.currency).toBe('EUR');
    expect(r.fieldConfidence.currency).toEqual({ confidence: 'low', reason: 'missing' });
  });

  it('drops unreadable items and taxes, and bad quantities and rates', () => {
    const r = normalizeParsedReceipt(
      parsed({
        items: [
          { name: 'Süt', qty: 0, unit: 'kg', amount: '1.234,56' },
          { name: 'Garbage', qty: 1, unit: null, amount: 'abc' },
          { name: ' ', qty: 1, unit: null, amount: '1,00' },
        ],
        tax: [
          { rate: 150, amount: '10,00' },
          { rate: 10, amount: 'x' },
        ],
      }),
      ctx,
    );
    expect(r.items).toEqual([{ name: 'Süt', qty: null, unit: null, amountMinor: 123456 }]);
    expect(r.taxes).toEqual([{ rate: null, amountMinor: 1000 }]);
  });
});

describe('GİB QR merge', () => {
  it('trusts the QR for date, total, currency and taxes', () => {
    const r = mergeGibQr(normalizeParsedReceipt(parsed({ total: { value: '999,00', confidence: 'low' } }), ctx), parseGibQr(earsivDotDecimal)!);
    expect(r).toMatchObject({ date: '2026-10-12', totalMinor: 118000, currency: 'TRY', merchant: 'Migros Ticaret A.Ş.', documentNumber: 'GIB2026000000123' });
    expect(r.fieldConfidence.total).toEqual({ confidence: 'high' });
    expect(r.taxes).toHaveLength(2);
  });

  it('flags only the merchant for a QR-only receipt', () => {
    expect(firstLowField(gibQrConfidence(false))).toBe('merchant');
    expect(gibQrConfidence(true).merchant).toEqual({ confidence: 'high' });
  });
});

describe('display name, units and document type', () => {
  it('keeps a weighed line with its unit', () => {
    const r = normalizeParsedReceipt(
      parsed({ total: { value: '192,68', confidence: 'high' }, items: [{ name: 'BEYAZ PEYNİR', qty: 0.876, unit: 'kg', amount: '192,68' }] }),
      ctx,
    );
    expect(r.items).toEqual([{ name: 'BEYAZ PEYNİR', qty: 0.876, unit: 'kg', amountMinor: 19268 }]);
  });

  it('converts grams to kilograms', () => {
    const r = normalizeParsedReceipt(
      parsed({
        total: { value: '20,00', confidence: 'high' },
        items: [{ name: 'ZEYTİN SİYAH', qty: 250, unit: 'g', amount: '20,00' }],
      }),
      ctx,
    );
    expect(r.items).toEqual([{ name: 'ZEYTİN SİYAH', qty: 0.25, unit: 'kg', amountMinor: 2000 }]);
    const small = normalizeParsedReceipt(parsed({ items: [{ name: 'X', qty: 5, unit: 'g', amount: '1,00' }] }), ctx);
    expect(small.items[0]).toMatchObject({ qty: 0.005, unit: 'kg' });
  });

  it('drops a unit that has no quantity', () => {
    const r = normalizeParsedReceipt(parsed({ items: [{ name: 'SÜT 1 LT', qty: null, unit: 'l', amount: '34,50' }] }), ctx);
    expect(r.items[0]).toMatchObject({ qty: null, unit: null });
  });

  it('keeps the display name only when there is a merchant', () => {
    expect(normalizeParsedReceipt(parsed({ merchant: { value: null, confidence: 'low' }, merchantDisplay: 'Guess' }), ctx).merchantDisplay).toBeNull();
    expect(normalizeParsedReceipt(parsed({ merchantDisplay: '  ' }), ctx).merchantDisplay).toBeNull();
  });

  it('passes info slips through', () => {
    expect(normalizeParsedReceipt(parsed({ documentType: 'info_slip' }), ctx).documentType).toBe('info_slip');
  });
});

describe('Çağrı fixtures', () => {
  const today = { today: '2026-10-12', deviceCurrency: 'TRY', locale: 'tr' };

  it('normalizes the Çağrı receipt: names, kg line, total matches items', () => {
    const r = normalizeParsedReceipt(cagriParsed, today);
    expect([r.merchant, r.merchantDisplay]).toEqual(['Çağrı Mağazacılık A.Ş.', 'Çağrı Market']);
    expect(r.totalMinor).toBe(66329);
    expect(r.items.find((i) => i.unit === 'kg')).toEqual({ name: 'BEYAZ PEYNİR', qty: 0.876, unit: 'kg', amountMinor: 19268 });
    expect(r.items.find((i) => i.amountMinor === 13426)).toEqual({ name: 'MV.PATLICAN KEMER KG', qty: 2.238, unit: 'kg', amountMinor: 13426 });
    expect(r.items.reduce((s, i) => s + i.amountMinor, 0)).toBe(66329);
    expect(hasLowField(r.fieldConfidence)).toBe(false);
  });

  it('flags a missing line with the difference available', () => {
    const r = normalizeParsedReceipt({ ...cagriParsed, items: cagriParsed.items.slice(0, 3) }, today);
    expect(r.fieldConfidence.total?.reason).toBe('itemsMismatch');
  });

  it('keeps all 34 items of the long receipt, in order, adding up to the total', () => {
    const r = normalizeParsedReceipt(longParsed, { ...today, today: '2026-10-11' });
    expect(r.items).toHaveLength(34);
    expect(r.totalMinor).toBe(301295);
    expect(r.items.reduce((s, i) => s + i.amountMinor, 0)).toBe(301295);
    expect(r.items.filter((i) => i.unit === 'kg').map((i) => i.qty)).toEqual([1.452, 0.968, 1.12]);
    expect(r.fieldConfidence.total).toEqual({ confidence: 'high' });
  });

  it('keeps the info slip type', () => {
    expect(normalizeParsedReceipt(infoSlipParsed, today).documentType).toBe('info_slip');
  });
});
