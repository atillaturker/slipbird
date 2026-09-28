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

/** "₺1.234,56" (tr) / "$1,234.56" (en). */
export function formatMoney(minor: number, currency: string, locale: string): string {
  const exponent = currencyExponent(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(minor / 10 ** exponent);
}

/** The amount without a currency symbol, for editing in a field: "1.234,56" (tr) / "1,234.56" (en). */
export function formatAmountInput(minor: number, currency: string, locale: string): string {
  const exponent = currencyExponent(currency);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(minor / 10 ** exponent);
}

/** The narrow symbol for a currency in this locale ("₺", "$", "€"); falls back to the code. */
export function currencySymbol(currency: string, locale: string): string {
  const part = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find((p) => p.type === 'currency');
  return part?.value ?? currency;
}
