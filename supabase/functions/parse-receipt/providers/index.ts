import { buildUserMessage, SYSTEM_PROMPT } from '../prompt.ts';
import { parsedReceiptJsonSchema, ParsedReceiptSchema } from '../schema.ts';
import { geminiAdapter } from './gemini.ts';
import { groqAdapter } from './groq.ts';
import { ParserError, type ProviderAdapter, type ProviderAttempt, type ReceiptParser, type TokenUsage } from './types.ts';

type Env = { get(key: string): string | undefined };

/**
 * PARSER_PROVIDER is an ordered fallback chain, e.g. "groq,gemini". Each provider reads its own model
 * and key: GROQ_MODEL / GROQ_API_KEY, GEMINI_MODEL / GEMINI_API_KEY. Keys come from function secrets only.
 * Unknown or unconfigured providers are left out (and reported); none usable → config_error.
 */
export function adaptersFromEnv(env: Env, override?: string): { adapters: ProviderAdapter[]; skipped: string[] } {
  // Development only (the caller checks ALLOW_PARSER_OVERRIDE): one "provider:model", no fallback, so a failure is visible.
  if (override) {
    const [name, ...rest] = override.split(':');
    const adapter = adapterFor(name, env, rest.join(':'));
    if (!adapter) throw new ParserError('config_error');
    return { adapters: [adapter], skipped: [] };
  }
  const names = (env.get('PARSER_PROVIDER') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const adapters: ProviderAdapter[] = [];
  const skipped: string[] = [];
  for (const name of names) {
    const adapter = adapterFor(name, env);
    if (adapter) adapters.push(adapter);
    else skipped.push(name);
  }
  if (adapters.length === 0) throw new ParserError('config_error');
  return { adapters, skipped };
}

function adapterFor(name: string, env: Env, modelOverride?: string): ProviderAdapter | null {
  switch (name) {
    case 'gemini': {
      const key = env.get('GEMINI_API_KEY');
      const model = modelOverride || env.get('GEMINI_MODEL');
      return key && model ? geminiAdapter(key, model) : null;
    }
    case 'groq': {
      const key = env.get('GROQ_API_KEY');
      const model = modelOverride || env.get('GROQ_MODEL');
      return key && model ? groqAdapter(key, model) : null;
    }
    default:
      return null;
  }
}

const ATTEMPTS_PER_PROVIDER = 2; // invalid JSON → retry once, then parse_failed

// Worth trying the next provider for these; parse_failed means the text itself defeated the model.
const FALL_THROUGH = new Set(['busy', 'provider_error', 'config_error']);

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  const sum = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0));
  return { inputTokens: sum(a.inputTokens, b.inputTokens), outputTokens: sum(a.outputTokens, b.outputTokens) };
}

/**
 * Tries each provider in order within one request. On busy / provider_error / config_error it moves on
 * immediately; the first valid answer wins. Each provider's output is validated against schema.ts with zod
 * and retried once if invalid. When all fail: busy if any was busy (with the shortest retry-after), else
 * provider_error, else config_error.
 */
export function createParser(adapters: ProviderAdapter[], now: () => number = Date.now): ReceiptParser {
  return {
    async parse(text, hints) {
      let usage: TokenUsage = { inputTokens: null, outputTokens: null };
      const attempts: ProviderAttempt[] = [];
      const user = buildUserMessage(text, hints);

      for (const adapter of adapters) {
        const started = now();
        let invalidOutputs = 0;
        let finishReason: string | null = null;
        let outputTokens: number | null = null;
        try {
          for (let attempt = 1; attempt <= ATTEMPTS_PER_PROVIDER; attempt += 1) {
            const result = await adapter.complete({ system: SYSTEM_PROMPT, user, jsonSchema: parsedReceiptJsonSchema });
            usage = addUsage(usage, result.usage);
            finishReason = result.finishReason;
            outputTokens = result.usage.outputTokens;
            let json: unknown;
            try {
              json = JSON.parse(result.text);
            } catch {
              invalidOutputs += 1;
              continue;
            }
            const parsed = ParsedReceiptSchema.safeParse(json);
            if (parsed.success) {
              attempts.push({ provider: adapter.name, outcome: 'ok', latencyMs: now() - started, invalidOutputs, finishReason, outputTokens, error: null });
              return { receipt: parsed.data, usage, provider: adapter.name, model: adapter.model, attempts };
            }
            invalidOutputs += 1;
          }
          throw new ParserError('parse_failed');
        } catch (error) {
          const e = error instanceof ParserError ? error : new ParserError('provider_error');
          usage = addUsage(usage, e.usage);
          attempts.push({
            provider: adapter.name,
            outcome: e.code,
            latencyMs: now() - started,
            invalidOutputs,
            finishReason: e.finishReason ?? finishReason,
            outputTokens: e.usage.outputTokens ?? outputTokens,
            error: e.provider,
          });
          if (!FALL_THROUGH.has(e.code)) throw new ParserError(e.code, usage, e.provider, attempts);
        }
      }

      const busy = attempts.filter((a) => a.outcome === 'busy');
      if (busy.length) {
        const delays = busy.map((a) => a.error?.retryAfterSeconds).filter((d): d is number => typeof d === 'number');
        const shortest = delays.length ? Math.min(...delays) : null;
        throw new ParserError('busy', usage, busy[0].error && { ...busy[0].error, retryAfterSeconds: shortest }, attempts);
      }
      const code = attempts.some((a) => a.outcome === 'provider_error') ? 'provider_error' : 'config_error';
      throw new ParserError(code, usage, attempts[attempts.length - 1]?.error ?? null, attempts);
    },
  };
}
