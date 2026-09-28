import { addNetworkStateListener } from 'expo-network';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

import { dequeue, dueItems, enqueue, parseQueue, postpone, reschedule, type QueueItem } from '@/lib/retry';

import { CACHE_KEYS } from './kv-keys';
import { forgetParse } from './parse-lease';

const QUEUE_KEY = CACHE_KEYS.scanQueue;

/**
 * What processing one queued receipt ended in. `retryAfterMs` when the provider said when to retry;
 * `in_flight` when another worker is parsing it right now (look again shortly, not a failure).
 */
export type QueueOutcome = 'done' | 'retry' | 'in_flight' | { retryAfterMs: number };
/** `attempt` is 1 for the first try, 2 for the first retry, … */
type Handler = (receiptId: string, attempt: number) => Promise<QueueOutcome>;

const IN_FLIGHT_RECHECK_MS = 5_000;

let handler: Handler | null = null;
let running = false;
let rerun = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function read(): QueueItem[] {
  return parseQueue(Storage.getItemSync(QUEUE_KEY));
}

function write(queue: QueueItem[]) {
  Storage.setItemSync(QUEUE_KEY, JSON.stringify(queue));
}

function scheduleNext(queue: QueueItem[]) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const next = Math.min(...queue.map((q) => q.nextAttemptAt));
  timer = setTimeout(() => void processQueue(), Math.max(1000, next - Date.now()));
}

/** Runs every due item once (all of them when `force`, e.g. connectivity came back). */
export async function processQueue(force = false): Promise<void> {
  if (!handler) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    for (const item of dueItems(read(), Date.now(), force)) {
      let outcome: QueueOutcome;
      try {
        outcome = await handler(item.receiptId, item.attempts + 1);
      } catch {
        outcome = 'retry';
      }
      if (outcome === 'done') write(dequeue(read(), item.receiptId));
      else if (outcome === 'in_flight') write(postpone(read(), item.receiptId, Date.now(), IN_FLIGHT_RECHECK_MS));
      else write(reschedule(read(), item.receiptId, Date.now(), outcome === 'retry' ? undefined : outcome.retryAfterMs));
    }
  } finally {
    running = false;
    scheduleNext(read());
    if (rerun) {
      rerun = false;
      void processQueue();
    }
  }
}

/** Persists a receipt for parsing and tries right away. New pages: whatever was parsed before no longer counts. */
export function enqueueReceipt(receiptId: string): void {
  forgetParse(receiptId);
  write(enqueue(read(), receiptId, Date.now()));
  void processQueue();
}

export function removeFromQueue(receiptId: string): void {
  write(dequeue(read(), receiptId));
  forgetParse(receiptId);
}

/** Starts processing: now, when the app comes to the foreground, and when the network returns. */
export function startScanQueue(process: Handler): () => void {
  handler = process;
  void processQueue();
  const network = addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void processQueue(true);
  });
  const app = AppState.addEventListener('change', (state) => {
    if (state === 'active') void processQueue();
  });
  return () => {
    network.remove();
    app.remove();
    if (timer) clearTimeout(timer);
    handler = null;
  };
}
