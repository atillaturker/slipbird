import { categoryOrder, type Category } from '@/theme';

import type { FieldConfidence } from '@/lib/receipt-normalize';
import { documentTypes, itemUnits, parseIssues, paymentMethods, type DocumentType, type ItemUnit, type ParseIssue, type PaymentMethod, type Receipt, type ReceiptItem, type ReceiptSource, type ReceiptStatus, type ReceiptSummary, type ReceiptTax } from '@/lib/types';

/** Row shapes as SQLite returns them. */
export type ReceiptRow = {
  id: string;
  merchant: string | null;
  merchantNormalized: string | null;
  merchantDisplay: string | null;
  documentType: string | null;
  date: string;
  time: string | null;
  totalMinor: number;
  currency: string;
  category: string;
  paymentMethod: string | null;
  note: string | null;
  source: string;
  status: string;
  ocrText: string | null;
  ettn: string | null;
  documentNumber: string | null;
  imagePaths: string;
  fieldConfidence: string | null;
  parseIssue: string | null;
  createdAt: string;
  updatedAt: string;
};
export type ReceiptSummaryRow = Pick<ReceiptRow, keyof ReceiptSummary>;
export type ItemRow = { name: string; qty: number | null; unit: string | null; amountMinor: number };
export type TaxRow = { rate: number | null; amountMinor: number };

const sources: readonly ReceiptSource[] = ['scan', 'gib_qr', 'manual', 'import'];
const statuses: readonly ReceiptStatus[] = ['processing', 'needs_review', 'saved', 'failed', 'queued'];

function oneOf<T extends string>(values: readonly T[], value: string | null, fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

export function toCategory(value: string | null): Category {
  return oneOf(categoryOrder, value, 'other');
}

function toDocumentType(value: string | null): DocumentType | null {
  return value && documentTypes.includes(value as DocumentType) ? (value as DocumentType) : null;
}

function toUnit(value: string | null): ItemUnit | null {
  return value && itemUnits.includes(value as ItemUnit) ? (value as ItemUnit) : null;
}

function toParseIssue(value: string | null): ParseIssue | null {
  return value && parseIssues.includes(value as ParseIssue) ? (value as ParseIssue) : null;
}

function toPaymentMethod(value: string | null): PaymentMethod | null {
  return value && paymentMethods.includes(value as PaymentMethod) ? (value as PaymentMethod) : null;
}

export function parseImagePaths(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function parseFieldConfidence(json: string | null): FieldConfidence | null {
  if (!json) return null;
  try {
    const value: unknown = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as FieldConfidence) : null;
  } catch {
    return null;
  }
}

export function rowToSummary(row: ReceiptSummaryRow): ReceiptSummary {
  return {
    id: row.id,
    merchant: row.merchant,
    merchantDisplay: row.merchantDisplay,
    documentType: toDocumentType(row.documentType),
    date: row.date,
    time: row.time,
    totalMinor: row.totalMinor,
    currency: row.currency,
    category: toCategory(row.category),
    source: oneOf(sources, row.source, 'manual'),
    status: oneOf(statuses, row.status, 'saved'),
    imagePaths: parseImagePaths(row.imagePaths),
    fieldConfidence: parseFieldConfidence(row.fieldConfidence),
  };
}

export function rowToReceipt(row: ReceiptRow, items: ItemRow[], taxes: TaxRow[]): Receipt {
  return {
    ...rowToSummary(row),
    merchantNormalized: row.merchantNormalized,
    paymentMethod: toPaymentMethod(row.paymentMethod),
    parseIssue: toParseIssue(row.parseIssue),
    note: row.note,
    ocrText: row.ocrText,
    ettn: row.ettn,
    documentNumber: row.documentNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: items.map((i): ReceiptItem => ({ name: i.name, qty: i.qty, unit: toUnit(i.unit), amountMinor: i.amountMinor })),
    taxes: taxes.map((t): ReceiptTax => ({ rate: t.rate, amountMinor: t.amountMinor })),
  };
}
