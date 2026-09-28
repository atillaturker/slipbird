import { dequeue, dueItems, enqueue, parseQueue, postpone, reschedule, retryDelayMs } from '../retry';

describe('retryDelayMs', () => {
  it('backs off 5 s, 15 s, 30 s, 60 s, then every 5 min', () => {
    expect([1, 2, 3, 4, 5, 6, 50].map(retryDelayMs)).toEqual([5_000, 15_000, 30_000, 60_000, 300_000, 300_000, 300_000]);
  });
});

describe('queue', () => {
  it('enqueues once, reschedules with backoff and dequeues', () => {
    let q = enqueue([], 'a', 1000);
    q = enqueue(q, 'a', 2000);
    expect(q).toEqual([{ receiptId: 'a', attempts: 0, nextAttemptAt: 1000 }]);
    q = reschedule(q, 'a', 10_000);
    expect(q).toEqual([{ receiptId: 'a', attempts: 1, nextAttemptAt: 15_000 }]);
    q = reschedule(q, 'a', 15_000);
    expect(q[0]).toEqual({ receiptId: 'a', attempts: 2, nextAttemptAt: 30_000 });
    expect(dueItems(q, 20_000)).toEqual([]);
    expect(dueItems(q, 20_000, true)).toHaveLength(1);
    expect(dueItems(q, 30_000)).toHaveLength(1);
    expect(dequeue(q, 'a')).toEqual([]);
  });

  it("waits for the provider's hint when it is longer than the backoff, within 1 h", () => {
    const q = enqueue([], 'a', 0);
    expect(reschedule(q, 'a', 1000, 22_000)[0]).toEqual({ receiptId: 'a', attempts: 1, nextAttemptAt: 23_000 });
    expect(reschedule(q, 'a', 1000, 2_000)[0].nextAttemptAt).toBe(6_000); // backoff (5 s) is longer
    expect(reschedule(q, 'a', 0, 5 * 3_600_000)[0].nextAttemptAt).toBe(3_600_000);
  });

  it('postpones without counting a failure', () => {
    const q = postpone(enqueue([], 'a', 0), 'a', 1000, 5000);
    expect(q[0]).toEqual({ receiptId: 'a', attempts: 0, nextAttemptAt: 6000 });
  });

  it('survives corrupt storage', () => {
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue('nope')).toEqual([]);
    expect(parseQueue('[{"receiptId":"a","attempts":1,"nextAttemptAt":5},{"x":1}]')).toEqual([{ receiptId: 'a', attempts: 1, nextAttemptAt: 5 }]);
  });
});
