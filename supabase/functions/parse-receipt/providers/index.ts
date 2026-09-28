import { buildUserMessage, SYSTEM_PROMPT } from '../prompt.ts';
import { parsedReceiptJsonSchema, ParsedReceiptSchema } from '../schema.ts';
import { geminiAdapter } from './gemini.ts';
import { ParserError, type ProviderAdapter, type ReceiptParser, type TokenUsage } from './types.ts';

/**
 * PARSER_PROVIDER picks the adapter (gemini now; groq, anthropic, openai later), PARSER_MODEL the model.
 * Keys come from function secrets only.
 */
export function adapterFromEnv(env: { get(key: string): string | undefined }): ProviderAdapter {
  const provider = env.get('PARSER_PROVIDER');
  const model = env.get('PARSER_MODEL');
  if (!model) throw new ParserError('config_error');
  switch (provider) {
    case 'gemini': {
      const key = env.get('GEMINI_API_KEY');
      if (!key) throw new ParserError('config_error');
      return geminiAdapter(key, model);
    }
    default:
      throw new ParserError('config_error');
  }
}

const ATTEMPTS = 2; // invalid JSON → retry once, then parse_failed

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  const sum = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0));
  return { inputTokens: sum(a.inputTokens, b.inputTokens), outputTokens: sum(a.outputTokens, b.outputTokens) };
}

/** Wraps any adapter: builds the prompt, validates the output against schema.ts with zod, retries once. */
export function createParser(adapter: ProviderAdapter): ReceiptParser {
  return {
    async parse(text, hints) {
      let usage: TokenUsage = { inputTokens: null, outputTokens: null };
      for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
        const result = await adapter.complete({ system: SYSTEM_PROMPT, user: buildUserMessage(text, hints), jsonSchema: parsedReceiptJsonSchema });
        usage = addUsage(usage, result.usage);
        let json: unknown;
        try {
          json = JSON.parse(result.text);
        } catch {
          continue;
        }
        const parsed = ParsedReceiptSchema.safeParse(json);
        if (parsed.success) return { receipt: parsed.data, usage };
      }
      throw new ParserError('parse_failed', usage);
    },
  };
}
