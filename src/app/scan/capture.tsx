import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { WarningCircle, X } from 'phosphor-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components';
import { ICON_SIZE_ROW } from '@/components/constants';
import { IconButton } from '@/components/IconButton';
import { parseGibQr } from '@/lib/gib-qr';
import { ingestQr } from '@/store/scan';
import { useTheme } from '@/theme';

// How long the "not an e-Arşiv QR" note stays before the same code is read again.
const REJECT_COOLDOWN_MS = 2500;

export default function QrCaptureScreen() {
  const { t } = useTranslation();
  const { colors, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [rejected, setRejected] = useState(false);
  const busy = useRef(false);
  const lastRejected = useRef<{ data: string; at: number } | null>(null);

  const close = () => router.back();

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    const last = lastRejected.current;
    if (last && last.data === data && Date.now() - last.at < REJECT_COOLDOWN_MS) return;

    const qr = parseGibQr(data);
    if (!qr) {
      lastRejected.current = { data, at: Date.now() };
      setRejected(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    busy.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = await ingestQr(qr);
    // The merchant isn't in the QR: open review so the person can add it.
    router.replace({ pathname: '/scan/review', params: { id } });
  };

  const closeButton = (
    <View style={{ position: 'absolute', top: insets.top + space[2], right: space[2] }}>
      <IconButton icon={X} label={t('qr.close')} onPress={close} />
    </View>
  );

  if (!permission) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', padding: space[4] }}>
        <EmptyState
          title={t('qr.permissionTitle')}
          body={t('qr.permissionBody')}
          action={
            permission.canAskAgain ? (
              <Button onPress={() => void requestPermission()}>{t('qr.allow')}</Button>
            ) : (
              <Button onPress={() => void Linking.openSettings()}>{t('qr.openSettings')}</Button>
            )
          }
        />
        {closeButton}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => void onScanned(r)} />
      {closeButton}
      <View
        style={{
          position: 'absolute',
          left: space[4],
          right: space[4],
          bottom: insets.bottom + space[6],
          padding: space[4],
          gap: space[2],
          borderRadius: radius.md,
          backgroundColor: colors.paperRaised,
        }}>
        <Text style={[type.body, { color: colors.ink }]}>{t('qr.hint')}</Text>
        {rejected && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }} accessibilityLiveRegion="polite">
            <WarningCircle size={ICON_SIZE_ROW} color={colors.check} />
            <Text style={[type.subhead, { color: colors.check, flex: 1 }]}>{t('qr.notGib')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
