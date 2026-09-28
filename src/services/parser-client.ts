import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import type { ParsedReceipt } from '@/lib/parsed-receipt';

import { ensureSession, supabase } from './supabase';

/**
 * retryable — keep the receipt queued: offline, provider busy, session problem, server hiccup.
 * quota_exceeded / parse_failed / rejected — don't retry; the person fills the receipt in.
 */
export type ParseFailure = 'offline' | 'busy' | 'retryable' | 'quota_exceeded' | 'parse_failed' | 'rejected';

export type ParseResult = { ok: true; receipt: ParsedReceipt } | { ok: false; error: ParseFailure };

export type ParseInput = { text: string; locale: string; deviceCurrency: string; countryHint: string | null };

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
    let code: string | undefined;
    try {
      code = ((await response.json()) as { code?: string }).code;
    } catch {
      code = undefined;
    }
    if (response.status === 401) await supabase.auth.signOut().catch(() => undefined);
    return { ok: false, error: fromCode(response.status, code) };
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return { ok: false, error: 'offline' };
  return { ok: false, error: 'retryable' };
}
