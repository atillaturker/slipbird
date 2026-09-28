import type { SQLiteDatabase } from 'expo-sqlite';

/** Deletes every receipt (with items and taxes), budget and merchant rule. Settings live elsewhere and are kept. */
export async function deleteAllData(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM receipt_items');
    await txn.runAsync('DELETE FROM receipt_taxes');
    await txn.runAsync('DELETE FROM receipts');
    await txn.runAsync('DELETE FROM budgets');
    await txn.runAsync('DELETE FROM merchant_rules');
  });
}
