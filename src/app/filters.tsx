import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Chip, TextField } from '@/components';
import { DateField } from '@/components/DateField';
import { FieldLabel } from '@/components/FieldLabel';
import { FormScreen } from '@/components/FormScreen';
import { currencySymbol, formatAmountInput, parseAmount } from '@/lib/money';
import { NO_FILTERS, toggle } from '@/lib/receipt-filters';
import { paymentMethods, type ReceiptSource } from '@/lib/types';
import { useReceipts } from '@/store/receipts';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

const SOURCES: readonly ReceiptSource[] = ['scan', 'gib_qr', 'manual', 'import'];

/** Date range, amount range (home currency), source and payment method for the receipts list. */
export default function FiltersScreen() {
  const { t, i18n } = useTranslation();
  const { space } = useTheme();
  const home = useSettings((s) => s.homeCurrency);
  const current = useReceipts((s) => s.filters);
  const setFilters = useReceipts((s) => s.setFilters);

  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const [min, setMin] = useState(current.minMinor === null ? '' : formatAmountInput(current.minMinor, home, i18n.language));
  const [max, setMax] = useState(current.maxMinor === null ? '' : formatAmountInput(current.maxMinor, home, i18n.language));
  const [sources, setSources] = useState(current.sources);
  const [payments, setPayments] = useState(current.payments);
  const [errors, setErrors] = useState<{ date?: string; min?: string; max?: string }>({});

  const parseBound = (text: string): number | null | undefined => {
    if (!text.trim()) return null;
    const minor = parseAmount(text, home, { locale: i18n.language });
    return minor === null || minor < 0 ? undefined : minor;
  };

  const apply = () => {
    const minMinor = parseBound(min);
    const maxMinor = parseBound(max);
    const next: typeof errors = {};
    if (minMinor === undefined) next.min = t('filters.amountInvalid');
    if (maxMinor === undefined) next.max = t('filters.amountInvalid');
    if (typeof minMinor === 'number' && typeof maxMinor === 'number' && minMinor > maxMinor) next.max = t('filters.amountOrder');
    if (from && to && from > to) next.date = t('filters.dateOrder');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setFilters({ from, to, minMinor: minMinor ?? null, maxMinor: maxMinor ?? null, sources, payments });
    router.back();
  };

  const clear = () => {
    setFilters(NO_FILTERS);
    router.back();
  };

  const symbol = currencySymbol(home, i18n.language);

  return (
    <>
      <Stack.Screen options={{ title: t('filters.title') }} />
      <FormScreen
        footer={
          <>
            <Button block onPress={apply}>
              {t('filters.show')}
            </Button>
            <Button variant="ghost" size="md" block onPress={clear}>
              {t('filters.clear')}
            </Button>
          </>
        }>
        <View style={{ gap: space[3] }}>
          <DateField label={t('filters.from')} value={from} placeholder={t('filters.anyDate')} clearLabel={t('filters.clearDate')} maximumDate={new Date()} error={errors.date} onChange={setFrom} onClear={() => setFrom(null)} />
          <DateField label={t('filters.to')} value={to} placeholder={t('filters.anyDate')} clearLabel={t('filters.clearDate')} maximumDate={new Date()} onChange={setTo} onClear={() => setTo(null)} />
        </View>

        <View style={{ gap: space[3] }}>
          <FieldLabel>{t('filters.amount', { currency: home })}</FieldLabel>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            <View style={{ flex: 1 }}>
              <TextField label={t('filters.min')} value={min} prefix={symbol} figure placeholder="0" error={errors.min} onChangeText={(v) => setMin(v)} />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label={t('filters.max')} value={max} prefix={symbol} figure error={errors.max} onChangeText={(v) => setMax(v)} />
            </View>
          </View>
        </View>

        <View style={{ gap: space[2] }}>
          <FieldLabel>{t('filters.source')}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {SOURCES.map((source) => (
              <Chip key={source} selected={sources.includes(source)} onPress={() => setSources((s) => toggle(s, source))}>
                {t(`filters.sources.${source}`)}
              </Chip>
            ))}
          </View>
        </View>

        <View style={{ gap: space[2] }}>
          <FieldLabel>{t('filters.payment')}</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {paymentMethods.map((method) => (
              <Chip key={method} selected={payments.includes(method)} onPress={() => setPayments((p) => toggle(p, method))}>
                {t(`payment.${method}`)}
              </Chip>
            ))}
          </View>
        </View>
      </FormScreen>
    </>
  );
}
