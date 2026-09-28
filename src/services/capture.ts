import { scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import DocumentScanner, { ResponseType, ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';

import { parseGibQr, type GibQr } from '@/lib/gib-qr';
import { limitPages, MAX_PAGES } from '@/lib/image-paths';

export type Capture = { pages: string[]; dropped: boolean };

/**
 * Opens the native document scanner (edge detection, crop, perspective fix).
 * Android caps pages at 3; iOS can't, so extra pages are dropped here. Null when cancelled.
 */
export async function scanDocument(): Promise<Capture | null> {
  const result = await DocumentScanner.scanDocument({
    maxNumDocuments: MAX_PAGES,
    croppedImageQuality: 100, // full quality here; images.ts compresses once
    responseType: ResponseType.ImageFilePath,
  });
  if (result.status === ScanDocumentResponseStatus.Cancel || !result.scannedImages?.length) return null;
  return limitPages(result.scannedImages);
}

/** Picks up to 3 photos from the library. Null when cancelled. */
export async function importPhotos(): Promise<Capture | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: MAX_PAGES,
    quality: 1,
  });
  if (result.canceled || !result.assets.length) return null;
  return limitPages(result.assets.map((a) => a.uri));
}

/**
 * Looks for a GİB invoice QR on the captured pages. Detection on a whole-receipt photo is
 * best-effort (Android's detector prefers the QR to fill the frame); "Scan QR code" is the
 * reliable path. Any read failure just means "no QR".
 */
export async function findGibQr(pages: string[]): Promise<GibQr | null> {
  for (const page of pages) {
    try {
      const uri = page.startsWith('/') ? `file://${page}` : page;
      for (const code of await scanFromURLAsync(uri, ['qr'])) {
        const qr = parseGibQr(code.data);
        if (qr) return qr;
      }
    } catch {
      // Unreadable image or unsupported format: treat as no QR.
    }
  }
  return null;
}
