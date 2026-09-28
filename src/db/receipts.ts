import type { SQLiteDatabase } from 'expo-sqlite';

import { createId } from '@/lib/id';
import { buildSearchText, likePattern } from '@/lib/search';
import type { Receipt, ReceiptInput, ReceiptSummary } from '@/lib/types';
import type { Category } from '@/theme';

import { rowToReceipt, rowToSummary, type ItemRow, type ReceiptRow, type ReceiptSummaryRow, type TaxRow } from './mappers';

const SUMMARY_COLUMNS = 'id, merchant, date, time, totalMinor, currency, category, source, status, imagePaths';
const ORDER = 'ORDER BY date DESC, time DESC, createdAt DESC';

export type ReceiptFilter = {
  query?: string;
  category?: Category | null;
};

export async function listReceipts(db: SQLiteDatabase, filter: ReceiptFilter = {}): Promise<ReceiptSummary[]> {
  const where: string[] = [];
  const params: string[] = [];
  if (filter.query?.trim()) {
    where.push("searchText LIKE ? ESCAPE '\\'");
    params.push(likePattern(filter.query));
  }
  if (filter.category) {
    where.push('category = ?');
    params.push(filter.category);
  }
  const sql = `SELECT ${SUMMARY_COLUMNS} FROM receipts ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ${ORDER}`;
  const rows = await db.getAllAsync<ReceiptSummaryRow>(sql, params);
  return rows.map(rowToSummary);
}

export async function getReceipt(db: SQLiteDatabase, id: string): Promise<Receipt | null> {
  const row = await db.getFirstAsync<ReceiptRow>('SELECT * FROM receipts WHERE id = ?', id);
  if (!row) return null;
  const items = await db.getAllAsync<ItemRow>('SELECT name, qty, amountMinor FROM receipt_items WHERE receiptId = ? ORDER BY position', id);
  const taxes = await db.getAllAsync<TaxRow>('SELECT rate, amountMinor FROM receipt_taxes WHERE receiptId = ? ORDER BY rate', id);
  return rowToReceipt(row, items, taxes);
}

/** Inserts a new receipt, or replaces an existing one (with its items and taxes) when `id` is given. Returns the id. */
export async function saveReceipt(db: SQLiteDatabase, input: ReceiptInput, id?: string): Promise<string> {
  const receiptId = id ?? createId();
  const now = new Date().toISOString();
  const searchText = buildSearchText(input.merchant, input.note, input.items.map((i) => i.name));
  const values = [
    input.merchant,
    input.date,
    input.time,
    input.totalMinor,
    input.currency,
    input.category,
    input.paymentMethod,
    input.note,
    input.source,
    input.status,
    input.ocrText,
    input.ettn,
    input.documentNumber,
    JSON.stringify(input.imagePaths),
    searchText,
  ];

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (id) {
      await txn.runAsync(
        `UPDATE receipts SET merchant = ?, date = ?, time = ?, totalMinor = ?, currency = ?, category = ?, paymentMethod = ?, note = ?,
           source = ?, status = ?, ocrText = ?, ettn = ?, documentNumber = ?, imagePaths = ?, searchText = ?, updatedAt = ?
         WHERE id = ?`,
        [...values, now, receiptId],
      );
      await txn.runAsync('DELETE FROM receipt_items WHERE receiptId = ?', receiptId);
      await txn.runAsync('DELETE FROM receipt_taxes WHERE receiptId = ?', receiptId);
    } else {
      await txn.runAsync(
        `INSERT INTO receipts (merchant, date, time, totalMinor, currency, category, paymentMethod, note,
           source, status, ocrText, ettn, documentNumber, imagePaths, searchText, createdAt, updatedAt, id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...values, now, now, receiptId],
      );
    }
    for (const [position, item] of input.items.entries()) {
      await txn.runAsync('INSERT INTO receipt_items (id, receiptId, name, qty, amountMinor, position) VALUES (?, ?, ?, ?, ?, ?)', [
        createId(),
        receiptId,
        item.name,
        item.qty,
        item.amountMinor,
        position,
      ]);
    }
    for (const tax of input.taxes) {
      await txn.runAsync('INSERT INTO receipt_taxes (id, receiptId, rate, amountMinor) VALUES (?, ?, ?, ?)', [createId(), receiptId, tax.rate, tax.amountMinor]);
    }
  });

  return receiptId;
}

/** Deletes a receipt; items and taxes go with it (ON DELETE CASCADE). */
export async function deleteReceipt(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM receipts WHERE id = ?', id);
}

/** Whether any receipt exists at all (to tell "no receipts yet" from "no matches"). */
export async function hasReceipts(db: SQLiteDatabase): Promise<boolean> {
  return (await db.getFirstAsync<{ one: number }>('SELECT 1 AS one FROM receipts LIMIT 1')) !== null;
}
