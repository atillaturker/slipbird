import { ParserError, type ProviderAdapter, type ProviderErrorDetails } from './types.ts';

// Gemini API (ai.google.dev): generateContent with native JSON-schema structured output.
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

// Long enough for Google's quota explanations, short enough to keep logs tidy.
const MAX_MESSAGE_LENGTH = 500;

type GeminiErrorBody = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    details?: {
      '@type'?: string;
      violations?: { quotaMetric?: string; quotaId?: string; quotaValue?: string }[];
      retryDelay?: string;
    }[];
  };
};

/**
 * Pulls the loggable parts out of a Gemini error response: HTTP status, `error.status`, `error.message`
 * (truncated, key redacted), and QuotaFailure / RetryInfo details. The request (receipt text) is never read.
 */
export function describeGeminiError(httpStatus: number | null, bodyText: string | null, apiKey: string): ProviderErrorDetails {
  let body: GeminiErrorBody = {};
  try {
    body = bodyText ? (JSON.parse(bodyText) as GeminiErrorBody) : {};
  } catch {
    body = {};
  }
  const details = body.error?.details ?? [];
  const violation = details.find((d) => d['@type']?.endsWith('google.rpc.QuotaFailure'))?.violations?.[0];
  const retry = details.find((d) => d['@type']?.endsWith('google.rpc.RetryInfo'));
  const redact = (s: string) => (apiKey ? s.split(apiKey).join('[redacted]') : s);
  const message = body.error?.message ? redact(body.error.message).slice(0, MAX_MESSAGE_LENGTH) : null;
  return {
    httpStatus,
    errorStatus: body.error?.status ?? null,
    message,
    quotaId: violation?.quotaId ?? null,
    quotaMetric: violation?.quotaMetric ?? null,
    quotaValue: violation?.quotaValue ?? null,
    retryDelay: retry?.retryDelay ?? null,
  };
}

export function geminiAdapter(apiKey: string, model: string): ProviderAdapter {
  return {
    name: 'gemini',
    async complete({ system, user, jsonSchema }) {
      let response: Response;
      try {
        response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json',
              responseJsonSchema: jsonSchema,
            },
          }),
        });
      } catch (error) {
        // Network failure: no response to describe. Log the error kind only.
        const details = describeGeminiError(null, null, apiKey);
        throw new ParserError('provider_error', undefined, { ...details, message: error instanceof Error ? error.name : 'fetch_failed' });
      }

      if (!response.ok) {
        const details = describeGeminiError(response.status, await response.text().catch(() => null), apiKey);
        // 429 = rate limit or quota (see quotaId/quotaValue); 503 = overloaded. Both are worth retrying later.
        throw new ParserError(response.status === 429 || response.status === 503 ? 'busy' : 'provider_error', undefined, details);
      }

      const body = (await response.json()) as GeminiResponse;
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return {
        text,
        usage: {
          inputTokens: body.usageMetadata?.promptTokenCount ?? null,
          outputTokens: body.usageMetadata?.candidatesTokenCount ?? null,
        },
      };
    },
  };
}
