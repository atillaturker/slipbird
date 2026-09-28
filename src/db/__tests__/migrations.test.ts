import { migrations, pendingMigrations } from '../migrations';

describe('pendingMigrations', () => {
  it('runs everything on a fresh database', () => {
    expect(pendingMigrations(0).map((m) => m.version)).toEqual(migrations.map((_, i) => i + 1));
  });

  it('runs nothing when up to date', () => {
    expect(pendingMigrations(migrations.length)).toEqual([]);
  });

  it('creates every table from the spec', () => {
    for (const table of ['receipts', 'receipt_items', 'receipt_taxes', 'budgets', 'merchant_rules']) {
      expect(migrations[0]).toContain(`CREATE TABLE ${table} (`);
    }
  });
});
