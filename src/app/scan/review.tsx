import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, ReviewField, SegmentedControl, TextField } from '@/components';
import { CategorySheet } from '@/components/CategorySheet';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { DuplicateSheet } from '@/components/DuplicateSheet';
import { FieldLabel } from '@/components/FieldLabel';
import { ItemsEditor } from '@/components/ItemsEditor';
import { OcrTextViewer } from '@/components/OcrTextViewer';
import { PageViewer } from '@/components/PageViewer';
import { TaxLinesEditor } from '@/components/TaxLinesEditor';
import { formatReceiptDate, fromISODate, toISODate } from '@/lib/dates';
import { currencySymbol, formatMoney } from '@/lib/money';
import { errorLocation, itemsDifference, type ReceiptFormError } from '@/lib/receipt-form';
import { firstLowField, type ReviewFieldKey } from '@/lib/receipt-normalize';
import { flagMessage } from '@/lib/review-flags';
import { displayMerchant, paymentMethods, type PaymentMethod, type ReceiptSummary } from '@/lib/types';
import { useReceiptForm } from '@/store/use-receipt-form';
import { useTheme } from '@/theme';

type Tab = 'receipt' | 'items';

// The photo takes the top of the screen (docs/SPEC.md §1.7) but leaves room for the first fields.
const PHOTO_SHARE = 0.38;

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { scheme, colors, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const review = useReceiptForm(id);
  const { form, errors, saving, fieldConfidence, setField } = review;

  const [tab, setTab] = useState<Tab>('receipt');
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<ReceiptSummary | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);

  // Scroll to the first low field once, when the receipt has loaded (docs/SPEC.md §1.7).
  const scroll = useRef<ScrollView>(null);
  const groupY = useRef(0);
  const scrolled = useRef(false);
  const [scrollTarget, setScrollTarget] = useState<ReviewFieldKey | null | undefined>(undefined);
  if (scrollTarget === undefined && form) setScrollTarget(firstLowField(fieldConfidence));
  const onFieldLayout = (key: ReviewFieldKey, y: number) => {
    if (scrolled.current || key !== scrollTarget) return;
    scrolled.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, groupY.current + y - space[4]), animated: true });
  };

  const lang = i18n.language;
  const tabLabels: Record<Tab, string> = { receipt: t('review.tabReceipt'), items: t('review.tabItems') };
  const paymentLabels: Record<PaymentMethod, string> = { card: t('payment.card'), cash: t('payment.cash'), other: t('payment.other') };
  const err = (key: ReceiptFormError | undefined) => (key ? t(`receiptForm.errors.${key}`) : undefined);

  const flagProps = (key: ReviewFieldKey) => {
    const c = fieldConfidence?.[key];
    if (c?.confidence !== 'low') return { confidence: 'high' as const };
    // Items vs total: say by how much, from what's on screen now.
    const difference = c.reason === 'itemsMismatch' && form ? itemsDifference(form, lang) : null;
    if (difference && difference.diffMinor !== 0 && form) {
      const money = (minor: number) => formatMoney(minor, form.currency, lang);
      const args = { sum: money(difference.sumMinor), diff: money(Math.abs(difference.diffMinor)) };
      return { confidence: 'low' as const, flag: t(difference.diffMinor > 0 ? 'review.flags.itemsShort' : 'review.flags.itemsOver', args) };
    }
    return { confidence: 'low' as const, flag: t(`review.flags.${flagMessage(key, c.reason)}`) };
  };

  const screen = <Stack.Screen options={{ title: t('review.title') }} />;

  useEffect(() => {
    // A receipt that was saved (or deleted) elsewhere no longer needs review here.
    if (review.status === 'saved') router.replace({ pathname: '/receipt/[id]', params: { id } });
  }, [review.status, id]);

  if (review.missing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center' }}>
        {screen}
        <EmptyState title={t('detail.notFound')} body={t('detail.notFoundBody')} action={<Button onPress={() => router.back()}>{t('detail.back')}</Button>} />
      </View>
    );
  }
  if (!form) return screen;

  const symbol = currencySymbol(form.currency, lang);
  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromISODate(form.date) ?? new Date(),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) setField('date', toISODate(picked));
        },
      });
    } else {
      setDateOpen((o) => !o);
    }
  };

  const save = async (checkDuplicates: boolean) => {
    try {
      const result = await review.submit({ checkDuplicates });
      if (result.ok) {
        router.back();
        return;
      }
      if ('duplicate' in result) {
        setDuplicate(result.duplicate);
        return;
      }
      const where = errorLocation(result.errors);
      setTab(where.tab);
      if (where.openTaxes) setTaxesOpen(true);
    } catch {
      Alert.alert(t('receiptForm.saveFailed'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteBody'), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('detail.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void review.discard();
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {screen}
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[12], gap: space[6] }}>
        <PageViewer uris={review.imageUris} height={Math.round(windowHeight * PHOTO_SHARE)} />

        {(review.status === 'queued' || review.status === 'processing') && (
          <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('review.processing')}</Text>
        )}

        <SegmentedControl options={Object.values(tabLabels)} value={tabLabels[tab]} onChange={(v) => setTab(v === tabLabels.items ? 'items' : 'receipt')} />

        {tab === 'receipt' ? (
          <>
            <View
              onLayout={(e) => {
                groupY.current = e.nativeEvent.layout.y;
              }}
              style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.rule, overflow: 'hidden' }}>
              <Measured field="merchant" onMeasure={onFieldLayout}>
                <ReviewField label={t('review.merchant')} value={form.merchant} {...flagProps('merchant')} onChangeText={(v) => setField('merchant', v)} />
              </Measured>
              <Hairline />
              <Measured field="date" onMeasure={onFieldLayout}>
                <ReviewField label={t('review.date')} value={formatReceiptDate(form.date, null, lang)} figure {...flagProps('date')} onPress={pickDate} />
              </Measured>
              {dateOpen && Platform.OS === 'ios' && (
                <RNDateTimePicker
                  value={fromISODate(form.date) ?? new Date()}
                  mode="date"
                  display="inline"
                  maximumDate={new Date()}
                  locale={lang}
                  themeVariant={scheme}
                  accentColor={colors.stamp}
                  onChange={(_, picked) => {
                    if (picked) setField('date', toISODate(picked));
                  }}
                />
              )}
              <Hairline />
              <Measured field="total" onMeasure={onFieldLayout}>
                <ReviewField label={`${t('review.total')} (${symbol})`} value={form.total} figure {...flagProps('total')} onChangeText={(v) => setField('total', v)} />
              </Measured>
              <Hairline />
              <Measured field="currency" onMeasure={onFieldLayout}>
                <ReviewField label={t('review.currency')} value={form.currency} figure {...flagProps('currency')} onPress={() => setCurrencyOpen(true)} />
              </Measured>
              <Hairline />
              <Measured field="category" onMeasure={onFieldLayout}>
                <ReviewField label={t('review.category')} value={t(`category.${form.category}`)} {...flagProps('category')} onPress={() => setCategoryOpen(true)} />
              </Measured>
            </View>
            {(errors.merchant || errors.date || errors.total) && (
              <Text style={[type.subhead, { color: colors.danger }]} accessibilityLiveRegion="polite">
                {[err(errors.merchant), err(errors.date), err(errors.total)].filter(Boolean).join(' · ')}
              </Text>
            )}

            <TaxLinesEditor
              taxes={form.taxes}
              errors={errors.taxes}
              symbol={symbol}
              open={taxesOpen}
              onToggle={() => setTaxesOpen((o) => !o)}
              onChange={review.updateTax}
              onAdd={review.addTax}
              onRemove={review.removeTax}
            />

            <View style={{ gap: space[2] }}>
              <FieldLabel>{t('review.payment')}</FieldLabel>
              <SegmentedControl
                options={paymentMethods.map((m) => paymentLabels[m])}
                value={form.paymentMethod ? paymentLabels[form.paymentMethod] : undefined}
                onChange={(v) => setField('paymentMethod', paymentMethods.find((m) => paymentLabels[m] === v) ?? null)}
              />
            </View>

            <TextField label={t('review.note')} value={form.note} placeholder={t('receiptForm.notePlaceholder')} onChangeText={(v) => setField('note', v)} />
          </>
        ) : (
          <ItemsEditor items={form.items} errors={errors.items} symbol={symbol} onChange={review.updateItem} onAdd={review.addItem} onRemove={review.removeItem} />
        )}

        <View style={{ gap: space[3] }}>
          <Button block disabled={saving} onPress={() => void save(true)}>
            {t('review.save')}
          </Button>
          <Button variant="ghost" size="md" onPress={confirmDelete}>
            {t('review.delete')}
          </Button>
          {__DEV__ && (
            <Button variant="ghost" size="md" onPress={() => setOcrOpen(true)}>
              {t('dev.showOcr')}
            </Button>
          )}
        </View>
      </ScrollView>

      <CurrencyPicker visible={currencyOpen} value={form.currency} homeCurrency={review.homeCurrency} onSelect={(c) => setField('currency', c)} onClose={() => setCurrencyOpen(false)} />
      {__DEV__ && <OcrTextViewer visible={ocrOpen} text={review.parserText} onClose={() => setOcrOpen(false)} />}
      <CategorySheet visible={categoryOpen} value={form.category} onSelect={(c) => setField('category', c)} onClose={() => setCategoryOpen(false)} />
      <DuplicateSheet
        visible={duplicate !== null}
        existing={
          duplicate && {
            merchant: displayMerchant(duplicate) ?? t('receipts.unknownMerchant'),
            date: formatReceiptDate(duplicate.date, duplicate.time, lang),
            amount: formatMoney(duplicate.totalMinor, duplicate.currency, lang),
          }
        }
        onClose={() => setDuplicate(null)}
        onSaveAnyway={() => {
          setDuplicate(null);
          void save(false);
        }}
        onDiscard={() => {
          setDuplicate(null);
          void review.discard();
          router.back();
        }}
      />
    </KeyboardAvoidingView>
  );
}

/** Reports where a field sits inside the review group, for scroll-to-first-low. */
function Measured({ field, onMeasure, children }: { field: ReviewFieldKey; onMeasure: (field: ReviewFieldKey, y: number) => void; children: React.ReactNode }) {
  return <View onLayout={(e) => onMeasure(field, e.nativeEvent.layout.y)}>{children}</View>;
}

function Hairline() {
  const { colors, space } = useTheme();
  return <View style={{ height: 1, marginLeft: space[4], backgroundColor: colors.rule }} />;
}
