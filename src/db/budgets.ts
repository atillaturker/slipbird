import type { SQLiteDatabase } from 'expo-sqlite';

import type { Budget } from '@/lib/spending';

import { toCategory } from './mappers';

export async function listBudgets(db: SQLiteDatabase): Promise<Budget[]> {
  const rows = await db.getAllAsync<{ category: string; limitMinor: number; currency: string; active: number }>(
    'SELECT category, limitMinor, currency, active FROM budgets',
  );
  return rows.map((r) => ({ category: toCategory(r.category), limitMinor: r.limitMinor, currency: r.currency, active: r.active === 1 }));
}

/** A monthly limit for one category, in the home currency. */
export async function saveBudget(db: SQLiteDatabase, budget: Budget): Promise<void> {
  await db.runAsync(
    `INSERT INTO budgets (category, limitMinor, currency, active) VALUES (?, ?, ?, ?)
     ON CONFLICT (category) DO UPDATE SET limitMinor = excluded.limitMinor, currency = excluded.currency, active = excluded.active`,
    [budget.category, budget.limitMinor, budget.currency, budget.active ? 1 : 0],
  );
}

export async function deleteBudget(db: SQLiteDatabase, category: string): Promise<void> {
  await db.runAsync('DELETE FROM budgets WHERE category = ?', category);
}
