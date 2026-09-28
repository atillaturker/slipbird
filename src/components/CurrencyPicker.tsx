import { Check } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { currencyMatches, currencyOptions } from '@/lib/currency';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';
import { SearchField } from './SearchField';

type Props = {
  visible: boolean;
  value: string;
  homeCurrency: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

function currencyName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Sheet listing the home currency and TRY/USD/EUR/GBP first, then every ISO 4217 currency, with search. */
export function CurrencyPicker({ visible, value, homeCurrency, onSelect, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, space, size, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const { pinned, rest } = currencyOptions(homeCurrency);
    const withNames = (codes: readonly string[]) =>
      codes.map((code) => ({ code, name: currencyName(code, i18n.language) })).filter((c) => currencyMatches(c.code, c.name, query));
    return [
      { title: t('currencyPicker.common'), data: withNames(pinned) },
      { title: t('currencyPicker.all'), data: withNames(rest) },
    ].filter((s) => s.data.length > 0);
  }, [homeCurrency, i18n.language, query, t]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], gap: space[3] }}>
          <Text style={[type.title2, { color: colors.ink }]} accessibilityRole="header">
            {t('currencyPicker.title')}
          </Text>
          <Button variant="ghost" size="md" onPress={close}>
            {t('currencyPicker.done')}
          </Button>
        </View>
        <View style={{ paddingHorizontal: space[4], paddingBottom: space[3] }}>
          <SearchField value={query} onChangeText={setQuery} label={t('currencyPicker.search')} placeholder={t('currencyPicker.search')} clearLabel={t('receipts.clearSearch')} />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}
          renderSectionHeader={({ section }) => (
            <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase', paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[2] }]}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => {
            const selected = item.code === value;
            return (
              <PressableBase
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.name}, ${item.code}`}
                onPress={() => {
                  onSelect(item.code);
                  close();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.hitMin, paddingHorizontal: space[4] }}>
                <Text style={[type.figureMd, { color: colors.ink, width: space[12] }]}>{item.code}</Text>
                <Text style={[type.body, { flex: 1, color: colors.inkMuted }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {selected ? <Check size={ICON_SIZE_ROW} color={colors.stampInk} /> : null}
              </PressableBase>
            );
          }}
        />
      </View>
    </Modal>
  );
}
