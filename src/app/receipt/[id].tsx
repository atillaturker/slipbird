import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, ReceiptCard } from '@/components';
import { InfoRow } from '@/components/InfoRow';
import { ListGroup } from '@/components/ListGroup';
import { formatReceiptDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { formatDecimal } from '@/lib/number';
import { receiptBadge } from '@/lib/receipt-status';
import { imageUri } from '@/services/images';
import { useReceipt, useReceipts } from '@/store/receipts';
import { useScanActions } from '@/store/scan';
import { useTheme } from '@/theme';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors, categories, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();
  const receipt = useReceipt(id);
  const remove = useReceipts((s) => s.remove);
  const { retake } = useScanActions();
  const lang = i18n.language;

  const screen = <Stack.Screen options={{ title: t('detail.title') }} />;

  if (receipt === undefined) return screen;
  if (receipt === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center' }}>
        {screen}
        <EmptyState title={t('detail.notFound')} body={t('detail.notFoundBody')} action={<Button onPress={() => router.back()}>{t('detail.back')}</Button>} />
      </View>
    );
  }

  const confirmDelete = () =>
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteBody'), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('detail.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void remove(receipt.id);
          router.back();
        },
      },
    ]);

  if (receipt.status === 'failed') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[12], gap: space[4] }}>
        {screen}
        <EmptyState title={t('scan.failedTitle')} body={t('scan.failedBody')} />
        <Button block onPress={() => void retake(receipt.id)}>
          {t('scan.retake')}
        </Button>
        <Button variant="secondary" block onPress={() => router.replace({ pathname: '/scan/review', params: { id: receipt.id } })}>
          {t('scan.enterManually')}
        </Button>
        <Button variant="danger" block onPress={confirmDelete}>
          {t('detail.delete')}
        </Button>
      </ScrollView>
    );
  }

  const money = (minor: number) => formatMoney(minor, receipt.currency, lang);
  const badge = receiptBadge(receipt);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[12], gap: space[6] }}>
      {screen}
      <ReceiptCard
        merchant={receipt.merchant ?? t('receipts.unknownMerchant')}
        date={formatReceiptDate(receipt.date, receipt.time, lang)}
        number={receipt.documentNumber ?? undefined}
        badge={badge ? { tone: badge.tone, label: t(`status.${badge.label}`) } : undefined}
        items={receipt.items.map((item) => ({
          name: item.name,
          qty: item.qty === null ? undefined : t('detail.qty', { qty: formatDecimal(item.qty, lang) }),
          amount: money(item.amountMinor),
        }))}
        tax={receipt.taxes.map((tax) => ({
          label: tax.rate === null ? t('detail.vatNoRate') : t('detail.vat', { rate: formatDecimal(tax.rate, lang) }),
          amount: money(tax.amountMinor),
        }))}
        total={money(receipt.totalMinor)}
        totalLabel={t('receiptCard.total')}
        images={receipt.imagePaths.map(imageUri)}
      />

      <ListGroup>
        <InfoRow label={t('detail.category')}>
          <View style={{ width: space[2], height: space[2], borderRadius: radius.full, backgroundColor: categories[receipt.category] }} />
          <Text style={[type.body, { color: colors.ink }]}>{t(`category.${receipt.category}`)}</Text>
        </InfoRow>
        {receipt.paymentMethod ? <InfoRow label={t('detail.payment')}>{t(`payment.${receipt.paymentMethod}`)}</InfoRow> : null}
        {receipt.note ? <InfoRow label={t('detail.note')}>{receipt.note}</InfoRow> : null}
      </ListGroup>

      <View style={{ gap: space[3] }}>
        <Button variant="secondary" block onPress={() => router.push({ pathname: '/receipt/new', params: { id: receipt.id } })}>
          {t('detail.edit')}
        </Button>
        <Button variant="danger" block onPress={confirmDelete}>
          {t('detail.delete')}
        </Button>
      </View>
    </ScrollView>
  );
}
