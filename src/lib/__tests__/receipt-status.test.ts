import { receiptBadge } from '../receipt-status';

describe('receiptBadge', () => {
  it('shows the status first when it needs attention', () => {
    expect(receiptBadge({ source: 'scan', status: 'needs_review' })).toEqual({ tone: 'review', label: 'needsReview' });
    expect(receiptBadge({ source: 'gib_qr', status: 'queued' })).toEqual({ tone: 'neutral', label: 'queued' });
    expect(receiptBadge({ source: 'scan', status: 'failed' })).toEqual({ tone: 'neutral', label: 'failed' });
  });

  it('shows the source for saved receipts', () => {
    expect(receiptBadge({ source: 'gib_qr', status: 'saved' })).toEqual({ tone: 'verified', label: 'eArsiv' });
    expect(receiptBadge({ source: 'manual', status: 'saved' })).toEqual({ tone: 'neutral', label: 'manual' });
    expect(receiptBadge({ source: 'scan', status: 'saved' })).toBeNull();
  });

  it('leaves processing to the row', () => {
    expect(receiptBadge({ source: 'scan', status: 'processing' })).toBeNull();
  });
});
