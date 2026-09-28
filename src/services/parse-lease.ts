import Storage from 'expo-sqlite/kv-store';

import { acquireLease, clearLease, finishLease, parseLeases, pruneLeases, type Leases } from '@/lib/parse-lease';

const LEASES_KEY = 'parseLeases';

// Synchronous read-modify-write on the shared kv store: atomic within the JS runtime, and shared by every
// copy of the queue module (so a stale copy after Fast Refresh can't parse the same receipt again).
function read(): Leases {
  return parseLeases(Storage.getItemSync(LEASES_KEY));
}

function write(leases: Leases) {
  Storage.setItemSync(LEASES_KEY, JSON.stringify(leases));
}

/** Claims a receipt for parsing; `in_flight` / `done` when someone else has it or it's already parsed. */
export function claimParse(receiptId: string): { ok: true } | { ok: false; reason: 'in_flight' | 'done' } {
  const now = Date.now();
  const result = acquireLease(pruneLeases(read(), now), receiptId, now);
  if (!result.ok) return result;
  write(result.leases);
  return { ok: true };
}

/** Releases the claim; `done` = parsed (or settled for manual entry), never send it again. */
export function releaseParse(receiptId: string, done: boolean): void {
  write(finishLease(read(), receiptId, Date.now(), done));
}

/** New pages or a deleted receipt: forget what we knew. */
export function forgetParse(receiptId: string): void {
  write(clearLease(read(), receiptId));
}
