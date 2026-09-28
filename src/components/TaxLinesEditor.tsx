import { Trash } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { ReceiptForm, ReceiptFormErrors } from '@/lib/receipt-form';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Disclosure } from './Disclosure';
import { IconButton } from './IconButton';
import { TextField } from './TextField';

type Props = {
  taxes: ReceiptForm['taxes'];
  errors: ReceiptFormErrors['taxes'];
  symbol: string;
  open: boolean;
  onToggle: () => void;
  onChange: (index: number, patch: Partial<ReceiptForm['taxes'][number]>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

/** Collapsed-by-default VAT/KDV lines: rate and amount per line. */
export function TaxLinesEditor({ taxes, errors, symbol, open, onToggle, onChange, onAdd, onRemove }: Props) {
  const { t } = useTranslation();
  const { space } = useTheme();

  return (
    <View style={{ gap: space[3] }}>
      <Disclosure title={taxes.length ? t('receiptForm.taxesCount', { count: taxes.length }) : t('receiptForm.taxes')} open={open} onToggle={onToggle} />
      {open && (
        <>
          {taxes.map((tax, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
              <View style={{ flex: 2 }}>
                <TextField
                  label={t('receiptForm.taxRate')}
                  value={tax.rate}
                  figure
                  error={errors[i]?.rate && t(`receiptForm.errors.${errors[i].rate}`)}
                  onChangeText={(v) => onChange(i, { rate: v })}
                />
              </View>
              <View style={{ flex: 3 }}>
                <TextField
                  label={t('receiptForm.taxAmount')}
                  value={tax.amount}
                  prefix={symbol}
                  figure
                  error={errors[i]?.amount && t(`receiptForm.errors.${errors[i].amount}`)}
                  onChangeText={(v) => onChange(i, { amount: v })}
                />
              </View>
              <IconButton icon={Trash} label={t('receiptForm.removeTax', { n: i + 1 })} tone="muted" onPress={() => onRemove(i)} />
            </View>
          ))}
          <Button variant="ghost" size="md" onPress={onAdd}>
            {t('receiptForm.addTax')}
          </Button>
        </>
      )}
    </View>
  );
}
