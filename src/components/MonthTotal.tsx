import { ArrowDown, ArrowUp } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE } from './constants';

type Props = {
  label: string;
  amount: string;
  delta?: string;
  deltaDirection?: 'up' | 'down';
  deltaLabel?: string;
};

export function MonthTotal({ label, amount, delta, deltaDirection = 'up', deltaLabel }: Props) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const deltaColor = deltaDirection === 'up' ? colors.danger : colors.stampInk;
  const Arrow = deltaDirection === 'up' ? ArrowUp : ArrowDown;

  return (
    <View style={{ gap: space[1] }}>
      <Text style={[type.subhead, { color: colors.inkMuted }]}>{label}</Text>
      <Text style={[type.figureXl, { color: colors.ink }]} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="header">
        {amount}
      </Text>
      {delta ? (
        <View
          accessible
          accessibilityLabel={[t(deltaDirection === 'up' ? 'monthTotal.up' : 'monthTotal.down'), delta, deltaLabel].filter(Boolean).join(', ')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], flexWrap: 'wrap' }}>
          <Arrow size={ICON_SIZE_INLINE} color={deltaColor} />
          <Text style={[type.figureSm, { color: deltaColor }]}>{delta}</Text>
          {deltaLabel ? <Text style={[type.subhead, { color: colors.inkMuted }]}>{deltaLabel}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
