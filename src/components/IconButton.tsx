import type { Icon } from 'phosphor-react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

type Props = {
  icon: Icon;
  label: string;
  onPress?: () => void;
  tone?: 'ink' | 'stamp' | 'muted';
  size?: number;
};

/** An icon-only action with a full `hitMin` touch target and an accessibility label. */
export function IconButton({ icon: IconGlyph, label, onPress, tone = 'ink', size }: Props) {
  const { colors, radius, size: sizes } = useTheme();
  const color = { ink: colors.ink, stamp: colors.stampInk, muted: colors.inkMuted }[tone];

  return (
    <PressableBase
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: sizes.hitMin, height: sizes.hitMin, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }}>
      <IconGlyph size={size ?? ICON_SIZE_ROW} color={color} weight="regular" />
    </PressableBase>
  );
}
