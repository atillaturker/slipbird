import { Images, QrCode } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { ICON_SIZE_ROW } from './constants';
import { PressableBase } from './internal/PressableBase';
import { Sheet } from './Sheet';

type Props = {
  visible: boolean;
  onImport: () => void;
  onScanQr: () => void;
  onClose: () => void;
};

/** The scan button's long-press options: import from photos, scan an e-Arşiv QR. */
export function ScanMenu({ visible, onImport, onScanQr, onClose }: Props) {
  const { t } = useTranslation();
  const { colors, space, size, type } = useTheme();

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
    <Sheet visible={visible} title={t('scan.menuTitle')} dismissLabel={t('scan.cancel')} onClose={onClose}>
      <View style={{ marginHorizontal: -space[4] }}>
        {option(Images, t('scan.importPhotos'), onImport)}
        {option(QrCode, t('scan.scanQr'), onScanQr)}
      </View>
      <Button variant="secondary" block onPress={onClose}>
        {t('scan.cancel')}
      </Button>
    </Sheet>
  );
}
