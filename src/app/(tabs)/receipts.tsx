import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components';
import { Screen } from '@/components/Screen';

export default function ReceiptsScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('receipts.title')}>
      <EmptyState title={t('receipts.emptyTitle')} body={t('receipts.emptyBody')} />
    </Screen>
  );
}
