import { foldText } from './search';

/** Active ISO 4217 currencies (no funds, metals or test codes). */
export const ISO_CURRENCIES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'INR',
  'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL',
  'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR',
  'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD',
  'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD',
  'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWG',
] as const;

const PINNED = ['TRY', 'USD', 'EUR', 'GBP'];

export function isCurrencyCode(code: unknown): code is string {
  return typeof code === 'string' && (ISO_CURRENCIES as readonly string[]).includes(code);
}

/** Picker order: home currency, then TRY/USD/EUR/GBP, then everything else A–Z. */
export function currencyOptions(homeCurrency: string): { pinned: string[]; rest: string[] } {
  const pinned = [...new Set([homeCurrency, ...PINNED])].filter(isCurrencyCode);
  const rest = ISO_CURRENCIES.filter((c) => !pinned.includes(c));
  return { pinned, rest };
}

/** Matches a typed query against the code and its display name, ignoring case and accents. */
export function currencyMatches(code: string, name: string, query: string): boolean {
  const q = foldText(query.trim());
  return q === '' || foldText(code).includes(q) || foldText(name).includes(q);
}

/** The home currency default: the device region's currency when we support it, else USD. */
export function defaultHomeCurrency(deviceCurrency: string | null | undefined): string {
  return isCurrencyCode(deviceCurrency) ? deviceCurrency : 'USD';
}
