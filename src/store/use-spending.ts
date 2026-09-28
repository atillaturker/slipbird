import { useEffect, useMemo } from 'react';

import {
  averageReceipt,
  categoryTotals,
  countedSpend,
  linkedInfoSlips,
  monthlyTotals,
  pendingCount,
  periodRange,
  periodSummary,
  topMerchants,
  totalIn,
  type Period,
} from '@/lib/spending';
import type { Category } from '@/theme';

import { checkBudgetAlerts } from './budget-alerts';
import { useBudgets } from './budgets';
import { useReceipts } from './receipts';
import { useSettings } from './settings';
import { useSpending } from './spending';

/** Keeps spending in step with receipts (any save or delete) and the home currency. */
export function useSpendingSync() {
  const revision = useReceipts((s) => s.revision);
  const home = useSettings((s) => s.homeCurrency);
  const refresh = useSpending((s) => s.refresh);
  const refreshBudgets = useBudgets((s) => s.refresh);
  useEffect(() => {
    void Promise.all([refresh(), refreshBudgets()]).then(checkBudgetAlerts);
  }, [revision, home, refresh, refreshBudgets]);
}

/** Setting or removing a budget, then sending any alert that is now due. */
export function useBudgetActions() {
  const setBudget = useBudgets((s) => s.setBudget);
  const removeBudget = useBudgets((s) => s.removeBudget);
  return {
    setBudget: async (category: Category, limitMinor: number) => {
      await setBudget(category, limitMinor);
      await checkBudgetAlerts();
    },
    removeBudget,
  };
}

/** Everything Home and Insights show for a period, in the home currency. */
export function useSpendingView(period: Period) {
  useSpendingSync();
  const { rows, rates, loaded } = useSpending();
  const home = useSettings((s) => s.homeCurrency);

  return useMemo(() => {
    const today = new Date();
    const items = countedSpend(rows, rates, home);
    const range = periodRange(period, today);
    const month = periodRange('month', today);
    const spentThisMonth: Partial<Record<Category, number>> = Object.fromEntries(categoryTotals(items, month).map((c) => [c.category, c.totalMinor]));
    return {
      loaded,
      home,
      hasAny: rows.length > 0,
      summary: periodSummary(items, period, today),
      categories: categoryTotals(items, range),
      monthly: monthlyTotals(items, today),
      merchants: topMerchants(items, range),
      average: averageReceipt(items, range),
      unconverted: totalIn(items, range).unconverted,
      pending: pendingCount(rows),
      needsReview: rows.filter((r) => r.status === 'needs_review' || r.status === 'queued' || r.status === 'failed'),
      recent: rows.filter((r) => r.status === 'saved').slice(0, 5),
      linkedInfoSlips: linkedInfoSlips(rows),
      spentThisMonth,
    };
  }, [rows, rates, home, period, loaded]);
}
