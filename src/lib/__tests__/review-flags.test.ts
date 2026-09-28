import { gibQrConfidence } from '../receipt-normalize';
import { flagMessage, unparsedConfidence } from '../review-flags';

describe('flagMessage', () => {
  it('maps field and reason to a message', () => {
    expect(flagMessage('merchant', 'missing')).toBe('merchantMissing');
    expect(flagMessage('merchant', 'uncertain')).toBe('merchantCheck');
    expect(flagMessage('date', 'dateFuture')).toBe('dateFuture');
    expect(flagMessage('total', 'itemsMismatch')).toBe('itemsMismatch');
    expect(flagMessage('total', undefined)).toBe('totalCheck');
    expect(flagMessage('category', 'uncertain')).toBe('categoryCheck');
  });
});

describe('unparsedConfidence', () => {
  it('flags everything when nothing is known', () => {
    const fc = unparsedConfidence(null);
    expect(fc.merchant?.confidence).toBe('low');
    expect(fc.total?.reason).toBe('missing');
  });

  it('keeps what a GİB QR established', () => {
    const fc = unparsedConfidence(gibQrConfidence(false));
    expect(fc.total).toEqual({ confidence: 'high' });
    expect(fc.merchant?.confidence).toBe('low');
  });
});
