/** Offline scan queue bookkeeping (pure; persisted by src/services/scan-queue.ts). */

export type QueueItem = { receiptId: string; attempts: number; nextAttemptAt: number };

// Parsing is waiting on someone: retry soon, then settle into a slow steady pace.
const BACKOFF_MS = [5_000, 15_000, 30_000, 60_000];
const STEADY_MS = 5 * 60_000;
// Upper bound for a provider's own retry-after hint (a daily quota can say "hours").
const MAX_DELAY_MS = 60 * 60_000;
const MIN_DELAY_MS = 1_000;

/** Delay after the n-th failure in a row: 5 s, 15 s, 30 s, 60 s, then 5 min each time. */
export function retryDelayMs(attempts: number): number {
  return BACKOFF_MS[Math.max(0, attempts - 1)] ?? STEADY_MS;
}

export function enqueue(queue: QueueItem[], receiptId: string, now: number): QueueItem[] {
  if (queue.some((q) => q.receiptId === receiptId)) return queue;
  return [...queue, { receiptId, attempts: 0, nextAttemptAt: now }];
}

export function dequeue(queue: QueueItem[], receiptId: string): QueueItem[] {
  return queue.filter((q) => q.receiptId !== receiptId);
}

/**
 * After a failed attempt: count it and push the next try out by the backoff schedule — or later, when the
 * provider asked for a longer wait (its hint is clamped to 1 s…1 h).
 */
export function reschedule(queue: QueueItem[], receiptId: string, now: number, providerDelayMs?: number): QueueItem[] {
  return queue.map((q) => {
    if (q.receiptId !== receiptId) return q;
    const backoff = retryDelayMs(q.attempts + 1);
    const hint = providerDelayMs !== undefined ? Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, providerDelayMs)) : 0;
    return { ...q, attempts: q.attempts + 1, nextAttemptAt: now + Math.max(backoff, hint) };
  });
}

/** Look again shortly without counting a failure (another worker is parsing this receipt right now). */
export function postpone(queue: QueueItem[], receiptId: string, now: number, delayMs: number): QueueItem[] {
  return queue.map((q) => (q.receiptId === receiptId ? { ...q, nextAttemptAt: now + delayMs } : q));
}

/** Items due now, oldest first. `force` ignores backoff (connectivity just came back). */
export function dueItems(queue: QueueItem[], now: number, force = false): QueueItem[] {
  return queue.filter((q) => force || q.nextAttemptAt <= now);
}

export function parseQueue(json: string | null): QueueItem[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (q): q is QueueItem => !!q && typeof q.receiptId === 'string' && typeof q.attempts === 'number' && typeof q.nextAttemptAt === 'number',
    );
  } catch {
    return [];
  }
}
