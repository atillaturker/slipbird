// Compares models on the fixtures through the DEPLOYED parse-receipt (real prompt, real providers).
//
//   1. supabase secrets set ALLOW_PARSER_OVERRIDE=true        (development only; unset it afterwards)
//   2. deno run --allow-net --allow-read --allow-env bakeoff.ts [--runs 2] [--only long34] gemini:gemini-3.5-flash-lite groq:openai/gpt-oss-120b
//   3. supabase secrets unset ALLOW_PARSER_OVERRIDE
//
// Reads EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY from ../../../.env.local. Each model signs in as its own anonymous user,
// so the free monthly limit (15) is not shared; calls are spaced out to stay inside free-tier rate limits.
import { cagriExpected, cagriOcr, gramsExpected, gramsOcr, longExpected, longOcr } from './fixtures.ts';
import { scoreParse, type Expected } from './score.ts';
import { ParsedReceiptSchema } from './schema.ts';

const args = Deno.args;
const runsAt = args.indexOf('--runs');
const runs = runsAt >= 0 ? Number(args[runsAt + 1]) : 2;
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args[onlyAt + 1] : null;
const models = args.filter((a) => /^(gemini|groq):/.test(a));
if (models.length === 0) {
  console.error('Usage: bakeoff.ts [--runs N] provider:model ...   e.g. gemini:gemini-3.5-flash groq:openai/gpt-oss-120b');
  Deno.exit(2);
}

const envText = await Deno.readTextFile(new URL('../../../.env.local', import.meta.url));
const env = Object.fromEntries(envText.split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error('.env.local needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');

const fixtures: { name: string; text: string; expected: Expected }[] = [
  { name: 'cagri', text: cagriOcr, expected: cagriExpected },
  { name: 'grams', text: gramsOcr, expected: gramsExpected },
  { name: 'long34', text: longOcr, expected: longExpected },
];
const SPACING_MS = 4_000;
const CALL_TIMEOUT_MS = 120_000;

async function signIn(): Promise<string> {
  const r = await fetch(`${url}/auth/v1/signup`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: anon }, body: '{}' });
  const j = await r.json();
  if (!j.access_token) throw new Error(`anonymous sign-in failed: HTTP ${r.status} ${j.msg ?? ''}`);
  return j.access_token;
}

type Row = { model: string; fixture: string; run: number; ok: boolean; passed: number; total: number; ms: number; answered: string; note: string };
const rows: Row[] = [];

for (const model of models) {
  const token = await signIn();
  for (const fixture of fixtures.filter((f) => !only || f.name === only)) {
    for (let run = 1; run <= runs; run += 1) {
      const started = Date.now();
      // A busy answer (rate limit) says when to retry: wait and try again, a few times, so the comparison measures
      // the model rather than the free tier's limits. A timeout is a result too, not a crash.
      let response: Response | null = null;
      let body: unknown = null;
      let failure = '';
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          response = await fetch(`${url}/functions/v1/parse-receipt`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', apikey: anon, authorization: `Bearer ${token}` },
            body: JSON.stringify({ text: fixture.text, locale: 'tr-TR', deviceCurrency: 'TRY', countryHint: 'TR', debugProvider: model }),
            signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          });
          body = await response.json().catch(() => null);
        } catch (error) {
          response = null;
          failure = `${(error as Error).name}: no answer within ${CALL_TIMEOUT_MS / 1000}s`;
          break;
        }
        const wait = (body as { code?: string; retryAfterSeconds?: number } | null)?.retryAfterSeconds;
        if (response.status === 429 && typeof wait === 'number' && attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, (wait + 1) * 1000));
          continue;
        }
        break;
      }
      const ms = Date.now() - started;
      const answered = response?.headers.get('x-parser') ?? '-';
      const parsed = response?.ok ? ParsedReceiptSchema.safeParse(body) : null;
      if (parsed?.success) {
        const score = scoreParse(parsed.data, fixture.expected);
        rows.push({ model, fixture: fixture.name, run, ok: true, passed: score.passed, total: score.total, ms, answered, note: score.notes.join('; ') });
      } else {
        rows.push({ model, fixture: fixture.name, run, ok: false, passed: 0, total: 6, ms, answered, note: failure || `HTTP ${response?.status} ${JSON.stringify(body)?.slice(0, 120)}` });
      }
      const r = rows[rows.length - 1];
      console.log(`${model.padEnd(36)} ${fixture.name.padEnd(7)} #${run}  ${r.ok ? `${r.passed}/${r.total}` : 'ERROR'}  ${String(ms).padStart(6)} ms  ${r.note}`);
      await new Promise((resolve) => setTimeout(resolve, SPACING_MS));
    }
  }
}

console.log('\nSummary (checks passed / possible, mean latency)');
for (const model of models) {
  const mine = rows.filter((r) => r.model === model);
  const passed = mine.reduce((s, r) => s + r.passed, 0);
  const possible = mine.reduce((s, r) => s + r.total, 0);
  const errors = mine.filter((r) => !r.ok).length;
  const ms = Math.round(mine.reduce((s, r) => s + r.ms, 0) / mine.length);
  console.log(`${model.padEnd(36)} ${passed}/${possible}  errors ${errors}  mean ${ms} ms`);
}
