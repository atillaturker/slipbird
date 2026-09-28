import { acquireLease, clearLease, DONE_TTL_MS, finishLease, IN_FLIGHT_TTL_MS, parseLeases, pruneLeases, type Leases } from '../parse-lease';

describe('parse lease', () => {
  it('lets only one attempt in while it is in flight', () => {
    const first = acquireLease({}, 'r1', 0);
    expect(first.ok).toBe(true);
    const leases = first.ok ? first.leases : {};
    expect(acquireLease(leases, 'r1', 1000)).toEqual({ ok: false, reason: 'in_flight' });
    expect(acquireLease(leases, 'r2', 1000).ok).toBe(true);
  });

  it('refuses a receipt that was already parsed', () => {
    const leases = finishLease({ r1: { state: 'in_flight', at: 0 } }, 'r1', 5000, true);
    expect(acquireLease(leases, 'r1', 6000)).toEqual({ ok: false, reason: 'done' });
  });

  it('frees the receipt after a failed attempt, for the next retry', () => {
    const leases = finishLease({ r1: { state: 'in_flight', at: 0 } }, 'r1', 5000, false);
    expect(leases).toEqual({});
    expect(acquireLease(leases, 'r1', 6000).ok).toBe(true);
  });

  it('takes over a lease left by an attempt that died', () => {
    expect(acquireLease({ r1: { state: 'in_flight', at: 0 } }, 'r1', IN_FLIGHT_TTL_MS).ok).toBe(true);
  });

  it('a retake clears "already parsed"', () => {
    const leases: Leases = { r1: { state: 'done', at: 0 } };
    expect(acquireLease(clearLease(leases, 'r1'), 'r1', 1).ok).toBe(true);
  });

  it('prunes expired entries and survives corrupt storage', () => {
    const leases: Leases = { old: { state: 'done', at: 0 }, stuck: { state: 'in_flight', at: 0 }, fresh: { state: 'done', at: DONE_TTL_MS } };
    expect(Object.keys(pruneLeases(leases, DONE_TTL_MS + 1))).toEqual(['fresh']);
    expect(parseLeases('nope')).toEqual({});
    expect(parseLeases('{"a":{"state":"done","at":1},"b":{"state":"weird","at":1},"c":3}')).toEqual({ a: { state: 'done', at: 1 } });
  });
});
