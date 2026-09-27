import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState } from '@/components';
import { Screen } from '@/components/Screen';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('home.title')}>
      <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} action={<Button>{t('home.emptyAction')}</Button>} />
      {__DEV__ && (
        <Button variant="ghost" size="md" onPress={() => router.push('/dev/components')}>
          {t('dev.open')}
        </Button>
      )}
    </Screen>
  );
}
