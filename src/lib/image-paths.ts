/**
 * Receipt images live in the document directory at `receipts/<receiptId>/<n>.jpg` plus `thumb.jpg`.
 * The database stores these relative paths; the app resolves them against the current document
 * directory at runtime (the absolute container path can change between app updates on iOS).
 */
export const RECEIPTS_DIR = 'receipts';
export const MAX_PAGES = 3;
export const PAGE_LONG_EDGE = 1600;
export const THUMB_LONG_EDGE = 200;
export const JPEG_QUALITY = 0.7;

export function receiptDir(receiptId: string): string {
  return `${RECEIPTS_DIR}/${receiptId}`;
}

/** 1-based page number. */
export function pagePath(receiptId: string, page: number): string {
  return `${receiptDir(receiptId)}/${page}.jpg`;
}

export function thumbnailPath(receiptId: string): string {
  return `${receiptDir(receiptId)}/thumb.jpg`;
}

/** Resize that brings the long edge down to `max`, keeping the aspect ratio; null if already small enough. */
export function longEdgeResize(width: number, height: number, max: number): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

/** Keeps at most MAX_PAGES pages (iOS's scanner can't cap them); `dropped` says whether any were cut. */
export function limitPages<T>(pages: T[]): { pages: T[]; dropped: boolean } {
  return { pages: pages.slice(0, MAX_PAGES), dropped: pages.length > MAX_PAGES };
}
