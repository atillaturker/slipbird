import { currencyExponent } from './money';

/** Exchange rates against one base: `rates[X]` = units of X per 1 unit of `base` (Frankfurter). */
export type Rates = { base: string; date: string; rates: Record<string, number> };

// Rates are decimals; scaling them to integers keeps money math exact (BigInt), with 8 significant decimals.
const RATE_SCALE = 100_000_000n;

function pow10(n: number): bigint {
  return 10n ** BigInt(Math.abs(n));
}

/** Integer division rounding half away from zero. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (n * 2n + d) / (2n * d);
  return negative ? -q : q;
}

/**
 * Converts minor units of `from` into minor units of `rates.base` (the home currency). Null when the rate is
 * unknown (the receipt is then left out of totals and the screen says so).
 */
export function toBase(amountMinor: number, from: string, rates: Rates): number | null {
  if (from === rates.base) return amountMinor;
  const rate = rates.rates[from];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  // amount_from / rate = amount_base; adjust for the currencies' different minor-unit exponents.
  const scaledRate = BigInt(Math.round(rate * Number(RATE_SCALE)));
  if (scaledRate <= 0n) return null;
  const expDiff = currencyExponent(rates.base) - currencyExponent(from);
  let numerator = BigInt(amountMinor) * RATE_SCALE;
  let denominator = scaledRate;
  if (expDiff > 0) numerator *= pow10(expDiff);
  if (expDiff < 0) denominator *= pow10(expDiff);
  return Number(divRound(numerator, denominator));
}

/**
 * Reads a Frankfurter response: v2 (`[{ date, base, quote, rate }]`) or v1 (`{ base, date, rates }`).
 * Null when it isn't one.
 */
export function parseRates(json: unknown, expectedBase: string): Rates | null {
  if (Array.isArray(json)) {
    const rows = json.filter(
      (r): r is { date: string; base: string; quote: string; rate: number } =>
        !!r && typeof r === 'object' && typeof r.quote === 'string' && typeof r.rate === 'number' && r.base === expectedBase,
    );
    if (!rows.length) return null;
    return { base: expectedBase, date: rows[0].date ?? '', rates: Object.fromEntries(rows.map((r) => [r.quote, r.rate])) };
  }
  if (json && typeof json === 'object') {
    const v1 = json as { base?: unknown; date?: unknown; rates?: unknown };
    if (v1.base !== expectedBase || !v1.rates || typeof v1.rates !== 'object') return null;
    const rates = Object.fromEntries(Object.entries(v1.rates as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number'));
    return { base: expectedBase, date: typeof v1.date === 'string' ? v1.date : '', rates };
  }
  return null;
}

/** Cached rates are good for a day (docs/SPEC.md §2). */
export const RATES_TTL_MS = 24 * 60 * 60_000;

export function ratesAreFresh(fetchedAt: number, now: number): boolean {
  return now - fetchedAt < RATES_TTL_MS;
}
