/**
 * Per-receipt parse bookkeeping, so a receipt is never sent to the parser twice at once, nor again after
 * it was parsed. Pure; persisted by src/services/parse-lease.ts in the kv store, which every copy of the
 * queue (e.g. a stale one left behind by Fast Refresh) reads and writes synchronously.
 */
export type Lease = { state: 'in_flight' | 'done'; at: number };
export type Leases = Record<string, Lease>;

/** Longer than any parse request can take; a lease older than this belonged to a killed/crashed attempt. */
export const IN_FLIGHT_TTL_MS = 2 * 60_000;
/** How long "already parsed" is remembered. Retakes clear it explicitly. */
export const DONE_TTL_MS = 24 * 60 * 60_000;

export function acquireLease(leases: Leases, receiptId: string, now: number): { ok: true; leases: Leases } | { ok: false; reason: 'in_flight' | 'done' } {
  const lease = leases[receiptId];
  if (lease?.state === 'done' && now - lease.at < DONE_TTL_MS) return { ok: false, reason: 'done' };
  if (lease?.state === 'in_flight' && now - lease.at < IN_FLIGHT_TTL_MS) return { ok: false, reason: 'in_flight' };
  return { ok: true, leases: { ...leases, [receiptId]: { state: 'in_flight', at: now } } };
}

/** Ends an attempt: `done` remembers that the receipt needs no more parsing; otherwise the lease is dropped. */
export function finishLease(leases: Leases, receiptId: string, now: number, done: boolean): Leases {
  const { [receiptId]: _ended, ...rest } = leases;
  return done ? { ...rest, [receiptId]: { state: 'done', at: now } } : rest;
}

/** Forget a receipt (new pages were captured, or it was deleted). */
export function clearLease(leases: Leases, receiptId: string): Leases {
  const { [receiptId]: _cleared, ...rest } = leases;
  return rest;
}

/** Drops expired entries so the stored map stays small. */
export function pruneLeases(leases: Leases, now: number): Leases {
  return Object.fromEntries(
    Object.entries(leases).filter(([, l]) => now - l.at < (l.state === 'done' ? DONE_TTL_MS : IN_FLIGHT_TTL_MS)),
  );
}

export function parseLeases(json: string | null): Leases {
  if (!json) return {};
  try {
    const value: unknown = JSON.parse(json);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        (e): e is [string, Lease] => !!e[1] && typeof e[1] === 'object' && ['in_flight', 'done'].includes((e[1] as Lease).state) && typeof (e[1] as Lease).at === 'number',
      ),
    );
  } catch {
    return {};
  }
}
