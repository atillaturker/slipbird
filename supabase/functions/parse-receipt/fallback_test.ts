import { assertEquals, assertRejects } from 'jsr:@std/assert@1';

import { cagriExpected } from './fixtures.ts';
import { adaptersFromEnv, createParser } from './providers/index.ts';
import { NO_DETAILS, ParserError, type ParserErrorCode, type ProviderAdapter } from './providers/types.ts';

const hints = { locale: 'tr-TR', deviceCurrency: 'TRY', countryHint: 'TR' };
const ok = JSON.stringify(cagriExpected);

/** A fake provider that fails with `code` (and optional retry-after) or answers `text`. */
function provider(name: string, behaviour: { fail?: ParserErrorCode; retryAfterSeconds?: number; text?: string }) {
  const p = {
    name,
    calls: 0,
    complete() {
      p.calls += 1;
      if (behaviour.fail) {
        return Promise.reject(new ParserError(behaviour.fail, undefined, { ...NO_DETAILS, httpStatus: 503, retryAfterSeconds: behaviour.retryAfterSeconds ?? null }));
      }
      return Promise.resolve({ text: behaviour.text ?? ok, usage: { inputTokens: 10, outputTokens: 5 } });
    },
  };
  return p satisfies ProviderAdapter;
}

Deno.test('first provider answers: no fallback', async () => {
  const groq = provider('groq', {});
  const gemini = provider('gemini', {});
  const result = await createParser([groq, gemini]).parse('t', hints);
  assertEquals([result.provider, groq.calls, gemini.calls], ['groq', 1, 0]);
  assertEquals(result.attempts.map((a) => [a.provider, a.outcome]), [['groq', 'ok']]);
});

Deno.test('busy → next provider immediately; logs who answered', async () => {
  const groq = provider('groq', { fail: 'busy' });
  const gemini = provider('gemini', {});
  const result = await createParser([groq, gemini]).parse('t', hints);
  assertEquals(result.provider, 'gemini');
  assertEquals(result.attempts.map((a) => [a.provider, a.outcome]), [
    ['groq', 'busy'],
    ['gemini', 'ok'],
  ]);
});

Deno.test('provider_error and config_error also fall through', async () => {
  for (const fail of ['provider_error', 'config_error'] as const) {
    const result = await createParser([provider('groq', { fail }), provider('gemini', {})]).parse('t', hints);
    assertEquals(result.provider, 'gemini');
  }
});

Deno.test('all busy → busy with the shortest retry-after', async () => {
  const error = await assertRejects(
    () => createParser([provider('groq', { fail: 'busy', retryAfterSeconds: 20 }), provider('gemini', { fail: 'busy', retryAfterSeconds: 7 })]).parse('t', hints),
    ParserError,
  );
  assertEquals([error.code, error.provider?.retryAfterSeconds, error.attempts.length], ['busy', 7, 2]);
});

Deno.test('mixed failures: busy wins over provider_error, provider_error over config_error', async () => {
  const busyWins = await assertRejects(() => createParser([provider('a', { fail: 'config_error' }), provider('b', { fail: 'busy' })]).parse('t', hints), ParserError);
  assertEquals(busyWins.code, 'busy');
  const errorWins = await assertRejects(() => createParser([provider('a', { fail: 'config_error' }), provider('b', { fail: 'provider_error' })]).parse('t', hints), ParserError);
  assertEquals(errorWins.code, 'provider_error');
  const allConfig = await assertRejects(() => createParser([provider('a', { fail: 'config_error' })]).parse('t', hints), ParserError);
  assertEquals(allConfig.code, 'config_error');
});

Deno.test('parse_failed stops the chain (the text defeated the model)', async () => {
  const gemini = provider('gemini', {});
  const error = await assertRejects(() => createParser([provider('groq', { text: '{nope' }), gemini]).parse('t', hints), ParserError);
  assertEquals([error.code, gemini.calls], ['parse_failed', 0]);
  assertEquals(error.attempts[0].invalidOutputs, 2);
});

Deno.test('PARSER_PROVIDER is an ordered chain; unconfigured providers are skipped', () => {
  const env = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });
  const full = adaptersFromEnv(env({ PARSER_PROVIDER: 'groq, gemini', GROQ_API_KEY: 'g', GROQ_MODEL: 'openai/gpt-oss-120b', GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }));
  assertEquals(full.adapters.map((a) => a.name), ['groq', 'gemini']);
  const partial = adaptersFromEnv(env({ PARSER_PROVIDER: 'groq,gemini,claude', GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }));
  assertEquals([partial.adapters.map((a) => a.name), partial.skipped], [['gemini'], ['groq', 'claude']]);
  let code = '';
  try {
    adaptersFromEnv(env({ PARSER_PROVIDER: 'groq' }));
  } catch (e) {
    code = (e as ParserError).code;
  }
  assertEquals(code, 'config_error');
});
