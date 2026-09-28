import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { BudgetBar } from './BudgetBar';
import { PressableBase } from './internal/PressableBase';

/** A BudgetBar you can tap to change or remove the budget. */
export function BudgetItem({ onPress, ...bar }: ComponentProps<typeof BudgetBar> & { onPress: () => void }) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const name = bar.label ?? t(`category.${bar.category}`);
  return (
    <PressableBase accessibilityRole="button" accessibilityHint={t('budgets.editHint', { category: name })} onPress={onPress} style={{ paddingVertical: space[2] }}>
      <BudgetBar {...bar} />
    </PressableBase>
  );
}
