import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from '@/components';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { ListGroup } from '@/components/ListGroup';
import { Section } from '@/components/Section';
import { SettingsRow } from '@/components/SettingsRow';
import type { LanguageSetting } from '@/lib/language';
import { ensureNotificationPermission } from '@/services/notifications';
import { wipeAllData } from '@/services/wipe';
import { useBudgets } from '@/store/budgets';
import { useReceipts } from '@/store/receipts';
import { useSettings } from '@/store/settings';
import { useSpending } from '@/store/spending';
import { useTheme } from '@/theme';

const LANGUAGES: readonly LanguageSetting[] = ['system', 'en', 'tr'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, homeCurrency, setHomeCurrency, budgetAlerts, setBudgetAlerts } = useSettings();
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const languageLabels: Record<LanguageSetting, string> = { system: t('settings.system'), en: 'English', tr: 'Türkçe' };

  const changeAlerts = async (on: boolean) => {
    if (on && !(await ensureNotificationPermission())) {
      Alert.alert(t('settings.alertsDenied'));
      return;
    }
    setBudgetAlerts(on);
  };

  const confirmDelete = () =>
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteBody'), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await wipeAllData();
            // Every screen reads from these stores: reload them empty.
            useReceipts.getState().clearAll();
            await Promise.all([useSpending.getState().refresh(), useBudgets.getState().refresh()]);
            router.navigate('/');
            Alert.alert(t('settings.deleted'));
          })();
        },
      },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[6], gap: space[6] }}>
      <Stack.Screen options={{ title: t('settings.title') }} />

      <Section title={t('settings.general')}>
        <ListGroup>
          <SettingsRow label={t('settings.homeCurrency')} value={homeCurrency} onPress={() => setCurrencyOpen(true)} />
          <SettingsRow
            label={t('settings.alerts')}
            accessory={
              <Switch
                accessibilityLabel={t('settings.alerts')}
                value={budgetAlerts}
                onValueChange={(on) => void changeAlerts(on)}
                trackColor={{ false: colors.ruleStrong, true: colors.stamp }}
                thumbColor={colors.paperRaised}
              />
            }
          />
        </ListGroup>
        <Text style={[type.caption, { color: colors.inkMuted }]}>{t('settings.alertsHint')}</Text>
        <View style={{ gap: space[2] }}>
          <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase' }]}>{t('settings.language')}</Text>
          <SegmentedControl
            options={LANGUAGES.map((l) => languageLabels[l])}
            value={languageLabels[language]}
            onChange={(v) => setLanguage(LANGUAGES.find((l) => languageLabels[l] === v) ?? 'system')}
          />
        </View>
      </Section>

      <Section title={t('settings.data')}>
        <ListGroup>
          <SettingsRow label={t('settings.export')} onPress={() => router.push('/settings/export')} />
          <SettingsRow label={t('settings.deleteAll')} danger onPress={confirmDelete} />
        </ListGroup>
      </Section>

      <Section title={t('settings.about')}>
        <ListGroup>
          <SettingsRow label={t('settings.privacy')} onPress={() => router.push('/settings/privacy')} />
          <SettingsRow label={t('settings.version')} value={Constants.expoConfig?.version ?? ''} />
        </ListGroup>
      </Section>

      <CurrencyPicker visible={currencyOpen} value={homeCurrency} homeCurrency={homeCurrency} onSelect={setHomeCurrency} onClose={() => setCurrencyOpen(false)} />
    </ScrollView>
  );
}
