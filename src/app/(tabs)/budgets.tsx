import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Chip, EmptyState } from '@/components';
import { BudgetItem } from '@/components/BudgetItem';
import { BudgetSheet } from '@/components/BudgetSheet';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { formatMoney } from '@/lib/money';
import { useBudgets } from '@/store/budgets';
import { useBudgetActions, useSpendingView } from '@/store/use-spending';
import { categoryOrder, useTheme, type Category } from '@/theme';

export default function BudgetsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const view = useSpendingView('month');
  const budgets = useBudgets((s) => s.budgets);
  const { setBudget, removeBudget } = useBudgetActions();
  const [editing, setEditing] = useState<Category | null>(null);
  const money = (minor: number) => formatMoney(minor, view.home, i18n.language);

  const active = budgets.filter((b) => b.currency === view.home);
  const paused = budgets.filter((b) => b.currency !== view.home);
  const withBudget = new Set(budgets.map((b) => b.category));
  const available = categoryOrder.filter((c) => !withBudget.has(c));
  const editingBudget = editing ? budgets.find((b) => b.category === editing) : undefined;

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
                  onPress={() => setEditing(b.category)}
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
              <Chip key={c} category={c} onPress={() => setEditing(c)}>
                {t(`category.${c}`)}
              </Chip>
            ))}
          </View>
        </Section>
      )}

      {editing && (
        <BudgetSheet
          key={editing}
          category={editing}
          limitMinor={editingBudget && editingBudget.currency === view.home ? editingBudget.limitMinor : null}
          currency={view.home}
          onClose={() => setEditing(null)}
          onSave={(limitMinor) => {
            const category = editing;
            setEditing(null);
            void setBudget(category, limitMinor);
          }}
          onRemove={() => {
            const category = editing;
            setEditing(null);
            void removeBudget(category);
          }}
        />
      )}
    </Screen>
  );
}
