import { emptyReceiptForm, errorLocation, itemsDifference, receiptToForm, validateReceiptForm, type ReceiptForm } from '../receipt-form';
import type { Receipt } from '../types';

const today = '2026-10-12';
const base = (patch: Partial<ReceiptForm> = {}): ReceiptForm => ({
  ...emptyReceiptForm(today, 'TRY'),
  merchant: 'Migros',
  total: '1.234,56',
  ...patch,
});

const savedReceipt = (): Receipt => ({
  id: 'r1',
  merchant: 'Migros',
  merchantNormalized: null,
  merchantDisplay: null,
  documentType: null,
  date: '2026-10-10',
  time: null,
  totalMinor: 123456,
  currency: 'TRY',
  category: 'groceries',
  paymentMethod: 'card',
  note: null,
  source: 'manual',
  status: 'saved',
  ocrText: null,
  ettn: null,
  documentNumber: null,
  imagePaths: [],
  fieldConfidence: null,
  parseIssue: null,
  items: [{ name: 'Peynir', qty: 0.45, unit: 'kg', amountMinor: 21200 }],
  taxes: [{ rate: 10, amountMinor: 1927 }],
  createdAt: '',
  updatedAt: '',
});

describe('validateReceiptForm', () => {
  it('accepts a minimal receipt and parses money to minor units', () => {
    const result = validateReceiptForm(base(), today, 'tr');
    expect(result.ok && result.input).toMatchObject({ merchant: 'Migros', totalMinor: 123456, currency: 'TRY', note: null, items: [], taxes: [] });
  });

  it('requires a merchant and a positive total', () => {
    const result = validateReceiptForm(base({ merchant: '  ', total: '' }), today, 'tr');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.merchant).toBe('merchantRequired');
      expect(result.errors.total).toBe('totalRequired');
    }
    const zero = validateReceiptForm(base({ total: '0,00' }), today, 'tr');
    expect(!zero.ok && zero.errors.total).toBe('totalInvalid');
  });

  it('rejects invalid and future dates', () => {
    const invalid = validateReceiptForm(base({ date: '2026-02-31' }), today, 'tr');
    expect(!invalid.ok && invalid.errors.date).toBe('dateInvalid');
    const future = validateReceiptForm(base({ date: '2026-10-13' }), today, 'tr');
    expect(!future.ok && future.errors.date).toBe('dateFuture');
  });

  it('parses items and taxes, skipping fully empty rows', () => {
    const result = validateReceiptForm(
      base({
        items: [
          { name: 'Süt', qty: '2', unit: 'pcs', amount: '42,50' },
          { name: '', qty: '', unit: null, amount: '' },
          { name: 'Peynir', qty: '0,45', unit: 'kg', amount: '212,00' },
        ],
        taxes: [{ rate: '%10', amount: '19,27' }],
      }),
      today,
      'tr',
    );
    expect(result.ok && result.input.items).toEqual([
      { name: 'Süt', qty: 2, unit: 'pcs', amountMinor: 4250 },
      { name: 'Peynir', qty: 0.45, unit: 'kg', amountMinor: 21200 },
    ]);
    expect(result.ok && result.input.taxes).toEqual([{ rate: 10, amountMinor: 1927 }]);
  });

  it('reports item and tax errors by row index', () => {
    const result = validateReceiptForm(
      base({ items: [{ name: 'A', qty: 'x', unit: null, amount: '1' }, { name: '', qty: '', unit: null, amount: 'abc' }], taxes: [{ rate: '150', amount: '1' }] }),
      today,
      'tr',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.items).toEqual({ 0: { qty: 'qtyInvalid' }, 1: { name: 'itemNameRequired', amount: 'amountInvalid' } });
      expect(result.errors.taxes).toEqual({ 0: { rate: 'rateInvalid' } });
    }
  });

  it('uses English number format for English input', () => {
    const result = validateReceiptForm(base({ currency: 'USD', total: '1,234.56' }), today, 'en');
    expect(result.ok && result.input.totalMinor).toBe(123456);
  });
});

describe('receiptToForm', () => {
  it('formats a saved receipt for editing and round-trips', () => {
    const receipt = savedReceipt();
    const form = receiptToForm(receipt, 'tr');
    expect(form.total.replace(/ /g, ' ')).toBe('1.234,56');
    expect(form.items[0]).toEqual({ name: 'Peynir', qty: '0,45', unit: 'kg', amount: '212,00' });
    const result = validateReceiptForm(form, today, 'tr');
    expect(result.ok && result.input).toMatchObject({ totalMinor: 123456, items: receipt.items, taxes: receipt.taxes, category: 'groceries', paymentMethod: 'card' });
  });

  it('leaves the total empty for a scan that has none yet', () => {
    const form = receiptToForm(
      { ...savedReceipt(), totalMinor: 0, status: 'needs_review', source: 'scan' },
      'tr',
    );
    expect(form.total).toBe('');
  });
});

describe('errorLocation', () => {
  const none = { items: {}, taxes: {} };
  it('points at the tab holding the errors', () => {
    expect(errorLocation({ ...none, total: 'totalRequired' })).toEqual({ tab: 'receipt', openTaxes: false });
    expect(errorLocation({ ...none, items: { 0: { name: 'itemNameRequired' } } })).toEqual({ tab: 'items', openTaxes: false });
    expect(errorLocation({ ...none, taxes: { 0: { rate: 'rateInvalid' } } })).toEqual({ tab: 'receipt', openTaxes: true });
  });
});

describe('itemsDifference', () => {
  const form = (total: string, amounts: string[]) => ({
    ...emptyReceiptForm(today, 'TRY'),
    total,
    items: amounts.map((amount) => ({ name: 'x', qty: '', unit: null, amount })),
  });

  it('says how far the items are from the total', () => {
    expect(itemsDifference(form('529,03', ['54,90', '89,95', '192,68']), 'tr')).toEqual({ sumMinor: 33753, diffMinor: 19150 });
    expect(itemsDifference(form('100,00', ['60,00', '50,00']), 'tr')).toEqual({ sumMinor: 11000, diffMinor: -1000 });
  });

  it('is null without items or a readable total', () => {
    expect(itemsDifference(form('100,00', []), 'tr')).toBeNull();
    expect(itemsDifference(form('', ['1,00']), 'tr')).toBeNull();
  });
});

describe('merchant names in the form', () => {
  it('shows the display name when there is one', () => {
    expect(receiptToForm({ ...savedReceipt(), merchant: 'Çağrı Mağazacılık A.Ş.', merchantDisplay: 'Çağrı Market' }, 'tr').merchant).toBe('Çağrı Market');
    expect(receiptToForm({ ...savedReceipt(), merchant: 'Migros', merchantDisplay: null }, 'tr').merchant).toBe('Migros');
  });
});
