import type { ReceiptSource, ReceiptStatus } from './types';

export type ReceiptBadge = {
  tone: 'neutral' | 'verified' | 'review';
  /** Translation key under `status.*`. */
  label: 'manual' | 'eArsiv' | 'needsReview' | 'queued' | 'failed';
};

/**
 * The one badge a receipt shows (docs/COMPONENTS.md → Badge). Processing rows show their own
 * "Processing" state, and saved scans need no badge.
 */
export function receiptBadge(receipt: { source: ReceiptSource; status: ReceiptStatus }): ReceiptBadge | null {
  switch (receipt.status) {
    case 'processing':
      return null;
    case 'failed':
      return { tone: 'neutral', label: 'failed' };
    case 'queued':
      return { tone: 'neutral', label: 'queued' };
    case 'needs_review':
      return { tone: 'review', label: 'needsReview' };
  }
  if (receipt.source === 'gib_qr') return { tone: 'verified', label: 'eArsiv' };
  if (receipt.source === 'manual') return { tone: 'neutral', label: 'manual' };
  return null;
}
