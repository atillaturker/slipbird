import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Chip, EmptyState } from '@/components';
import { BudgetItem } from '@/components/BudgetItem';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { formatMoney } from '@/lib/money';
import { canSetBudget } from '@/lib/pro';
import { useBudgets } from '@/store/budgets';
import { useProGate } from '@/store/pro';
import { useSpendingView } from '@/store/use-spending';
import { categoryOrder, useTheme, type Category } from '@/theme';

export default function BudgetsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const view = useSpendingView('month');
  const budgets = useBudgets((s) => s.budgets);
  const { isPro, requirePro } = useProGate();
  const editBudget = (category: Category) => {
    // Free includes budgets for 3 categories; a fourth needs Pro.
    if (!canSetBudget(budgets.map((b) => b.category), category, isPro) && !requirePro('moreBudgets')) return;
    router.push({ pathname: '/budget/[category]', params: { category } });
  };
  const money = (minor: number) => formatMoney(minor, view.home, i18n.language);

  const active = budgets.filter((b) => b.currency === view.home);
  const paused = budgets.filter((b) => b.currency !== view.home);
  const withBudget = new Set(budgets.map((b) => b.category));
  const available = categoryOrder.filter((c) => !withBudget.has(c));

  return (
    <Screen title={t('budgets.title')}>
      {active.length > 0 ? (
        <Section title={t('budgets.thisMonth')}>
          <View style={{ gap: space[2] }}>
            {active.map((b) => {
              const spent = view.spentThisMonth[b.category] ?? 0;
              return (
                <BudgetItem
                  key={b.category}
                  category={b.category}
                  spent={spent}
                  limit={b.limitMinor}
                  spentDisplay={money(spent)}
                  limitDisplay={money(b.limitMinor)}
                  leftDisplay={spent <= b.limitMinor ? t('budgets.left', { amount: money(b.limitMinor - spent) }) : undefined}
                  overDisplay={spent > b.limitMinor ? t('budgets.over', { amount: money(spent - b.limitMinor) }) : undefined}
                  onPress={() => editBudget(b.category)}
                />
              );
            })}
          </View>
        </Section>
      ) : (
        <EmptyState title={t('budgets.emptyTitle')} body={t('budgets.emptyBody')} />
      )}

      {paused.length > 0 && (
        <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('budgets.otherCurrency', { currency: paused[0].currency })}</Text>
      )}

      {available.length > 0 && (
        <Section title={t('budgets.addTitle')}>
          <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('budgets.addBody')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {available.map((c) => (
              <Chip key={c} category={c} onPress={() => editBudget(c)}>
                {t(`category.${c}`)}
              </Chip>
            ))}
          </View>
        </Section>
      )}

    </Screen>
  );
}
