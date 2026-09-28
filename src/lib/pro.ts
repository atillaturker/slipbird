import type { Category } from '@/theme';

/** The RevenueCat entitlement that unlocks Slipbird Pro. */
export const PRO_ENTITLEMENT = 'pro';

/** What Pro unlocks (docs/SPEC.md M7): unlimited scans, PDF reports, budgets beyond this many categories. */
export const FREE_BUDGET_LIMIT = 3;

export type ProFeature = 'scans' | 'pdfReport' | 'moreBudgets';

/**
 * Whether a budget can be set for `category`: changing an existing budget is always fine; adding a new one is
 * free up to FREE_BUDGET_LIMIT categories, then needs Pro.
 */
export function canSetBudget(existingCategories: readonly Category[], category: Category, isPro: boolean): boolean {
  if (isPro || existingCategories.includes(category)) return true;
  return existingCategories.length < FREE_BUDGET_LIMIT;
}

/** True when the customer's entitlements (RevenueCat CustomerInfo.entitlements.active shape) include Pro. */
export function hasProEntitlement(active: Record<string, { isActive?: boolean }> | null | undefined): boolean {
  const entitlement = active?.[PRO_ENTITLEMENT];
  return !!entitlement && entitlement.isActive !== false;
}

/**
 * How much cheaper the yearly plan is than twelve months of the monthly plan, as a whole percent (0–99).
 * Null when either price is missing or the yearly plan isn't cheaper.
 */
export function yearlySavingsPercent(monthlyPrice: number | null | undefined, yearlyPrice: number | null | undefined): number | null {
  if (!monthlyPrice || !yearlyPrice || monthlyPrice <= 0 || yearlyPrice <= 0) return null;
  const percent = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);
  return percent > 0 && percent < 100 ? percent : null;
}
