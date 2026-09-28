import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState } from '@/components';
import { Screen } from '@/components/Screen';
import { useScanActions } from '@/store/scan';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { scan } = useScanActions();

  return (
    <Screen title={t('home.title')}>
      <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} action={<Button onPress={() => void scan()}>{t('home.emptyAction')}</Button>} />
      {__DEV__ && (
        <Button variant="ghost" size="md" onPress={() => router.push('/dev/components')}>
          {t('dev.open')}
        </Button>
      )}
    </Screen>
  );
}
