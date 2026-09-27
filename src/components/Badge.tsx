import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

export type BadgeTone = 'neutral' | 'verified' | 'review' | 'over';

type Props = {
  tone?: BadgeTone;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', children }: Props) {
  const { colors, space, radius, type } = useTheme();

  const palette = {
    verified: { background: colors.stampSoft, text: colors.stampInk },
    review: { background: colors.checkSoft, text: colors.check },
    over: { background: colors.dangerSoft, text: colors.danger },
    neutral: { background: colors.paperSunken, text: colors.inkMuted },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: space[2],
        paddingVertical: space[1] / 2,
        borderRadius: radius.xs,
        backgroundColor: palette.background,
      }}>
      <Text style={[type.caption, { color: palette.text }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}
