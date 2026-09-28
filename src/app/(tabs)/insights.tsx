import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { CategoryBreakdown, EmptyState, MonthTotal, SegmentedControl } from '@/components';
import { InfoRow } from '@/components/InfoRow';
import { ListGroup } from '@/components/ListGroup';
import { MonthlyBars } from '@/components/MonthlyBars';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { monthLabel } from '@/lib/dates';
import { formatMoney, formatMoneyShort } from '@/lib/money';
import type { Period } from '@/lib/spending';
import { useReceipts } from '@/store/receipts';
import { useSpendingView } from '@/store/use-spending';
import { useTheme } from '@/theme';

const PERIODS: readonly Period[] = ['week', 'month', 'year'];

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const [period, setPeriod] = useState<Period>('month');
  const view = useSpendingView(period);
  const setCategory = useReceipts((s) => s.setCategory);
  const lang = i18n.language;
  const money = (minor: number) => formatMoney(minor, view.home, lang);

  const periodLabels: Record<Period, string> = { week: t('insights.week'), month: t('insights.month'), year: t('insights.year') };
  const spentLabel = { week: t('insights.spentWeek'), month: t('insights.spentMonth'), year: t('insights.spentYear') }[period];
  const vsLabel = { week: t('insights.vsWeek'), month: t('insights.vsMonth'), year: t('insights.vsYear') }[period];
  const bars = view.monthly.map((m) => ({
    key: m.month,
    label: monthLabel(m.month, lang),
    value: m.totalMinor,
    display: formatMoneyShort(m.totalMinor, view.home, lang),
    current: m.current,
  }));

  return (
    <Screen title={t('insights.title')}>
      <SegmentedControl
        options={PERIODS.map((p) => periodLabels[p])}
        value={periodLabels[period]}
        onChange={(v) => setPeriod(PERIODS.find((p) => periodLabels[p] === v) ?? 'month')}
      />

      {view.loaded && view.summary.current.count === 0 && view.monthly.every((m) => m.totalMinor === 0) ? (
        <EmptyState title={t('insights.emptyTitle')} body={t('insights.emptyBody')} />
      ) : (
        <>
          <View style={{ gap: space[2] }}>
            <MonthTotal
              label={spentLabel}
              amount={money(view.summary.current.totalMinor)}
              delta={view.summary.delta ? money(view.summary.delta.amountMinor) : undefined}
              deltaDirection={view.summary.delta?.direction}
              deltaLabel={vsLabel}
            />
            {view.unconverted > 0 && <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('home.unconverted', { count: view.unconverted })}</Text>}
          </View>

          {view.categories.length > 0 && (
            <Section title={t('insights.categories')}>
              <CategoryBreakdown
                items={view.categories.map((c) => ({ category: c.category, value: c.totalMinor, display: money(c.totalMinor) }))}
                onPressItem={(category) => {
                  setCategory(category);
                  router.navigate('/receipts');
                }}
              />
            </Section>
          )}

          <Section title={t('insights.lastMonths')}>
            <MonthlyBars bars={bars} accessibilityLabel={t('insights.chartSummary', { months: bars.map((b) => `${b.label} ${money(b.value)}`).join(', ') })} />
          </Section>

          {view.merchants.length > 0 && (
            <Section title={t('insights.topMerchants')}>
              <ListGroup>
                {view.merchants.map((m) => (
                  <InfoRow key={m.name} label={m.name}>
                    <Text style={[type.caption, { color: colors.inkMuted }]}>{t('insights.receiptCount', { count: m.count })}</Text>
                    <Text style={[type.figureMd, { color: colors.ink }]}>{money(m.totalMinor)}</Text>
                  </InfoRow>
                ))}
              </ListGroup>
            </Section>
          )}

          {view.average !== null && (
            <ListGroup>
              <InfoRow label={t('insights.average')}>
                <Text style={[type.figureMd, { color: colors.ink }]}>{money(view.average)}</Text>
              </InfoRow>
            </ListGroup>
          )}
        </>
      )}
    </Screen>
  );
}
