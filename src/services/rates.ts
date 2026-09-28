import Storage from 'expo-sqlite/kv-store';

import { parseRates, ratesAreFresh, type Rates } from '@/lib/currency-convert';

// Frankfurter: free, keyless daily reference rates (https://frankfurter.dev). v2 returns
// [{ date, base, quote, rate }] with `rate` = quote units per 1 base unit.
const ENDPOINT = 'https://api.frankfurter.dev/v2/rates';
const CACHE_KEY = 'exchangeRates';
const TIMEOUT_MS = 8_000;

type Cached = { rates: Rates; fetchedAt: number };

function readCache(): Cached | null {
  try {
    const value = JSON.parse(Storage.getItemSync(CACHE_KEY) ?? 'null') as Cached | null;
    return value && value.rates && typeof value.fetchedAt === 'number' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Rates against the home currency, cached for 24 hours. Offline or on error, an older cache for the same
 * base is better than nothing; null only when there has never been one.
 */
export async function getRates(homeCurrency: string): Promise<Rates | null> {
  const cached = readCache();
  const usable = cached && cached.rates.base === homeCurrency ? cached : null;
  if (usable && ratesAreFresh(usable.fetchedAt, Date.now())) return usable.rates;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${ENDPOINT}?base=${encodeURIComponent(homeCurrency)}`, { signal: controller.signal });
    if (!response.ok) return usable?.rates ?? null;
    const rates = parseRates(await response.json(), homeCurrency);
    if (!rates) return usable?.rates ?? null;
    Storage.setItemSync(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() } satisfies Cached));
    return rates;
  } catch {
    return usable?.rates ?? null;
  } finally {
    clearTimeout(timeout);
  }
}
