import type { Category } from '@/theme';

export type ReceiptSource = 'scan' | 'gib_qr' | 'manual' | 'import';
export type ReceiptStatus = 'processing' | 'needs_review' | 'saved' | 'failed' | 'queued';
export type PaymentMethod = 'card' | 'cash' | 'other';

export const paymentMethods: readonly PaymentMethod[] = ['card', 'cash', 'other'];

export type ReceiptItem = {
  name: string;
  qty: number | null;
  amountMinor: number;
};

export type ReceiptTax = {
  rate: number | null;
  amountMinor: number;
};

/** A receipt as the app edits and saves it. Money is integer minor units + ISO 4217 code. */
export type ReceiptInput = {
  merchant: string | null;
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
  'id' | 'merchant' | 'date' | 'time' | 'totalMinor' | 'currency' | 'category' | 'source' | 'status' | 'imagePaths'
>;
