import { CaretRight, Check, WarningCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE, ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

type Props = {
  label: string;
  value?: string;
  figure?: boolean;
  confidence?: 'high' | 'low';
  flag?: string;
  onChangeText?: (v: string) => void;
  /** Makes the field a read-only row that opens a picker (date, currency, category). */
  onPress?: () => void;
};

export function ReviewField({ label, value, figure, confidence = 'high', flag, onChangeText, onPress }: Props) {
  const { t } = useTranslation();
  const { colors, space, size, type } = useTheme();
  // Editing a low field clears its flag: the person has now checked it.
  const [edited, setEdited] = useState(false);
  const low = confidence === 'low' && !edited;

  return (
    <View
      style={{
        paddingHorizontal: space[4],
        paddingVertical: space[3],
        gap: space[1],
        backgroundColor: low ? colors.checkSoft : colors.paperRaised,
      }}>
      <Text style={[type.caption, { color: low ? colors.check : colors.inkMuted, textTransform: 'uppercase' }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: size.hitMin - space[3] }}>
        {onPress ? (
          <PressableBase
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${value ?? ''}`}
            accessibilityHint={low ? (flag ?? t('reviewField.check')) : undefined}
            onPress={onPress}
            hitSlop={{ top: space[3], bottom: space[3] }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
            <Text style={[figure ? type.figureMd : type.body, { flex: 1, color: colors.ink }]} numberOfLines={1}>
              {value}
            </Text>
            <CaretRight size={ICON_SIZE_INLINE} color={colors.inkMuted} />
          </PressableBase>
        ) : (
          <TextInput
            accessibilityLabel={label}
            accessibilityHint={low ? (flag ?? t('reviewField.check')) : undefined}
            value={value}
            onChangeText={(v) => {
              setEdited(true);
              onChangeText?.(v);
            }}
            keyboardType={figure ? 'decimal-pad' : 'default'}
            selectionColor={colors.stamp}
            style={[figure ? type.figureMd : type.body, { flex: 1, color: colors.ink, padding: 0 }]}
          />
        )}
        <View accessible accessibilityLabel={low ? t('reviewField.check') : t('reviewField.confirmed')}>
          {low ? <WarningCircle size={ICON_SIZE_ROW} color={colors.check} /> : <Check size={ICON_SIZE_ROW} color={colors.stampInk} />}
        </View>
      </View>
      {low && flag ? <Text style={[type.subhead, { color: colors.check }]}>{flag}</Text> : null}
    </View>
  );
}
