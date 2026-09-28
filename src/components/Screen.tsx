import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** Title row of a tab screen, with an optional action on the right. */
export function ScreenHeader({ title, action }: { title: string; action?: ReactNode }) {
  const { colors, space, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] }}>
      <Text style={[type.title1, { color: colors.ink, flexShrink: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}

/** A scrolling tab screen: title, gutter, and `space[12]` at the end so the scan button never covers content. */
export function Screen({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  const { colors, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingTop: insets.top + space[4], paddingHorizontal: space[4], paddingBottom: space[12], gap: space[6] }}>
      <ScreenHeader title={title} action={action} />
      {children}
    </ScrollView>
  );
}
