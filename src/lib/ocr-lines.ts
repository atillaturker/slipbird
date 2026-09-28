/**
 * Rebuilds printed rows from OCR geometry. ML Kit groups text into blocks by layout, so on a receipt the item
 * names (left column) and prices (right column) often come back as separate blocks — the parser then sees all
 * names, then all prices, and pairs them wrongly. Here every fragment is placed by its position instead:
 * rows by vertical centre, left to right within a row, "name  %1 *134,26" on one line again.
 */

export type Point = { x: number; y: number };
export type OcrFrame = { left: number; top: number; width: number; height: number };
/** One recognised line fragment with its box (ML Kit TextLine: text, frame, cornerPoints TL, TR, BR, BL). */
export type OcrFragment = { text: string; frame?: OcrFrame; cornerPoints?: readonly Point[] };

type Placed = { text: string; x: number; y: number; left: number; right: number; height: number; charWidth: number };

// Fragments whose centres are within this share of the median line height sit on the same printed row.
const ROW_TOLERANCE = 0.6;
// A gap wider than this many average characters is a column gap: join with two spaces so it stays visible.
const COLUMN_GAP_CHARS = 1.5;
// Only long, flat fragments tell us the page skew reliably.
const SKEW_MIN_ASPECT = 3;
// Skew beyond this is a sideways photo, not a slightly tilted receipt: don't "correct" it.
const MAX_SKEW_RAD = (15 * Math.PI) / 180;

/** "2,238 KG X 59,99", "2 AD X 21,25", "1,5 LT X 40,00": quantity rows belong above their item. */
export const QUANTITY_LINE = /^\d+(?:[.,]\d+)?\s*(?:KG|AD|ADET|LT|L|GR|G)?\.?\s*[Xx×*]\s*\d[\d.,]*$/i;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function box(f: OcrFragment): { cx: number; cy: number; width: number; height: number; angle: number | null } | null {
  const p = f.cornerPoints;
  if (p && p.length === 4) {
    const [tl, tr, br, bl] = p;
    const width = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const height = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    return { cx: (tl.x + tr.x + br.x + bl.x) / 4, cy: (tl.y + tr.y + br.y + bl.y) / 4, width, height, angle: Math.atan2(tr.y - tl.y, tr.x - tl.x) };
  }
  if (f.frame) return { cx: f.frame.left + f.frame.width / 2, cy: f.frame.top + f.frame.height / 2, width: f.frame.width, height: f.frame.height, angle: null };
  return null;
}

/** Page skew in radians: median top-edge angle of long fragments (0 without corner points). */
export function estimateSkew(fragments: OcrFragment[]): number {
  const angles = fragments
    .map(box)
    .filter((b): b is NonNullable<ReturnType<typeof box>> => !!b && b.angle !== null && b.width > SKEW_MIN_ASPECT * b.height)
    .map((b) => b.angle!);
  const skew = median(angles);
  return Math.abs(skew) <= MAX_SKEW_RAD ? skew : 0;
}

/**
 * Printed rows, top to bottom. Fragments are clustered by the vertical centre of their de-skewed box
 * (tolerance 0.6 × median line height) and joined left to right. A quantity fragment that shares a row with
 * other text is split into its own row directly above. Without geometry, fragment order is kept.
 */
export function buildRows(fragments: OcrFragment[]): string[] {
  const texts = fragments.map((f) => f.text.trim()).filter(Boolean);
  const boxes = fragments.map(box);
  if (!texts.length) return [];
  if (boxes.some((b) => !b)) return texts;

  const skew = estimateSkew(fragments);
  const cos = Math.cos(skew);
  const sin = Math.sin(skew);
  const placed: Placed[] = [];
  fragments.forEach((f, i) => {
    const text = f.text.trim();
    const b = boxes[i]!;
    if (!text) return;
    // Rotate by −skew so rows are horizontal.
    const x = b.cx * cos + b.cy * sin;
    const y = -b.cx * sin + b.cy * cos;
    placed.push({ text, x, y, left: x - b.width / 2, right: x + b.width / 2, height: b.height, charWidth: b.width / Math.max(1, text.length) });
  });

  const lineHeight = median(placed.map((p) => p.height)) || 1;
  const tolerance = ROW_TOLERANCE * lineHeight;
  const charWidth = median(placed.map((p) => p.charWidth)) || 1;

  // Cluster top to bottom; each fragment joins the nearest row whose running centre is within tolerance.
  const rows: { y: number; items: Placed[] }[] = [];
  for (const p of [...placed].sort((a, b) => a.y - b.y)) {
    let best: (typeof rows)[number] | null = null;
    for (let i = rows.length - 1; i >= 0 && i >= rows.length - 3; i -= 1) {
      const d = Math.abs(rows[i].y - p.y);
      if (d <= tolerance && (!best || d < Math.abs(best.y - p.y))) best = rows[i];
    }
    if (best) {
      best.items.push(p);
      best.y = best.items.reduce((s, it) => s + it.y, 0) / best.items.length;
    } else {
      rows.push({ y: p.y, items: [p] });
    }
  }

  const join = (items: Placed[]) =>
    [...items]
      .sort((a, b) => a.left - b.left)
      .reduce((line, it, i, all) => {
        if (i === 0) return it.text;
        const gap = it.left - all[i - 1].right;
        return line + (gap > COLUMN_GAP_CHARS * charWidth ? '  ' : ' ') + it.text;
      }, '');

  const out: string[] = [];
  for (const row of rows.sort((a, b) => a.y - b.y)) {
    const quantity = row.items.filter((p) => QUANTITY_LINE.test(p.text));
    const rest = row.items.filter((p) => !QUANTITY_LINE.test(p.text));
    if (quantity.length && rest.length) out.push(join(quantity), join(rest));
    else out.push(join(row.items));
  }
  return out;
}

// ─── Tiling tall receipts ────────────────────────────────────────────────────────────────────────────────

export type Tile = { top: number; height: number };

// Taller than 3:1 → OCR in horizontal tiles (~2:1 each) with 20% overlap, so small text stays readable.
const TILE_ABOVE_ASPECT = 3;
const TILE_ASPECT = 2;
const TILE_OVERLAP = 0.2;

/** Horizontal tiles covering the image top to bottom; one tile when it isn't taller than 3:1. */
export function planTiles(width: number, height: number): Tile[] {
  if (width <= 0 || height / width <= TILE_ABOVE_ASPECT) return [{ top: 0, height }];
  const tileHeight = Math.round(width * TILE_ASPECT);
  const step = Math.round(tileHeight * (1 - TILE_OVERLAP));
  const tiles: Tile[] = [];
  for (let top = 0; top + tileHeight < height; top += step) tiles.push({ top, height: tileHeight });
  tiles.push({ top: height - tileHeight, height: tileHeight });
  return tiles;
}

function shift(f: OcrFragment, dy: number): OcrFragment {
  return {
    text: f.text,
    frame: f.frame && { ...f.frame, top: f.frame.top + dy },
    cornerPoints: f.cornerPoints?.map((p) => ({ x: p.x, y: p.y + dy })),
  };
}

/**
 * Brings each tile's fragments into whole-image coordinates. A fragment touching an inner cut edge may be
 * clipped; the overlapping neighbour has it whole, so it's dropped here. Fragments read twice in an overlap
 * (same text, same place) are kept once.
 */
export function mergeTiles(tiles: { tile: Tile; fragments: OcrFragment[] }[], imageHeight: number): OcrFragment[] {
  const all = tiles.flatMap(({ fragments }) => fragments);
  const lineHeight = median(all.map(box).filter((b) => !!b).map((b) => b!.height)) || 1;
  const edge = Math.max(2, 0.3 * lineHeight);

  const kept: OcrFragment[] = [];
  for (const { tile, fragments } of tiles) {
    const innerTop = tile.top > 0;
    const innerBottom = tile.top + tile.height < imageHeight;
    for (const f of fragments) {
      const b = box(f);
      if (b && ((innerTop && b.cy - b.height / 2 < edge) || (innerBottom && b.cy + b.height / 2 > tile.height - edge))) continue;
      const moved = shift(f, tile.top);
      const mb = box(moved);
      const duplicate = kept.some((k) => {
        const kb = box(k);
        return k.text.trim() === moved.text.trim() && kb && mb && Math.abs(kb.cy - mb.cy) < ROW_TOLERANCE * lineHeight && Math.abs(kb.cx - mb.cx) < lineHeight;
      });
      if (!duplicate) kept.push(moved);
    }
  }
  return kept;
}
