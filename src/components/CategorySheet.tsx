import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { categoryOrder, useTheme, type Category } from '@/theme';

import { Button } from './Button';
import { Chip } from './Chip';
import { Sheet } from './Sheet';

type Props = {
  visible: boolean;
  value: Category;
  onSelect: (category: Category) => void;
  onClose: () => void;
};

export function CategorySheet({ visible, value, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { space } = useTheme();

  return (
    <Sheet visible={visible} title={t('review.pickCategory')} dismissLabel={t('review.done')} onClose={onClose}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        {categoryOrder.map((c) => (
          <Chip
            key={c}
            category={c}
            selected={value === c}
            onPress={() => {
              onSelect(c);
              onClose();
            }}>
            {t(`category.${c}`)}
          </Chip>
        ))}
      </View>
      <Button variant="secondary" block onPress={onClose}>
        {t('review.done')}
      </Button>
    </Sheet>
  );
}
