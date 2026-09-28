import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { currencySymbol, formatAmountInput, parseAmount } from '@/lib/money';
import { useTheme, type Category } from '@/theme';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { TextField } from './TextField';

type Props = {
  category: Category | null;
  /** Current limit in minor units, when editing. */
  limitMinor: number | null;
  currency: string;
  onSave: (limitMinor: number) => void;
  onRemove: () => void;
  onClose: () => void;
};

/** Set, change or remove the monthly budget for one category (amount in the home currency). */
export function BudgetSheet({ category, limitMinor, currency, onSave, onRemove, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { space } = useTheme();
  const [amount, setAmount] = useState(limitMinor ? formatAmountInput(limitMinor, currency, i18n.language) : '');
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    const minor = parseAmount(amount, currency, { locale: i18n.language });
    if (minor === null || minor <= 0) {
      setError(t('budgets.amountInvalid'));
      return;
    }
    onSave(minor);
  };

  return (
    <Sheet visible={category !== null} title={category ? t('budgets.sheetTitle', { category: t(`category.${category}`) }) : ''} dismissLabel={t('budgets.cancel')} onClose={onClose}>
      <TextField
        label={t('budgets.monthlyLimit')}
        value={amount}
        prefix={currencySymbol(currency, i18n.language)}
        figure
        error={error}
        onChangeText={(v) => {
          setAmount(v);
          setError(undefined);
        }}
      />
      <View style={{ gap: space[3] }}>
        <Button block onPress={save}>
          {t('budgets.set')}
        </Button>
        {limitMinor ? (
          <Button variant="danger" block onPress={onRemove}>
            {t('budgets.remove')}
          </Button>
        ) : (
          <Button variant="ghost" size="md" onPress={onClose}>
            {t('budgets.cancel')}
          </Button>
        )}
      </View>
    </Sheet>
  );
}
