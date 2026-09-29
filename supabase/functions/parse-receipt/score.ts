/** Scores a parse against a fixture's expected output, for comparing prompts and models. */
import type { ParsedReceipt } from './schema.ts';

type ExpectedItem = { name: string; qty: number | null; unit: string | null; amount: string };
export type Expected = {
  merchant: { value: string | null };
  total: { value: string | null };
  currency: { value: string | null };
  items: readonly ExpectedItem[];
};

/** Lower case with Turkish and accented letters folded, so "ÇAĞRI" matches "Çağrı". */
export function fold(text: string): string {
  return text
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .replace(/[şğüöçâîû]/g, (c) => ({ ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' })[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quantities compared in kilograms, so "250 g" and "0.25 kg" are the same answer. */
function canonical(qty: number | null, unit: string | null): { qty: number | null; unit: string | null } {
  if (qty !== null && unit === 'g') return { qty: qty / 1000, unit: 'kg' };
  return { qty, unit };
}

export type Score = { checks: Record<string, boolean>; passed: number; total: number; notes: string[] };

export function scoreParse(actual: ParsedReceipt, expected: Expected): Score {
  const notes: string[] = [];
  const checks: Record<string, boolean> = {};

  // Merchant: the first two words of the expected legal name (before A.Ş. / Ltd. Şti.), ignoring case and accents.
  const expectedWords = fold(expected.merchant.value ?? '').split(' ').slice(0, 2).join(' ');
  checks.merchant = fold(actual.merchant.value ?? '').startsWith(expectedWords);
  if (!checks.merchant) notes.push(`merchant ${JSON.stringify(actual.merchant.value)}`);

  checks.total = actual.total.value === expected.total.value;
  if (!checks.total) notes.push(`total ${actual.total.value}`);

  checks.currency = actual.currency.value === expected.currency.value;
  if (!checks.currency) notes.push(`currency ${actual.currency.value}`);

  checks.itemCount = actual.items.length === expected.items.length;
  if (!checks.itemCount) notes.push(`${actual.items.length} items, expected ${expected.items.length}`);

  const amounts = actual.items.map((i) => i.amount);
  checks.amounts = amounts.length === expected.items.length && amounts.every((a, i) => a === expected.items[i].amount);
  if (!checks.amounts) notes.push(`amounts ${amounts.join(' ')}`);

  // Quantity and unit per item, matched by amount (amounts are unique within the fixtures).
  let quantitiesOk = true;
  for (const want of expected.items) {
    const got = actual.items.find((i) => i.amount === want.amount);
    if (!got) continue; // already reported by `amounts`
    const a = canonical(got.qty, got.unit);
    const b = canonical(want.qty, want.unit);
    const same = a.unit === b.unit && (a.qty === b.qty || (a.qty !== null && b.qty !== null && Math.abs(a.qty - b.qty) < 1e-9));
    if (!same) {
      quantitiesOk = false;
      notes.push(`${want.name}: ${got.qty} ${got.unit}, expected ${want.qty} ${want.unit}`);
    }
  }
  checks.quantities = quantitiesOk;

  const passed = Object.values(checks).filter(Boolean).length;
  return { checks, passed, total: Object.keys(checks).length, notes };
}
