#!/usr/bin/env node
/**
 * End-to-end check of the Supabase backend from .env.local (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY):
 * anonymous sign-in, then parse-receipt with no token, a bad body, and the synthetic Çağrı receipt.
 * Creates one anonymous user and (if the LLM works) counts one parse against its monthly quota.
 * Usage: node scripts/smoke-test-backend.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('.env.local needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');

const fixtures = fs.readFileSync(path.join(root, 'supabase/functions/parse-receipt/fixtures.ts'), 'utf8');
const text = fixtures.match(/export const cagriOcr = `([^`]*)`/)?.[1];
if (!text) throw new Error('fixture text not found');

/** Lower case with Turkish letters folded, so "ÇAĞRI" matches "Çağrı" (a plain /i regex does not). */
const fold = (t) => t.replace(/[İIı]/g, 'i').toLowerCase().replace(/[şğüöç]/g, (c) => ({ ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' })[c]).replace(/\s+/g, ' ').trim();

let failed = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

async function call(name, { token, body }) {
  const started = Date.now();
  const response = await fetch(`${url}/functions/v1/parse-receipt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: anon, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json, ms: Date.now() - started, headers: Object.fromEntries(response.headers) };
}

(async () => {
  // 1. Anonymous sign-in (Authentication → Providers → Anonymous must be on).
  const signIn = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: anon },
    body: JSON.stringify({}),
  });
  const session = await signIn.json().catch(() => ({}));
  check(signIn.ok && !!session.access_token, 'anonymous sign-in', signIn.ok ? `user ${String(session.user?.id).slice(0, 8)}…` : `HTTP ${signIn.status} ${session.msg ?? session.error_description ?? ''}`);
  if (!session.access_token) return;
  const token = session.access_token;

  // 2. No token → refused before the function runs.
  const noToken = await call('no token', { body: { text, locale: 'tr-TR', deviceCurrency: 'TRY' } });
  check(noToken.status === 401, 'no token is refused', `HTTP ${noToken.status}`);

  // 3. Bad body → 400 bad_request.
  const bad = await call('bad body', { token, body: { text: '', locale: 'tr-TR', deviceCurrency: 'TRY' } });
  check(bad.status === 400 && bad.json?.code === 'bad_request', 'empty text is rejected', `HTTP ${bad.status} ${JSON.stringify(bad.json)}`);

  // 4. A real parse.
  const parsed = await call('parse', { token, body: { text, locale: 'tr-TR', deviceCurrency: 'TRY', countryHint: 'TR', receiptRef: 'smoke-test', attempt: 1 } });
  console.log(`      parse took ${parsed.ms} ms, HTTP ${parsed.status}`);
  if (parsed.status === 200) {
    const r = parsed.json;
    console.log(`      merchant: ${JSON.stringify(r.merchant)}  display: ${JSON.stringify(r.merchantDisplay)}`);
    for (const i of r.items ?? []) console.log(`      item: ${String(i.name).padEnd(24)} qty ${String(i.qty).padEnd(6)} unit ${String(i.unit).padEnd(5)} ${i.amount}`);
    console.log(`      answered by: ${parsed.headers['x-parser'] ?? 'n/a'}`);
    check(fold(r.merchant?.value ?? '').startsWith('cagri magazacilik'), 'merchant read (any capitalisation)', r.merchant?.value);
    check(r.total?.value === '663,29', 'total as printed', r.total?.value);
    check(r.items?.length === 6, 'all 6 items returned', `${r.items?.length} items`);
    const byAmount = (amount) => (r.items ?? []).find((i) => i.amount === amount);
    const unitOf = (amount) => { const i = byAmount(amount); return i ? `${i.qty} ${i.unit}` : 'missing'; };
    // Weighed lines have a quantity line above them: kg. Pack sizes inside a name ("ŞEKER 1 KG") are not quantities.
    check(unitOf('192,68') === '0.876 kg' && unitOf('134,26') === '2.238 kg', 'weighed lines carry qty and kg', `${unitOf('192,68')}; ${unitOf('134,26')}`);
    check(unitOf('54,90') === 'null null' && unitOf('89,95') === 'null null', 'pack sizes in names get no unit', `${unitOf('54,90')}; ${unitOf('89,95')}`);
    check(unitOf('42,50') === '2 pcs', 'counted line is pcs', unitOf('42,50'));
    check(r.currency?.value === 'TRY', 'currency inferred for a Turkish receipt without a symbol', JSON.stringify(r.currency));
  } else {
    check(false, 'parse returned a receipt', JSON.stringify(parsed.json));
    const hints = {
      402: 'quota_exceeded: this anonymous user is over the free limit (set PARSE_QUOTA_DISABLED=true on the function to lift it in development)',
      429: 'busy: every provider was rate limited; see retryAfterSeconds',
      500: 'config_error: no usable provider (check PARSER_PROVIDER and the GROQ_/GEMINI_ keys and model names)',
      502: 'provider_error: the providers failed; check the function logs',
      422: 'parse_failed: the model output was unusable twice',
    };
    if (hints[parsed.status]) console.log(`      hint: ${hints[parsed.status]}`);
  }
})()
  .catch((e) => {
    failed += 1;
    console.log('FAIL  ' + e.message);
  })
  .finally(() => {
    console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
    process.exit(failed ? 1 : 0);
  });
