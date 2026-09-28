import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';

import { describeGeminiError, geminiAdapter } from './providers/gemini.ts';
import { ParserError } from './providers/types.ts';

const KEY = 'AIzaTESTKEY1234567890';

// Shape of a Gemini free-tier quota error for a model the project has no quota for.
const quotaZero = JSON.stringify({
  error: {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    message: 'You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-x',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '0' }],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '34s' },
    ],
  },
});

const overloaded = JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE', message: 'The model is overloaded. Please try again later.' } });

Deno.test('describes a quota error with limit 0', () => {
  assertEquals(describeGeminiError(429, quotaZero, KEY), {
    httpStatus: 429,
    errorStatus: 'RESOURCE_EXHAUSTED',
    message:
      'You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-x',
    quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
    quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
    quotaValue: '0',
    retryDelay: '34s',
  });
});

Deno.test('describes an overload without quota fields', () => {
  const d = describeGeminiError(503, overloaded, KEY);
  assertEquals([d.httpStatus, d.errorStatus, d.quotaId, d.quotaValue], [503, 'UNAVAILABLE', null, null]);
});

Deno.test('redacts the key, truncates long messages, tolerates non-JSON bodies', () => {
  const echoed = JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: `API key ${KEY} not valid. ${'x'.repeat(2000)}` } });
  const d = describeGeminiError(400, echoed, KEY);
  assert(!d.message!.includes(KEY));
  assert(d.message!.startsWith('API key [redacted] not valid.'));
  assertEquals(d.message!.length, 500);
  assertEquals(describeGeminiError(502, '<html>Bad gateway</html>', KEY).errorStatus, null);
  assertEquals(describeGeminiError(502, null, KEY).message, null);
});

Deno.test('adapter maps 429/503 to busy and other failures to provider_error, with details', async () => {
  const originalFetch = globalThis.fetch;
  const receiptText = 'MIGROS TOPLAM 1.234,56 SECRET-RECEIPT-LINE';
  try {
    for (const [status, body, code] of [
      [429, quotaZero, 'busy'],
      [503, overloaded, 'busy'],
      [400, JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'Invalid schema' } }), 'provider_error'],
    ] as const) {
      globalThis.fetch = () => Promise.resolve(new Response(body, { status }));
      const error = await assertRejects(
        () => geminiAdapter(KEY, 'gemini-x').complete({ system: 's', user: receiptText, jsonSchema: {} }),
        ParserError,
      );
      assertEquals(error.code, code);
      assertEquals(error.provider?.httpStatus, status);
      const logged = JSON.stringify(error.provider);
      assert(!logged.includes('SECRET-RECEIPT-LINE'), 'receipt text must not be logged');
      assert(!logged.includes(KEY), 'key must not be logged');
    }

    globalThis.fetch = () => Promise.reject(new TypeError(`connect failed to ${KEY}`));
    const network = await assertRejects(() => geminiAdapter(KEY, 'gemini-x').complete({ system: 's', user: receiptText, jsonSchema: {} }), ParserError);
    assertEquals([network.code, network.provider?.httpStatus, network.provider?.message], ['provider_error', null, 'TypeError']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
