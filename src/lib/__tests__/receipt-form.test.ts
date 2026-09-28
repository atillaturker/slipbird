import { emptyReceiptForm, errorLocation, receiptToForm, validateReceiptForm, type ReceiptForm } from '../receipt-form';
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
  items: [{ name: 'Peynir', qty: 0.45, amountMinor: 21200 }],
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
          { name: 'Süt', qty: '2', amount: '42,50' },
          { name: '', qty: '', amount: '' },
          { name: 'Peynir', qty: '0,45', amount: '212,00' },
        ],
        taxes: [{ rate: '%10', amount: '19,27' }],
      }),
      today,
      'tr',
    );
    expect(result.ok && result.input.items).toEqual([
      { name: 'Süt', qty: 2, amountMinor: 4250 },
      { name: 'Peynir', qty: 0.45, amountMinor: 21200 },
    ]);
    expect(result.ok && result.input.taxes).toEqual([{ rate: 10, amountMinor: 1927 }]);
  });

  it('reports item and tax errors by row index', () => {
    const result = validateReceiptForm(
      base({ items: [{ name: 'A', qty: 'x', amount: '1' }, { name: '', qty: '', amount: 'abc' }], taxes: [{ rate: '150', amount: '1' }] }),
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
    expect(form.items[0]).toEqual({ name: 'Peynir', qty: '0,45', amount: '212,00' });
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
