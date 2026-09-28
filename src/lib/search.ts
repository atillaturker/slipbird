/**
 * Search text normalisation, shared by what we store (`receipts.searchText`) and what the person types.
 * SQLite LIKE folds ASCII case only, so both sides are folded here: every dotted/dotless i becomes "i",
 * then lower case, then diacritics are removed (ş→s, ğ→g, ü→u, ö→o, ç→c, é→e).
 */
// Explicit folds for Turkish and common Western letters, so matching works even where
// String.prototype.normalize is unavailable; normalize() then catches anything else.
const FOLDS: Record<string, string> = { ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u', é: 'e', è: 'e', ê: 'e', á: 'a', à: 'a', í: 'i', ó: 'o', ú: 'u', ñ: 'n', ß: 'ss' };

/** Lower case with dotted/dotless i unified and accents removed. */
export function foldText(text: string): string {
  let folded = text.replace(/[İIı]/g, 'i').toLowerCase().replace(/[şğüöçâîûéèêáàíóúñß]/g, (c) => FOLDS[c] ?? c);
  if (typeof folded.normalize === 'function') folded = folded.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return folded;
}

export function normalizeSearch(text: string): string {
  return foldText(text).replace(/\s+/g, ' ').trim();
}

/** The stored search text for a receipt: merchant, note and item names. */
export function buildSearchText(merchant: string | null, note: string | null, itemNames: string[]): string {
  return normalizeSearch([merchant ?? '', note ?? '', ...itemNames].filter(Boolean).join(' '));
}

/** A LIKE pattern matching `query` anywhere, with LIKE wildcards escaped (use with ESCAPE '\'). */
export function likePattern(query: string): string {
  return `%${normalizeSearch(query).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
