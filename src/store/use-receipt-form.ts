import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toISODate } from '@/lib/dates';
import { emptyReceiptForm, receiptToForm, validateReceiptForm, type ReceiptForm, type ReceiptFormErrors } from '@/lib/receipt-form';
import type { ReceiptInput } from '@/lib/types';
import { imageUri } from '@/services/images';

import { useReceipt, useReceipts } from './receipts';
import { useSettings } from './settings';

const NO_ERRORS: ReceiptFormErrors = { items: {}, taxes: {} };

/**
 * State for manual entry and editing. With `id`, loads that receipt and saves over it
 * (keeping its source, images and OCR text); without, starts empty in the home currency.
 */
export function useReceiptForm(id: string | undefined) {
  const { i18n } = useTranslation();
  const homeCurrency = useSettings((s) => s.homeCurrency);
  const save = useReceipts((s) => s.save);
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

  const update = (patch: Partial<ReceiptForm>) =>
    setDraft((d) => {
      const base = d ?? initial;
      return base ? { ...base, ...patch } : d;
    });

  const setField = <K extends keyof ReceiptForm>(key: K, value: ReceiptForm[K]) => {
    update({ [key]: value } as Partial<ReceiptForm>);
    if (key === 'merchant' || key === 'date' || key === 'total') setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addItem = () => update({ items: [...(form?.items ?? []), { name: '', qty: '', amount: '' }] });
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

  /** Validates and saves. Returns the saved id, or the validation errors (also set in state); throws if the write fails. */
  const submit = async (): Promise<{ ok: true; id: string } | { ok: false; errors: ReceiptFormErrors }> => {
    if (!form) return { ok: false, errors: NO_ERRORS };
    const result = validateReceiptForm(form, toISODate(new Date()), i18n.language);
    if (!result.ok) {
      setErrors(result.errors);
      return { ok: false, errors: result.errors };
    }
    setErrors(NO_ERRORS);
    const input: ReceiptInput = {
      ...result.input,
      time: existing?.time ?? null,
      source: existing?.source ?? 'manual',
      status: 'saved',
      ocrText: existing?.ocrText ?? null,
      ettn: existing?.ettn ?? null,
      documentNumber: existing?.documentNumber ?? null,
      imagePaths: existing?.imagePaths ?? [],
    };
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
