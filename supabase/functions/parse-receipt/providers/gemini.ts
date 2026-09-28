import { ParserError, type ProviderAdapter } from './types.ts';

// Gemini API (ai.google.dev): generateContent with native JSON-schema structured output.
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

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
      } catch {
        throw new ParserError('provider_error');
      }

      // 429 = rate limit / free-tier quota; 503 = overloaded. Both are worth retrying later.
      if (response.status === 429 || response.status === 503) throw new ParserError('busy');
      if (!response.ok) throw new ParserError('provider_error');

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
