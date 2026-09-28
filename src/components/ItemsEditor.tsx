import { Trash } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { ReceiptForm, ReceiptFormError, ReceiptFormErrors } from '@/lib/receipt-form';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { IconButton } from './IconButton';
import { TextField } from './TextField';

type Props = {
  items: ReceiptForm['items'];
  errors: ReceiptFormErrors['items'];
  symbol: string;
  onChange: (index: number, patch: Partial<ReceiptForm['items'][number]>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
};

/** Line items: name, quantity and amount per line. Optional — many receipts are saved with just a total. */
export function ItemsEditor({ items, errors, symbol, onChange, onAdd, onRemove }: Props) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const err = (key: ReceiptFormError | undefined) => (key ? t(`receiptForm.errors.${key}`) : undefined);

  return (
    <View style={{ gap: space[4] }}>
      {items.length === 0 && <Text style={[type.body, { color: colors.inkMuted }]}>{t('receiptForm.noItems')}</Text>}
      {items.map((item, i) => (
        <View key={i} style={{ gap: space[2], paddingBottom: space[4], borderBottomWidth: 1, borderBottomColor: colors.rule }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('receiptForm.itemName')} value={item.name} error={err(errors[i]?.name)} onChangeText={(v) => onChange(i, { name: v })} />
            </View>
            <IconButton icon={Trash} label={t('receiptForm.removeItem', { n: i + 1 })} tone="muted" onPress={() => onRemove(i)} />
          </View>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <View style={{ flex: 2 }}>
              <TextField
                label={item.unit ? t('receiptForm.itemQtyUnit', { unit: t(`units.${item.unit}`) }) : t('receiptForm.itemQty')}
                value={item.qty} figure error={err(errors[i]?.qty)} onChangeText={(v) => onChange(i, { qty: v })} />
            </View>
            <View style={{ flex: 3 }}>
              <TextField
                label={t('receiptForm.itemAmount')}
                value={item.amount}
                prefix={symbol}
                figure
                error={err(errors[i]?.amount)}
                onChangeText={(v) => onChange(i, { amount: v })}
              />
            </View>
          </View>
        </View>
      ))}
      <Button variant="secondary" size="md" onPress={onAdd}>
        {t('receiptForm.addItem')}
      </Button>
    </View>
  );
}
