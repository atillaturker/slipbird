// parse-receipt: OCR text in, structured receipt JSON out (docs/SPEC.md §1.4).
// Stateless: receipt text is never logged or stored. Logs carry only user id, time, tokens, latency.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { adapterFromEnv, createParser } from './providers/index.ts';
import { ParserError, type TokenUsage } from './providers/types.ts';
import { currentMonth, FREE_MONTHLY_PARSES } from './quota.ts';
import { ParseRequestSchema } from './schema.ts';

type ErrorCode = 'bad_request' | 'unauthorized' | 'quota_exceeded' | 'busy' | 'parse_failed' | 'provider_error' | 'config_error';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  quota_exceeded: 402,
  busy: 429,
  parse_failed: 422,
  provider_error: 502,
  config_error: 500,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function fail(code: ErrorCode): Response {
  return json({ code }, STATUS[code]);
}

function log(entry: { userId: string | null; outcome: string; usage?: TokenUsage; startedAt: number }) {
  console.log(
    JSON.stringify({
      fn: 'parse-receipt',
      at: new Date().toISOString(),
      userId: entry.userId,
      outcome: entry.outcome,
      inputTokens: entry.usage?.inputTokens ?? null,
      outputTokens: entry.usage?.outputTokens ?? null,
      latencyMs: Date.now() - entry.startedAt,
    }),
  );
}

Deno.serve(async (req) => {
  const startedAt = Date.now();
  if (req.method !== 'POST') return fail('bad_request');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) return fail('config_error');

  // Who is calling: the app's (anonymous) user JWT.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return fail('unauthorized');
  const { data: userData, error: userError } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
  const userId = userData.user?.id ?? null;
  if (userError || !userId) return fail('unauthorized');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('bad_request');
  }
  const input = ParseRequestSchema.safeParse(body);
  if (!input.success) {
    log({ userId, outcome: 'bad_request', startedAt });
    return fail('bad_request');
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const month = currentMonth();
  const { data: usageRow, error: usageError } = await admin
    .from('scan_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();
  if (usageError) return fail('config_error');
  if ((usageRow?.count ?? 0) >= FREE_MONTHLY_PARSES) {
    log({ userId, outcome: 'quota_exceeded', startedAt });
    return fail('quota_exceeded');
  }

  try {
    const parser = createParser(adapterFromEnv(Deno.env));
    const { receipt, usage } = await parser.parse(input.data.text, {
      locale: input.data.locale,
      deviceCurrency: input.data.deviceCurrency,
      countryHint: input.data.countryHint ?? null,
    });
    // Count only successful parses against the quota.
    await admin.rpc('record_scan', { p_user: userId, p_month: month });
    log({ userId, outcome: 'ok', usage, startedAt });
    return json(receipt);
  } catch (error) {
    if (error instanceof ParserError) {
      log({ userId, outcome: error.code, usage: error.usage, startedAt });
      return fail(error.code);
    }
    log({ userId, outcome: 'provider_error', startedAt });
    return fail('provider_error');
  }
});
