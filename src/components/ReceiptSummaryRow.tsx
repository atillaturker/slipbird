import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { dayLabel } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { receiptBadge } from '@/lib/receipt-status';
import { displayMerchant, type ReceiptSummary } from '@/lib/types';
import { thumbnailUri } from '@/services/images';

import { ReceiptRow } from './ReceiptRow';

type Props = {
  receipt: ReceiptSummary;
  /** Shown instead of the day (e.g. the time, under a day header). */
  dateText?: string;
  onDelete?: () => void;
};

/**
 * A receipt in a list, the same everywhere (Receipts, Home): display name, category, date, own-currency amount,
 * one badge. Tapping opens review for scans that wait for it, the detail otherwise.
 */
export function ReceiptSummaryRow({ receipt, dateText, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const badge = receiptBadge(receipt);
  const label = dayLabel(receipt.date, new Date(), i18n.language);
  const day = label.kind === 'today' ? t('dates.today') : label.kind === 'yesterday' ? t('dates.yesterday') : label.text;

  return (
    <ReceiptRow
      merchant={displayMerchant(receipt) ?? t('receipts.unknownMerchant')}
      category={receipt.category}
      categoryLabel={t(`category.${receipt.category}`)}
      date={dateText ?? day}
      amount={receipt.totalMinor > 0 ? formatMoney(receipt.totalMinor, receipt.currency, i18n.language) : '—'}
      status={badge ? { tone: badge.tone, label: t(`status.${badge.label}`) } : undefined}
      processing={receipt.status === 'processing'}
      thumbnailUri={thumbnailUri(receipt.id, receipt.imagePaths)}
      onPress={() =>
        receipt.status === 'needs_review' || receipt.status === 'queued'
          ? router.push({ pathname: '/scan/review', params: { id: receipt.id } })
          : router.push({ pathname: '/receipt/[id]', params: { id: receipt.id } })
      }
      onDelete={onDelete}
    />
  );
}
