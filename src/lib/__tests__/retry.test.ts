import { dequeue, dueItems, enqueue, parseQueue, reschedule, retryDelayMs } from '../retry';

describe('retryDelayMs', () => {
  it('doubles from 30 s and caps at 1 h', () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(120_000);
    expect(retryDelayMs(20)).toBe(3_600_000);
  });
});

describe('queue', () => {
  it('enqueues once, reschedules with backoff and dequeues', () => {
    let q = enqueue([], 'a', 1000);
    q = enqueue(q, 'a', 2000);
    expect(q).toEqual([{ receiptId: 'a', attempts: 0, nextAttemptAt: 1000 }]);
    q = reschedule(q, 'a', 5000);
    expect(q).toEqual([{ receiptId: 'a', attempts: 1, nextAttemptAt: 35_000 }]);
    expect(dueItems(q, 10_000)).toEqual([]);
    expect(dueItems(q, 10_000, true)).toHaveLength(1);
    expect(dueItems(q, 35_000)).toHaveLength(1);
    expect(dequeue(q, 'a')).toEqual([]);
  });

  it("honours the provider's retry delay, within 1 s…1 h", () => {
    const q = enqueue([], 'a', 0);
    expect(reschedule(q, 'a', 1000, 22_000)[0]).toEqual({ receiptId: 'a', attempts: 1, nextAttemptAt: 23_000 });
    expect(reschedule(q, 'a', 1000, 10)[0].nextAttemptAt).toBe(2000);
    expect(reschedule(q, 'a', 0, 5 * 3_600_000)[0].nextAttemptAt).toBe(3_600_000);
  });

  it('survives corrupt storage', () => {
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue('nope')).toEqual([]);
    expect(parseQueue('[{"receiptId":"a","attempts":1,"nextAttemptAt":5},{"x":1}]')).toEqual([{ receiptId: 'a', attempts: 1, nextAttemptAt: 5 }]);
  });
});
