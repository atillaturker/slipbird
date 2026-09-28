import { router, useFocusEffect } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState } from '@/components';
import { IconButton } from '@/components/IconButton';
import { GroupRow } from '@/components/ListGroup';
import { ReceiptSummaryRow } from '@/components/ReceiptSummaryRow';
import { ScreenHeader } from '@/components/Screen';
import { SearchField } from '@/components/SearchField';
import { dayLabel, groupByDay } from '@/lib/dates';
import { useReceipts } from '@/store/receipts';
import { categoryOrder, useTheme } from '@/theme';

export default function ReceiptsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { list, hasAny, loaded, query, category, setQuery, setCategory, refresh, remove } = useReceipts();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const sections = useMemo(() => {
    const now = new Date();
    return groupByDay(list).map((group) => {
      const label = dayLabel(group.date, now, i18n.language);
      const title = label.kind === 'today' ? t('dates.today') : label.kind === 'yesterday' ? t('dates.yesterday') : label.text;
      return { key: group.date, label: title, title: title.toLocaleUpperCase(i18n.language), data: group.items };
    });
  }, [list, i18n.language, t]);

  const addManually = () => router.push('/receipt/new');
  const filtered = !!query.trim() || category !== null;

  const header = (
    <View style={{ gap: space[4], paddingBottom: space[2] }}>
      <ScreenHeader title={t('receipts.title')} action={<IconButton icon={Plus} label={t('receipts.addManually')} tone="stamp" onPress={addManually} />} />
      {hasAny && (
        <>
          <SearchField value={query} onChangeText={setQuery} label={t('receipts.search')} placeholder={t('receipts.searchPlaceholder')} clearLabel={t('receipts.clearSearch')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space[4] }} contentContainerStyle={{ gap: space[2], paddingHorizontal: space[4] }}>
            <Chip selected={category === null} onPress={() => setCategory(null)}>
              {t('receipts.all')}
            </Chip>
            {categoryOrder.map((c) => (
              <Chip key={c} category={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)}>
                {t(`category.${c}`)}
              </Chip>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  const empty = !loaded ? null : !hasAny ? (
    <EmptyState title={t('receipts.emptyTitle')} body={t('receipts.emptyBody')} action={<Button onPress={addManually}>{t('receipts.addManually')}</Button>} />
  ) : filtered ? (
    <EmptyState
      title={category && !query.trim() ? t('receipts.categoryEmptyTitle', { category: t(`category.${category}`) }) : t('receipts.noMatchesTitle')}
      body={t('receipts.noMatchesBody')}
      action={
        <Button
          variant="secondary"
          size="md"
          onPress={() => {
            setQuery('');
            setCategory(null);
          }}>
          {t('receipts.clearFilters')}
        </Button>
      }
    />
  ) : null;

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingHorizontal: space[4], paddingBottom: space[12] }}
      sections={sections}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      renderSectionHeader={({ section }) => (
        <Text style={[type.caption, { color: colors.inkMuted, paddingTop: space[4], paddingBottom: space[2] }]} accessibilityRole="header">
          {section.title}
        </Text>
      )}
      renderItem={({ item, index, section }) => (
        <GroupRow first={index === 0} last={index === section.data.length - 1}>
          <ReceiptSummaryRow receipt={item} dateText={item.time ?? section.label} onDelete={() => void remove(item.id)} />
        </GroupRow>
      )}
    />
  );
}
