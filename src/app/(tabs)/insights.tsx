import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components';
import { Screen } from '@/components/Screen';

export default function InsightsScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('insights.title')}>
      <EmptyState title={t('insights.emptyTitle')} body={t('insights.emptyBody')} />
    </Screen>
  );
}
