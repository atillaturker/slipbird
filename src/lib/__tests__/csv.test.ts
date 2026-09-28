import { buildCsv, CSV_COLUMNS } from '../csv';
import type { Receipt } from '../types';

const receipt = (patch: Partial<Receipt> = {}): Receipt => ({
  id: 'r1',
  merchant: 'Migros Ticaret A.Ş.',
  merchantDisplay: 'Migros',
  merchantNormalized: 'migros',
  documentType: 'receipt',
  date: '2026-10-11',
  time: '18:42',
  totalMinor: 34753,
  currency: 'TRY',
  category: 'groceries',
  paymentMethod: 'card',
  note: null,
  source: 'scan',
  status: 'saved',
  ocrText: 'PRIVATE OCR TEXT',
  ettn: null,
  documentNumber: null,
  imagePaths: ['receipts/r1/1.jpg'],
  fieldConfidence: null,
  parseIssue: null,
  items: [
    { name: 'Süt 1 LT', qty: 2, unit: 'pcs', amountMinor: 6900 },
    { name: 'Beyaz peynir', qty: 0.876, unit: 'kg', amountMinor: 19268 },
  ],
  taxes: [{ rate: 1, amountMinor: 3441 }],
  createdAt: '',
  updatedAt: '',
  ...patch,
});

const lines = (csv: string) => csv.replace(/^﻿/, '').trimEnd().split('\r\n');

describe('buildCsv', () => {
  it('starts with a BOM and the header, and ends with a newline', () => {
    const csv = buildCsv([]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines(csv)).toEqual([CSV_COLUMNS.join(',')]);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('writes one row per item with receipt columns repeated', () => {
    const rows = lines(buildCsv([receipt()]));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toBe('2026-10-11,18:42,Migros,groceries,card,TRY,347.53,34.41,receipt,,scan,,Süt 1 LT,2,pcs,69.00');
    expect(rows[2]).toBe('2026-10-11,18:42,Migros,groceries,card,TRY,,,receipt,,scan,,Beyaz peynir,0.876,kg,192.68');
  });

  it('keeps receipt totals on the first row only, so summing never double counts', () => {
    const rows = lines(buildCsv([receipt()])).slice(1).map((r) => r.split(','));
    const totalIndex = CSV_COLUMNS.indexOf('total');
    expect(rows.map((r) => r[totalIndex])).toEqual(['347.53', '']);
  });

  it('writes a single row for a receipt without items', () => {
    const rows = lines(buildCsv([receipt({ items: [], taxes: [], time: null, paymentMethod: null, merchantDisplay: null })]));
    expect(rows[1]).toBe('2026-10-11,,Migros Ticaret A.Ş.,groceries,,TRY,347.53,,receipt,,scan,,,,,');
  });

  it('quotes commas, quotes and line breaks', () => {
    const rows = buildCsv([receipt({ note: 'said "hi", left\nright', items: [] })]);
    expect(rows).toContain('"said ""hi"", left\nright"');
  });

  it('neutralises spreadsheet formulas in text from receipts', () => {
    const csv = buildCsv([receipt({ merchantDisplay: null, merchant: '=HYPERLINK("http://x")', note: '+1 call', items: [{ name: '@SUM(A1)', qty: null, unit: null, amountMinor: 100 }] })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain("'+1 call");
    expect(csv).toContain("'@SUM(A1)");
  });

  it('does not touch generated negative amounts (refunds)', () => {
    expect(lines(buildCsv([receipt({ totalMinor: -1250, items: [], taxes: [] })]))[1]).toContain(',TRY,-12.50,');
  });

  it('never exports OCR text or image paths', () => {
    const csv = buildCsv([receipt()]);
    expect(csv).not.toContain('PRIVATE OCR TEXT');
    expect(csv).not.toContain('.jpg');
  });
});
