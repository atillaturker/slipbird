import { differenceInCalendarDays } from 'date-fns';

import { categoryOrder, type Category } from '@/theme';

import { isCurrencyCode } from './currency';
import { fromISODate, toISODate } from './dates';
import type { GibQr } from './gib-qr';
import { detectNumberStyle, parseAmount } from './money';
import type { Confidence, ParsedReceipt } from './parsed-receipt';
import { documentTypes, itemUnits, paymentMethods, type DocumentType, type PaymentMethod, type ReceiptItem, type ReceiptTax } from './types';

/** Fields the review screen flags. */
export type ReviewFieldKey = 'merchant' | 'date' | 'total' | 'currency' | 'category';
export const reviewFieldOrder: readonly ReviewFieldKey[] = ['merchant', 'date', 'total', 'currency', 'category'];

/** Why a field is `low`; maps to a short check message (`review.flags.*`). */
export type FlagReason = 'uncertain' | 'missing' | 'dateFuture' | 'dateOld' | 'totalNotPositive' | 'itemsMismatch';

export type FieldConfidence = Partial<Record<ReviewFieldKey, { confidence: Confidence; reason?: FlagReason }>>;

export type NormalizedReceipt = {
  merchant: string | null;
  merchantDisplay: string | null;
  documentType: DocumentType | null;
  date: string;
  time: string | null;
  totalMinor: number;
  currency: string;
  category: Category;
  paymentMethod: PaymentMethod | null;
  items: ReceiptItem[];
  taxes: ReceiptTax[];
  ettn: string | null;
  documentNumber: string | null;
  fieldConfidence: FieldConfidence;
};

export type NormalizeContext = {
  /** YYYY-MM-DD on the device. */
  today: string;
  /** Used when the receipt shows no currency (and flagged). */
  deviceCurrency: string;
  /** Device locale; only breaks ties the receipt itself can't. */
  locale: string;
};

// Items may differ from the total by rounding and small fees; beyond 1% something was misread.
const ITEMS_TOLERANCE = 0.01;
const MAX_AGE_DAYS = 365;

const high = { confidence: 'high' as const };
const low = (reason: FlagReason) => ({ confidence: 'low' as const, reason });

function validTime(time: string | null): string | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? `${String(h).padStart(2, '0')}:${m[2]}` : null;
}

/**
 * Turns the parser's output into app values (minor units, ISO dates) and decides what needs checking.
 * Amounts are parsed in the receipt's own number style; a field is downgraded to `low` when the model
 * was unsure, or the date is in the future or over a year old, the total is missing or ≤ 0, the items
 * disagree with the total by more than 1%, or no currency was found.
 */
export function normalizeParsedReceipt(parsed: ParsedReceipt, ctx: NormalizeContext): NormalizedReceipt {
  const fc: FieldConfidence = {};
  const uncertain = (c: Confidence) => (c === 'low' ? low('uncertain') : high);

  // Currency first: amounts need its exponent.
  const rawCurrency = parsed.currency.value?.trim().toUpperCase() ?? null;
  const currency = isCurrencyCode(rawCurrency) ? rawCurrency : ctx.deviceCurrency;
  fc.currency = isCurrencyCode(rawCurrency) ? uncertain(parsed.currency.confidence) : low('missing');

  const style = detectNumberStyle([parsed.total.value ?? '', ...parsed.items.map((i) => i.amount), ...parsed.tax.map((t) => t.amount)]) ?? undefined;
  const amount = (text: string | null) => (text ? parseAmount(text, currency, { style, locale: ctx.locale }) : null);

  // Merchant: never invented; empty means missing.
  const merchant = parsed.merchant.value?.trim() || null;
  fc.merchant = merchant ? uncertain(parsed.merchant.confidence) : low('missing');

  // Date: within the last year and not in the future.
  let date = ctx.today;
  const parsedDate = parsed.date.value ? fromISODate(parsed.date.value) : null;
  const today = fromISODate(ctx.today)!;
  if (!parsedDate) {
    fc.date = low('missing');
  } else {
    date = toISODate(parsedDate);
    if (parsedDate > today) fc.date = low('dateFuture');
    else if (differenceInCalendarDays(today, parsedDate) > MAX_AGE_DAYS) fc.date = low('dateOld');
    else fc.date = uncertain(parsed.date.confidence);
  }

  const items: ReceiptItem[] = [];
  for (const item of parsed.items) {
    const amountMinor = amount(item.amount);
    const name = item.name.trim();
    if (amountMinor === null || !name) continue;
    const qty = item.qty !== null && item.qty > 0 ? item.qty : null;
    const unit = qty !== null && item.unit && itemUnits.includes(item.unit) ? item.unit : null;
    items.push({ name, qty, unit, amountMinor });
  }

  const taxes: ReceiptTax[] = [];
  for (const tax of parsed.tax) {
    const amountMinor = amount(tax.amount);
    if (amountMinor === null || amountMinor < 0) continue;
    taxes.push({ rate: tax.rate !== null && tax.rate >= 0 && tax.rate <= 100 ? tax.rate : null, amountMinor });
  }

  const parsedTotal = amount(parsed.total.value);
  const totalMinor = parsedTotal ?? 0;
  if (parsedTotal === null) {
    fc.total = low('missing');
  } else if (parsedTotal <= 0) {
    fc.total = low('totalNotPositive');
  } else {
    const itemsSum = items.reduce((sum, i) => sum + i.amountMinor, 0);
    const mismatch = items.length > 0 && Math.abs(itemsSum - parsedTotal) > parsedTotal * ITEMS_TOLERANCE;
    fc.total = mismatch ? low('itemsMismatch') : uncertain(parsed.total.confidence);
  }

  const category = categoryOrder.includes(parsed.category.value) ? parsed.category.value : 'other';
  fc.category = uncertain(category === parsed.category.value ? parsed.category.confidence : 'low');

  return {
    merchant,
    merchantDisplay: merchant ? parsed.merchantDisplay?.trim() || null : null,
    documentType: documentTypes.includes(parsed.documentType) ? parsed.documentType : null,
    date,
    time: validTime(parsed.date.time),
    totalMinor,
    currency,
    category,
    paymentMethod: parsed.paymentMethod && paymentMethods.includes(parsed.paymentMethod) ? parsed.paymentMethod : null,
    items,
    taxes,
    ettn: null,
    documentNumber: null,
    fieldConfidence: fc,
  };
}

/** A valid GİB QR is authoritative for date, total, currency and taxes; OCR still supplies merchant, items and category. */
export function mergeGibQr(receipt: NormalizedReceipt, qr: GibQr): NormalizedReceipt {
  return {
    ...receipt,
    date: qr.date,
    totalMinor: qr.totalMinor,
    currency: qr.currency,
    taxes: qr.taxes.length ? qr.taxes : receipt.taxes,
    ettn: qr.ettn,
    documentNumber: qr.documentNumber,
    fieldConfidence: { ...receipt.fieldConfidence, date: high, total: high, currency: high },
  };
}

/** Confidence for a receipt read from a GİB QR alone: everything high except the merchant, which isn't in the QR. */
export function gibQrConfidence(hasMerchant: boolean): FieldConfidence {
  return { merchant: hasMerchant ? high : low('missing'), date: high, total: high, currency: high, category: low('uncertain') };
}

export function hasLowField(fc: FieldConfidence | null | undefined): boolean {
  return !!fc && reviewFieldOrder.some((k) => fc[k]?.confidence === 'low');
}

/** The first low field in reading order (the review screen scrolls to it). */
export function firstLowField(fc: FieldConfidence | null | undefined): ReviewFieldKey | null {
  return (fc && reviewFieldOrder.find((k) => fc[k]?.confidence === 'low')) || null;
}
