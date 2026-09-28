import type { ParseIssue } from './types';

/** What the parser client reports (services/parser-client.ts `ParseFailure`). */
type Failure = ParseIssue | 'offline' | 'busy' | 'retryable';

/**
 * The failures that end automatic reading for good (the queue keeps retrying the others: offline, busy,
 * server hiccup). Null for a retryable failure.
 */
export function issueFromFailure(failure: Failure): ParseIssue | null {
  switch (failure) {
    case 'quota_exceeded':
    case 'unavailable':
    case 'parse_failed':
    case 'rejected':
      return failure;
    default:
      return null;
  }
}

/** Translation keys under `parseIssue.*` (title, body). */
export type IssueMessage = 'quota' | 'unavailable' | 'unreadable';

export function issueMessage(issue: ParseIssue): IssueMessage {
  switch (issue) {
    case 'quota_exceeded':
      return 'quota';
    case 'unavailable':
      return 'unavailable';
    default:
      return 'unreadable';
  }
}

/**
 * When the free monthly parses come back: the 1st of next month, UTC (the backend counts per UTC month).
 * Returned as YYYY-MM-DD for display through the date formatters.
 */
export function nextQuotaReset(now: Date): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}
