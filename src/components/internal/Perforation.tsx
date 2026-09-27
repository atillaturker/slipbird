import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

// Dashed dividers: `rule-strong`, 1.5px, dash 4/3 (docs/COMPONENTS.md).
const DASH_WIDTH = 1.5;
const DASH_PATTERN = '4 3';

export function DashedRule() {
  const { colors } = useTheme();
  return (
    <Svg width="100%" height={DASH_WIDTH} accessible={false}>
      <Line x1="0" y1={DASH_WIDTH / 2} x2="100%" y2={DASH_WIDTH / 2} stroke={colors.ruleStrong} strokeWidth={DASH_WIDTH} strokeDasharray={DASH_PATTERN} />
    </Svg>
  );
}

/** Zigzag points for a torn edge, left to right: triangles `tooth` wide and half as deep, starting at `top`. */
export function tornEdgePoints(width: number, tooth: number, top = 0): [number, number][] {
  const depth = tooth / 2;
  const teeth = Math.max(1, Math.round(width / tooth));
  const step = width / teeth;
  const points: [number, number][] = [[0, top]];
  for (let i = 0; i < teeth; i += 1) {
    points.push([i * step + step / 2, top + depth], [(i + 1) * step, top]);
  }
  return points;
}

/** Torn paper edge in `paper-raised`, drawn directly below a receipt surface. */
export function TornEdge() {
  const { colors, size } = useTheme();
  const [width, setWidth] = useState(0);
  const depth = size.perforation / 2;

  return (
    <View style={{ height: depth }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={depth} accessible={false}>
          <Path d={`M${tornEdgePoints(width, size.perforation).map(([x, y]) => `${x} ${y}`).join(' L')} Z`} fill={colors.paperRaised} />
        </Svg>
      )}
    </View>
  );
}
