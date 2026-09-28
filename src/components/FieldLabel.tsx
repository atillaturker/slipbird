import { Text } from 'react-native';

import { useTheme } from '@/theme';

/** The uppercase caption above a form field or group (same as TextField's label). */
export function FieldLabel({ children }: { children: string }) {
  const { colors, type } = useTheme();
  return <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase' }]}>{children}</Text>;
}
