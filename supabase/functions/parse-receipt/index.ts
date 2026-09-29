// parse-receipt: OCR text in, structured receipt JSON out (docs/SPEC.md §1.4).
// Stateless: receipt text is never logged or stored. Logs carry only user id, time, tokens, latency.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { createProChecker } from './entitlement.ts';
import { adaptersFromEnv, createParser } from './providers/index.ts';
import { NO_DETAILS, ParserError, type ProviderAttempt, type ProviderErrorDetails, type TokenUsage } from './providers/types.ts';
import { currentMonth, FREE_MONTHLY_PARSES, quotaEnforced } from './quota.ts';
import { ParseRequestSchema } from './schema.ts';

// Slipbird Pro subscribers aren't held to the free monthly limit (RevenueCat app user id = Supabase user id).
const isProUser = createProChecker({ secretKey: Deno.env.get('REVENUECAT_SECRET_KEY'), entitlement: Deno.env.get('REVENUECAT_ENTITLEMENT') || 'pro' });

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

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

function fail(code: ErrorCode, retryAfterSeconds: number | null = null): Response {
  if (retryAfterSeconds === null) return json({ code }, STATUS[code]);
  // The app's queue waits this long before trying again (Gemini's RetryInfo).
  return new Response(JSON.stringify({ code, retryAfterSeconds }), {
    status: STATUS[code],
    headers: { 'content-type': 'application/json', 'retry-after': String(retryAfterSeconds) },
  });
}

type LogEntry = {
  userId: string | null;
  outcome: string;
  usage?: TokenUsage;
  startedAt: number;
  provider?: ProviderErrorDetails | null;
  /** Which provider produced the answer. */
  answeredBy?: string | null;
  attempts?: ProviderAttempt[];
  skippedProviders?: string[];
  receiptRef?: string | null;
  attempt?: number | null;
  /** Non-empty lines in the OCR text we were sent (was an item never read, or dropped by the model?). */
  ocrLineCount?: number | null;
  itemsReturned?: number | null;
  finishReason?: string | null;
  /** This month's successful parses after this request (or so far, when refused), and the free limit. */
  quotaUsed?: number | null;
  /** True when PARSE_QUOTA_DISABLED lifted the limit for this request (development). */
  quotaBypassed?: boolean;
};

function log(entry: LogEntry) {
  console.log(
    JSON.stringify({
      fn: 'parse-receipt',
      at: new Date().toISOString(),
      userId: entry.userId,
      outcome: entry.outcome,
      inputTokens: entry.usage?.inputTokens ?? null,
      outputTokens: entry.usage?.outputTokens ?? null,
      latencyMs: Date.now() - entry.startedAt,
      receiptRef: entry.receiptRef ?? null,
      attempt: entry.attempt ?? null,
      answeredBy: entry.answeredBy ?? null,
      ocrLineCount: entry.ocrLineCount ?? null,
      itemsReturned: entry.itemsReturned ?? null,
      finishReason: entry.finishReason ?? null,
      quotaUsed: entry.quotaUsed ?? null,
      quotaLimit: FREE_MONTHLY_PARSES,
      ...(entry.quotaBypassed ? { quotaBypassed: true } : {}),
      // Per-provider tries (status, error status/message, quota, validation retries) — no receipt text, no keys.
      ...(entry.attempts?.length ? { attempts: entry.attempts } : {}),
      ...(entry.skippedProviders?.length ? { skippedProviders: entry.skippedProviders } : {}),
      ...(entry.provider ? { provider: entry.provider } : {}),
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
  const enforced = quotaEnforced(Deno.env);
  const overLimit = enforced && (usageRow?.count ?? 0) >= FREE_MONTHLY_PARSES;
  // Only ask RevenueCat when the free limit would otherwise refuse this request.
  const pro = overLimit && (await isProUser(userId));
  if (overLimit && !pro) {
    log({ userId, outcome: 'quota_exceeded', quotaUsed: usageRow?.count ?? null, startedAt });
    return fail('quota_exceeded');
  }

  const ref = {
    receiptRef: input.data.receiptRef ?? null,
    attempt: input.data.attempt ?? null,
    ocrLineCount: input.data.text.split('\n').filter((line) => line.trim()).length,
  };
  let skippedProviders: string[] = [];
  try {
    // Trying a single model (bake-off) is opt-in per deployment: ALLOW_PARSER_OVERRIDE=true, development only.
    const override = Deno.env.get('ALLOW_PARSER_OVERRIDE') === 'true' ? input.data.debugProvider : undefined;
    const chain = adaptersFromEnv(Deno.env, override);
    skippedProviders = chain.skipped;
    const { receipt, usage, provider, model, attempts } = await createParser(chain.adapters).parse(input.data.text, {
      locale: input.data.locale,
      deviceCurrency: input.data.deviceCurrency,
      countryHint: input.data.countryHint ?? null,
    });
    // Count only successful parses against the quota.
    const { data: quotaUsed } = await admin.rpc('record_scan', { p_user: userId, p_month: month });
    const answered = attempts[attempts.length - 1];
    log({ userId, outcome: 'ok', usage, quotaUsed: typeof quotaUsed === 'number' ? quotaUsed : null, answeredBy: `${provider}/${model}`, itemsReturned: receipt.items.length, finishReason: answered?.finishReason ?? null, attempts, skippedProviders, quotaBypassed: !enforced, ...(pro ? { pro: true } : {}), startedAt, ...ref });
    // Which model answered: handy when comparing models. Not sensitive.
    return json(receipt, 200, { 'x-parser': `${provider}/${model}` });
  } catch (error) {
    if (error instanceof ParserError) {
      log({ userId, outcome: error.code, usage: error.usage, finishReason: error.attempts[error.attempts.length - 1]?.finishReason ?? null, attempts: error.attempts, skippedProviders, startedAt, ...ref });
      return fail(error.code, error.code === 'busy' ? (error.provider?.retryAfterSeconds ?? null) : null);
    }
    log({ userId, outcome: 'provider_error', startedAt, skippedProviders, provider: { ...NO_DETAILS, message: error instanceof Error ? error.name : 'unknown' }, ...ref });
    return fail('provider_error');
  }
});
