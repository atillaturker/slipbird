/**
 * Slipbird Pro on the server: a Pro subscriber isn't held to the free monthly parse limit. The app makes
 * RevenueCat's app user id the Supabase user id, so the function can ask RevenueCat's REST API about the
 * caller. The secret key lives only in function secrets (REVENUECAT_SECRET_KEY).
 */

type Subscriber = {
  subscriber?: {
    entitlements?: Record<string, { expires_date?: string | null; grace_period_expires_date?: string | null } | undefined>;
  };
};

const API = 'https://api.revenuecat.com/v1/subscribers';

/**
 * Whether the response shows an active entitlement now: no expiry date means lifetime, otherwise the expiry
 * (or the billing-retry grace period) must still be ahead.
 */
export function isEntitlementActive(body: unknown, entitlement: string, now: number): boolean {
  const e = (body as Subscriber | null)?.subscriber?.entitlements?.[entitlement];
  if (!e) return false;
  if (e.expires_date === null) return true;
  const ahead = (date: string | null | undefined) => {
    const t = date ? Date.parse(date) : NaN;
    return Number.isFinite(t) && t > now;
  };
  return ahead(e.expires_date) || ahead(e.grace_period_expires_date);
}

type Options = {
  secretKey?: string;
  entitlement?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  /** How long a positive or negative answer is reused. */
  ttlMs?: number;
  timeoutMs?: number;
};

/**
 * Returns `isPro(userId)`. Without a key, or when RevenueCat can't be reached, the answer is false (the free limit
 * applies) and isn't cached, so the next request asks again.
 */
export function createProChecker(options: Options): (userId: string) => Promise<boolean> {
  const { secretKey, entitlement = 'pro', fetchFn = fetch, now = Date.now, ttlMs = 60_000, timeoutMs = 3_000 } = options;
  const cache = new Map<string, { pro: boolean; at: number }>();

  return async (userId) => {
    if (!secretKey) return false;
    const hit = cache.get(userId);
    if (hit && now() - hit.at < ttlMs) return hit.pro;
    try {
      const response = await fetchFn(`${API}/${encodeURIComponent(userId)}`, {
        headers: { authorization: `Bearer ${secretKey}`, 'content-type': 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) return false;
      const pro = isEntitlementActive(await response.json(), entitlement, now());
      cache.set(userId, { pro, at: now() });
      return pro;
    } catch {
      return false;
    }
  };
}
