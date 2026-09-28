import { parseImagePaths, rowToReceipt, rowToSummary, type ReceiptRow } from '../mappers';

const row: ReceiptRow = {
  id: 'r1',
  merchant: 'Migros',
  merchantNormalized: null,
  merchantDisplay: 'Migros Jet',
  documentType: 'receipt',
  date: '2026-10-12',
  time: '18:42',
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
  imagePaths: '["a.jpg"]',
  fieldConfidence: null,
  createdAt: '2026-10-12T15:42:00.000Z',
  updatedAt: '2026-10-12T15:42:00.000Z',
};

describe('mappers', () => {
  it('maps a full receipt with items and taxes', () => {
    const receipt = rowToReceipt(row, [{ name: 'Süt', qty: 2, unit: 'pcs', amountMinor: 4250 }], [{ rate: 10, amountMinor: 1927 }]);
    expect(receipt).toMatchObject({ id: 'r1', category: 'groceries', paymentMethod: 'card', imagePaths: ['a.jpg'] });
    expect(receipt.items).toEqual([{ name: 'Süt', qty: 2, unit: 'pcs', amountMinor: 4250 }]);
    expect([receipt.merchantDisplay, receipt.documentType]).toEqual(['Migros Jet', 'receipt']);
    expect(receipt.taxes).toEqual([{ rate: 10, amountMinor: 1927 }]);
  });

  it('falls back safely on unknown enum values', () => {
    const summary = rowToSummary({ ...row, category: 'pets', source: 'fax', status: 'weird' });
    expect(summary).toMatchObject({ category: 'other', source: 'manual', status: 'saved' });
    expect(rowToReceipt({ ...row, paymentMethod: 'crypto' }, [], []).paymentMethod).toBeNull();
    expect(rowToReceipt({ ...row, documentType: 'coupon' }, [{ name: 'x', qty: 1, unit: 'gallon', amountMinor: 1 }], []).items[0].unit).toBeNull();
  });

  it('tolerates broken imagePaths JSON', () => {
    expect(parseImagePaths('not json')).toEqual([]);
    expect(parseImagePaths('{"a":1}')).toEqual([]);
    expect(parseImagePaths('["x", 3]')).toEqual(['x']);
  });
});
