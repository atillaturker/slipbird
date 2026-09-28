import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarBlank, WarningCircle, X } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Text, View } from 'react-native';

import { formatReceiptDate, fromISODate, toISODate } from '@/lib/dates';
import { useTheme } from '@/theme';

import { ICON_SIZE_INLINE, ICON_SIZE_ROW } from './constants';
import { IconButton } from './IconButton';
import { PressableBase } from './internal/PressableBase';

type Props = {
  label: string;
  /** YYYY-MM-DD, or null for an open (unset) date. */
  value: string | null;
  onChange: (iso: string) => void;
  /** Shown while `value` is null (e.g. "Any date"). */
  placeholder?: string;
  /** With `onClear`, a set date can be cleared again. */
  clearLabel?: string;
  onClear?: () => void;
  maximumDate?: Date;
  error?: string;
};

/** A date in the receipt's figure font; opens the system date picker (Android dialog, iOS inline calendar). */
export function DateField({ label, value, onChange, placeholder, clearLabel, onClear, maximumDate, error }: Props) {
  const { i18n } = useTranslation();
  const { scheme, colors, space, radius, size, type } = useTheme();
  const [open, setOpen] = useState(false);
  const date = (value ? fromISODate(value) : null) ?? new Date();
  const shown = value ? formatReceiptDate(value, null, i18n.language) : (placeholder ?? '');

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <PressableBase
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${shown}`}
          accessibilityState={{ expanded: Platform.OS === 'ios' ? open : undefined }}
          onPress={press}
          style={{
            flex: 1,
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
          <Text style={[type.figureMd, { flex: 1, color: value ? colors.ink : colors.inkMuted }]}>{shown}</Text>
          <CalendarBlank size={ICON_SIZE_ROW} color={colors.inkMuted} />
        </PressableBase>
        {value && onClear ? <IconButton icon={X} label={clearLabel ?? ''} tone="muted" onPress={onClear} /> : null}
      </View>
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
