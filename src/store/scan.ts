import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { getDb } from '@/db';
import { getMerchantRule } from '@/db/merchant-rules';
import { getReceipt } from '@/db/receipts';
import { i18n } from '@/i18n';
import { toISODate } from '@/lib/dates';
import type { GibQr } from '@/lib/gib-qr';
import { categoryFromRule } from '@/lib/merchant-rules';
import { fitForParser, isReadable } from '@/lib/ocr-text';
import { mergeGibQr, normalizeParsedReceipt } from '@/lib/receipt-normalize';
import { issueFromFailure } from '@/lib/parse-issue';
import { unparsedConfidence } from '@/lib/review-flags';
import { applyGibQr, pendingScan } from '@/lib/scan-draft';
import type { Receipt, ReceiptInput } from '@/lib/types';
import { findGibQr, importPhotos, scanDocument, type Capture } from '@/services/capture';
import { saveReceiptImages } from '@/services/images';
import { recognizePages } from '@/services/ocr';
import { isRetryable, parseReceiptText } from '@/services/parser-client';
import { CACHE_KEYS } from '@/services/kv-keys';
import { claimParse, releaseParse } from '@/services/parse-lease';
import { enqueueReceipt, type QueueOutcome } from '@/services/scan-queue';

import { useReceipts } from './receipts';
import { useSettings } from './settings';

function today() {
  return toISODate(new Date());
}

/**
 * Captured pages → receipt (docs/SPEC.md §1): the `processing` row appears immediately; images are
 * stored; a GİB QR fills what it carries; on-device OCR reads the text. Readable text is queued for
 * parse-receipt (retried offline); unreadable pages without a QR end as `failed`.
 */
export async function ingestPages(pages: string[], source: 'scan' | 'import', retakeId?: string): Promise<string> {
  const { save } = useReceipts.getState();
  const draft = pendingScan(source, today(), useSettings.getState().homeCurrency);
  const id = await save(draft, retakeId);
  try {
    const imagePaths = await saveReceiptImages(id, pages);
    const qr = await findGibQr(pages);
    const withImages: ReceiptInput = qr ? applyGibQr({ ...draft, imagePaths }, qr) : { ...draft, imagePaths };

    let text = '';
    try {
      text = await recognizePages(pages);
    } catch {
      text = '';
    }

    if (!isReadable(text)) {
      // A QR alone is still a usable receipt; otherwise ask for a retake or manual entry.
      await save(qr ? withImages : { ...withImages, status: 'failed' }, id);
      return id;
    }
    await save({ ...withImages, ocrText: text, status: 'queued' }, id);
    enqueueReceipt(id);
  } catch {
    await save({ ...draft, status: 'failed' }, id);
  }
  return id;
}

/**
 * Reads a receipt again from its stored OCR text — after the monthly quota resets, or once the backend is
 * fixed — without retaking the photo. The receipt goes back to `queued` and through the same queue.
 */
export async function readAgain(receiptId: string): Promise<void> {
  const receipt = await getReceipt(getDb(), receiptId);
  if (!receipt?.ocrText) return;
  await useReceipts.getState().save({ ...toInput(receipt), status: 'queued', parseIssue: null }, receiptId);
  enqueueReceipt(receiptId);
}

/** A receipt from a QR scanned on its own (no photo, so no OCR): the person adds the merchant. */
export async function ingestQr(qr: GibQr): Promise<string> {
  return useReceipts.getState().save(applyGibQr(pendingScan('scan', today(), useSettings.getState().homeCurrency), qr));
}

function qrFromReceipt(r: Receipt): GibQr {
  return {
    ettn: r.ettn,
    documentNumber: r.documentNumber,
    date: r.date,
    totalMinor: r.totalMinor,
    currency: r.currency,
    taxes: r.taxes,
    sellerTaxId: null,
    scenario: null,
    type: null,
  };
}

function toInput(r: Receipt): ReceiptInput {
  const { id: _id, merchantNormalized: _m, createdAt: _c, updatedAt: _u, ...input } = r;
  return input;
}

const QUOTA_NOTICE_KEY = CACHE_KEYS.quotaNoticeMonth;

/** The first time the free scans run out in a month, offer Pro; after that the review banner carries the offer. */
function offerProOnce() {
  const month = today().slice(0, 7);
  if (Storage.getItemSync(QUOTA_NOTICE_KEY) === month) return;
  Storage.setItemSync(QUOTA_NOTICE_KEY, month);
  router.push({ pathname: '/paywall', params: { feature: 'scans' } });
}

/**
 * Parses one queued receipt, at most once at a time and never again once parsed: a receipt already being
 * parsed (by any worker) is `in_flight`, one already parsed is `done` without calling the parser.
 */
export async function processQueuedReceipt(receiptId: string, attempt = 1): Promise<QueueOutcome> {
  const claim = claimParse(receiptId);
  if (!claim.ok) return claim.reason === 'done' ? 'done' : 'in_flight';
  let outcome: QueueOutcome = 'retry';
  try {
    outcome = await parseQueuedReceipt(receiptId, attempt);
    return outcome;
  } finally {
    // 'done' = parsed, or settled for manual entry: never send it again. Anything else frees it for the retry.
    releaseParse(receiptId, outcome === 'done');
  }
}

/** One parse attempt. `retry` keeps it queued with backoff (offline, provider busy). */
async function parseQueuedReceipt(receiptId: string, attempt: number): Promise<QueueOutcome> {
  const db = getDb();
  const receipt = await getReceipt(db, receiptId);
  // Deleted, or already filled in by the person while it waited.
  if (!receipt || receipt.status !== 'queued' || !receipt.ocrText) return 'done';

  const locale = getLocales()[0];
  const result = await parseReceiptText({
    text: fitForParser(receipt.ocrText),
    locale: locale?.languageTag ?? i18n.language,
    deviceCurrency: useSettings.getState().homeCurrency,
    countryHint: locale?.regionCode ?? null,
    receiptRef: receiptId,
    attempt,
  });

  const { save } = useReceipts.getState();
  // The person may have edited it meanwhile; only fill it if it's still waiting.
  const current = await getReceipt(db, receiptId);
  if (!current || current.status !== 'queued') return 'done';

  if (!result.ok) {
    if (isRetryable(result.error)) return result.retryAfterMs ? { retryAfterMs: result.retryAfterMs } : 'retry';
    if (result.error === 'quota_exceeded') offerProOnce();
    // Say why nothing was filled in: the review screen shows it (a silent empty form looks like a bug).
    await save(
      { ...toInput(current), status: 'needs_review', fieldConfidence: unparsedConfidence(current.fieldConfidence), parseIssue: issueFromFailure(result.error) },
      receiptId,
    );
    return 'done';
  }

  let normalized = normalizeParsedReceipt(result.receipt, {
    today: today(),
    deviceCurrency: useSettings.getState().homeCurrency,
    locale: i18n.language,
  });
  if (current.source === 'gib_qr') normalized = mergeGibQr(normalized, qrFromReceipt(current));

  const rule = categoryFromRule(await getMerchantRule(db, normalized.merchant), normalized.category);
  const { fieldConfidence, ...fields } = normalized;
  await save(
    {
      ...toInput(current),
      ...fields,
      category: rule.category,
      status: 'needs_review',
      parseIssue: null,
      fieldConfidence: rule.fromRule ? { ...fieldConfidence, category: { confidence: 'high' } } : fieldConfidence,
    },
    receiptId,
  );
  return 'done';
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
