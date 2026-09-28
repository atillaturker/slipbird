import Storage from 'expo-sqlite/kv-store';

import { i18n } from '@/i18n';
import { formatMoney } from '@/lib/money';
import { budgetAlertsDue, categoryTotals, countedSpend, periodRange } from '@/lib/spending';
import { notifyNow } from '@/services/notifications';
import type { Category } from '@/theme';

import { useBudgets } from './budgets';
import { useSettings } from './settings';
import { useSpending } from './spending';

const SENT_KEY = 'budgetAlertsSent';

/**
 * Sends the budget alerts that are due (80% and 100%, once each per category per month) and remembers them.
 * Runs after spending refreshes and after a budget changes. Does nothing when alerts are off.
 */
export async function checkBudgetAlerts(): Promise<void> {
  const { budgetAlerts, homeCurrency } = useSettings.getState();
  if (!budgetAlerts) return;
  if (!useBudgets.getState().loaded) await useBudgets.getState().refresh();
  const budgets = useBudgets.getState().budgets.filter((b) => b.currency === homeCurrency);
  if (!budgets.length) return;

  const { rows, rates } = useSpending.getState();
  const month = periodRange('month', new Date());
  const spent: Partial<Record<Category, number>> = Object.fromEntries(
    categoryTotals(countedSpend(rows, rates, homeCurrency), month).map((c) => [c.category, c.totalMinor]),
  );
  const monthKey = month.start.slice(0, 7);
  let sent: string[] = [];
  try {
    sent = (JSON.parse(Storage.getItemSync(SENT_KEY) ?? '[]') as string[]).filter((k) => k.startsWith(monthKey));
  } catch {
    sent = [];
  }
  const { send, markSent } = budgetAlertsDue(budgets, spent, monthKey, new Set(sent));
  if (!markSent.length) return;
  Storage.setItemSync(SENT_KEY, JSON.stringify([...sent, ...markSent]));

  const money = (minor: number) => formatMoney(minor, homeCurrency, i18n.language);
  for (const alert of send) {
    const budget = budgets.find((b) => b.category === alert.category)!;
    const category = i18n.t(`category.${alert.category}`);
    const spentMinor = spent[alert.category] ?? 0;
    if (alert.threshold === 100) {
      await notifyNow(
        i18n.t('budgetAlerts.overTitle', { category }),
        i18n.t('budgetAlerts.overBody', { spent: money(spentMinor), over: money(Math.max(0, spentMinor - budget.limitMinor)) }),
      );
    } else {
      await notifyNow(i18n.t('budgetAlerts.nearTitle', { category }), i18n.t('budgetAlerts.nearBody', { spent: money(spentMinor), limit: money(budget.limitMinor) }));
    }
  }
}
