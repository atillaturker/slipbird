import type { ParsedReceipt } from '../schema.ts';

export type ParseHints = {
  locale: string;
  deviceCurrency: string;
  countryHint: string | null;
};

export type TokenUsage = { inputTokens: number | null; outputTokens: number | null };

/** What every provider adapter implements: one JSON-constrained completion. */
export interface ProviderAdapter {
  readonly name: string;
  complete(request: { system: string; user: string; jsonSchema: Record<string, unknown> }): Promise<{ text: string; usage: TokenUsage }>;
}

/** The single interface the handler uses, whatever the provider. */
export interface ReceiptParser {
  parse(text: string, hints: ParseHints): Promise<{ receipt: ParsedReceipt; usage: TokenUsage }>;
}

/**
 * busy — provider rate limit (429) or overload: the app keeps the receipt queued and retries.
 * parse_failed — the model's output was not valid JSON for the schema, twice.
 * provider_error — anything else from the provider.
 */
export type ParserErrorCode = 'busy' | 'parse_failed' | 'provider_error' | 'config_error';

export class ParserError extends Error {
  constructor(
    readonly code: ParserErrorCode,
    readonly usage: TokenUsage = { inputTokens: null, outputTokens: null },
  ) {
    super(code);
  }
}
