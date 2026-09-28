/** Below this, OCR found too little to parse (docs/SPEC.md §1.3). */
export const MIN_OCR_CHARS = 20;
/** The parser accepts at most this much text (docs/SPEC.md §1.4). */
export const MAX_PARSER_CHARS = 12_000;

/** Joins per-page OCR text in page order, with a marker so the parser knows where pages break. */
export function joinPages(pages: string[]): string {
  return pages
    .map((text, i) => (i === 0 ? text.trim() : `--- page ${i + 1} ---\n${text.trim()}`))
    .filter((t) => t.length > 0)
    .join('\n');
}

/** Enough real characters to be worth parsing (whitespace and page markers don't count). */
export function isReadable(text: string): boolean {
  return text.replace(/--- page \d+ ---/g, '').replace(/\s+/g, '').length >= MIN_OCR_CHARS;
}

/**
 * Fits text within the parser limit. Totals sit at the bottom of receipts, so a long text keeps
 * its start (merchant, date) and its end (totals, VAT, payment) and drops the middle.
 */
export function fitForParser(text: string, max = MAX_PARSER_CHARS): string {
  if (text.length <= max) return text;
  const marker = '\n[…]\n';
  const head = Math.floor((max - marker.length) * 0.4);
  const tail = max - marker.length - head;
  return text.slice(0, head) + marker + text.slice(text.length - tail);
}
