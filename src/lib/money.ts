/**
 * Money is integer minor units + an ISO 4217 code. All parsing and formatting goes through this file.
 */

// ISO 4217 minor-unit exponents that differ from 2.
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE_DECIMAL = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND']);

/** Number of minor-unit digits for a currency (JPY 0, USD 2, KWD 3). */
export function currencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/** How a number is written: `comma` = 1.234,56 (tr, most of Europe), `dot` = 1,234.56 (en). */
export type NumberFormatStyle = 'comma' | 'dot';

export function localeNumberStyle(locale: string): NumberFormatStyle {
  return locale.toLowerCase().startsWith('en') ? 'dot' : 'comma';
}

/**
 * The number style a receipt uses, judged from all its amounts: a string with both separators, or
 * one separator followed by exactly 2 digits, tells us which one is decimal. Null when nothing does.
 */
export function detectNumberStyle(amounts: string[]): NumberFormatStyle | null {
  let comma = 0;
  let dot = 0;
  for (const raw of amounts) {
    const s = raw.replace(/[^\d.,]/g, '');
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot >= 0 && lastComma >= 0) {
      if (lastComma > lastDot) comma += 1;
      else dot += 1;
    } else if (/,\d{2}$/.test(s) && s.split(',').length === 2) {
      comma += 1;
    } else if (/\.\d{2}$/.test(s) && s.split('.').length === 2) {
      dot += 1;
    }
  }
  if (comma === dot) return null;
  return comma > dot ? 'comma' : 'dot';
}

// Safe upper bound: keeps minor units well inside Number.MAX_SAFE_INTEGER.
const MAX_DIGITS = 15;

type ParseOptions = {
  /** The format detected on the receipt itself. Wins over `locale`. */
  style?: NumberFormatStyle;
  /** Device/app locale, used only when the string alone is ambiguous. */
  locale?: string;
};

/**
 * Parses an amount as printed or typed ("1.234,56", "1,234.56", "*12,50", "₺ 45", "-3.20") into minor units.
 * Returns null when the string is not a usable amount for this currency.
 *
 * Separator rules:
 * - Both `.` and `,` present: the last one is the decimal separator.
 * - One kind, repeated: it groups thousands.
 * - One separator once: decimal if 1–2 digits follow (spec: exactly 2 digits = decimal); 3 digits follow =
 *   thousands, unless the currency has 3 decimals, where the receipt's `style` or the `locale` decides.
 */
export function parseAmount(input: string, currency: string, options: ParseOptions = {}): number | null {
  const exponent = currencyExponent(currency);
  const negative = /^\s*[-−]|[-−]\s*$|^\s*\(.*\)\s*$/.test(input);
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimalSep: '.' | ',' | null = null;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? '.' : ',';
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? '.' : ',';
    const count = cleaned.split(sep).length - 1;
    const after = cleaned.length - cleaned.lastIndexOf(sep) - 1;
    if (count > 1) {
      decimalSep = null;
    } else if (after === 3) {
      const style = options.style ?? (options.locale ? localeNumberStyle(options.locale) : undefined);
      const styleDecimal = style === 'comma' ? ',' : style === 'dot' ? '.' : null;
      decimalSep = exponent === 3 && styleDecimal === sep ? sep : null;
    } else if (after === 0) {
      decimalSep = null;
    } else {
      decimalSep = sep;
    }
  }

  let whole = cleaned;
  let fraction = '';
  if (decimalSep) {
    const at = cleaned.lastIndexOf(decimalSep);
    whole = cleaned.slice(0, at);
    fraction = cleaned.slice(at + 1);
  }
  whole = whole.replace(/[.,]/g, '');
  if (/[.,]/.test(fraction)) return null;
  if (fraction.length > exponent) return null;

  const digits = (whole.replace(/^0+(?=\d)/, '') || '0') + fraction.padEnd(exponent, '0');
  if (digits.replace(/^0+/, '').length > MAX_DIGITS) return null;
  const minor = Number.parseInt(digits, 10);
  if (!Number.isFinite(minor)) return null;
  return negative && minor !== 0 ? -minor : minor;
}

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Cached formatter. Some JS engines (older Hermes builds) reject `currencyDisplay: 'narrowSymbol'`;
 * fall back to the regular symbol rather than failing to show an amount.
 */
function formatter(locale: string, currency: string | null, exponent: number): Intl.NumberFormat {
  const key = `${locale}|${currency ?? ''}|${exponent}`;
  let f = formatters.get(key);
  if (!f) {
    const digits = { minimumFractionDigits: exponent, maximumFractionDigits: exponent };
    if (!currency) {
      f = new Intl.NumberFormat(locale, digits);
    } else {
      try {
        f = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', ...digits });
      } catch {
        f = new Intl.NumberFormat(locale, { style: 'currency', currency, ...digits });
      }
    }
    formatters.set(key, f);
  }
  return f;
}

/** "₺1.234,56" (tr) / "$1,234.56" (en). */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const exponent = currencyExponent(currency);
  return formatter(locale, currency, exponent).format(minor / 10 ** exponent);
}

/** The amount without a currency symbol, for editing in a field: "1.234,56" (tr) / "1,234.56" (en). */
export function formatAmountInput(minor: number, currency: string, locale: string): string {
  const exponent = currencyExponent(currency);
  return formatter(locale, null, exponent).format(minor / 10 ** exponent);
}

/** The narrow symbol for a currency in this locale ("₺", "$", "€"); falls back to the code. */
export function currencySymbol(currency: string, locale: string): string {
  try {
    const part = formatter(locale, currency, currencyExponent(currency))
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

const shortFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Short amount for chart labels: compact where the engine supports it ("₺12 B" tr, "₺12K" en), otherwise whole
 * units ("₺12.345"). Display only — never parse this back.
 */
export function formatMoneyShort(minor: number, currency: string, locale: string): string {
  const key = `${locale}|${currency}`;
  let f = shortFormatters.get(key);
  if (!f) {
    const base = { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 } as const;
    try {
      f = new Intl.NumberFormat(locale, { ...base, notation: 'compact', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 1 });
    } catch {
      f = new Intl.NumberFormat(locale, base);
    }
    shortFormatters.set(key, f);
  }
  return f.format(minor / 10 ** currencyExponent(currency));
}
