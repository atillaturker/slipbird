import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarBlank, WarningCircle } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Text, View } from 'react-native';

import { formatReceiptDate, fromISODate, toISODate } from '@/lib/dates';
import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE, ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

type Props = {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (iso: string) => void;
  maximumDate?: Date;
  error?: string;
};

/** A date in the receipt's figure font; opens the system date picker (Android dialog, iOS inline calendar). */
export function DateField({ label, value, onChange, maximumDate, error }: Props) {
  const { i18n } = useTranslation();
  const { scheme, colors, space, radius, size, type } = useTheme();
  const [open, setOpen] = useState(false);
  const date = fromISODate(value) ?? new Date();

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        maximumDate,
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) onChange(toISODate(picked));
        },
      });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <View style={{ gap: space[1] }}>
      <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase' }]}>{label}</Text>
      <PressableBase
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${formatReceiptDate(value, null, i18n.language)}`}
        accessibilityState={{ expanded: Platform.OS === 'ios' ? open : undefined }}
        onPress={press}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          minHeight: size.hitMin,
          paddingHorizontal: space[3],
          borderRadius: radius.sm,
          borderWidth: error || open ? 2 : 1,
          borderColor: error ? colors.danger : open ? colors.focus : colors.rule,
          backgroundColor: colors.paperRaised,
        }}>
        <Text style={[type.figureMd, { flex: 1, color: colors.ink }]}>{formatReceiptDate(value, null, i18n.language)}</Text>
        <CalendarBlank size={ICON_SIZE_ROW} color={colors.inkMuted} />
      </PressableBase>
      {open && Platform.OS === 'ios' ? (
        <RNDateTimePicker
          value={date}
          mode="date"
          display="inline"
          maximumDate={maximumDate}
          locale={i18n.language}
          themeVariant={scheme}
          accentColor={colors.stamp}
          onChange={(_, picked) => {
            if (picked) onChange(toISODate(picked));
          }}
        />
      ) : null}
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
          <WarningCircle size={ICON_SIZE_INLINE} color={colors.danger} />
          <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
