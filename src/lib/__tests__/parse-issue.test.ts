import { issueFromFailure, issueMessage, nextQuotaReset } from '../parse-issue';

describe('issueFromFailure', () => {
  it('keeps the failures that end automatic reading', () => {
    expect(issueFromFailure('quota_exceeded')).toBe('quota_exceeded');
    expect(issueFromFailure('unavailable')).toBe('unavailable');
    expect(issueFromFailure('parse_failed')).toBe('parse_failed');
    expect(issueFromFailure('rejected')).toBe('rejected');
  });

  it('leaves retryable failures to the queue', () => {
    for (const failure of ['offline', 'busy', 'retryable'] as const) expect(issueFromFailure(failure)).toBeNull();
  });
});

describe('issueMessage', () => {
  it('groups unreadable output and refused text', () => {
    expect(issueMessage('quota_exceeded')).toBe('quota');
    expect(issueMessage('unavailable')).toBe('unavailable');
    expect(issueMessage('parse_failed')).toBe('unreadable');
    expect(issueMessage('rejected')).toBe('unreadable');
  });
});

describe('nextQuotaReset', () => {
  it('is the 1st of next month, UTC', () => {
    expect(nextQuotaReset(new Date(Date.UTC(2026, 9, 12, 15)))).toBe('2026-11-01');
    expect(nextQuotaReset(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toBe('2027-01-01');
    expect(nextQuotaReset(new Date(Date.UTC(2026, 0, 1, 0, 0)))).toBe('2026-02-01');
  });
});
