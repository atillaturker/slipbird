import { WarningCircle } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_ROW } from './constants';

/**
 * A calm, persistent explanation above a form: why something wasn't filled in and what to do. `check` (amber)
 * with a warning icon and words — status is never colour alone.
 */
export function IssueBanner({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const { colors, space, radius, type } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ gap: space[3], padding: space[4], borderRadius: radius.md, backgroundColor: colors.checkSoft }}>
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        <WarningCircle size={ICON_SIZE_ROW} color={colors.check} />
        <View style={{ flex: 1, gap: space[1] }}>
          <Text style={[type.headline, { color: colors.check }]}>{title}</Text>
          <Text style={[type.subhead, { color: colors.ink }]}>{body}</Text>
        </View>
      </View>
      {action}
    </View>
  );
}
