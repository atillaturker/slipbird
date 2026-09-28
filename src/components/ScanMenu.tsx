import { Images, QrCode } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';

type Props = {
  visible: boolean;
  onImport: () => void;
  onScanQr: () => void;
  onClose: () => void;
};

/** The scan button's long-press options: import from photos, scan an e-Arşiv QR. */
export function ScanMenu({ visible, onImport, onScanQr, onClose }: Props) {
  const { t } = useTranslation();
  const { colors, space, radius, size, type } = useTheme();
  const insets = useSafeAreaInsets();

  const option = (Icon: typeof Images, label: string, action: () => void) => (
    <PressableBase
      accessibilityRole="button"
      onPress={() => {
        onClose();
        action();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: size.hitMin + space[2], paddingHorizontal: space[4] }}>
      <Icon size={ICON_SIZE_ROW} color={colors.ink} />
      <Text style={[type.body, { color: colors.ink }]}>{label}</Text>
    </PressableBase>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('scan.cancel')} onPress={onClose} style={{ flex: 1, backgroundColor: colors.ink, opacity: 0.3 }} />
      <View
        accessibilityViewIsModal
        style={{
          backgroundColor: colors.paperRaised,
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          paddingTop: space[4],
          paddingBottom: insets.bottom + space[4],
          gap: space[1],
        }}>
        <Text style={[type.caption, { color: colors.inkMuted, textTransform: 'uppercase', paddingHorizontal: space[4], paddingBottom: space[2] }]}>
          {t('scan.menuTitle')}
        </Text>
        {option(Images, t('scan.importPhotos'), onImport)}
        {option(QrCode, t('scan.scanQr'), onScanQr)}
        <View style={{ paddingHorizontal: space[4], paddingTop: space[2] }}>
          <Button variant="secondary" block onPress={onClose}>
            {t('scan.cancel')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
