import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { BudgetBar, Button, CategoryBreakdown, EmptyState, MonthTotal } from '@/components';
import { ListGroup } from '@/components/ListGroup';
import { ReceiptSummaryRow } from '@/components/ReceiptSummaryRow';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { formatMoney } from '@/lib/money';
import { budgetsNearLimit } from '@/lib/spending';
import { useBudgets } from '@/store/budgets';
import { useReceipts } from '@/store/receipts';
import { useScanActions } from '@/store/scan';
import { useSpendingView } from '@/store/use-spending';
import { useTheme } from '@/theme';

// Home shows the biggest categories; Insights shows them all.
const TOP_CATEGORIES = 4;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const { scan } = useScanActions();
  const view = useSpendingView('month');
  const budgets = useBudgets((s) => s.budgets);
  const setCategory = useReceipts((s) => s.setCategory);
  const money = (minor: number) => formatMoney(minor, view.home, i18n.language);

  if (view.loaded && !view.hasAny) {
    return (
      <Screen title={t('home.title')}>
        <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} action={<Button onPress={() => void scan()}>{t('home.emptyAction')}</Button>} />
        {__DEV__ && (
          <Button variant="ghost" size="md" onPress={() => router.push('/dev/components')}>
            {t('dev.open')}
          </Button>
        )}
      </Screen>
    );
  }

  const near = budgetsNearLimit(
    budgets.filter((b) => b.currency === view.home),
    view.spentThisMonth,
  );

  return (
    <Screen title={t('home.title')}>
      <View style={{ gap: space[2] }}>
        <MonthTotal
          label={t('home.spent')}
          amount={money(view.summary.current.totalMinor)}
          delta={view.summary.delta ? money(view.summary.delta.amountMinor) : undefined}
          deltaDirection={view.summary.delta?.direction}
          deltaLabel={t('home.vsLastMonth')}
        />
        {view.pending > 0 && <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('home.pending', { count: view.pending })}</Text>}
        {view.unconverted > 0 && <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('home.unconverted', { count: view.unconverted })}</Text>}
      </View>

      {view.categories.length > 0 && (
        <Section title={t('home.whereItWent')}>
          <CategoryBreakdown
            items={view.categories.slice(0, TOP_CATEGORIES).map((c) => ({ category: c.category, value: c.totalMinor, display: money(c.totalMinor) }))}
            onPressItem={(category) => {
              setCategory(category);
              router.navigate('/receipts');
            }}
          />
        </Section>
      )}

      {view.needsReview.length > 0 && (
        <Section title={t('home.needsReview')}>
          <ListGroup>
            {view.needsReview.map((r) => (
              <ReceiptSummaryRow key={r.id} receipt={r} />
            ))}
          </ListGroup>
        </Section>
      )}

      {view.recent.length > 0 && (
        <Section title={t('home.recent')}>
          <ListGroup>
            {view.recent.map((r) => (
              <ReceiptSummaryRow key={r.id} receipt={r} />
            ))}
          </ListGroup>
          <Button variant="ghost" size="md" onPress={() => router.navigate('/receipts')}>
            {t('home.seeAll')}
          </Button>
        </Section>
      )}

      {near.length > 0 && (
        <Section title={t('home.budgetsNear')}>
          {near.map((b) => {
            const spent = view.spentThisMonth[b.category] ?? 0;
            return (
              <BudgetBar
                key={b.category}
                category={b.category}
                spent={spent}
                limit={b.limitMinor}
                spentDisplay={money(spent)}
                limitDisplay={money(b.limitMinor)}
                leftDisplay={spent <= b.limitMinor ? t('budgets.left', { amount: money(b.limitMinor - spent) }) : undefined}
                overDisplay={spent > b.limitMinor ? t('budgets.over', { amount: money(spent - b.limitMinor) }) : undefined}
              />
            );
          })}
        </Section>
      )}

      {__DEV__ && (
        <Button variant="ghost" size="md" onPress={() => router.push('/dev/components')}>
          {t('dev.open')}
        </Button>
      )}
    </Screen>
  );
}

