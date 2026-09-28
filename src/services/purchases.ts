import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PACKAGE_TYPE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

// RevenueCat public SDK keys (safe in the app; the secret key lives only in function secrets).
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

/** False in builds without a RevenueCat key (development without Pro set up): Pro stays off, nothing crashes. */
export const purchasesAvailable = !!apiKey;

let configured = false;

/**
 * Starts RevenueCat with `appUserId` (the Supabase user id — Slipbird has no accounts) and reports every
 * change of the customer's entitlements. Safe to call more than once.
 */
export function configurePurchases(appUserId: string, onCustomerInfo: (info: CustomerInfo) => void): boolean {
  if (!apiKey) return false;
  if (configured) return true;
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey, appUserID: appUserId });
  Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
  configured = true;
  void Purchases.getCustomerInfo().then(onCustomerInfo).catch(() => undefined);
  return true;
}

export type Plans = { monthly: PurchasesPackage | null; yearly: PurchasesPackage | null };

/** The monthly and yearly packages of the current offering; null when offline or nothing is set up. */
export async function loadPlans(): Promise<Plans | null> {
  if (!configured) return null;
  try {
    const { current } = await Purchases.getOfferings();
    if (!current) return null;
    const find = (type: PACKAGE_TYPE) => current.availablePackages.find((p) => p.packageType === type) ?? null;
    const plans = { monthly: find(PACKAGE_TYPE.MONTHLY), yearly: find(PACKAGE_TYPE.ANNUAL) };
    return plans.monthly || plans.yearly ? plans : null;
  } catch {
    return null;
  }
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'failed';

export async function purchase(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    await Purchases.purchasePackage(pkg);
    return 'purchased';
  } catch (error) {
    return (error as { userCancelled?: boolean | null }).userCancelled ? 'cancelled' : 'failed';
  }
}

/** Restores purchases made with the same store account (a new phone, a reinstall). Null on failure. */
export async function restore(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

/** Opens the store's subscription management page. */
export async function manageSubscription(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch {
    // The store page couldn't open; nothing else to do.
  }
}
