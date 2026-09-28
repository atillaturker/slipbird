import type { SQLiteDatabase } from 'expo-sqlite';

import { normalizeMerchant } from '@/lib/merchant-rules';
import type { Category } from '@/theme';

import { toCategory } from './mappers';

/** The category the person last saved for this merchant, if any. */
export async function getMerchantRule(db: SQLiteDatabase, merchant: string | null): Promise<Category | null> {
  const key = normalizeMerchant(merchant);
  if (!key) return null;
  const row = await db.getFirstAsync<{ category: string }>('SELECT category FROM merchant_rules WHERE merchantNormalized = ?', key);
  return row ? toCategory(row.category) : null;
}

/** Remembers `merchant → category` when the person saves a receipt (docs/SPEC.md §1.6). */
export async function saveMerchantRule(db: SQLiteDatabase, merchant: string | null, category: Category): Promise<void> {
  const key = normalizeMerchant(merchant);
  if (!key) return;
  await db.runAsync(
    `INSERT INTO merchant_rules (merchantNormalized, category, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT (merchantNormalized) DO UPDATE SET category = excluded.category, updatedAt = excluded.updatedAt`,
    [key, category, new Date().toISOString()],
  );
}
