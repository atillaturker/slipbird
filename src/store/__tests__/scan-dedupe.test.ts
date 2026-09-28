// processQueuedReceipt must send a receipt to the parser at most once at a time, and never again once parsed.

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return { __esModule: true, default: { getItemSync: (k: string) => store.get(k) ?? null, setItemSync: (k: string, v: string) => store.set(k, v) } };
});
jest.mock('expo-network', () => ({ addNetworkStateListener: () => ({ remove: () => undefined }) }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
jest.mock('@/services/capture', () => ({}));
jest.mock('@/services/images', () => ({ saveReceiptImages: jest.fn(), deleteReceiptImages: jest.fn(), imageUri: (p: string) => p }));
jest.mock('@/services/ocr', () => ({}));
jest.mock('@/db', () => ({ getDb: () => ({}) }));
jest.mock('@/db/merchant-rules', () => ({ getMerchantRule: async () => null, saveMerchantRule: async () => undefined }));

// One receipt in the database; its status changes when the store saves it.
const mockReceipt = {
  id: 'r1',
  merchant: null,
  merchantDisplay: null,
  merchantNormalized: null,
  documentType: null,
  date: '2026-10-12',
  time: null,
  totalMinor: 0,
  currency: 'TRY',
  category: 'other',
  paymentMethod: null,
  note: null,
  source: 'scan',
  status: 'queued',
  ocrText: 'MIGROS TOPLAM 42,50 KREDI KARTI',
  ettn: null,
  documentNumber: null,
  imagePaths: [],
  fieldConfidence: null,
  items: [],
  taxes: [],
  createdAt: '',
  updatedAt: '',
};
let mockRow = { ...mockReceipt };
jest.mock('@/db/receipts', () => ({ getReceipt: async () => ({ ...mockRow }) }));
jest.mock('@/store/receipts', () => ({
  useReceipts: { getState: () => ({ save: async (input: { status: string }) => { mockRow = { ...mockRow, ...input }; return 'r1'; } }) },
}));

const mockParse = jest.fn();
jest.mock('@/services/parser-client', () => ({
  parseReceiptText: (...args: unknown[]) => mockParse(...args),
  isRetryable: (e: string) => ['offline', 'busy', 'retryable'].includes(e),
}));

const parsed = {
  merchant: { value: 'Migros Ticaret A.Ş.', confidence: 'high' },
  merchantDisplay: 'Migros',
  date: { value: '2026-10-12', time: null, confidence: 'high' },
  total: { value: '42,50', confidence: 'high' },
  currency: { value: 'TRY', confidence: 'high' },
  tax: [],
  items: [],
  paymentMethod: 'card',
  category: { value: 'groceries', confidence: 'high' },
  documentType: 'receipt',
};

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('processQueuedReceipt de-duplication', () => {
  beforeEach(() => {
    mockRow = { ...mockReceipt };
    mockParse.mockReset();
  });

  it('sends one request when called twice concurrently, and none after it succeeded', async () => {
    const { processQueuedReceipt } = jest.requireActual<typeof import('../scan')>('../scan');
    const gate = deferred<unknown>();
    mockParse.mockReturnValue(gate.promise);

    const first = processQueuedReceipt('r1', 1);
    const second = await processQueuedReceipt('r1', 1); // e.g. a second copy of the queue
    expect(second).toBe('in_flight');

    gate.resolve({ ok: true, receipt: parsed });
    expect(await first).toBe('done');
    expect(mockRow.status).toBe('needs_review');
    expect(mockRow.merchantDisplay).toBe('Migros');

    // The receipt is back in "queued" by some mistake: still not parsed again.
    mockRow = { ...mockRow, status: 'queued' };
    expect(await processQueuedReceipt('r1', 2)).toBe('done');
    expect(mockParse).toHaveBeenCalledTimes(1);
    expect(mockParse.mock.calls[0][0]).toMatchObject({ receiptRef: 'r1', attempt: 1 });
  });

  it('frees the receipt after a busy answer so the retry can go out', async () => {
    const { processQueuedReceipt } = jest.requireActual<typeof import('../scan')>('../scan');
    const { forgetParse } = jest.requireActual<typeof import('@/services/parse-lease')>('@/services/parse-lease');
    forgetParse('r1');
    mockParse.mockResolvedValueOnce({ ok: false, error: 'busy', retryAfterMs: 7000 });
    expect(await processQueuedReceipt('r1', 1)).toEqual({ retryAfterMs: 7000 });
    mockParse.mockResolvedValueOnce({ ok: true, receipt: parsed });
    expect(await processQueuedReceipt('r1', 2)).toBe('done');
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  it('a retake (new pages) may be parsed again', async () => {
    const { processQueuedReceipt } = jest.requireActual<typeof import('../scan')>('../scan');
    const { forgetParse } = jest.requireActual<typeof import('@/services/parse-lease')>('@/services/parse-lease');
    forgetParse('r1');
    mockParse.mockResolvedValue({ ok: true, receipt: parsed });
    await processQueuedReceipt('r1', 1);
    mockRow = { ...mockRow, status: 'queued' };
    forgetParse('r1'); // what enqueueReceipt does for new pages
    await processQueuedReceipt('r1', 1);
    expect(mockParse).toHaveBeenCalledTimes(2);
  });
});
