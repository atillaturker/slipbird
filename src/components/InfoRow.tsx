import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

/** A label/value line inside a list group (detail screen). */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  const { colors, space, size, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.hitMin, paddingHorizontal: space[4], paddingVertical: space[2] }}>
      <Text style={[type.subhead, { color: colors.inkMuted }]}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space[2] }}>
        {typeof children === 'string' ? <Text style={[type.body, { color: colors.ink, textAlign: 'right', flexShrink: 1 }]}>{children}</Text> : children}
      </View>
    </View>
  );
}
