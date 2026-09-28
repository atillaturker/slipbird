import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';

import { classifyGroqFailure, describeGroqError, groqAdapter } from './providers/groq.ts';
import { ParserError } from './providers/types.ts';

const KEY = 'gsk_TESTKEY1234567890';

function withFetch(handler: (url: string, init?: RequestInit) => Response, run: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => Promise.resolve(handler(String(url), init));
  return run().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

Deno.test('sends a strict json_schema request with temperature 0 and the configured model', async () => {
  let url = '';
  let body: Record<string, unknown> = {};
  let auth = '';
  await withFetch(
    (u, init) => {
      url = u;
      body = JSON.parse(String(init?.body));
      auth = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 120, completion_tokens: 80 } }));
    },
    async () => {
      const result = await groqAdapter(KEY, 'openai/gpt-oss-120b').complete({ system: 'sys', user: 'usr', jsonSchema: { type: 'object' } });
      assertEquals(result, { text: '{"ok":true}', usage: { inputTokens: 120, outputTokens: 80 }, finishReason: 'stop' });
    },
  );
  assertEquals(url, 'https://api.groq.com/openai/v1/chat/completions');
  assertEquals(auth, `Bearer ${KEY}`);
  assertEquals(body.model, 'openai/gpt-oss-120b');
  assertEquals(body.temperature, 0);
  assertEquals(body.max_completion_tokens, 16_384);
  assertEquals(body.response_format, { type: 'json_schema', json_schema: { name: 'receipt', strict: true, schema: { type: 'object' } } });
  assertEquals(body.messages, [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'usr' },
  ]);
});

Deno.test('maps Groq failures and honours Retry-After', async () => {
  assertEquals([429, 498, 503].map(classifyGroqFailure), ['busy', 'busy', 'busy']);
  assertEquals([401, 403, 404].map(classifyGroqFailure), ['config_error', 'config_error', 'config_error']);
  assertEquals([400, 500].map(classifyGroqFailure), ['provider_error', 'provider_error']);

  await withFetch(
    () => new Response(JSON.stringify({ error: { message: 'Rate limit reached for model', type: 'tokens', code: 'rate_limit_exceeded' } }), { status: 429, headers: { 'retry-after': '7' } }),
    async () => {
      const error = await assertRejects(() => groqAdapter(KEY, 'm').complete({ system: 's', user: 'SECRET-RECEIPT-LINE', jsonSchema: {} }), ParserError);
      assertEquals([error.code, error.provider?.httpStatus, error.provider?.errorStatus, error.provider?.retryAfterSeconds], ['busy', 429, 'rate_limit_exceeded', 7]);
      assert(!JSON.stringify(error.provider).includes('SECRET-RECEIPT-LINE'));
    },
  );
});

Deno.test('a strict-schema validation failure counts as invalid output (parser retries)', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ error: { message: 'Generated JSON does not match the expected schema', code: 'json_validate_failed' } }), { status: 400 }),
    async () => {
      const result = await groqAdapter(KEY, 'm').complete({ system: 's', user: 'u', jsonSchema: {} });
      assertEquals(result.text, '');
    },
  );
});

Deno.test('redacts the key from error messages', () => {
  const d = describeGroqError(401, JSON.stringify({ error: { message: `Invalid API Key ${KEY}`, code: 'invalid_api_key' } }), null, KEY);
  assertEquals(d.message, 'Invalid API Key [redacted]');
  assertEquals(d.retryAfterSeconds, null);
});

Deno.test('finish_reason "length" is reported as truncated', async () => {
  await withFetch(
    () => new Response(JSON.stringify({ choices: [{ message: { content: '{"items":[' }, finish_reason: 'length' }], usage: { prompt_tokens: 1, completion_tokens: 16384 } })),
    async () => {
      const error = await assertRejects(() => groqAdapter(KEY, 'm').complete({ system: 's', user: 'u', jsonSchema: {} }), ParserError);
      assertEquals([error.code, error.finishReason, error.provider?.errorStatus], ['provider_error', 'length', 'truncated']);
    },
  );
});
