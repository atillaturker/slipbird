import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { JPEG_QUALITY, longEdgeResize, PAGE_LONG_EDGE, pagePath, receiptDir, THUMB_LONG_EDGE, thumbnailPath } from '@/lib/image-paths';

/** Absolute URI for a stored relative image path (see src/lib/image-paths.ts). */
export function imageUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

/** Scanner/picker results may be bare paths; the manipulator wants URIs. */
function asUri(pathOrUri: string): string {
  return pathOrUri.startsWith('/') ? `file://${pathOrUri}` : pathOrUri;
}

async function writeJpeg(source: string, maxEdge: number, relativeDest: string): Promise<void> {
  const original = await ImageManipulator.manipulate(asUri(source)).renderAsync();
  const resize = longEdgeResize(original.width, original.height, maxEdge);
  const image = resize ? await ImageManipulator.manipulate(original).resize(resize).renderAsync() : original;
  const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  const dest = new File(Paths.document, relativeDest);
  if (dest.exists) dest.delete();
  await new File(result.uri).move(dest);
}

/**
 * Saves captured pages as JPEG (long edge 1600, quality 0.7) plus a 200px thumbnail of page 1,
 * replacing any images the receipt had (retake). Returns the relative page paths.
 * Images never leave the device.
 */
export async function saveReceiptImages(receiptId: string, sources: string[]): Promise<string[]> {
  const dir = new Directory(Paths.document, receiptDir(receiptId));
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });

  const paths: string[] = [];
  for (const [i, source] of sources.entries()) {
    const path = pagePath(receiptId, i + 1);
    await writeJpeg(source, PAGE_LONG_EDGE, path);
    paths.push(path);
  }
  if (sources[0]) await writeJpeg(sources[0], THUMB_LONG_EDGE, thumbnailPath(receiptId));
  return paths;
}

/** URI of the list thumbnail, when the receipt has images. */
export function thumbnailUri(receiptId: string, imagePaths: string[]): string | undefined {
  return imagePaths.length ? imageUri(thumbnailPath(receiptId)) : undefined;
}

export function deleteReceiptImages(receiptId: string): void {
  const dir = new Directory(Paths.document, receiptDir(receiptId));
  if (dir.exists) dir.delete();
}
