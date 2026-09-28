import { hasLowField, type FieldConfidence } from './receipt-normalize';
import type { ReceiptSource, ReceiptStatus } from './types';

export type ReceiptBadge = {
  tone: 'neutral' | 'verified' | 'review';
  /** Translation key under `status.*`. */
  label: 'manual' | 'eArsiv' | 'needsReview' | 'readyToSave' | 'queued' | 'failed';
};

/**
 * The one badge a receipt shows (docs/COMPONENTS.md → Badge). Processing rows show their own
 * "Processing" state, and saved scans need no badge.
 */
export function receiptBadge(receipt: { source: ReceiptSource; status: ReceiptStatus; fieldConfidence?: FieldConfidence | null }): ReceiptBadge | null {
  switch (receipt.status) {
    case 'processing':
      return null;
    case 'failed':
      return { tone: 'neutral', label: 'failed' };
    case 'queued':
      return { tone: 'neutral', label: 'queued' };
    case 'needs_review':
      // `review` only while a low-confidence field is unconfirmed; otherwise it just waits for Save.
      return hasLowField(receipt.fieldConfidence) || !receipt.fieldConfidence ? { tone: 'review', label: 'needsReview' } : { tone: 'neutral', label: 'readyToSave' };
  }
  if (receipt.source === 'gib_qr') return { tone: 'verified', label: 'eArsiv' };
  if (receipt.source === 'manual') return { tone: 'neutral', label: 'manual' };
  return null;
}
