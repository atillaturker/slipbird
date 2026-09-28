import { create } from 'zustand';

import { getDb } from '@/db';
import { deleteBudget, listBudgets, saveBudget } from '@/db/budgets';
import type { Budget } from '@/lib/spending';
import { ensureNotificationPermission } from '@/services/notifications';
import type { Category } from '@/theme';

import { useSettings } from './settings';

type BudgetsState = {
  budgets: Budget[];
  loaded: boolean;
  refresh: () => Promise<void>;
  setBudget: (category: Category, limitMinor: number) => Promise<void>;
  removeBudget: (category: Category) => Promise<void>;
};

export const useBudgets = create<BudgetsState>((set, get) => ({
  budgets: [],
  loaded: false,
  refresh: async () => {
    set({ budgets: await listBudgets(getDb()), loaded: true });
  },
  setBudget: async (category, limitMinor) => {
    const first = get().budgets.length === 0;
    await saveBudget(getDb(), { category, limitMinor, currency: useSettings.getState().homeCurrency, active: true });
    await get().refresh();
    // Ask for notifications when they first matter: the first budget.
    if (first && useSettings.getState().budgetAlerts) await ensureNotificationPermission();
  },
  removeBudget: async (category) => {
    await deleteBudget(getDb(), category);
    await get().refresh();
  },
}));
