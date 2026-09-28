import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { Sheet } from './Sheet';

type Props = {
  visible: boolean;
  /** The saved receipt this one matches, already formatted. */
  existing: { merchant: string; date: string; amount: string } | null;
  onSaveAnyway: () => void;
  onDiscard: () => void;
  onClose: () => void;
};

/** "This looks like a receipt you already saved" — shown before saving a likely duplicate. */
export function DuplicateSheet({ visible, existing, onSaveAnyway, onDiscard, onClose }: Props) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();

  return (
    <Sheet visible={visible} title={t('duplicate.title')} dismissLabel={t('detail.cancel')} onClose={onClose}>
      {existing && <Text style={[type.figureSm, { color: colors.inkMuted }]}>{t('duplicate.body', existing)}</Text>}
      <View style={{ gap: space[3] }}>
        <Button variant="secondary" block onPress={onSaveAnyway}>
          {t('duplicate.saveAnyway')}
        </Button>
        <Button variant="danger" block onPress={onDiscard}>
          {t('duplicate.discard')}
        </Button>
      </View>
    </Sheet>
  );
}
