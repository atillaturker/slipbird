import { CaretRight } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE } from './constants';
import { PressableBase } from './internal/PressableBase';

type Props = {
  label: string;
  /** Current value shown on the right (muted). */
  value?: string;
  /** A control on the right instead of a value (e.g. a Switch). */
  accessory?: ReactNode;
  onPress?: () => void;
  /** Destructive rows are `danger` (word and colour). */
  danger?: boolean;
};

/** A row in a settings group: label, optional value or control, and a caret when it opens something. */
export function SettingsRow({ label, value, accessory, onPress, danger }: Props) {
  const { colors, space, size, type } = useTheme();
  const content = (
    <>
      <Text style={[type.body, { flex: 1, color: danger ? colors.danger : colors.ink }]}>{label}</Text>
      {value ? <Text style={[type.body, { color: colors.inkMuted }]}>{value}</Text> : null}
      {accessory}
      {onPress && !accessory ? <CaretRight size={ICON_SIZE_INLINE} color={colors.inkMuted} /> : null}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: space[3], minHeight: size.hitMin + space[2], paddingHorizontal: space[4] };

  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <PressableBase accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} style={style}>
      {content}
    </PressableBase>
  );
}
