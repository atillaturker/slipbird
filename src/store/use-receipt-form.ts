import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getDb } from '@/db';
import { findDuplicate } from '@/db/receipts';
import { toISODate } from '@/lib/dates';
import type { FieldConfidence, ReviewFieldKey } from '@/lib/receipt-normalize';
import { emptyReceiptForm, receiptToForm, validateReceiptForm, type ReceiptForm, type ReceiptFormErrors } from '@/lib/receipt-form';
import type { ReceiptInput, ReceiptSummary } from '@/lib/types';
import { imageUri } from '@/services/images';

import { useReceipt, useReceipts } from './receipts';
import { useSettings } from './settings';

const NO_ERRORS: ReceiptFormErrors = { items: {}, taxes: {} };

// Which review field each form key confirms when edited.
const REVIEW_FIELD: Partial<Record<keyof ReceiptForm, ReviewFieldKey>> = {
  merchant: 'merchant',
  date: 'date',
  total: 'total',
  currency: 'currency',
  category: 'category',
};

/**
 * State for manual entry and editing. With `id`, loads that receipt and saves over it
 * (keeping its source, images and OCR text); without, starts empty in the home currency.
 */
export function useReceiptForm(id: string | undefined) {
  const { i18n } = useTranslation();
  const homeCurrency = useSettings((s) => s.homeCurrency);
  const save = useReceipts((s) => s.save);
  const remove = useReceipts((s) => s.remove);
  const existing = useReceipt(id);
  // The form starts from the saved receipt (or an empty one); `draft` holds the person's edits once they start.
  const initial = useMemo(
    () => (id ? (existing ? receiptToForm(existing, i18n.language) : null) : emptyReceiptForm(toISODate(new Date()), homeCurrency)),
    [id, existing, i18n.language, homeCurrency],
  );
  const [draft, setDraft] = useState<ReceiptForm | null>(null);
  const form = draft ?? initial;
  const [errors, setErrors] = useState<ReceiptFormErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  // Review fields the person has edited: their flags are cleared.
  const [confirmed, setConfirmed] = useState<ReadonlySet<ReviewFieldKey>>(new Set());

  const update = (patch: Partial<ReceiptForm>) =>
    setDraft((d) => {
      const base = d ?? initial;
      return base ? { ...base, ...patch } : d;
    });

  const setField = <K extends keyof ReceiptForm>(key: K, value: ReceiptForm[K]) => {
    update({ [key]: value } as Partial<ReceiptForm>);
    const reviewKey = REVIEW_FIELD[key];
    if (reviewKey) setConfirmed((c) => new Set(c).add(reviewKey));
    if (key === 'merchant' || key === 'date' || key === 'total') setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addItem = () => update({ items: [...(form?.items ?? []), { name: '', qty: '', unit: null, amount: '' }] });
  const updateItem = (index: number, patch: Partial<ReceiptForm['items'][number]>) =>
    update({ items: (form?.items ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const removeItem = (index: number) => {
    update({ items: (form?.items ?? []).filter((_, i) => i !== index) });
    setErrors((e) => ({ ...e, items: {} }));
  };

  const addTax = () => update({ taxes: [...(form?.taxes ?? []), { rate: '', amount: '' }] });
  const updateTax = (index: number, patch: Partial<ReceiptForm['taxes'][number]>) =>
    update({ taxes: (form?.taxes ?? []).map((tax, i) => (i === index ? { ...tax, ...patch } : tax)) });
  const removeTax = (index: number) => {
    update({ taxes: (form?.taxes ?? []).filter((_, i) => i !== index) });
    setErrors((e) => ({ ...e, taxes: {} }));
  };

  /**
   * Validates and saves. With `checkDuplicates`, first looks for an already saved copy (same ETTN, or same
   * merchant, total and date) and returns it instead of saving. Throws if the write fails.
   */
  const submit = async (
    options: { checkDuplicates?: boolean } = {},
  ): Promise<{ ok: true; id: string } | { ok: false; errors: ReceiptFormErrors } | { ok: false; duplicate: ReceiptSummary }> => {
    if (!form) return { ok: false, errors: NO_ERRORS };
    const result = validateReceiptForm(form, toISODate(new Date()), i18n.language);
    if (!result.ok) {
      setErrors(result.errors);
      return { ok: false, errors: result.errors };
    }
    setErrors(NO_ERRORS);
    // The form edits the display name. With a printed legal name, that stays and the typed name becomes the
    // display name; without one, the typed name is the merchant.
    const typed = result.input.merchant;
    const legal = existing?.merchant?.trim() || null;
    const input: ReceiptInput = {
      ...result.input,
      merchant: legal ?? typed,
      merchantDisplay: legal && typed !== legal ? typed : null,
      documentType: existing?.documentType ?? null,
      time: existing?.time ?? null,
      source: existing?.source ?? 'manual',
      status: 'saved',
      ocrText: existing?.ocrText ?? null,
      ettn: existing?.ettn ?? null,
      documentNumber: existing?.documentNumber ?? null,
      imagePaths: existing?.imagePaths ?? [],
      // Saving is the person's confirmation: nothing is left to check.
      fieldConfidence: null,
    };
    if (options.checkDuplicates && id) {
      const duplicate = await findDuplicate(getDb(), { id, ettn: input.ettn, merchant: input.merchant, totalMinor: input.totalMinor, date: input.date });
      if (duplicate) return { ok: false, duplicate };
    }
    setSaving(true);
    try {
      return { ok: true, id: await save(input, id) };
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    /** The receipt being edited is gone (deleted elsewhere). */
    missing: !!id && existing === null,
    /** Parser confidence per field, minus the fields the person has since edited. */
    fieldConfidence: withConfirmed(existing?.fieldConfidence ?? null, confirmed),
    status: existing?.status,
    /** Deletes the receipt being reviewed (duplicate → Discard). */
    discard: async () => {
      if (id) await remove(id);
    },
    /** Photos of the receipt being edited, as URIs the Image component can show. */
    imageUris: (existing?.imagePaths ?? []).map(imageUri),
    errors,
    saving,
    homeCurrency,
    setField,
    addItem,
    updateItem,
    removeItem,
    addTax,
    updateTax,
    removeTax,
    submit,
  };
}

function withConfirmed(fc: FieldConfidence | null, confirmed: ReadonlySet<ReviewFieldKey>): FieldConfidence | null {
  if (!fc) return null;
  const out: FieldConfidence = { ...fc };
  for (const key of confirmed) out[key] = { confidence: 'high' };
  return out;
}
