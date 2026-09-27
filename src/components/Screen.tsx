import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** A scrolling tab screen: title, gutter, and `space[12]` at the end so the scan button never covers content. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingHorizontal: space[4], paddingBottom: space[12], gap: space[6] }}>
      <Text style={[type.title1, { color: colors.ink }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}
