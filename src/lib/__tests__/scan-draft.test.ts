import { applyGibQr, awaitingReview, pendingScan } from '../scan-draft';
import { parseGibQr } from '../gib-qr';

import { earsivDotDecimal } from '../__fixtures__/gib-qr';

describe('scan drafts', () => {
  const draft = pendingScan('scan', '2026-10-12', 'USD');

  it('starts as a processing row with no fields', () => {
    expect(draft).toMatchObject({ status: 'processing', source: 'scan', merchant: null, totalMinor: 0, currency: 'USD', date: '2026-10-12' });
  });

  it('fills everything the GİB QR carries and waits for the merchant', () => {
    const filled = applyGibQr({ ...draft, imagePaths: ['receipts/x/1.jpg'] }, parseGibQr(earsivDotDecimal)!);
    expect(filled).toMatchObject({
      source: 'gib_qr',
      status: 'needs_review',
      date: '2026-10-12',
      totalMinor: 118000,
      currency: 'TRY',
      ettn: '3f2b8c1e-7a4d-4f6e-9b2a-1c5d8e9f0a12',
      documentNumber: 'GIB2026000000123',
      imagePaths: ['receipts/x/1.jpg'],
    });
    expect(filled.taxes).toHaveLength(2);
  });

  it('is saved straight away when the merchant is already known', () => {
    expect(applyGibQr({ ...draft, merchant: 'Migros' }, parseGibQr(earsivDotDecimal)!).status).toBe('saved');
  });

  it('marks image-only scans for review', () => {
    expect(awaitingReview(draft, ['receipts/x/1.jpg'])).toMatchObject({ status: 'needs_review', imagePaths: ['receipts/x/1.jpg'] });
  });
});
