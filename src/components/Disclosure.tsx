import { CaretDown, CaretUp } from 'phosphor-react-native';
import { Text } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

/** A collapsible section's header row (e.g. VAT lines on manual entry and review). */
export function Disclosure({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  const { colors, size, type } = useTheme();
  const Caret = open ? CaretUp : CaretDown;
  return (
    <PressableBase
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: size.hitMin }}>
      <Text style={[type.headline, { color: colors.ink }]}>{title}</Text>
      <Caret size={ICON_SIZE_ROW} color={colors.inkMuted} />
    </PressableBase>
  );
}
