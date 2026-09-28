/**
 * Search text normalisation, shared by what we store (`receipts.searchText`) and what the person types.
 * SQLite LIKE folds ASCII case only, so both sides are folded here: every dotted/dotless i becomes "i",
 * then lower case, then diacritics are removed (ş→s, ğ→g, ü→u, ö→o, ç→c, é→e).
 */
export function normalizeSearch(text: string): string {
  return text
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The stored search text for a receipt: merchant, note and item names. */
export function buildSearchText(merchant: string | null, note: string | null, itemNames: string[]): string {
  return normalizeSearch([merchant ?? '', note ?? '', ...itemNames].filter(Boolean).join(' '));
}

/** A LIKE pattern matching `query` anywhere, with LIKE wildcards escaped (use with ESCAPE '\'). */
export function likePattern(query: string): string {
  return `%${normalizeSearch(query).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
