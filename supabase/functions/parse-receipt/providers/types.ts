import type { ParsedReceipt } from '../schema.ts';

export type ParseHints = {
  locale: string;
  deviceCurrency: string;
  countryHint: string | null;
};

export type TokenUsage = { inputTokens: number | null; outputTokens: number | null };

/** One model answer. `finishReason` as the provider reports it (stop, length, STOP, MAX_TOKENS, …). */
export type Completion = { text: string; usage: TokenUsage; finishReason: string | null };

/** What every provider adapter implements: one JSON-constrained completion. Failures throw ParserError. */
export interface ProviderAdapter {
  readonly name: string;
  complete(request: { system: string; user: string; jsonSchema: Record<string, unknown> }): Promise<Completion>;
}

/** One provider's try within a request, for logs. */
export type ProviderAttempt = {
  provider: string;
  outcome: 'ok' | ParserErrorCode;
  latencyMs: number;
  /** Model outputs that failed JSON/schema validation (each triggers one more model call). */
  invalidOutputs: number;
  /** Finish reason of this provider's last answer; `length`/`MAX_TOKENS` means the output was cut off. */
  finishReason: string | null;
  outputTokens: number | null;
  error: ProviderErrorDetails | null;
};

/** The single interface the handler uses, whatever the providers. */
export interface ReceiptParser {
  parse(text: string, hints: ParseHints): Promise<{ receipt: ParsedReceipt; usage: TokenUsage; provider: string; attempts: ProviderAttempt[] }>;
}

/**
 * busy — rate limit (429) or overload (503): try the next provider; the app retries later if all are busy.
 * parse_failed — the model's output was not valid JSON for the schema, twice.
 * provider_error — anything else from the provider (bad request, 5xx, network).
 * config_error — the provider can't work as configured (missing key/model, quota limit 0).
 */
export type ParserErrorCode = 'busy' | 'parse_failed' | 'provider_error' | 'config_error';

/**
 * What the provider said when a call failed — for logs only. Never contains receipt text or keys.
 * `quotaValue: "0"` means the key/project has no quota for that model; overloads come as 503/UNAVAILABLE.
 */
export type ProviderErrorDetails = {
  httpStatus: number | null;
  errorStatus: string | null;
  message: string | null;
  quotaId: string | null;
  quotaMetric: string | null;
  quotaValue: string | null;
  retryDelay: string | null;
  /** When the provider asked us to retry (RetryInfo / Retry-After), in seconds. */
  retryAfterSeconds: number | null;
};

export const NO_DETAILS: ProviderErrorDetails = {
  httpStatus: null,
  errorStatus: null,
  message: null,
  quotaId: null,
  quotaMetric: null,
  quotaValue: null,
  retryDelay: null,
  retryAfterSeconds: null,
};

/** A cut-off answer would give partial items: treat it as a provider failure (try the next provider). */
export function truncated(finishReason: string | null, usage: TokenUsage): ParserError {
  return new ParserError('provider_error', usage, { ...NO_DETAILS, errorStatus: 'truncated', message: `finish reason: ${finishReason}` }, [], finishReason);
}

export class ParserError extends Error {
  constructor(
    readonly code: ParserErrorCode,
    readonly usage: TokenUsage = { inputTokens: null, outputTokens: null },
    readonly provider: ProviderErrorDetails | null = null,
    readonly attempts: ProviderAttempt[] = [],
    readonly finishReason: string | null = null,
  ) {
    super(code);
  }
}
