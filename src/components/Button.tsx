import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { useTheme } from '@/theme';

import { PressableBase } from './internal/PressableBase';

// Heights from docs/COMPONENTS.md: lg 52px (default), md 40px.
const HEIGHT = { lg: 52, md: 40 } as const;

type Props = {
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md';
  block?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export function Button({ onPress, variant = 'primary', size = 'lg', block, disabled, children }: Props) {
  const { colors, space, radius, type, size: sizes } = useTheme();
  const slop = Math.max(0, (sizes.hitMin - HEIGHT[size]) / 2);

  const palette = {
    primary: { background: colors.stamp, border: colors.stamp, text: colors.onStamp },
    secondary: { background: colors.paperRaised, border: colors.ruleStrong, text: colors.ink },
    ghost: { background: 'transparent', border: 'transparent', text: colors.stampInk },
    danger: { background: colors.dangerSoft, border: colors.dangerSoft, text: colors.danger },
  }[variant];

  return (
    <PressableBase
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      hitSlop={{ top: slop, bottom: slop }}
      style={{
        height: HEIGHT[size],
        paddingHorizontal: size === 'lg' ? space[6] : space[4],
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: block ? 'stretch' : 'flex-start',
      }}>
      <Text style={[type.headline, { color: palette.text }]} numberOfLines={1}>
        {children}
      </Text>
    </PressableBase>
  );
}
