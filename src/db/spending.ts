import type { SQLiteDatabase } from 'expo-sqlite';

import type { SpendRow } from '@/lib/spending';
import type { ReceiptSummary } from '@/lib/types';

import { rowToSummary, type ReceiptSummaryRow } from './mappers';

export type SpendReceipt = ReceiptSummary & SpendRow;

/**
 * Receipts dated from `fromDate` to `toDate` inclusive (YYYY-MM-DD), newest first, with what spending and the Home lists
 * need. Every status is returned: spending counts saved ones, Home lists the rest as needing review.
 */
export async function listSpendRows(db: SQLiteDatabase, fromDate: string, toDate = '9999-12-31'): Promise<SpendReceipt[]> {
  const rows = await db.getAllAsync<ReceiptSummaryRow & { merchantNormalized: string | null }>(
    `SELECT id, merchant, merchantDisplay, merchantNormalized, documentType, date, time, totalMinor, currency, category,
            source, status, imagePaths, fieldConfidence
     FROM receipts WHERE date >= ? AND date <= ? ORDER BY date DESC, time DESC, createdAt DESC`,
    [fromDate, toDate],
  );
  return rows.map((r) => ({ ...rowToSummary(r), merchantNormalized: r.merchantNormalized }));
}
