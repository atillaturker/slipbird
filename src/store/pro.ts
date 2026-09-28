import { router } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { hasProEntitlement, type ProFeature } from '@/lib/pro';
import { configurePurchases } from '@/services/purchases';
import { getUserId } from '@/services/supabase';

const DEV_PRO_KEY = 'devPro';

type ProState = {
  /** RevenueCat says the `pro` entitlement is active. */
  entitled: boolean;
  /** Development only: pretend Pro is on, to try the gated screens without a store product. */
  devPro: boolean;
  setEntitled: (entitled: boolean) => void;
  setDevPro: (on: boolean) => void;
};

export const useProStore = create<ProState>((set) => ({
  entitled: false,
  devPro: __DEV__ && Storage.getItemSync(DEV_PRO_KEY) === 'true',
  setEntitled: (entitled) => set({ entitled }),
  setDevPro: (on) => {
    Storage.setItemSync(DEV_PRO_KEY, on ? 'true' : 'false');
    set({ devPro: on });
  },
}));

/** Whether Slipbird Pro is active (a real subscription, or the development switch in dev builds). */
export function useIsPro(): boolean {
  return useProStore((s) => s.entitled || (__DEV__ && s.devPro));
}

/** Starts RevenueCat once there is a user id (after the anonymous sign-in). */
export async function startPurchases(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  configurePurchases(userId, (info) => useProStore.getState().setEntitled(hasProEntitlement(info.entitlements.active)));
}

/** For gated actions: `requirePro(feature)` is true when allowed, otherwise opens the paywall and returns false. */
export function useProGate(): { isPro: boolean; requirePro: (feature: ProFeature) => boolean; openPaywall: (feature?: ProFeature) => void } {
  const isPro = useIsPro();
  const openPaywall = (feature?: ProFeature) => router.push({ pathname: '/paywall', params: feature ? { feature } : {} });
  return {
    isPro,
    openPaywall,
    requirePro: (feature) => {
      if (isPro) return true;
      openPaywall(feature);
      return false;
    },
  };
}
