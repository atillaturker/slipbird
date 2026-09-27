import { Check, WarningCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_ROW } from './constants';

type Props = {
  label: string;
  value?: string;
  figure?: boolean;
  confidence?: 'high' | 'low';
  flag?: string;
  onChangeText?: (v: string) => void;
};

export function ReviewField({ label, value, figure, confidence = 'high', flag, onChangeText }: Props) {
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
        <View accessible accessibilityLabel={low ? t('reviewField.check') : t('reviewField.confirmed')}>
          {low ? <WarningCircle size={ICON_SIZE_ROW} color={colors.check} /> : <Check size={ICON_SIZE_ROW} color={colors.stampInk} />}
        </View>
      </View>
      {low && flag ? <Text style={[type.subhead, { color: colors.check }]}>{flag}</Text> : null}
    </View>
  );
}
