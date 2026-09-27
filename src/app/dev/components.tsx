import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Appearance, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Badge,
  BudgetBar,
  Button,
  CategoryBreakdown,
  Chip,
  EmptyState,
  MonthTotal,
  ReceiptCard,
  ReceiptRow,
  ReviewField,
  ScanButton,
  SegmentedControl,
  TextField,
} from '@/components';
import { categoryOrder, useTheme } from '@/theme';

type ThemeChoice = 'system' | 'light' | 'dark';
type Period = 'week' | 'month' | 'year';

// Sample figures are fixed strings: money formatting arrives with src/lib/money.ts in M2.
export default function ComponentsShowcase() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Showcase />;
}

function Showcase() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>('system');
  const [chip, setChip] = useState('all');
  const [period, setPeriod] = useState<Period>('month');
  const [amount, setAmount] = useState('1.234,56');
  const [total, setTotal] = useState('₺1.284,50');
  const [merchant, setMerchant] = useState('Migros Jet');

  const themeLabels: Record<ThemeChoice, string> = {
    system: t('dev.themeSystem'),
    light: t('dev.themeLight'),
    dark: t('dev.themeDark'),
  };
  const setTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
  };
  const periodLabels: Record<Period, string> = { week: t('dev.sampleWeek'), month: t('dev.sampleMonth'), year: t('dev.sampleYear') };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingHorizontal: space[4], paddingBottom: insets.bottom + space[12], gap: space[6] }}>
      <Text style={[type.title1, { color: colors.ink }]} accessibilityRole="header">
        {t('dev.title')}
      </Text>

      <View style={{ gap: space[3] }}>
        <Label>{t('dev.theme')}</Label>
        <SegmentedControl
          options={Object.values(themeLabels)}
          value={themeLabels[themeChoice]}
          onChange={(v) => setTheme((Object.keys(themeLabels) as ThemeChoice[]).find((k) => themeLabels[k] === v) ?? 'system')}
        />
        <Label>{t('dev.language')}</Label>
        <SegmentedControl options={['English', 'Türkçe']} value={i18n.language === 'tr' ? 'Türkçe' : 'English'} onChange={(v) => i18n.changeLanguage(v === 'Türkçe' ? 'tr' : 'en')} />
      </View>

      <Section title={t('dev.section.buttons')}>
        <Button>{t('dev.sampleSave')}</Button>
        <Button variant="secondary">{t('dev.sampleRetake')}</Button>
        <Button variant="ghost">{t('dev.sampleCancel')}</Button>
        <Button variant="danger">{t('dev.sampleDeleteReceipt')}</Button>
        <Button size="md">{t('dev.sampleSetBudget')}</Button>
        <Button block>{t('dev.sampleSave')}</Button>
        <Button disabled>{t('dev.sampleSave')}</Button>
      </Section>

      <Section title={t('dev.section.scan')}>
        <ScanButton />
      </Section>

      <Section title={t('dev.section.chips')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
          <Chip selected={chip === 'all'} onPress={() => setChip('all')}>
            {t('dev.sampleAll')}
          </Chip>
          {categoryOrder.map((c) => (
            <Chip key={c} category={c} selected={chip === c} onPress={() => setChip(c)}>
              {t(`category.${c}`)}
            </Chip>
          ))}
        </ScrollView>
      </Section>

      <Section title={t('dev.section.badges')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          <Badge tone="verified">{t('dev.sampleEArsiv')}</Badge>
          <Badge tone="review">{t('dev.sampleNeedsReview')}</Badge>
          <Badge tone="over">{t('dev.sampleOverBudget')}</Badge>
          <Badge>{t('dev.sampleManual')}</Badge>
          <Badge>{t('dev.sampleQueued')}</Badge>
        </View>
      </Section>

      <Section title={t('dev.section.segmented')}>
        <SegmentedControl
          options={Object.values(periodLabels)}
          value={periodLabels[period]}
          onChange={(v) => setPeriod((Object.keys(periodLabels) as Period[]).find((k) => periodLabels[k] === v) ?? 'month')}
        />
      </Section>

      <Section title={t('dev.section.textField')}>
        <TextField label={t('dev.sampleAmount')} prefix="₺" figure value={amount} onChangeText={setAmount} />
        <TextField label={t('dev.sampleDateLabel')} figure value="31.02.2026" error={t('dev.sampleDateError')} />
        <TextField label={t('dev.sampleNote')} placeholder={t('dev.sampleNotePlaceholder')} helper={t('dev.sampleNoteHelper')} />
      </Section>

      <Section title={t('dev.section.reviewField')}>
        <Group>
          <ReviewField label={t('dev.sampleMerchantLabel')} value={merchant} onChangeText={setMerchant} />
          <ReviewField label={t('dev.sampleDateLabel')} figure value="12.10.2026" />
          <ReviewField label={t('dev.sampleTotalLabel')} figure value={total} confidence="low" flag={t('dev.sampleCheckTotal')} onChangeText={setTotal} />
        </Group>
      </Section>

      <Section title={t('dev.section.monthTotal')}>
        <MonthTotal label={t('dev.sampleThisMonth')} amount="₺18.420,75" delta="₺1.240,00" deltaDirection="up" deltaLabel={t('dev.sampleVsLastMonth')} />
        <MonthTotal label={t('dev.sampleThisMonth')} amount="$1,284.10" delta="$96.40" deltaDirection="down" deltaLabel={t('dev.sampleVsLastMonth')} />
      </Section>

      <Section title={t('dev.section.breakdown')}>
        <CategoryBreakdown
          onPressItem={() => {}}
          items={[
            { category: 'groceries', value: 642000, display: '₺6.420,00' },
            { category: 'dining', value: 318050, display: '₺3.180,50' },
            { category: 'bills', value: 245000, display: '₺2.450,00' },
            { category: 'transport', value: 121025, display: '₺1.210,25' },
            { category: 'other', value: 64000, display: '₺640,00' },
            { category: 'entertainment', value: 52000, display: '₺520,00' },
          ]}
        />
      </Section>

      <Section title={t('dev.section.budget')}>
        <BudgetBar category="groceries" spent={320000} limit={600000} spentDisplay="₺3.200,00" limitDisplay="₺6.000,00" leftDisplay={t('dev.sampleLeft', { amount: '₺2.800,00' })} />
        <BudgetBar category="dining" spent={270000} limit={300000} spentDisplay="₺2.700,00" limitDisplay="₺3.000,00" leftDisplay={t('dev.sampleLeft', { amount: '₺300,00' })} />
        <BudgetBar category="entertainment" spent={125000} limit={100000} spentDisplay="₺1.250,00" limitDisplay="₺1.000,00" overDisplay={t('dev.sampleOver', { amount: '₺250,00' })} />
      </Section>

      <Section title={t('dev.section.row')}>
        <Group>
          <ReceiptRow merchant={t('dev.sampleMerchant')} category="groceries" categoryLabel={t('category.groceries')} date={t('dev.sampleToday')} amount="₺1.284,50" status={{ tone: 'verified', label: t('dev.sampleEArsiv') }} onPress={() => {}} onDelete={() => {}} />
          <Hairline />
          <ReceiptRow merchant={t('dev.sampleMerchant2')} category="dining" categoryLabel={t('category.dining')} date={t('dev.sampleYesterday')} amount="$6.75" status={{ tone: 'review', label: t('dev.sampleNeedsReview') }} onPress={() => {}} />
          <Hairline />
          <ReceiptRow merchant={t('dev.sampleMerchant')} date={t('dev.sampleToday')} amount="₺96,40" processing />
        </Group>
      </Section>

      <Section title={t('dev.section.card')}>
        <ReceiptCard
          merchant={t('dev.sampleMerchant')}
          date="12.10.2026 18:42"
          number="GIB2026000001234"
          badge={{ tone: 'verified', label: t('dev.sampleEArsiv') }}
          items={[
            { name: t('dev.itemBread'), qty: '2 ×', amount: '₺30,00' },
            { name: t('dev.itemMilk'), amount: '₺42,50' },
            { name: t('dev.itemCheese'), qty: '0,45 kg', amount: '₺212,00' },
          ]}
          tax={[
            { label: t('dev.sampleVat', { rate: 1 }), amount: '₺2,82' },
            { label: t('dev.sampleVat', { rate: 10 }), amount: '₺19,27' },
          ]}
          total="₺284,50"
          totalLabel={t('dev.sampleTotal')}
        />
      </Section>

      <Section title={t('dev.section.empty')}>
        <Group>
          <EmptyState title={t('dev.sampleFilteredEmpty')} body={t('dev.sampleFilteredBody')} action={<Button variant="secondary" size="md">{t('dev.sampleClearFilter')}</Button>} />
        </Group>
      </Section>
    </ScrollView>
  );

}

function Label({ children }: { children: ReactNode }) {
  const { colors, type } = useTheme();
  return <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase' }]}>{children}</Text>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors, space, type } = useTheme();
  return (
    <View style={{ gap: space[3] }}>
      <Text style={[type.headline, { color: colors.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

function Group({ children }: { children: ReactNode }) {
  const { colors, radius } = useTheme();
  return <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.rule, overflow: 'hidden', backgroundColor: colors.paperRaised }}>{children}</View>;
}

function Hairline() {
  const { colors, space } = useTheme();
  return <View style={{ height: 1, marginLeft: space[4], backgroundColor: colors.rule }} />;
}
