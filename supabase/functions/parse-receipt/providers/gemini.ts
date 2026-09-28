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

/** Gemini's RetryInfo delay ("34s", "0.5s") in whole seconds, rounded up; null if absent or unreadable. */
export function retryDelaySeconds(delay: string | null): number | null {
  const m = delay ? /^(\d+(?:\.\d+)?)s$/.exec(delay.trim()) : null;
  return m ? Math.ceil(Number(m[1])) : null;
}

/**
 * A 429 whose quota limit is 0: this key/project has no quota for the model at all, so retrying
 * can't help (wrong model id for the free tier, or billing needed) — a configuration problem.
 */
export function isZeroQuota(details: ProviderErrorDetails): boolean {
  return details.quotaValue === '0' || /\blimit:\s*0\b/.test(details.message ?? '');
}

/** What a failed Gemini call means for the app: config_error (limit 0), busy (retry later), provider_error. */
export function classifyGeminiFailure(details: ProviderErrorDetails): 'config_error' | 'busy' | 'provider_error' {
  if (details.httpStatus === 429) return isZeroQuota(details) ? 'config_error' : 'busy';
  if (details.httpStatus === 503) return 'busy';
  return 'provider_error';
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
        // 429 = rate limit (retry after retryDelay) or no quota at all (limit 0 → config_error); 503 = overloaded.
        throw new ParserError(classifyGeminiFailure(details), undefined, details);
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
