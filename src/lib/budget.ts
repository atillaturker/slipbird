export type BudgetLevel = 'ok' | 'near' | 'over';

/** Share of the budget at which the bar turns amber and the first alert fires. */
export const BUDGET_NEAR_RATIO = 0.8;

/**
 * Where a monthly budget stands: under 80% `ok`, 80–100% `near`, above 100% `over`.
 * `ratio` is clamped to 0…1 for drawing the bar; over budget draws a full bar.
 */
export function budgetState(spent: number, limit: number): { level: BudgetLevel; ratio: number } {
  if (limit <= 0) {
    return spent > 0 ? { level: 'over', ratio: 1 } : { level: 'ok', ratio: 0 };
  }
  const raw = Math.max(0, spent) / limit;
  const level: BudgetLevel = raw > 1 ? 'over' : raw >= BUDGET_NEAR_RATIO ? 'near' : 'ok';
  return { level, ratio: Math.min(1, raw) };
}
