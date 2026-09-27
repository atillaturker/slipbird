import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

// Shared visual rules (docs/COMPONENTS.md): pressed 0.7, disabled 0.4, focus ring 2px `focus` with 2px offset.
const PRESSED_OPACITY = 0.7;
const DISABLED_OPACITY = 0.4;
const FOCUS_RING = 2;

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function PressableBase({ style, disabled, onFocus, onBlur, children, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={({ pressed }) => [
        style,
        pressed && { opacity: PRESSED_OPACITY },
        disabled && { opacity: DISABLED_OPACITY },
        focused && { outlineWidth: FOCUS_RING, outlineOffset: FOCUS_RING, outlineColor: colors.focus, outlineStyle: 'solid' },
      ]}>
      {children}
    </Pressable>
  );
}
