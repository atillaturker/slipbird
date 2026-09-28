import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  dismissLabel: string;
  onClose: () => void;
  children: ReactNode;
};

/** A bottom sheet over a dimmed backdrop (tap outside or back to close). */
export function Sheet({ visible, title, dismissLabel, onClose, children }: Props) {
  const { colors, space, radius, type } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel={dismissLabel} onPress={onClose} style={{ flex: 1, backgroundColor: colors.ink, opacity: 0.3 }} />
      <View
        accessibilityViewIsModal
        style={{
          backgroundColor: colors.paperRaised,
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          padding: space[4],
          paddingBottom: insets.bottom + space[4],
          gap: space[4],
        }}>
        <Text style={[type.headline, { color: colors.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {children}
      </View>
    </Modal>
  );
}
