import { X } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { PressableBase } from './internal/PressableBase';

// Page previews above the form: tall enough to read a receipt, short enough to leave the fields in view.
const PREVIEW_HEIGHT = 240;

/** The receipt's own photos (resolved URIs), in page order; tap one to see it full screen. */
export function ReceiptPages({ uris }: { uris: string[] }) {
  const { t } = useTranslation();
  const { colors, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(null);

  if (uris.length === 0) return null;

  return (
    <View accessibilityLabel={t('photos.label')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[3] }}>
        {uris.map((uri, i) => (
          <PressableBase key={uri} accessibilityRole="imagebutton" accessibilityLabel={t('photos.open', { n: i + 1 })} onPress={() => setOpen(i)}>
            <Image
              source={{ uri }}
              resizeMode="cover"
              style={{ height: PREVIEW_HEIGHT, aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.paperSunken }}
            />
          </PressableBase>
        ))}
      </ScrollView>

      <Modal visible={open !== null} animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: colors.paperSunken, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[2] }}>
            <Text style={[type.subhead, { color: colors.inkMuted, paddingLeft: space[2] }]}>
              {open !== null && uris.length > 1 ? t('photos.page', { n: open + 1, count: uris.length }) : ''}
            </Text>
            <IconButton icon={X} label={t('photos.close')} onPress={() => setOpen(null)} />
          </View>
          {open !== null && <Image source={{ uri: uris[open] }} resizeMode="contain" style={{ flex: 1 }} accessibilityLabel={t('photos.open', { n: open + 1 })} />}
        </View>
      </Modal>
    </View>
  );
}
