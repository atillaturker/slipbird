import { dayLabel, formatReceiptDate, fromISODate, groupByDay, isISODate, monthLabel, monthTitle, toISODate } from '../dates';

const now = new Date(2026, 9, 12, 15, 30); // 12 Oct 2026, local time

describe('ISO dates', () => {
  it('round-trips local dates', () => {
    expect(toISODate(now)).toBe('2026-10-12');
    expect(toISODate(fromISODate('2026-01-05')!)).toBe('2026-01-05');
  });

  it('rejects impossible or malformed dates', () => {
    expect(isISODate('2026-02-31')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate('12.10.2026')).toBe(false);
    expect(isISODate('2024-02-29')).toBe(true);
  });
});

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    expect(dayLabel('2026-10-12', now, 'en')).toEqual({ kind: 'today' });
    expect(dayLabel('2026-10-11', now, 'tr')).toEqual({ kind: 'yesterday' });
  });

  it('omits the year within the current year', () => {
    expect(dayLabel('2026-10-01', now, 'en')).toEqual({ kind: 'date', text: '1 Oct' });
    expect(dayLabel('2026-10-01', now, 'tr')).toEqual({ kind: 'date', text: '1 Eki' });
  });

  it('includes the year for earlier years', () => {
    expect(dayLabel('2025-12-31', now, 'en')).toEqual({ kind: 'date', text: '31 Dec 2025' });
  });
});

describe('formatReceiptDate', () => {
  it('prints date and optional time', () => {
    expect(formatReceiptDate('2026-10-12', '18:42', 'en')).toBe('12 Oct 2026 18:42');
    expect(formatReceiptDate('2026-10-12', null, 'tr')).toBe('12 Eki 2026');
  });
});

describe('groupByDay', () => {
  it('groups consecutive items by date', () => {
    const groups = groupByDay([
      { id: 'a', date: '2026-10-12' },
      { id: 'b', date: '2026-10-12' },
      { id: 'c', date: '2026-10-10' },
    ]);
    expect(groups.map((g) => [g.date, g.items.map((i) => i.id)])).toEqual([
      ['2026-10-12', ['a', 'b']],
      ['2026-10-10', ['c']],
    ]);
  });
});

describe('monthLabel', () => {
  it('gives short month names in both languages', () => {
    expect(monthLabel('2026-10', 'en')).toBe('Oct');
    expect(monthLabel('2026-10', 'tr')).toBe('Eki');
    expect(monthLabel('bad', 'en')).toBe('bad');
  });
});

describe('monthTitle', () => {
  it('gives month and year in both languages', () => {
    expect(monthTitle('2026-10', 'en')).toBe('October 2026');
    expect(monthTitle('2026-10', 'tr')).toBe('Ekim 2026');
    expect(monthTitle('2026-01', 'tr')).toBe('Ocak 2026');
    expect(monthTitle('bad', 'en')).toBe('bad');
  });
});
