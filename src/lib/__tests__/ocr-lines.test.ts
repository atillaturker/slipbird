import { cagriRows, longRows } from '../__fixtures__/parsed-receipts';
import { buildRows, estimateSkew, mergeTiles, planTiles, type OcrFragment, type Tile } from '../ocr-lines';

const LINE_HEIGHT = 30;
const ROW_PITCH = 42;
const CHAR_WIDTH = 14;
const PRICE_RIGHT_EDGE = 620;

/**
 * Lays printed rows out like a receipt photo and returns them the way ML Kit does: left-column fragments
 * (names) as one block, right-column fragments (prices) as another. Parts of a row are separated by two
 * spaces; the first goes left, the rest right-aligned. `skewDeg` rotates the page.
 */
function mlKitLike(rows: string[], skewDeg = 0): OcrFragment[] {
  const a = (skewDeg * Math.PI) / 180;
  const rot = (x: number, y: number) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
  const frag = (text: string, left: number, top: number): OcrFragment => {
    const w = text.length * CHAR_WIDTH;
    return { text, cornerPoints: [rot(left, top), rot(left + w, top), rot(left + w, top + LINE_HEIGHT), rot(left, top + LINE_HEIGHT)] };
  };
  const left: OcrFragment[] = [];
  const right: OcrFragment[] = [];
  rows.forEach((row, r) => {
    const [first, ...rest] = row.split('  ');
    const top = 40 + r * ROW_PITCH;
    left.push(frag(first, 20, top));
    if (rest.length) {
      const text = rest.join('  ');
      right.push(frag(text, PRICE_RIGHT_EDGE - text.length * CHAR_WIDTH, top));
    }
  });
  return [...left, ...right];
}

describe('buildRows', () => {
  it.each([0, 2, -1.5])('rebuilds the Çağrı receipt rows from separate name/price blocks (skew %s°)', (skew) => {
    expect(buildRows(mlKitLike(cagriRows, skew))).toEqual(cagriRows);
  });

  it('rebuilds all 34 items of the long receipt with prices on their lines', () => {
    const rows = buildRows(mlKitLike(longRows, 1));
    expect(rows).toEqual(longRows);
    // Weighed line: quantity row directly above its item, price on the item's row.
    expect(rows.slice(rows.indexOf('DOMATES KG  %1 *57,93') - 1, rows.indexOf('DOMATES KG  %1 *57,93') + 1)).toEqual(['1,452 KG X 39,90', 'DOMATES KG  %1 *57,93']);
  });

  it('keeps a quantity line as its own row directly above the item', () => {
    // Quantity fragment printed on the same visual row as the item (tight layout).
    const fragments: OcrFragment[] = [
      { text: 'MV.PATLICAN KEMER KG', frame: { left: 20, top: 100, width: 280, height: 30 } },
      { text: '2,238 KG X 59,99', frame: { left: 320, top: 102, width: 170, height: 30 } },
      { text: '%1 *134,26', frame: { left: 500, top: 101, width: 120, height: 30 } },
    ];
    expect(buildRows(fragments)).toEqual(['2,238 KG X 59,99', 'MV.PATLICAN KEMER KG  %1 *134,26']);
  });

  it('keeps fragment order when there is no geometry', () => {
    expect(buildRows([{ text: 'A' }, { text: ' ' }, { text: 'B' }])).toEqual(['A', 'B']);
  });

  it('measures skew from long fragments and ignores sideways photos', () => {
    expect(estimateSkew(mlKitLike(cagriRows, 2)) * (180 / Math.PI)).toBeCloseTo(2, 1);
    expect(estimateSkew(mlKitLike(cagriRows, 40))).toBe(0);
  });
});

describe('tiling tall receipts', () => {
  it('plans one tile up to 3:1 and overlapping ~2:1 tiles beyond', () => {
    expect(planTiles(1000, 3000)).toEqual([{ top: 0, height: 3000 }]);
    expect(planTiles(1000, 5000)).toEqual([
      { top: 0, height: 2000 },
      { top: 1600, height: 2000 },
      { top: 3000, height: 2000 },
    ]);
  });

  it('merges tiles: clipped fragments at cuts are dropped, overlap duplicates kept once', () => {
    const page = mlKitLike(longRows);
    const width = 700;
    const height = 40 + longRows.length * ROW_PITCH + 40;
    // A narrow page so it tiles: pretend the width is small relative to the height.
    const tiles: Tile[] = planTiles(width / 3, height).map((t) => ({ top: t.top, height: t.height }));
    expect(tiles.length).toBeGreaterThan(2);

    // What ML Kit would read in each tile: fragments inside it, in tile coordinates; a line crossing a cut
    // comes back partially (truncated text, box clipped to the edge).
    const perTile = tiles.map((tile) => ({
      tile,
      fragments: page.flatMap((f): OcrFragment[] => {
        const ys = f.cornerPoints!.map((p) => p.y);
        const top = Math.min(...ys);
        const bottom = Math.max(...ys);
        if (bottom <= tile.top || top >= tile.top + tile.height) return [];
        const clippedTop = Math.max(top, tile.top);
        const clippedBottom = Math.min(bottom, tile.top + tile.height);
        const clipped = clippedTop > top || clippedBottom < bottom;
        const text = clipped ? f.text.slice(0, Math.ceil(f.text.length / 2)) : f.text;
        const [tl, tr] = f.cornerPoints!;
        return [
          {
            text,
            cornerPoints: [
              { x: tl.x, y: clippedTop - tile.top },
              { x: tr.x, y: clippedTop - tile.top },
              { x: tr.x, y: clippedBottom - tile.top },
              { x: tl.x, y: clippedBottom - tile.top },
            ],
          },
        ];
      }),
    }));

    expect(buildRows(mergeTiles(perTile, height))).toEqual(longRows);
  });
});
