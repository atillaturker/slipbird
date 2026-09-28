/** Offline scan queue bookkeeping (pure; persisted by src/services/scan-queue.ts). */

export type QueueItem = { receiptId: string; attempts: number; nextAttemptAt: number };

const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 60 * 60_000;

/** Exponential backoff: 30 s, 1 min, 2 min, … capped at 1 hour. `attempts` = failures so far. */
export function retryDelayMs(attempts: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
}

export function enqueue(queue: QueueItem[], receiptId: string, now: number): QueueItem[] {
  if (queue.some((q) => q.receiptId === receiptId)) return queue;
  return [...queue, { receiptId, attempts: 0, nextAttemptAt: now }];
}

export function dequeue(queue: QueueItem[], receiptId: string): QueueItem[] {
  return queue.filter((q) => q.receiptId !== receiptId);
}

/** After a failed attempt: count it and push the next try out. */
export function reschedule(queue: QueueItem[], receiptId: string, now: number): QueueItem[] {
  return queue.map((q) => (q.receiptId === receiptId ? { ...q, attempts: q.attempts + 1, nextAttemptAt: now + retryDelayMs(q.attempts + 1) } : q));
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
