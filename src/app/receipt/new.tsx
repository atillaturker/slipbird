import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trash } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState, SegmentedControl, TextField } from '@/components';
import { CurrencyButton } from '@/components/CurrencyButton';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { DateField } from '@/components/DateField';
import { Disclosure } from '@/components/Disclosure';
import { FieldLabel } from '@/components/FieldLabel';
import { IconButton } from '@/components/IconButton';
import { currencySymbol } from '@/lib/money';
import type { ReceiptFormError } from '@/lib/receipt-form';
import { paymentMethods, type PaymentMethod } from '@/lib/types';
import { useReceiptForm } from '@/store/use-receipt-form';
import { categoryOrder, useTheme } from '@/theme';

type Tab = 'receipt' | 'items';

export default function ManualEntryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();
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
        const receiptTabError = result.errors.merchant || result.errors.date || result.errors.total;
        const taxError = Object.keys(result.errors.taxes).length > 0;
        if (!receiptTabError && !taxError && Object.keys(result.errors.items).length > 0) setTab('items');
        else setTab('receipt');
        if (taxError) setTaxesOpen(true);
        return;
      }
      if (id) router.back();
      else router.replace({ pathname: '/receipt/[id]', params: { id: result.id } });
    } catch {
      Alert.alert(t('receiptForm.saveFailed'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {screen}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[12], gap: space[6] }}>
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

            <View style={{ gap: space[3] }}>
              <Disclosure
                title={form.taxes.length ? t('receiptForm.taxesCount', { count: form.taxes.length }) : t('receiptForm.taxes')}
                open={taxesOpen}
                onToggle={() => setTaxesOpen((o) => !o)}
              />
              {taxesOpen && (
                <>
                  {form.taxes.map((tax, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
                      <View style={{ flex: 2 }}>
                        <TextField label={t('receiptForm.taxRate')} value={tax.rate} figure error={err(errors.taxes[i]?.rate)} onChangeText={(v) => receiptForm.updateTax(i, { rate: v })} />
                      </View>
                      <View style={{ flex: 3 }}>
                        <TextField
                          label={t('receiptForm.taxAmount')}
                          value={tax.amount}
                          prefix={symbol}
                          figure
                          error={err(errors.taxes[i]?.amount)}
                          onChangeText={(v) => receiptForm.updateTax(i, { amount: v })}
                        />
                      </View>
                      <IconButton icon={Trash} label={t('receiptForm.removeTax', { n: i + 1 })} tone="muted" onPress={() => receiptForm.removeTax(i)} />
                    </View>
                  ))}
                  <Button variant="ghost" size="md" onPress={receiptForm.addTax}>
                    {t('receiptForm.addTax')}
                  </Button>
                </>
              )}
            </View>

            <TextField label={t('receiptForm.note')} value={form.note} placeholder={t('receiptForm.notePlaceholder')} onChangeText={(v) => setField('note', v)} />
          </>
        ) : (
          <View style={{ gap: space[4] }}>
            {form.items.length === 0 && <Text style={[type.body, { color: colors.inkMuted }]}>{t('receiptForm.noItems')}</Text>}
            {form.items.map((item, i) => (
              <View key={i} style={{ gap: space[2], paddingBottom: space[4], borderBottomWidth: 1, borderBottomColor: colors.rule }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
                  <View style={{ flex: 1 }}>
                    <TextField label={t('receiptForm.itemName')} value={item.name} error={err(errors.items[i]?.name)} onChangeText={(v) => receiptForm.updateItem(i, { name: v })} />
                  </View>
                  <IconButton icon={Trash} label={t('receiptForm.removeItem', { n: i + 1 })} tone="muted" onPress={() => receiptForm.removeItem(i)} />
                </View>
                <View style={{ flexDirection: 'row', gap: space[3] }}>
                  <View style={{ flex: 2 }}>
                    <TextField label={t('receiptForm.itemQty')} value={item.qty} figure error={err(errors.items[i]?.qty)} onChangeText={(v) => receiptForm.updateItem(i, { qty: v })} />
                  </View>
                  <View style={{ flex: 3 }}>
                    <TextField
                      label={t('receiptForm.itemAmount')}
                      value={item.amount}
                      prefix={symbol}
                      figure
                      error={err(errors.items[i]?.amount)}
                      onChangeText={(v) => receiptForm.updateItem(i, { amount: v })}
                    />
                  </View>
                </View>
              </View>
            ))}
            <Button variant="secondary" size="md" onPress={receiptForm.addItem}>
              {t('receiptForm.addItem')}
            </Button>
          </View>
        )}

        <Button block disabled={saving} onPress={() => void onSave()}>
          {t('receiptForm.save')}
        </Button>
      </ScrollView>

      <CurrencyPicker visible={currencyOpen} value={form.currency} homeCurrency={homeCurrency} onSelect={(c) => setField('currency', c)} onClose={() => setCurrencyOpen(false)} />
    </KeyboardAvoidingView>
  );
}

