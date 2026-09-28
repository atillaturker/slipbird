import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, TextField } from '@/components';
import { FormScreen } from '@/components/FormScreen';
import { currencySymbol, formatAmountInput, parseAmount } from '@/lib/money';
import { canSetBudget } from '@/lib/pro';
import { useBudgets } from '@/store/budgets';
import { useProGate } from '@/store/pro';
import { useSettings } from '@/store/settings';
import { useBudgetActions } from '@/store/use-spending';
import { categoryOrder } from '@/theme';

/** Set, change or remove the monthly budget for one category (amount in the home currency). */
export default function BudgetScreen() {
  const { category: param } = useLocalSearchParams<{ category: string }>();
  const { t, i18n } = useTranslation();
  const home = useSettings((s) => s.homeCurrency);
  const budgets = useBudgets((s) => s.budgets);
  const refresh = useBudgets((s) => s.refresh);
  const { setBudget, removeBudget } = useBudgetActions();
  const { isPro, requirePro } = useProGate();
  const category = categoryOrder.find((c) => c === param);
  const existing = budgets.find((b) => b.category === category && b.currency === home);

  // Budgets are normally loaded already (the tab did); this covers opening the screen cold.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // What the person typed, or the current limit until they type.
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const amount = typed ?? (existing ? formatAmountInput(existing.limitMinor, home, i18n.language) : '');

  if (!category) return null;
  const name = t(`category.${category}`);

  const save = () => {
    const minor = parseAmount(amount, home, { locale: i18n.language });
    if (minor === null || minor <= 0) {
      setError(t('budgets.amountInvalid'));
      return;
    }
    // Free includes budgets for 3 categories; a fourth needs Pro.
    if (!canSetBudget(budgets.map((b) => b.category), category, isPro)) {
      requirePro('moreBudgets');
      return;
    }
    void setBudget(category, minor);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: t('budgets.sheetTitle', { category: name }) }} />
      <FormScreen
        footer={
          <Button block onPress={save}>
            {t('budgets.set')}
          </Button>
        }>
        <TextField
          label={t('budgets.monthlyLimit')}
          value={amount}
          prefix={currencySymbol(home, i18n.language)}
          figure
          error={error}
          onChangeText={(v) => {
            setTyped(v);
            setError(undefined);
          }}
        />
        {existing ? (
          <Button
            variant="danger"
            block
            onPress={() => {
              void removeBudget(category);
              router.back();
            }}>
            {t('budgets.remove')}
          </Button>
        ) : null}
      </FormScreen>
    </>
  );
}
