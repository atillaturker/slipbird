import { CaretDown } from 'phosphor-react-native';
import { Text } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE } from './constants';
import { PressableBase } from './internal/PressableBase';

/** Shows the chosen ISO code beside an amount field; opens the currency picker. */
export function CurrencyButton({ code, label, onPress }: { code: string; label: string; onPress: () => void }) {
  const { colors, space, radius, size, type } = useTheme();
  return (
    <PressableBase
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        minHeight: size.hitMin,
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.ruleStrong,
        backgroundColor: colors.paperRaised,
      }}>
      <Text style={[type.figureMd, { color: colors.ink }]}>{code}</Text>
      <CaretDown size={ICON_SIZE_INLINE} color={colors.inkMuted} />
    </PressableBase>
  );
}
