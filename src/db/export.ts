import type { SQLiteDatabase } from 'expo-sqlite';

import type { Receipt } from '@/lib/types';
import type { DateRange } from '@/lib/spending';

import { rowToReceipt, type ItemRow, type ReceiptRow, type TaxRow } from './mappers';

const IN_RANGE = "status = 'saved' AND date >= ? AND date <= ?";

/**
 * Saved receipts in a date range with their items and taxes, oldest first, for CSV export. Three queries
 * regardless of how many receipts (items and taxes come back for the whole range and are grouped here).
 */
export async function listReceiptsForExport(db: SQLiteDatabase, range: DateRange): Promise<Receipt[]> {
  const params = [range.start, range.end];
  const rows = await db.getAllAsync<ReceiptRow>(`SELECT * FROM receipts WHERE ${IN_RANGE} ORDER BY date ASC, time ASC, createdAt ASC`, params);
  if (rows.length === 0) return [];

  const items = await db.getAllAsync<ItemRow & { receiptId: string }>(
    `SELECT receiptId, name, qty, unit, amountMinor FROM receipt_items WHERE receiptId IN (SELECT id FROM receipts WHERE ${IN_RANGE}) ORDER BY receiptId, position`,
    params,
  );
  const taxes = await db.getAllAsync<TaxRow & { receiptId: string }>(
    `SELECT receiptId, rate, amountMinor FROM receipt_taxes WHERE receiptId IN (SELECT id FROM receipts WHERE ${IN_RANGE}) ORDER BY receiptId, rate`,
    params,
  );

  const group = <T extends { receiptId: string }>(list: T[]) => {
    const map = new Map<string, T[]>();
    for (const entry of list) map.set(entry.receiptId, [...(map.get(entry.receiptId) ?? []), entry]);
    return map;
  };
  const itemsByReceipt = group(items);
  const taxesByReceipt = group(taxes);
  return rows.map((row) => rowToReceipt(row, itemsByReceipt.get(row.id) ?? [], taxesByReceipt.get(row.id) ?? []));
}
