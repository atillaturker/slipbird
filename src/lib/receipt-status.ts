import { hasLowField, type FieldConfidence } from './receipt-normalize';
import type { DocumentType, ReceiptSource, ReceiptStatus } from './types';

export type ReceiptBadge = {
  tone: 'neutral' | 'verified' | 'review';
  /** Translation key under `status.*`. */
  label: 'manual' | 'eArsiv' | 'needsReview' | 'readyToSave' | 'infoSlip' | 'queued' | 'failed';
};

/**
 * The one badge a receipt shows (docs/COMPONENTS.md → Badge). Processing rows show their own
 * "Processing" state, and saved scans need no badge.
 */
export function receiptBadge(receipt: {
  source: ReceiptSource;
  status: ReceiptStatus;
  fieldConfidence?: FieldConfidence | null;
  documentType?: DocumentType | null;
}): ReceiptBadge | null {
  const infoSlip = receipt.documentType === 'info_slip';
  switch (receipt.status) {
    case 'processing':
      return null;
    case 'failed':
      return { tone: 'neutral', label: 'failed' };
    case 'queued':
      return { tone: 'neutral', label: 'queued' };
    case 'needs_review':
      // `review` only while a low-confidence field is unconfirmed; otherwise it just waits for Save.
      if (hasLowField(receipt.fieldConfidence) || !receipt.fieldConfidence) return { tone: 'review', label: 'needsReview' };
      return infoSlip ? { tone: 'neutral', label: 'infoSlip' } : { tone: 'neutral', label: 'readyToSave' };
  }
  // An info slip isn't a tax receipt: say so rather than showing its source.
  if (infoSlip) return { tone: 'neutral', label: 'infoSlip' };
  if (receipt.source === 'gib_qr') return { tone: 'verified', label: 'eArsiv' };
  if (receipt.source === 'manual') return { tone: 'neutral', label: 'manual' };
  return null;
}
