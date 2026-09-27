import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme, type Category } from '@/theme';

import { PressableBase } from './internal/PressableBase';

const CHIP_HEIGHT = 32;

type Props = {
  onPress?: () => void;
  selected?: boolean;
  category?: Category;
  children: ReactNode;
};

export function Chip({ onPress, selected, category, children }: Props) {
  const { colors, categories, space, radius, size, type } = useTheme();
  const slop = (size.hitMin - CHIP_HEIGHT) / 2;

  return (
    <PressableBase
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: slop, bottom: slop }}
      style={{
        height: CHIP_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? colors.stamp : colors.ruleStrong,
        backgroundColor: selected ? colors.stamp : 'transparent',
      }}>
      {category && (
        <View
          style={{
            width: space[2],
            height: space[2],
            borderRadius: radius.full,
            backgroundColor: categories[category],
            borderWidth: selected ? 1 : 0,
            borderColor: colors.onStamp,
          }}
        />
      )}
      <Text style={[type.subhead, { color: selected ? colors.onStamp : colors.ink }]}>{children}</Text>
    </PressableBase>
  );
}
