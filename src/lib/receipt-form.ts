import type { Category } from '@/theme';

import { isISODate } from './dates';
import { formatAmountInput, parseAmount } from './money';
import { formatDecimal, parseDecimal } from './number';
import { displayMerchant, type ItemUnit, type PaymentMethod, type Receipt, type ReceiptInput } from './types';

/** What the manual entry screen edits: strings as typed, parsed on save. */
export type ReceiptForm = {
  merchant: string;
  date: string; // YYYY-MM-DD
  total: string;
  currency: string;
  category: Category;
  paymentMethod: PaymentMethod | null;
  note: string;
  items: { name: string; qty: string; unit: ItemUnit | null; amount: string }[];
  taxes: { rate: string; amount: string }[];
};

/** Error keys map to translated messages in the screen (`receiptForm.errors.*`). */
export type ReceiptFormError = 'merchantRequired' | 'dateInvalid' | 'dateFuture' | 'totalRequired' | 'totalInvalid' | 'amountInvalid' | 'itemNameRequired' | 'qtyInvalid' | 'rateInvalid';

export type ReceiptFormErrors = {
  merchant?: ReceiptFormError;
  date?: ReceiptFormError;
  total?: ReceiptFormError;
  items: Record<number, { name?: ReceiptFormError; qty?: ReceiptFormError; amount?: ReceiptFormError }>;
  taxes: Record<number, { rate?: ReceiptFormError; amount?: ReceiptFormError }>;
};

export function emptyReceiptForm(today: string, currency: string): ReceiptForm {
  return { merchant: '', date: today, total: '', currency, category: 'other', paymentMethod: null, note: '', items: [], taxes: [] };
}

/**
 * Validates the form. Returns the receipt to save, or errors per field.
 * `today` is YYYY-MM-DD; dates after it are rejected (a receipt can't be from the future).
 */
export function validateReceiptForm(
  form: ReceiptForm,
  today: string,
  locale: string,
): { ok: true; input: Omit<ReceiptInput, 'source' | 'status' | 'ocrText' | 'ettn' | 'documentNumber' | 'imagePaths' | 'time' | 'fieldConfidence' | 'merchantDisplay' | 'documentType'> } | { ok: false; errors: ReceiptFormErrors } {
  const errors: ReceiptFormErrors = { items: {}, taxes: {} };
  let failed = false;
  const fail = () => {
    failed = true;
  };
  const amount = (text: string) => parseAmount(text, form.currency, { locale });

  const merchant = form.merchant.trim();
  if (!merchant) {
    errors.merchant = 'merchantRequired';
    fail();
  }

  if (!isISODate(form.date)) {
    errors.date = 'dateInvalid';
    fail();
  } else if (form.date > today) {
    errors.date = 'dateFuture';
    fail();
  }

  const totalMinor = form.total.trim() ? amount(form.total) : null;
  if (!form.total.trim()) {
    errors.total = 'totalRequired';
    fail();
  } else if (totalMinor === null || totalMinor <= 0) {
    errors.total = 'totalInvalid';
    fail();
  }

  const items = form.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.name.trim() || item.amount.trim() || item.qty.trim())
    .map(({ item, index }) => {
      const e: ReceiptFormErrors['items'][number] = {};
      const name = item.name.trim();
      const amountMinor = amount(item.amount);
      const qty = item.qty.trim() ? parseDecimal(item.qty) : null;
      if (!name) e.name = 'itemNameRequired';
      if (amountMinor === null) e.amount = 'amountInvalid';
      if (item.qty.trim() && qty === null) e.qty = 'qtyInvalid';
      if (Object.keys(e).length) {
        errors.items[index] = e;
        fail();
      }
      return { name, qty, unit: qty === null ? null : item.unit, amountMinor: amountMinor ?? 0 };
    });

  const taxes = form.taxes
    .map((tax, index) => ({ tax, index }))
    .filter(({ tax }) => tax.rate.trim() || tax.amount.trim())
    .map(({ tax, index }) => {
      const e: ReceiptFormErrors['taxes'][number] = {};
      const amountMinor = amount(tax.amount);
      const rate = tax.rate.trim() ? parseDecimal(tax.rate) : null;
      if (amountMinor === null || amountMinor < 0) e.amount = 'amountInvalid';
      if (tax.rate.trim() && (rate === null || rate > 100)) e.rate = 'rateInvalid';
      if (Object.keys(e).length) {
        errors.taxes[index] = e;
        fail();
      }
      return { rate, amountMinor: amountMinor ?? 0 };
    });

  if (failed) return { ok: false, errors };

  const note = form.note.trim();
  return {
    ok: true,
    input: {
      merchant,
      date: form.date,
      totalMinor: totalMinor!,
      currency: form.currency,
      category: form.category,
      paymentMethod: form.paymentMethod,
      note: note || null,
      items,
      taxes,
    },
  };
}

/** Fills the form from a saved receipt, for editing. */
export function receiptToForm(receipt: Receipt, locale: string): ReceiptForm {
  const money = (minor: number) => formatAmountInput(minor, receipt.currency, locale);
  return {
    // The form edits the name people see in lists; the legal name stays as printed.
    merchant: displayMerchant(receipt) ?? '',
    date: receipt.date,
    // Scans waiting for review have no total yet: start empty rather than at 0,00.
    total: receipt.totalMinor > 0 ? money(receipt.totalMinor) : '',
    currency: receipt.currency,
    category: receipt.category,
    paymentMethod: receipt.paymentMethod,
    note: receipt.note ?? '',
    items: receipt.items.map((i) => ({ name: i.name, qty: i.qty === null ? '' : formatDecimal(i.qty, locale), unit: i.unit, amount: money(i.amountMinor) })),
    taxes: receipt.taxes.map((t) => ({ rate: t.rate === null ? '' : formatDecimal(t.rate, locale), amount: money(t.amountMinor) })),
  };
}

/** Where the person has to look after a failed save: the Items tab only when errors are there alone. */
export function errorLocation(errors: ReceiptFormErrors): { tab: 'receipt' | 'items'; openTaxes: boolean } {
  const receiptError = !!(errors.merchant || errors.date || errors.total);
  const taxError = Object.keys(errors.taxes).length > 0;
  const itemError = Object.keys(errors.items).length > 0;
  return { tab: !receiptError && !taxError && itemError ? 'items' : 'receipt', openTaxes: taxError };
}

/**
 * How far the items are from the total, as typed right now: `diffMinor` > 0 means the items are short of the
 * total, < 0 means they exceed it. Null when there are no readable items or no readable total.
 */
export function itemsDifference(form: ReceiptForm, locale: string): { sumMinor: number; diffMinor: number } | null {
  const total = form.total.trim() ? parseAmount(form.total, form.currency, { locale }) : null;
  const amounts = form.items.map((i) => (i.amount.trim() ? parseAmount(i.amount, form.currency, { locale }) : null)).filter((a): a is number => a !== null);
  if (total === null || amounts.length === 0) return null;
  const sumMinor = amounts.reduce((sum, a) => sum + a, 0);
  return { sumMinor, diffMinor: total - sumMinor };
}
