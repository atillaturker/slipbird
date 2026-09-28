import * as Haptics from 'expo-haptics';
import { Scan } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { PressableBase } from './internal/PressableBase';

const ICON_SIZE = 28;

type Props = {
  onPress?: () => void;
  onLongPress?: () => void;
  label?: string;
};

export function ScanButton({ onPress, onLongPress, label }: Props) {
  const { t } = useTranslation();
  const { colors, radius, size, shadow } = useTheme();

  return (
    <PressableBase
      accessibilityRole="button"
      accessibilityLabel={label ?? t('scan.button')}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      onLongPress={
        onLongPress &&
        (() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        })
      }
      style={[
        {
          width: size.scanButton,
          height: size.scanButton,
          borderRadius: radius.full,
          backgroundColor: colors.stamp,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadow.lift,
      ]}>
      <Scan size={ICON_SIZE} color={colors.onStamp} weight="regular" />
    </PressableBase>
  );
}
