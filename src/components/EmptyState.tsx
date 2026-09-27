import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

import { tornEdgePoints } from './internal/Perforation';

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const { colors, space, type } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: space[3], paddingVertical: space[8], paddingHorizontal: space[6] }}>
      <BlankSlip />
      <Text style={[type.title2, { color: colors.ink, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: colors.inkMuted, textAlign: 'center' }]}>{body}</Text>
      {action ? <View style={{ marginTop: space[3] }}>{action}</View> : null}
    </View>
  );
}

/** The blank-slip glyph: an empty receipt with a torn bottom edge. */
function BlankSlip() {
  const { colors, space, size } = useTheme();
  const width = space[12];
  const height = space[12] + space[4];
  const tooth = size.perforation;
  const body = height - tooth / 2;
  const inset = space[2];
  // Outline: top edge, down the right side, torn bottom right-to-left, back up the left side.
  const torn = tornEdgePoints(width, tooth, body)
    .reverse()
    .map(([x, y]) => `L${x + 1} ${y}`)
    .join(' ');
  const d = `M1 1 L${width + 1} 1 L${width + 1} ${body} ${torn} Z`;

  return (
    <Svg width={width + 2} height={height + 2} accessible={false}>
      <Path d={d} fill={colors.paperRaised} stroke={colors.ruleStrong} strokeWidth={1.5} strokeLinejoin="round" />
      <Line x1={inset} y1={space[3]} x2={width - inset} y2={space[3]} stroke={colors.rule} strokeWidth={2} strokeLinecap="round" />
      <Line x1={inset} y1={space[4] + space[1]} x2={width / 2} y2={space[4] + space[1]} stroke={colors.rule} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
