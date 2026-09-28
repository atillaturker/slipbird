import type { Category } from '@/theme';

import type { FieldConfidence } from './receipt-normalize';

export type ReceiptSource = 'scan' | 'gib_qr' | 'manual' | 'import';
export type ReceiptStatus = 'processing' | 'needs_review' | 'saved' | 'failed' | 'queued';
export type PaymentMethod = 'card' | 'cash' | 'other';

export const paymentMethods: readonly PaymentMethod[] = ['card', 'cash', 'other'];

/** How a line's quantity is measured: counted, weighed or by volume. */
export type ItemUnit = 'pcs' | 'kg' | 'l';
export const itemUnits: readonly ItemUnit[] = ['pcs', 'kg', 'l'];

/** `info_slip` = "BİLGİ FİŞİ / MALİ DEĞERİ YOKTUR", printed next to an e-Arşiv invoice; not a tax receipt. */
export type DocumentType = 'receipt' | 'invoice' | 'info_slip' | 'other';
export const documentTypes: readonly DocumentType[] = ['receipt', 'invoice', 'info_slip', 'other'];

/**
 * Why automatic reading left a receipt empty (docs/SPEC.md §1.4):
 * quota_exceeded — the free monthly parses are used; unavailable — the backend can't parse at all (no LLM
 * quota or key configured); parse_failed — the model's answer was unusable; rejected — the text was refused.
 */
export type ParseIssue = 'quota_exceeded' | 'unavailable' | 'parse_failed' | 'rejected';
export const parseIssues: readonly ParseIssue[] = ['quota_exceeded', 'unavailable', 'parse_failed', 'rejected'];

export type ReceiptItem = {
  name: string;
  qty: number | null;
  unit: ItemUnit | null;
  amountMinor: number;
};

export type ReceiptTax = {
  rate: number | null;
  amountMinor: number;
};

/** A receipt as the app edits and saves it. Money is integer minor units + ISO 4217 code. */
export type ReceiptInput = {
  /** Legal name as printed ("Çağrı Mağazacılık A.Ş."). */
  merchant: string | null;
  /** Short brand name shown in lists ("Çağrı Market"); null → use `merchant`. */
  merchantDisplay: string | null;
  documentType: DocumentType | null;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm
  totalMinor: number;
  currency: string;
  category: Category;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  source: ReceiptSource;
  status: ReceiptStatus;
  ocrText: string | null;
  ettn: string | null;
  documentNumber: string | null;
  imagePaths: string[];
  /** Per-field confidence from parsing; null for manual entries and once the person has saved. */
  fieldConfidence: FieldConfidence | null;
  /** Set when automatic reading failed for good; cleared by a successful read or by saving. */
  parseIssue: ParseIssue | null;
  items: ReceiptItem[];
  taxes: ReceiptTax[];
};

export type Receipt = ReceiptInput & {
  id: string;
  merchantNormalized: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The columns a list row needs. */
export type ReceiptSummary = Pick<
  Receipt,
  'id' | 'merchant' | 'merchantDisplay' | 'documentType' | 'date' | 'time' | 'totalMinor' | 'currency' | 'category' | 'source' | 'status' | 'imagePaths' | 'fieldConfidence'
>;

/** The name to show for a receipt: the short brand when known, else the legal name. */
export function displayMerchant(r: { merchant: string | null; merchantDisplay: string | null }): string | null {
  return r.merchantDisplay?.trim() || r.merchant?.trim() || null;
}
