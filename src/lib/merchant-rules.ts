import type { Category } from '@/theme';

import { foldText } from './search';

// Words that end company names rather than name the shop ("Migros Ticaret A.Ş.", "Tesco Stores Ltd").
const LEGAL_TAIL = new Set([
  'as', 'ltd', 'sti', 'limited', 'sirketi', 'inc', 'llc', 'gmbh', 'plc', 'co', 'corp', 'corporation',
  'company', 'san', 'sanayi', 'tic', 'ticaret', 've', 'ith', 'ihr', 'ithalat', 'ihracat', 'pazarlama', 'sa', 'srl', 'bv', 'ag',
]);

// "Şube 12", "Mağaza No: 123", "Store #45", "#1234" — branch numbers vary per shop of the same chain.
const STORE_NUMBER = /\b(sube|magaza|store|branch|no)\.?\s*(no)?\s*[:#.]?\s*\d+\b|#\s*\d+/g;

/**
 * The key merchant rules are stored under: case- and accent-folded, without legal suffixes,
 * store numbers or punctuation. "MİGROS TİCARET A.Ş. Şube 123" → "migros".
 */
export function normalizeMerchant(name: string | null | undefined): string | null {
  if (!name) return null;
  const folded = foldText(name)
    .replace(/['’]/g, '')
    .replace(STORE_NUMBER, ' ')
    // "a.s." / "ltd. sti." → "as" / "ltd sti" before punctuation is dropped
    .replace(/\b([a-z])\.([a-z])\.?/g, '$1$2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  // Drop trailing legal words and bare numbers.
  while (folded.length > 1 && (LEGAL_TAIL.has(folded[folded.length - 1]) || /^\d+$/.test(folded[folded.length - 1]))) {
    folded.pop();
  }
  const key = folded.join(' ');
  return key || null;
}

/** A saved rule overrides the model's category and is trusted (`high`). */
export function categoryFromRule(ruleCategory: Category | null, parsed: Category): { category: Category; fromRule: boolean } {
  return ruleCategory ? { category: ruleCategory, fromRule: true } : { category: parsed, fromRule: false };
}
