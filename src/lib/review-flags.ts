import type { FieldConfidence, FlagReason, ReviewFieldKey } from './receipt-normalize';

/** Translation keys under `review.flags.*` for the short check message on a low field. */
export type FlagMessage =
  | 'merchantMissing'
  | 'merchantCheck'
  | 'dateMissing'
  | 'dateFuture'
  | 'dateOld'
  | 'dateCheck'
  | 'totalMissing'
  | 'totalNotPositive'
  | 'itemsMismatch'
  | 'totalCheck'
  | 'currencyCheck'
  | 'categoryCheck';

export function flagMessage(field: ReviewFieldKey, reason: FlagReason | undefined): FlagMessage {
  switch (field) {
    case 'merchant':
      return reason === 'missing' ? 'merchantMissing' : 'merchantCheck';
    case 'date':
      if (reason === 'missing') return 'dateMissing';
      if (reason === 'dateFuture') return 'dateFuture';
      if (reason === 'dateOld') return 'dateOld';
      return 'dateCheck';
    case 'total':
      if (reason === 'missing') return 'totalMissing';
      if (reason === 'totalNotPositive') return 'totalNotPositive';
      if (reason === 'itemsMismatch') return 'itemsMismatch';
      return 'totalCheck';
    case 'currency':
      return 'currencyCheck';
    case 'category':
      return 'categoryCheck';
  }
}

/** Confidence for a receipt nobody could parse (OCR/parser failed, quota used): the person fills it all in. */
export function unparsedConfidence(existing: FieldConfidence | null): FieldConfidence {
  const missing = { confidence: 'low' as const, reason: 'missing' as const };
  return {
    merchant: missing,
    date: missing,
    total: missing,
    currency: missing,
    category: { confidence: 'low', reason: 'uncertain' },
    // Keep whatever a GİB QR already established.
    ...Object.fromEntries(Object.entries(existing ?? {}).filter(([, v]) => v?.confidence === 'high')),
  };
}
