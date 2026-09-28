import type { GibQr } from './gib-qr';
import { gibQrConfidence } from './receipt-normalize';
import type { ReceiptInput } from './types';

/** The row that appears the moment a capture starts: `processing`, no fields yet. */
export function pendingScan(source: 'scan' | 'import', today: string, currency: string): ReceiptInput {
  return {
    merchant: null,
    date: today,
    time: null,
    totalMinor: 0,
    currency,
    category: 'other',
    paymentMethod: null,
    note: null,
    source,
    status: 'processing',
    ocrText: null,
    ettn: null,
    documentNumber: null,
    imagePaths: [],
    fieldConfidence: null,
    items: [],
    taxes: [],
  };
}

/**
 * Fills a draft from a valid GİB QR. Every QR field is trusted (`gib_qr` source). The merchant isn't
 * in the QR, so the receipt waits for review until someone adds it (OCR fills it from M4).
 */
export function applyGibQr(draft: ReceiptInput, qr: GibQr): ReceiptInput {
  return {
    ...draft,
    source: 'gib_qr',
    status: draft.merchant ? 'saved' : 'needs_review',
    date: qr.date,
    totalMinor: qr.totalMinor,
    currency: qr.currency,
    taxes: qr.taxes,
    ettn: qr.ettn,
    documentNumber: qr.documentNumber,
    fieldConfidence: gibQrConfidence(!!draft.merchant),
  };
}

/** Before OCR exists (M4): images are saved and the person fills the fields in. */
export function awaitingReview(draft: ReceiptInput, imagePaths: string[]): ReceiptInput {
  return { ...draft, imagePaths, status: 'needs_review' };
}
