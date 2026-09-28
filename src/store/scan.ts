import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { toISODate } from '@/lib/dates';
import type { GibQr } from '@/lib/gib-qr';
import { applyGibQr, awaitingReview, pendingScan } from '@/lib/scan-draft';
import { findGibQr, importPhotos, scanDocument, type Capture } from '@/services/capture';
import { saveReceiptImages } from '@/services/images';

import { useReceipts } from './receipts';
import { useSettings } from './settings';

/**
 * Turns captured pages into a receipt: the `processing` row appears immediately, then images are
 * stored and the pages checked for a GİB QR. Ends as `needs_review` (the person fills in what's
 * missing until OCR arrives in M4) or `failed`. With `retakeId`, replaces that receipt's pages.
 */
export async function ingestPages(pages: string[], source: 'scan' | 'import', retakeId?: string): Promise<string> {
  const { save } = useReceipts.getState();
  const draft = pendingScan(source, toISODate(new Date()), useSettings.getState().homeCurrency);
  const id = await save(draft, retakeId);
  try {
    const imagePaths = await saveReceiptImages(id, pages);
    const qr = await findGibQr(pages);
    const withImages = { ...draft, imagePaths };
    await save(qr ? applyGibQr(withImages, qr) : awaitingReview(draft, imagePaths), id);
  } catch {
    await save({ ...draft, status: 'failed' }, id);
  }
  return id;
}

/** A receipt from a QR scanned on its own (no photo). Returns its id. */
export async function ingestQr(qr: GibQr): Promise<string> {
  const draft = pendingScan('scan', toISODate(new Date()), useSettings.getState().homeCurrency);
  return useReceipts.getState().save(applyGibQr(draft, qr));
}

/** Scan actions for the scan button, its long-press menu, and the failed-receipt retake. */
export function useScanActions() {
  const { t } = useTranslation();

  const handle = async (capture: () => Promise<Capture | null>, source: 'scan' | 'import', retakeId?: string) => {
    let result: Capture | null;
    try {
      result = await capture();
    } catch {
      Alert.alert(t(source === 'scan' ? 'scan.scannerFailed' : 'scan.importFailed'));
      return;
    }
    if (!result) return;
    if (result.dropped) Alert.alert(t('scan.pagesDropped'));
    router.navigate('/receipts');
    void ingestPages(result.pages, source, retakeId);
  };

  return {
    scan: () => handle(scanDocument, 'scan'),
    importPhotos: () => handle(importPhotos, 'import'),
    scanQr: () => router.push('/scan/capture'),
    retake: (receiptId: string) => handle(scanDocument, 'scan', receiptId),
  };
}
