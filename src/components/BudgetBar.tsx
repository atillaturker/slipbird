import { WarningCircle } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { budgetState } from '@/lib/budget';
import { useTheme, type Category } from '@/theme';

import { ICON_SIZE_INLINE } from './constants';

type Props = {
  category: Category;
  label?: string;
  spent: number;
  limit: number;
  spentDisplay: string;
  limitDisplay: string;
  leftDisplay?: string;
  overDisplay?: string;
};

export function BudgetBar({ category, label, spent, limit, spentDisplay, limitDisplay, leftDisplay, overDisplay }: Props) {
  const { t } = useTranslation();
  const { colors, categories, space, radius, type } = useTheme();
  const { level, ratio } = budgetState(spent, limit);
  const name = label ?? t(`category.${category}`);

  const barColor = { ok: colors.stamp, near: colors.check, over: colors.danger }[level];
  const note = level === 'over' ? overDisplay : leftDisplay;
  const noteColor = { ok: colors.inkMuted, near: colors.check, over: colors.danger }[level];

  return (
    <View
      accessible
      accessibilityLabel={[name, `${spentDisplay} / ${limitDisplay}`, note].filter(Boolean).join(', ')}
      style={{ gap: space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <View style={{ width: space[2], height: space[2], borderRadius: radius.full, backgroundColor: categories[category] }} />
        <Text style={[type.headline, { flex: 1, color: colors.ink }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[type.figureSm, { color: colors.ink }]}>{spentDisplay}</Text>
        <Text style={[type.figureSm, { color: colors.inkMuted }]}>/ {limitDisplay}</Text>
      </View>
      <View style={{ height: space[2], borderRadius: radius.full, backgroundColor: colors.paperSunken, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: radius.full, backgroundColor: barColor }} />
      </View>
      {note ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
          {level !== 'ok' && <WarningCircle size={ICON_SIZE_INLINE} color={noteColor} />}
          <Text style={[type.subhead, { color: noteColor }]}>{note}</Text>
        </View>
      ) : null}
    </View>
  );
}
