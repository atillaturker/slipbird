import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components';
import { PRIVACY_URL } from '@/config';
import { useTheme } from '@/theme';

const SECTIONS = ['s1', 's2', 's3', 's4'] as const;

/** What Slipbird does with your data, in plain words; the full policy is the page at PRIVACY_URL (docs/privacy). */
export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={{ padding: space[4], paddingBottom: insets.bottom + space[6], gap: space[6] }}>
      <Stack.Screen options={{ title: t('settings.privacy') }} />
      <Text style={[type.subhead, { color: colors.inkMuted }]}>{t('privacy.draft')}</Text>
      {SECTIONS.map((s) => (
        <View key={s} style={{ gap: space[2] }}>
          <Text style={[type.headline, { color: colors.ink }]} accessibilityRole="header">
            {t(`privacy.${s}Title`)}
          </Text>
          <Text style={[type.body, { color: colors.ink }]}>{t(`privacy.${s}Body`)}</Text>
        </View>
      ))}
      <Button variant="secondary" block onPress={() => void Linking.openURL(PRIVACY_URL)}>
        {t('privacy.online')}
      </Button>
    </ScrollView>
  );
}
