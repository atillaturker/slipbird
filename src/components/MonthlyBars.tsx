import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

// Bar area height; labels sit above (values) and below (months) in text, not SVG, so they use the type scale.
const CHART_HEIGHT = 120;
const BAR_GAP_RATIO = 0.35;

type Bar = { key: string; label: string; value: number; display: string; current: boolean };

/**
 * Monthly totals as bars, oldest to newest: the current month in `stamp`, the others in `rule-strong`,
 * each with its amount above and month below (docs/SPEC.md §3 Insights). Colour never carries meaning alone:
 * every bar is labelled, and the whole chart has a spoken summary.
 */
export function MonthlyBars({ bars, accessibilityLabel }: { bars: Bar[]; accessibilityLabel: string }) {
  const { colors, space, radius, type } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = bars.length ? width / bars.length : 0;
  const barWidth = slot * (1 - BAR_GAP_RATIO);

  return (
    <View accessible accessibilityLabel={accessibilityLabel} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ gap: space[1] }}>
      <View style={{ flexDirection: 'row' }}>
        {bars.map((b) => (
          <Text key={b.key} numberOfLines={1} adjustsFontSizeToFit style={[type.figureSm, { width: slot, textAlign: 'center', color: b.current ? colors.ink : colors.inkMuted }]}>
            {b.value > 0 ? b.display : ''}
          </Text>
        ))}
      </View>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          <Rect x={0} y={CHART_HEIGHT - 1} width={width} height={1} fill={colors.rule} />
          {bars.map((b, i) => {
            const h = b.value > 0 ? Math.max(2, (b.value / max) * (CHART_HEIGHT - 1)) : 0;
            return (
              <Rect
                key={b.key}
                x={i * slot + (slot - barWidth) / 2}
                y={CHART_HEIGHT - 1 - h}
                width={barWidth}
                height={h}
                rx={radius.xs}
                fill={b.current ? colors.stamp : colors.ruleStrong}
              />
            );
          })}
        </Svg>
      )}
      <View style={{ flexDirection: 'row' }}>
        {bars.map((b) => (
          <Text key={b.key} style={[type.caption, { width: slot, textAlign: 'center', color: b.current ? colors.ink : colors.inkMuted }]}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
