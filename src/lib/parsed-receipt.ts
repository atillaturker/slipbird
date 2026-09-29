import type { Category } from '@/theme';

import type { DocumentType, ItemUnit } from './types';

/**
 * What `parse-receipt` returns. Mirrors supabase/functions/parse-receipt/schema.ts — change both together.
 * Amounts are strings exactly as printed; src/lib/receipt-normalize.ts parses them.
 */
export type Confidence = 'high' | 'low';

export type ParsedReceipt = {
  merchant: { value: string | null; confidence: Confidence };
  merchantDisplay: string | null;
  date: { value: string | null; time: string | null; confidence: Confidence };
  total: { value: string | null; confidence: Confidence };
  currency: { value: string | null; confidence: Confidence };
  tax: { rate: number | null; amount: string }[];
  /** `g` is what the parser reports for grams; the app stores it as kg (see receipt-normalize). */
  items: { name: string; qty: number | null; unit: ItemUnit | 'g' | null; amount: string }[];
  paymentMethod: 'card' | 'cash' | 'other' | null;
  category: { value: Category; confidence: Confidence };
  documentType: DocumentType;
};
