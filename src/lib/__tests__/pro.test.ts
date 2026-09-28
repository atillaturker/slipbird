import { canSetBudget, FREE_BUDGET_LIMIT, hasProEntitlement, yearlySavingsPercent } from '../pro';

describe('canSetBudget', () => {
  it('allows the first three categories for free', () => {
    expect(FREE_BUDGET_LIMIT).toBe(3);
    expect(canSetBudget([], 'groceries', false)).toBe(true);
    expect(canSetBudget(['groceries', 'dining'], 'bills', false)).toBe(true);
  });

  it('asks for Pro to add a fourth category', () => {
    expect(canSetBudget(['groceries', 'dining', 'bills'], 'home', false)).toBe(false);
    expect(canSetBudget(['groceries', 'dining', 'bills'], 'home', true)).toBe(true);
  });

  it('always allows changing an existing budget', () => {
    expect(canSetBudget(['groceries', 'dining', 'bills'], 'dining', false)).toBe(true);
  });
});

describe('hasProEntitlement', () => {
  it('needs an active pro entitlement', () => {
    expect(hasProEntitlement({ pro: { isActive: true } })).toBe(true);
    expect(hasProEntitlement({ pro: {} })).toBe(true);
    expect(hasProEntitlement({ pro: { isActive: false } })).toBe(false);
    expect(hasProEntitlement({ other: { isActive: true } })).toBe(false);
    expect(hasProEntitlement({})).toBe(false);
    expect(hasProEntitlement(null)).toBe(false);
  });
});

describe('yearlySavingsPercent', () => {
  it('compares the yearly price with twelve monthly payments', () => {
    expect(yearlySavingsPercent(99.99, 599.99)).toBe(50);
    expect(yearlySavingsPercent(4.99, 39.99)).toBe(33);
  });

  it('is null when there is nothing to compare or no saving', () => {
    expect(yearlySavingsPercent(null, 40)).toBeNull();
    expect(yearlySavingsPercent(5, undefined)).toBeNull();
    expect(yearlySavingsPercent(5, 60)).toBeNull();
    expect(yearlySavingsPercent(5, 80)).toBeNull();
    expect(yearlySavingsPercent(0, 10)).toBeNull();
  });
});
