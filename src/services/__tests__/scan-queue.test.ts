import { AppState } from 'react-native';

// In-memory kv store shared by the queue and the parse lease (like the real sqlite kv store).
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return { __esModule: true, default: { getItemSync: (k: string) => store.get(k) ?? null, setItemSync: (k: string, v: string) => store.set(k, v) } };
});

let mockNetworkListener: ((state: { isConnected?: boolean; isInternetReachable?: boolean }) => void) | null = null;
jest.mock('expo-network', () => ({
  addNetworkStateListener: (fn: typeof mockNetworkListener) => {
    mockNetworkListener = fn;
    return { remove: () => undefined };
  },
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flush = () => new Promise<void>((r) => setImmediate(() => r()));

describe('scan queue de-duplication', () => {
  let appStateListener: ((s: string) => void) | null = null;

  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
      appStateListener = fn as (s: string) => void;
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
  });

  it('parses a receipt once even when enqueue, network and foreground events all fire while it is in flight', async () => {
    const { enqueueReceipt, processQueue, startScanQueue } = jest.requireActual<typeof import('../scan-queue')>('../scan-queue');
    const gate = deferred<'done'>();
    const handler = jest.fn(() => gate.promise);
    const stop = startScanQueue(handler);

    enqueueReceipt('r1');
    mockNetworkListener?.({ isConnected: true, isInternetReachable: true });
    appStateListener?.('active');
    void processQueue(true);
    enqueueReceipt('r1');
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);

    gate.resolve('done');
    await flush();
    await flush();
    mockNetworkListener?.({ isConnected: true, isInternetReachable: true });
    appStateListener?.('active');
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    stop();
  });
});
