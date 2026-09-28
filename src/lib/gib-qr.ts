import { isCurrencyCode } from './currency';
import { isISODate } from './dates';
import { parseAmount } from './money';
import { parseDecimal } from './number';
import type { ReceiptTax } from './types';

/**
 * Turkish GİB e-Arşiv / e-Fatura invoice QR codes carry a JSON payload (docs/SPEC.md §1.2).
 *
 * UNVERIFIED: keys and formats follow the spec, not real invoices. Verify against at least
 * 5 real payloads before M4 closes, and keep this parser tolerant of missing keys.
 */
export type GibQr = {
  ettn: string | null;
  documentNumber: string | null;
  date: string; // YYYY-MM-DD
  totalMinor: number;
  currency: string;
  taxes: ReceiptTax[];
  sellerTaxId: string | null;
  scenario: string | null;
  type: string | null;
};

// Currency spellings seen on Turkish documents that aren't ISO 4217 codes.
const CURRENCY_ALIASES: Record<string, string> = { TL: 'TRY', YTL: 'TRY', '₺': 'TRY' };

function readPayload(data: string): Record<string, string> | null {
  const text = data.trim();
  if (!text.startsWith('{')) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  // Normalise keys: lower case, no spaces ("KDVMatrah (20)" → "kdvmatrah(20)").
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;
    out[key.toLowerCase().replace(/\s+/g, '')] = String(value).trim();
  }
  return out;
}

/** "2024-01-15", "15-01-2024", "15.01.2024", "15/01/2024" (optionally with a time) → YYYY-MM-DD. */
export function gibDate(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  let iso: string | null = null;
  const ymd = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(v);
  const dmy = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})/.exec(v);
  if (ymd) iso = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  else if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return iso && isISODate(iso) ? iso : null;
}

/**
 * Parses a scanned QR payload. Returns null when it isn't a usable GİB invoice QR:
 * not JSON, no identifying key (ettn / no / vkntckn), no valid date, or no positive total.
 */
export function parseGibQr(data: string): GibQr | null {
  const p = readPayload(data);
  if (!p) return null;
  if (!p.ettn && !p.no && !p.vkntckn) return null;

  const rawCurrency = (p.parabirimi ?? '').toUpperCase();
  const currency = CURRENCY_ALIASES[rawCurrency] ?? (isCurrencyCode(rawCurrency) ? rawCurrency : 'TRY');

  const date = gibDate(p.tarih);
  const totalText = p.odenecek || p.vergidahil;
  const totalMinor = totalText ? parseAmount(totalText, currency) : null;
  if (!date || totalMinor === null || totalMinor <= 0) return null;

  const taxes: ReceiptTax[] = [];
  for (const [key, value] of Object.entries(p)) {
    const match = /^hesaplanankdv\(%?([\d.,]+)\)$/.exec(key);
    if (!match) continue;
    const amountMinor = parseAmount(value, currency);
    if (amountMinor === null) continue;
    taxes.push({ rate: parseDecimal(match[1]), amountMinor });
  }
  taxes.sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));

  return {
    ettn: p.ettn || null,
    documentNumber: p.no || null,
    date,
    totalMinor,
    currency,
    taxes,
    sellerTaxId: p.vkntckn || null,
    scenario: p.senaryo || null,
    type: p.tip || null,
  };
}
