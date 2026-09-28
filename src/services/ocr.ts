import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { buildRows, mergeTiles, planTiles, type OcrFragment, type Tile } from '@/lib/ocr-lines';
import { joinPages } from '@/lib/ocr-text';

function asUri(page: string): string {
  return page.startsWith('/') ? `file://${page}` : page;
}

/** ML Kit lines with their boxes (block order is layout order, which splits names from prices — ignored). */
async function recognize(uri: string): Promise<OcrFragment[]> {
  const result = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
  return result.blocks.flatMap((block) => block.lines.map((line) => ({ text: line.text, frame: line.frame, cornerPoints: line.cornerPoints })));
}

/** OCR of one horizontal strip of the page, cropped at full resolution; the temporary file is removed. */
async function recognizeTile(uri: string, width: number, tile: Tile): Promise<OcrFragment[]> {
  const cropped = await ImageManipulator.manipulate(uri).crop({ originX: 0, originY: tile.top, width, height: tile.height }).renderAsync();
  const saved = await cropped.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
  try {
    return await recognize(saved.uri);
  } finally {
    try {
      new File(saved.uri).delete();
    } catch {
      // A leftover file in the cache directory is harmless.
    }
  }
}

/**
 * On-device OCR with ML Kit (Latin script covers English and Turkish), on the full-resolution capture —
 * downscaling is only for storage (images.ts). Pages taller than 3:1 are read in overlapping tiles so small
 * print stays legible. The result is rebuilt into printed rows (item and price on one line) by ocr-lines.ts.
 * Images never leave the device; only this text does (to parse-receipt).
 */
export async function recognizePages(pages: string[]): Promise<string> {
  const texts: string[] = [];
  for (const page of pages) {
    const uri = asUri(page);
    const image = await ImageManipulator.manipulate(uri).renderAsync();
    const tiles = planTiles(image.width, image.height);
    let fragments: OcrFragment[];
    if (tiles.length === 1) {
      fragments = await recognize(uri);
    } else {
      // One tile at a time: full-resolution crops of a long receipt are large.
      const read: { tile: Tile; fragments: OcrFragment[] }[] = [];
      for (const tile of tiles) read.push({ tile, fragments: await recognizeTile(uri, image.width, tile) });
      fragments = mergeTiles(read, image.height);
    }
    texts.push(buildRows(fragments).join('\n'));
  }
  return joinPages(texts);
}
