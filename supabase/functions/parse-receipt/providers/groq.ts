import { NO_DETAILS, ParserError, truncated, type ProviderAdapter, type ProviderErrorDetails } from './types.ts';

// Covers reasoning + JSON for ~60 items (gpt-oss counts its reasoning against this limit).
export const GROQ_MAX_COMPLETION_TOKENS = 16_384;

// Groq: OpenAI-compatible chat completions with strict JSON-schema structured output.
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_MESSAGE_LENGTH = 500;

type GroqResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

type GroqErrorBody = { error?: { message?: string; type?: string; code?: string } };

/** Loggable parts of a Groq error: status, error code/type, message (truncated, key redacted), Retry-After. */
export function describeGroqError(httpStatus: number, bodyText: string | null, retryAfterHeader: string | null, apiKey: string): ProviderErrorDetails {
  let body: GroqErrorBody = {};
  try {
    body = bodyText ? (JSON.parse(bodyText) as GroqErrorBody) : {};
  } catch {
    body = {};
  }
  const message = body.error?.message ? body.error.message.split(apiKey).join('[redacted]').slice(0, MAX_MESSAGE_LENGTH) : null;
  const retryAfter = retryAfterHeader && /^\d+(\.\d+)?$/.test(retryAfterHeader.trim()) ? Math.ceil(Number(retryAfterHeader)) : null;
  return { ...NO_DETAILS, httpStatus, errorStatus: body.error?.code ?? body.error?.type ?? null, message, retryAfterSeconds: retryAfter };
}

/**
 * What a failed Groq call means: 429 rate limit, 498 capacity exceeded, 503 overloaded → busy;
 * 401/403/404 (bad key, no access, unknown model) → config_error; anything else → provider_error.
 */
export function classifyGroqFailure(status: number): 'busy' | 'config_error' | 'provider_error' {
  if (status === 429 || status === 498 || status === 503) return 'busy';
  if (status === 401 || status === 403 || status === 404) return 'config_error';
  return 'provider_error';
}

export function groqAdapter(apiKey: string, model: string): ProviderAdapter {
  return {
    name: 'groq',
    model,
    async complete({ system, user, jsonSchema }) {
      let response: Response;
      try {
        response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0,
            // gpt-oss is a reasoning model; extraction needs little of it and every token costs latency.
            reasoning_effort: 'low',
            max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            response_format: { type: 'json_schema', json_schema: { name: 'receipt', strict: true, schema: jsonSchema } },
          }),
        });
      } catch (error) {
        throw new ParserError('provider_error', undefined, { ...NO_DETAILS, message: error instanceof Error ? error.name : 'fetch_failed' });
      }

      if (!response.ok) {
        const details = describeGroqError(response.status, await response.text().catch(() => null), response.headers.get('retry-after'), apiKey);
        // Output that broke the strict schema: treat like invalid JSON so the parser retries once.
        if (response.status === 400 && details.errorStatus === 'json_validate_failed') return { text: '', usage: { inputTokens: null, outputTokens: null }, finishReason: null };
        throw new ParserError(classifyGroqFailure(response.status), undefined, details);
      }

      const body = (await response.json()) as GroqResponse;
      const usage = { inputTokens: body.usage?.prompt_tokens ?? null, outputTokens: body.usage?.completion_tokens ?? null };
      const finishReason = body.choices?.[0]?.finish_reason ?? null;
      if (finishReason === 'length') throw truncated(finishReason, usage);
      return { text: body.choices?.[0]?.message?.content ?? '', usage, finishReason };
    },
  };
}
