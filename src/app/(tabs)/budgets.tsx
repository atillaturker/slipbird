import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components';
import { Screen } from '@/components/Screen';

export default function BudgetsScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('budgets.title')}>
      <EmptyState title={t('budgets.emptyTitle')} body={t('budgets.emptyBody')} />
    </Screen>
  );
}
