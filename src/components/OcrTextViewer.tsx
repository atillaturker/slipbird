import { X } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { IconButton } from './IconButton';

/**
 * Dev builds only: the exact text sent to parse-receipt, so a missing item can be traced to OCR (never read)
 * or to the model (read but dropped).
 */
export function OcrTextViewer({ visible, text, onClose }: { visible: boolean; text: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const insets = useSafeAreaInsets();
  const lines = text ? text.split('\n').filter((l) => l.trim()).length : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingBottom: insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[4], gap: space[3] }}>
          <View style={{ flex: 1, gap: space[1] }}>
            <Text style={[type.headline, { color: colors.ink }]} accessibilityRole="header">
              {t('dev.ocrTitle')}
            </Text>
            {text ? <Text style={[type.caption, { color: colors.inkMuted }]}>{t('dev.ocrMeta', { lines, chars: text.length })}</Text> : null}
          </View>
          <IconButton icon={X} label={t('dev.close')} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[6] }}>
          <ScrollView horizontal>
            <Text selectable style={[type.figureSm, { color: colors.ink }]}>
              {text ?? t('dev.ocrNone')}
            </Text>
          </ScrollView>
        </ScrollView>
      </View>
    </Modal>
  );
}
