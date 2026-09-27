import { breakdownSegments } from '../breakdown';

describe('breakdownSegments', () => {
  it('adds shares that sum to 1', () => {
    const rows = breakdownSegments([
      { category: 'groceries', value: 600 },
      { category: 'dining', value: 300 },
      { category: 'transport', value: 100 },
    ]);
    expect(rows.map((r) => r.share)).toEqual([0.6, 0.3, 0.1]);
  });

  it('keeps the caller order but moves other last', () => {
    const rows = breakdownSegments([
      { category: 'other', value: 500 },
      { category: 'dining', value: 300 },
      { category: 'health', value: 200 },
    ]);
    expect(rows.map((r) => r.category)).toEqual(['dining', 'health', 'other']);
  });

  it('drops empty categories', () => {
    const rows = breakdownSegments([
      { category: 'groceries', value: 100 },
      { category: 'bills', value: 0 },
    ]);
    expect(rows.map((r) => r.category)).toEqual(['groceries']);
    expect(rows[0].share).toBe(1);
  });

  it('keeps extra fields', () => {
    const [row] = breakdownSegments([{ category: 'home', value: 5, display: '₺5,00' }]);
    expect(row.display).toBe('₺5,00');
  });

  it('returns nothing for no spending', () => {
    expect(breakdownSegments([])).toEqual([]);
  });
});
