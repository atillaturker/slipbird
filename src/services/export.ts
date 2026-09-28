import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/db';
import { listReceiptsForExport } from '@/db/export';
import { listSpendRows } from '@/db/spending';
import { i18n } from '@/i18n';
import { buildCsv } from '@/lib/csv';
import { formatReceiptDate, monthTitle, toISODate } from '@/lib/dates';
import { monthRange, rangeFileLabel } from '@/lib/export-range';
import { formatMoney } from '@/lib/money';
import { buildReportHtml, REPORT_PAGE } from '@/lib/report';
import { categoryTotals, countedSpend, totalIn, type DateRange } from '@/lib/spending';
import { displayMerchant } from '@/lib/types';
import { useSettings } from '@/store/settings';
import { useSpending } from '@/store/spending';
import { themes } from '@/theme';

import { getRates } from './rates';

/** `empty` = nothing to export in that range; `unavailable` = this device can't share files. */
export type ExportResult = { ok: true } | { ok: false; reason: 'empty' | 'unavailable' };

async function share(file: File, mimeType: string, uti: string): Promise<ExportResult> {
  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti, dialogTitle: i18n.t('export.shareTitle') });
  return { ok: true };
}

function cacheFile(name: string): File {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  return file;
}

/** Saved receipts in the range, with items, as one CSV (docs/SPEC.md §3 Settings → Export). */
export async function exportCsv(range: DateRange): Promise<ExportResult> {
  const receipts = await listReceiptsForExport(getDb(), range);
  if (receipts.length === 0) return { ok: false, reason: 'empty' };
  const file = cacheFile(`slipbird-${rangeFileLabel(range)}.csv`);
  file.write(buildCsv(receipts));
  return share(file, 'text/csv', 'public.comma-separated-values-text');
}

/** A monthly PDF report: totals in the home currency, category totals and the receipt list. `month` is YYYY-MM. */
export async function exportMonthlyPdf(month: string): Promise<ExportResult> {
  const home = useSettings.getState().homeCurrency;
  const language = i18n.language;
  const range = monthRange(month);
  const rows = await listSpendRows(getDb(), range.start, range.end);
  const rates = useSpending.getState().rates ?? (await getRates(home));
  const counted = countedSpend(rows, rates, home);
  if (counted.length === 0) return { ok: false, reason: 'empty' };

  const money = (minor: number) => formatMoney(minor, home, language);
  const total = totalIn(counted, range);
  const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 });
  const light = themes.light;
  const notes = total.unconverted > 0 ? [i18n.t('home.unconverted', { count: total.unconverted })] : [];

  const html = buildReportHtml({
    language,
    palette: light.colors,
    title: i18n.t('export.reportTitle'),
    period: monthTitle(month, language),
    generated: i18n.t('export.generated', { date: formatReceiptDate(toISODate(new Date()), null, language) }),
    totalLabel: i18n.t('export.totalSpent'),
    total: money(total.totalMinor),
    countLabel: i18n.t('export.receiptsCount'),
    count: String(counted.length),
    notes,
    categoriesTitle: i18n.t('insights.categories'),
    categories: categoryTotals(counted, range).map((c) => ({
      name: i18n.t(`category.${c.category}`),
      share: total.totalMinor > 0 ? percent.format(c.totalMinor / total.totalMinor) : '',
      amount: money(c.totalMinor),
      color: light.categories[c.category],
    })),
    receiptsTitle: i18n.t('export.receiptList'),
    columns: { date: i18n.t('export.colDate'), merchant: i18n.t('export.colMerchant'), category: i18n.t('export.colCategory'), amount: i18n.t('export.colAmount') },
    receipts: [...counted]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: formatReceiptDate(r.date, null, language),
        merchant: displayMerchant(r) ?? i18n.t('receipts.unknownMerchant'),
        category: i18n.t(`category.${r.category}`),
        amount: formatMoney(r.totalMinor, r.currency, language),
      })),
    emptyText: i18n.t('export.nothingThisMonth'),
  });

  const printed = await Print.printToFileAsync({ html, width: REPORT_PAGE.width, height: REPORT_PAGE.height });
  const file = new File(Paths.cache, `slipbird-report-${month}.pdf`);
  await new File(printed.uri).move(file, { overwrite: true });
  return share(file, 'application/pdf', 'com.adobe.pdf');
}
