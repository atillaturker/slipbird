import { addNetworkStateListener } from 'expo-network';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

import { dequeue, dueItems, enqueue, parseQueue, reschedule, type QueueItem } from '@/lib/retry';

const QUEUE_KEY = 'scanQueue';

/** What processing one queued receipt ended in; `retryAfterMs` when the provider said when to retry. */
export type QueueOutcome = 'done' | 'retry' | { retryAfterMs: number };
type Handler = (receiptId: string) => Promise<QueueOutcome>;

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
        outcome = await handler(item.receiptId);
      } catch {
        outcome = 'retry';
      }
      if (outcome === 'done') write(dequeue(read(), item.receiptId));
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

/** Persists a receipt for parsing and tries right away. */
export function enqueueReceipt(receiptId: string): void {
  write(enqueue(read(), receiptId, Date.now()));
  void processQueue();
}

export function removeFromQueue(receiptId: string): void {
  write(dequeue(read(), receiptId));
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
