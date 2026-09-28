import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import { Button, Chip, EmptyState, SegmentedControl, TextField } from '@/components';
import { CurrencyButton } from '@/components/CurrencyButton';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { DateField } from '@/components/DateField';
import { FieldLabel } from '@/components/FieldLabel';
import { FormScreen } from '@/components/FormScreen';
import { ItemsEditor } from '@/components/ItemsEditor';
import { ReceiptPages } from '@/components/ReceiptPages';
import { TaxLinesEditor } from '@/components/TaxLinesEditor';
import { currencySymbol } from '@/lib/money';
import { errorLocation, type ReceiptFormError } from '@/lib/receipt-form';
import { paymentMethods, type PaymentMethod } from '@/lib/types';
import { useReceiptForm } from '@/store/use-receipt-form';
import { categoryOrder, useTheme } from '@/theme';

type Tab = 'receipt' | 'items';

export default function ManualEntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const receiptForm = useReceiptForm(id);
  const { form, errors, saving, homeCurrency, setField } = receiptForm;
  const [tab, setTab] = useState<Tab>('receipt');
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const err = (key: ReceiptFormError | undefined) => (key ? t(`receiptForm.errors.${key}`) : undefined);
  const tabLabels: Record<Tab, string> = { receipt: t('receiptForm.tabReceipt'), items: t('receiptForm.tabItems') };
  const paymentLabels: Record<PaymentMethod, string> = { card: t('payment.card'), cash: t('payment.cash'), other: t('payment.other') };

  const screen = (
    <Stack.Screen
      options={{
        title: id ? t('receiptForm.titleEdit') : t('receiptForm.titleNew'),
        headerLeft: () => (
          <Button variant="ghost" size="md" onPress={() => router.back()}>
            {t('receiptForm.cancel')}
          </Button>
        ),
      }}
    />
  );

  if (receiptForm.missing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center' }}>
        {screen}
        <EmptyState title={t('detail.notFound')} body={t('detail.notFoundBody')} action={<Button onPress={() => router.back()}>{t('detail.back')}</Button>} />
      </View>
    );
  }
  if (!form) return screen;

  const symbol = currencySymbol(form.currency, i18n.language);

  const onSave = async () => {
    try {
      const result = await receiptForm.submit();
      if (!result.ok) {
        if (!('errors' in result)) return;
        const where = errorLocation(result.errors);
        setTab(where.tab);
        if (where.openTaxes) setTaxesOpen(true);
        return;
      }
      if (id) router.back();
      else router.replace({ pathname: '/receipt/[id]', params: { id: result.id } });
    } catch {
      Alert.alert(t('receiptForm.saveFailed'));
    }
  };

  return (
    <>
      {screen}
      <FormScreen
        footer={
          <Button block disabled={saving} onPress={() => void onSave()}>
            {t('receiptForm.save')}
          </Button>
        }>
        <ReceiptPages uris={receiptForm.imageUris} />
        <SegmentedControl options={Object.values(tabLabels)} value={tabLabels[tab]} onChange={(v) => setTab(v === tabLabels.items ? 'items' : 'receipt')} />

        {tab === 'receipt' ? (
          <>
            <TextField
              label={t('receiptForm.merchant')}
              value={form.merchant}
              placeholder={t('receiptForm.merchantPlaceholder')}
              error={err(errors.merchant)}
              onChangeText={(v) => setField('merchant', v)}
            />
            <DateField label={t('receiptForm.date')} value={form.date} maximumDate={new Date()} error={err(errors.date)} onChange={(v) => setField('date', v)} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[3] }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('receiptForm.total')}
                  value={form.total}
                  prefix={symbol}
                  figure
                  placeholder="0"
                  error={err(errors.total)}
                  onChangeText={(v) => setField('total', v)}
                />
              </View>
              <View style={{ gap: space[1] }}>
                <FieldLabel>{t('receiptForm.currency')}</FieldLabel>
                <CurrencyButton code={form.currency} label={t('receiptForm.changeCurrency', { code: form.currency })} onPress={() => setCurrencyOpen(true)} />
              </View>
            </View>

            <View style={{ gap: space[2] }}>
              <FieldLabel>{t('receiptForm.category')}</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {categoryOrder.map((c) => (
                  <Chip key={c} category={c} selected={form.category === c} onPress={() => setField('category', c)}>
                    {t(`category.${c}`)}
                  </Chip>
                ))}
              </View>
            </View>

            <View style={{ gap: space[2] }}>
              <FieldLabel>{t('receiptForm.payment')}</FieldLabel>
              <SegmentedControl
                options={paymentMethods.map((m) => paymentLabels[m])}
                value={form.paymentMethod ? paymentLabels[form.paymentMethod] : undefined}
                onChange={(v) => setField('paymentMethod', paymentMethods.find((m) => paymentLabels[m] === v) ?? null)}
              />
            </View>

            <TaxLinesEditor
              taxes={form.taxes}
              errors={errors.taxes}
              symbol={symbol}
              open={taxesOpen}
              onToggle={() => setTaxesOpen((o) => !o)}
              onChange={receiptForm.updateTax}
              onAdd={receiptForm.addTax}
              onRemove={receiptForm.removeTax}
            />

            <TextField label={t('receiptForm.note')} value={form.note} placeholder={t('receiptForm.notePlaceholder')} onChangeText={(v) => setField('note', v)} />
          </>
        ) : (
          <ItemsEditor
            items={form.items}
            errors={errors.items}
            symbol={symbol}
            onChange={receiptForm.updateItem}
            onAdd={receiptForm.addItem}
            onRemove={receiptForm.removeItem}
          />
        )}
      </FormScreen>

      <CurrencyPicker visible={currencyOpen} value={form.currency} homeCurrency={homeCurrency} onSelect={(c) => setField('currency', c)} onClose={() => setCurrencyOpen(false)} />
    </>
  );
}

