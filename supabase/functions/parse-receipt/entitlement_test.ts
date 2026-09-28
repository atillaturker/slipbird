import { assertEquals } from 'jsr:@std/assert@1';

import { createProChecker, isEntitlementActive } from './entitlement.ts';

const NOW = Date.parse('2026-10-12T12:00:00Z');
const body = (entitlements: Record<string, unknown>) => ({ subscriber: { entitlements } });

Deno.test('an entitlement is active until it expires; no expiry means lifetime', () => {
  assertEquals(isEntitlementActive(body({ pro: { expires_date: '2026-11-01T00:00:00Z' } }), 'pro', NOW), true);
  assertEquals(isEntitlementActive(body({ pro: { expires_date: null } }), 'pro', NOW), true);
  assertEquals(isEntitlementActive(body({ pro: { expires_date: '2026-10-01T00:00:00Z' } }), 'pro', NOW), false);
});

Deno.test('a billing-retry grace period keeps it active', () => {
  assertEquals(isEntitlementActive(body({ pro: { expires_date: '2026-10-01T00:00:00Z', grace_period_expires_date: '2026-10-20T00:00:00Z' } }), 'pro', NOW), true);
});

Deno.test('missing, other or malformed entitlements are not Pro', () => {
  assertEquals(isEntitlementActive(body({}), 'pro', NOW), false);
  assertEquals(isEntitlementActive(body({ other: { expires_date: null } }), 'pro', NOW), false);
  assertEquals(isEntitlementActive(body({ pro: {} }), 'pro', NOW), false);
  assertEquals(isEntitlementActive(body({ pro: { expires_date: 'soon' } }), 'pro', NOW), false);
  assertEquals(isEntitlementActive(null, 'pro', NOW), false);
  assertEquals(isEntitlementActive('nope', 'pro', NOW), false);
});

function fakeFetch(responses: (() => Response | Promise<Response>)[]) {
  const calls: { url: string; auth: string | null }[] = [];
  const fn = ((url: string, init?: RequestInit) => {
    calls.push({ url, auth: new Headers(init?.headers).get('authorization') });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    return Promise.resolve(next());
  }) as unknown as typeof fetch;
  return { fn, calls };
}
const ok = (entitlements: Record<string, unknown>) => () => new Response(JSON.stringify(body(entitlements)));

Deno.test('asks RevenueCat with the secret key and the URL-encoded user id, and caches the answer', async () => {
  const { fn, calls } = fakeFetch([ok({ pro: { expires_date: null } })]);
  let now = NOW;
  const isPro = createProChecker({ secretKey: 'sk_test', fetchFn: fn, now: () => now });
  assertEquals(await isPro('user/1'), true);
  assertEquals(await isPro('user/1'), true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0], { url: 'https://api.revenuecat.com/v1/subscribers/user%2F1', auth: 'Bearer sk_test' });
  now += 61_000;
  await isPro('user/1');
  assertEquals(calls.length, 2);
});

Deno.test('without a key, or when RevenueCat fails, the free limit applies and nothing is cached', async () => {
  assertEquals(await createProChecker({})('u'), false);

  const failing = fakeFetch([() => new Response('nope', { status: 500 }), ok({ pro: { expires_date: null } })]);
  const isPro = createProChecker({ secretKey: 'sk', fetchFn: failing.fn });
  assertEquals(await isPro('u'), false);
  assertEquals(await isPro('u'), true); // asked again, not cached
  assertEquals(failing.calls.length, 2);

  const throwing = createProChecker({ secretKey: 'sk', fetchFn: (() => Promise.reject(new TypeError('network'))) as unknown as typeof fetch });
  assertEquals(await throwing('u'), false);
});

Deno.test('a custom entitlement name is honoured', async () => {
  const { fn } = fakeFetch([ok({ plus: { expires_date: null } })]);
  assertEquals(await createProChecker({ secretKey: 'sk', entitlement: 'plus', fetchFn: fn })('u'), true);
});
