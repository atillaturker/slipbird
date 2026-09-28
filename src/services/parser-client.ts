import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import type { ParsedReceipt } from '@/lib/parsed-receipt';

import { ensureSession, supabase } from './supabase';

/**
 * retryable — keep the receipt queued: offline, provider busy, session problem, server hiccup.
 * quota_exceeded / parse_failed / rejected / unavailable — don't retry; the person fills the receipt in.
 * `unavailable` = the backend can't parse at all (e.g. no LLM quota for the model): retrying for hours won't help.
 */
export type ParseFailure = 'offline' | 'busy' | 'retryable' | 'quota_exceeded' | 'parse_failed' | 'rejected' | 'unavailable';

export type ParseResult =
  | { ok: true; receipt: ParsedReceipt }
  /** `retryAfterMs`: the provider said when to try again (busy only). */
  | { ok: false; error: ParseFailure; retryAfterMs?: number };

export type ParseInput = {
  text: string;
  locale: string;
  deviceCurrency: string;
  countryHint: string | null;
  /** Local receipt id and queue attempt, so server logs can tell app retries from duplicates. */
  receiptRef: string;
  attempt: number;
};

const RETRYABLE: readonly ParseFailure[] = ['offline', 'busy', 'retryable'];

export function isRetryable(error: ParseFailure): boolean {
  return RETRYABLE.includes(error);
}

function fromCode(status: number, code: string | undefined): ParseFailure {
  switch (code) {
    case 'quota_exceeded':
      return 'quota_exceeded';
    case 'parse_failed':
      return 'parse_failed';
    case 'bad_request':
      return 'rejected';
    case 'config_error':
      return 'unavailable';
    case 'busy':
      return 'busy';
    default:
      return status === 429 ? 'busy' : 'retryable';
  }
}

/** Sends OCR text (never images) to parse-receipt. */
export async function parseReceiptText(input: ParseInput): Promise<ParseResult> {
  if (!supabase) return { ok: false, error: 'retryable' };
  if (!(await ensureSession())) return { ok: false, error: 'offline' };

  const { data, error } = await supabase.functions.invoke<ParsedReceipt>('parse-receipt', { body: input });
  if (!error && data) return { ok: true, receipt: data };

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    let body: { code?: string; retryAfterSeconds?: number } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      body = {};
    }
    if (response.status === 401) await supabase.auth.signOut().catch(() => undefined);
    const failure = fromCode(response.status, body.code);
    const retryAfter = typeof body.retryAfterSeconds === 'number' && body.retryAfterSeconds > 0 ? body.retryAfterSeconds * 1000 : undefined;
    return failure === 'busy' && retryAfter ? { ok: false, error: failure, retryAfterMs: retryAfter } : { ok: false, error: failure };
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return { ok: false, error: 'offline' };
  return { ok: false, error: 'retryable' };
}
