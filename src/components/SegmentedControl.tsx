import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { PressableBase } from './internal/PressableBase';

type Props = {
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
};

export function SegmentedControl({ options, value, onChange }: Props) {
  const { colors, space, radius, size, type, shadow } = useTheme();
  const inset = space[1] / 2;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: inset,
        borderRadius: radius.sm,
        backgroundColor: colors.paperSunken,
      }}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <PressableBase
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange?.(option)}
            style={[
              {
                flex: 1,
                minHeight: size.hitMin - inset * 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm - inset,
                backgroundColor: selected ? colors.paperRaised : 'transparent',
              },
              selected && { ...shadow.lift, shadowOpacity: shadow.lift.shadowOpacity / 3, elevation: 1 },
            ]}>
            <Text style={[selected ? type.headline : type.subhead, { color: selected ? colors.ink : colors.inkMuted }]}>{option}</Text>
          </PressableBase>
        );
      })}
    </View>
  );
}
