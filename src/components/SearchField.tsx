import { MagnifyingGlass, XCircle } from 'phosphor-react-native';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  label: string;
  placeholder?: string;
  clearLabel: string;
};

export function SearchField({ value, onChangeText, label, placeholder, clearLabel }: Props) {
  const { colors, space, radius, size, type } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        minHeight: size.hitMin,
        paddingLeft: space[3],
        borderRadius: radius.sm,
        backgroundColor: colors.paperSunken,
      }}>
      <MagnifyingGlass size={ICON_SIZE_ROW} color={colors.inkMuted} />
      <TextInput
        accessibilityLabel={label}
        accessibilityRole="search"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        selectionColor={colors.stamp}
        returnKeyType="search"
        autoCorrect={false}
        style={[type.body, { flex: 1, color: colors.ink, paddingVertical: space[2] }]}
      />
      {value ? (
        <PressableBase
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText('')}
          style={{ width: size.hitMin, height: size.hitMin, alignItems: 'center', justifyContent: 'center' }}>
          <XCircle size={ICON_SIZE_ROW} color={colors.inkMuted} />
        </PressableBase>
      ) : (
        <View style={{ width: space[1] }} />
      )}
    </View>
  );
}
