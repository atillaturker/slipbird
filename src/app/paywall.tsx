import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button, EmptyState } from '@/components';
import { ICON_SIZE_ROW } from '@/components/constants';
import { FormScreen } from '@/components/FormScreen';
import { PressableBase } from '@/components/internal/PressableBase';
import { PRIVACY_URL, TERMS_URL } from '@/config';
import { hasProEntitlement, yearlySavingsPercent, type ProFeature } from '@/lib/pro';
import { loadPlans, manageSubscription, purchase, purchasesAvailable, restore, type Plans } from '@/services/purchases';
import { useIsPro, useProStore } from '@/store/pro';
import { useTheme } from '@/theme';

type Plan = 'monthly' | 'yearly';
const FEATURES: readonly ProFeature[] = ['scans', 'pdfReport', 'moreBudgets'];

/** Slipbird Pro: what it unlocks and the monthly / yearly plans. Prices come from the store, never from us. */
export default function PaywallScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const isPro = useIsPro();
  const [plans, setPlans] = useState<Plans | null | undefined>(undefined); // undefined = loading
  const [selected, setSelected] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isPro) return;
    let active = true;
    void loadPlans().then((loaded) => {
      if (active) setPlans(loaded);
    });
    return () => {
      active = false;
    };
  }, [isPro, attempt]);

  const retry = () => {
    setPlans(undefined);
    setAttempt((a) => a + 1);
  };

  const reason = FEATURES.find((f) => f === feature);
  const plan: Plan | null = selected ?? (plans?.yearly ? 'yearly' : plans?.monthly ? 'monthly' : null);
  const chosen: PurchasesPackage | null = plan && plans ? plans[plan] : null;
  const savings = yearlySavingsPercent(plans?.monthly?.product.price, plans?.yearly?.product.price);

  const buy = async () => {
    if (!chosen) return;
    setBusy(true);
    const result = await purchase(chosen);
    setBusy(false);
    if (result === 'purchased') router.back();
    else if (result === 'failed') Alert.alert(t('pro.failed'));
  };

  const restorePurchases = async () => {
    setBusy(true);
    const info = await restore();
    setBusy(false);
    if (info && hasProEntitlement(info.entitlements.active)) {
      useProStore.getState().setEntitled(true);
      Alert.alert(t('pro.restored'));
      router.back();
    } else {
      Alert.alert(t('pro.nothingToRestore'));
    }
  };

  const screen = <Stack.Screen options={{ title: t('pro.title') }} />;

  if (isPro) {
    return (
      <>
        {screen}
        <FormScreen
          footer={
            <Button block variant="secondary" onPress={() => void manageSubscription()}>
              {t('pro.manage')}
            </Button>
          }>
          <EmptyState title={t('pro.active')} body={t('pro.activeBody')} />
        </FormScreen>
      </>
    );
  }

  return (
    <>
      {screen}
      <FormScreen
        footer={
          plans ? (
            <>
              <Button block disabled={busy || !chosen} onPress={() => void buy()}>
                {t('pro.continue')}
              </Button>
              <Button variant="ghost" size="md" block disabled={busy} onPress={() => void restorePurchases()}>
                {t('pro.restore')}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="md" block disabled={busy} onPress={() => void restorePurchases()}>
              {t('pro.restore')}
            </Button>
          )
        }>
        <View style={{ gap: space[2] }}>
          <Text style={[type.title1, { color: colors.ink }]} accessibilityRole="header">
            {t('pro.title')}
          </Text>
          <Text style={[type.body, { color: colors.inkMuted }]}>{reason ? t(`pro.why_${reason}`) : t('pro.tagline')}</Text>
        </View>

        <View style={{ gap: space[3] }}>
          {(['benefitScans', 'benefitPdf', 'benefitBudgets'] as const).map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <Check size={ICON_SIZE_ROW} color={colors.stampInk} />
              <Text style={[type.body, { flex: 1, color: colors.ink }]}>{t(`pro.${key}`)}</Text>
            </View>
          ))}
        </View>

        {plans === undefined ? null : plans === null ? (
          <EmptyState
            title={t('pro.unavailable')}
            body={purchasesAvailable ? t('pro.unavailableBody') : t('pro.notInBuild')}
            action={purchasesAvailable ? <Button variant="secondary" size="md" onPress={retry}>{t('pro.retry')}</Button> : undefined}
          />
        ) : (
          <View style={{ gap: space[3] }}>
            {plans.yearly && (
              <PlanCard
                label={t('pro.yearly')}
                price={t('pro.perYear', { price: plans.yearly.product.priceString })}
                badge={savings ? t('pro.save', { percent: savings }) : undefined}
                selected={plan === 'yearly'}
                onPress={() => setSelected('yearly')}
              />
            )}
            {plans.monthly && (
              <PlanCard label={t('pro.monthly')} price={t('pro.perMonth', { price: plans.monthly.product.priceString })} selected={plan === 'monthly'} onPress={() => setSelected('monthly')} />
            )}
            <Text style={[type.caption, { color: colors.inkMuted }]}>{t('pro.legal')}</Text>
            <View style={{ flexDirection: 'row', gap: space[4] }}>
              <Button variant="ghost" size="md" onPress={() => void Linking.openURL(PRIVACY_URL)}>
                {t('pro.privacy')}
              </Button>
              <Button variant="ghost" size="md" onPress={() => void Linking.openURL(TERMS_URL)}>
                {t('pro.terms')}
              </Button>
            </View>
          </View>
        )}
      </FormScreen>
    </>
  );
}

function PlanCard({ label, price, badge, selected, onPress }: { label: string; price: string; badge?: string; selected: boolean; onPress: () => void }) {
  const { colors, space, radius, size, type } = useTheme();
  return (
    <PressableBase
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[label, price, badge].filter(Boolean).join(', ')}
      onPress={onPress}
      style={{
        minHeight: size.hitMin + space[4],
        justifyContent: 'center',
        gap: space[1],
        padding: space[4],
        borderRadius: radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.stamp : colors.rule,
        backgroundColor: selected ? colors.stampSoft : colors.paperRaised,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] }}>
        <Text style={[type.headline, { color: colors.ink }]}>{label}</Text>
        {badge ? <Text style={[type.caption, { color: colors.stampInk }]}>{badge}</Text> : null}
      </View>
      <Text style={[type.figureMd, { color: colors.ink }]}>{price}</Text>
    </PressableBase>
  );
}
