import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, type ViewStyle } from 'react-native';

import { breakdownSegments } from '@/lib/breakdown';
import { useTheme, type Category } from '@/theme';

import { PressableBase } from './internal/PressableBase';

// From docs/COMPONENTS.md: 14px bar, 2px gaps, 4px outer radius, 36px rows.
const BAR_HEIGHT = 14;
const BAR_GAP = 2;
const ROW_HEIGHT = 36;

type Props = {
  items: { category: Category; value: number; display: string; label?: string }[];
  onPressItem?: (category: Category) => void;
};

export function CategoryBreakdown({ items, onPressItem }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, categories, space, radius, size, type } = useTheme();
  const slop = Math.max(0, (size.hitMin - ROW_HEIGHT) / 2);
  const segments = breakdownSegments(items);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <View style={{ gap: space[3] }}>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: BAR_GAP, height: BAR_HEIGHT, borderRadius: radius.xs, overflow: 'hidden' }}>
        {segments.map((s) => (
          <View key={s.category} style={{ flex: s.share, backgroundColor: categories[s.category] }} />
        ))}
      </View>
      <View>
        {segments.map((s) => {
          const name = s.label ?? t(`category.${s.category}`);
          const share = percent.format(s.share);
          return (
            <Row
              key={s.category}
              accessibilityLabel={`${name}, ${share}, ${s.display}`}
              onPress={onPressItem && (() => onPressItem(s.category))}
              hitSlop={slop}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], height: ROW_HEIGHT }}>
              <View style={{ width: space[2], height: space[2], borderRadius: radius.full, backgroundColor: categories[s.category] }} />
              <Text style={[type.subhead, { flex: 1, color: colors.ink }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[type.figureSm, { color: colors.inkMuted }]}>{share}</Text>
              <Text style={[type.figureMd, { color: colors.ink, textAlign: 'right' }]}>{s.display}</Text>
            </Row>
          );
        })}
      </View>
    </View>
  );
}

type RowProps = {
  accessibilityLabel: string;
  onPress?: () => void;
  hitSlop: number;
  style: ViewStyle;
  children: ReactNode;
};

/** A breakdown row: pressable when the screen handles taps, otherwise a plain row. */
function Row({ accessibilityLabel, onPress, hitSlop, style, children }: RowProps) {
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={style}>
        {children}
      </View>
    );
  }
  return (
    <PressableBase accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={hitSlop} style={style}>
      {children}
    </PressableBase>
  );
}
