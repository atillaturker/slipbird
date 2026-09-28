import { WarningCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE } from './constants';
import { useFocusScroll } from './FormScreen';

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  prefix?: string;
  figure?: boolean;
  helper?: string;
  error?: string;
  onChangeText?: (v: string) => void;
};

export function TextField({ label, value, placeholder, prefix, figure, helper, error, onChangeText }: Props) {
  const { colors, space, radius, size, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const scrollToField = useFocusScroll();
  const textStyle = figure ? type.figureMd : type.body;

  return (
    <View style={{ gap: space[1] }}>
      <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase' }]}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          minHeight: size.hitMin,
          paddingHorizontal: space[3],
          borderRadius: radius.sm,
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? colors.danger : focused ? colors.focus : colors.rule,
          backgroundColor: colors.paperRaised,
        }}>
        {prefix ? <Text style={[textStyle, { color: colors.inkMuted }]}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          onChangeText={onChangeText}
          keyboardType={figure ? 'decimal-pad' : 'default'}
          onFocus={() => {
            setFocused(true);
            scrollToField();
          }}
          onBlur={() => setFocused(false)}
          selectionColor={colors.stamp}
          style={[textStyle, { flex: 1, color: colors.ink, paddingVertical: space[2] }]}
        />
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
          <WarningCircle size={ICON_SIZE_INLINE} color={colors.danger} />
          <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : helper ? (
        <Text style={[type.caption, { color: colors.inkMuted }]}>{helper}</Text>
      ) : null}
    </View>
  );
}
