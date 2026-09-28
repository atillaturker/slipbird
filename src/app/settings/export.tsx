import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, View } from 'react-native';

import { Button, Chip, SegmentedControl } from '@/components';
import { DateField } from '@/components/DateField';
import { FieldLabel } from '@/components/FieldLabel';
import { FormScreen } from '@/components/FormScreen';
import { monthTitle } from '@/lib/dates';
import { isValidRange, presetRange, recentMonths, type RangePreset } from '@/lib/export-range';
import { exportCsv, exportMonthlyPdf, type ExportResult } from '@/services/export';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme';

type Format = 'csv' | 'pdf';
const PRESETS: readonly RangePreset[] = ['thisMonth', 'lastMonth', 'thisYear', 'all', 'custom'];

/** CSV of receipts and items for a date range, or a monthly PDF report; shared through the system sheet. */
export default function ExportScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space, type } = useTheme();
  const home = useSettings((s) => s.homeCurrency);
  const months = useMemo(() => recentMonths(new Date()), []);

  const [format, setFormat] = useState<Format>('csv');
  const [preset, setPreset] = useState<RangePreset>('thisMonth');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [month, setMonth] = useState(months[0].month);
  const [busy, setBusy] = useState(false);

  const formatLabels: Record<Format, string> = { csv: t('export.csv'), pdf: t('export.pdf') };
  const presetLabel = (p: RangePreset) => ({ thisMonth: t('export.thisMonth'), lastMonth: t('export.lastMonth'), thisYear: t('export.thisYear'), all: t('export.allTime'), custom: t('export.custom') })[p];
  const range = presetRange(preset, new Date(), { from, to });
  const rangeError = format === 'csv' && !isValidRange(range) ? t('export.rangeInvalid') : undefined;

  const run = async () => {
    if (rangeError) return;
    setBusy(true);
    try {
      const result: ExportResult = format === 'csv' ? await exportCsv(range) : await exportMonthlyPdf(month);
      if (!result.ok) Alert.alert(result.reason === 'empty' ? t('export.nothing') : t('export.unavailable'), result.reason === 'empty' ? t('export.nothingBody') : undefined);
    } catch {
      Alert.alert(t('export.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('export.title') }} />
      <FormScreen
        footer={
          <Button block disabled={busy || !!rangeError} onPress={() => void run()}>
            {busy ? t('export.preparing') : format === 'csv' ? t('export.exportCsv') : t('export.exportPdf')}
          </Button>
        }>
        <View style={{ gap: space[2] }}>
          <FieldLabel>{t('export.format')}</FieldLabel>
          <SegmentedControl options={Object.values(formatLabels)} value={formatLabels[format]} onChange={(v) => setFormat(v === formatLabels.pdf ? 'pdf' : 'csv')} />
        </View>

        {format === 'csv' ? (
          <>
            <View style={{ gap: space[2] }}>
              <FieldLabel>{t('export.range')}</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {PRESETS.map((p) => (
                  <Chip key={p} selected={preset === p} onPress={() => setPreset(p)}>
                    {presetLabel(p)}
                  </Chip>
                ))}
              </View>
            </View>
            {preset === 'custom' && (
              <View style={{ gap: space[3] }}>
                <DateField label={t('export.from')} value={from} placeholder={t('export.anyDate')} clearLabel={t('filters.clearDate')} maximumDate={new Date()} error={rangeError} onChange={setFrom} onClear={() => setFrom(null)} />
                <DateField label={t('export.to')} value={to} placeholder={t('export.anyDate')} clearLabel={t('filters.clearDate')} maximumDate={new Date()} onChange={setTo} onClear={() => setTo(null)} />
              </View>
            )}
            <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('export.csvHint')}</Text>
          </>
        ) : (
          <>
            <View style={{ gap: space[2] }}>
              <FieldLabel>{t('export.month')}</FieldLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
                {months.map((m) => (
                  <Chip key={m.month} selected={month === m.month} onPress={() => setMonth(m.month)}>
                    {monthTitle(m.month, i18n.language)}
                  </Chip>
                ))}
              </View>
            </View>
            <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('export.pdfHint', { currency: home })}</Text>
          </>
        )}
      </FormScreen>
    </>
  );
}
