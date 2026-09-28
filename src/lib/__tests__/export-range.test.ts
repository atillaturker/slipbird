import { EPOCH, FAR_FUTURE, isValidRange, monthRange, presetRange, rangeFileLabel, recentMonths } from '../export-range';

const today = new Date(2026, 9, 12); // 12 Oct 2026

describe('presetRange', () => {
  it('covers this month so far, last month whole, this year so far', () => {
    expect(presetRange('thisMonth', today)).toEqual({ start: '2026-10-01', end: '2026-10-12' });
    expect(presetRange('lastMonth', today)).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(presetRange('thisYear', today)).toEqual({ start: '2026-01-01', end: '2026-10-12' });
  });

  it('handles January (last month is last year) and leap February', () => {
    expect(presetRange('lastMonth', new Date(2026, 0, 15))).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(presetRange('lastMonth', new Date(2024, 2, 10))).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('is unbounded for all time and open custom ends', () => {
    expect(presetRange('all', today)).toEqual({ start: EPOCH, end: FAR_FUTURE });
    expect(presetRange('custom', today, { from: '2026-03-01', to: null })).toEqual({ start: '2026-03-01', end: FAR_FUTURE });
    expect(presetRange('custom', today, { from: null, to: '2026-03-31' })).toEqual({ start: EPOCH, end: '2026-03-31' });
  });
});

describe('ranges', () => {
  it('validates order', () => {
    expect(isValidRange({ start: '2026-03-01', end: '2026-03-01' })).toBe(true);
    expect(isValidRange({ start: '2026-03-02', end: '2026-03-01' })).toBe(false);
  });

  it('lists recent months newest first with their bounds', () => {
    const months = recentMonths(today, 3);
    expect(months.map((m) => m.month)).toEqual(['2026-10', '2026-09', '2026-08']);
    expect(months[2].range).toEqual({ start: '2026-08-01', end: '2026-08-31' });
    expect(recentMonths(new Date(2026, 1, 10), 3).map((m) => m.month)).toEqual(['2026-02', '2026-01', '2025-12']);
  });

  it('gives a month its first and last day', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('makes file-name labels', () => {
    expect(rangeFileLabel({ start: '2026-10-01', end: '2026-10-12' })).toBe('2026-10-01_2026-10-12');
    expect(rangeFileLabel({ start: EPOCH, end: FAR_FUTURE })).toBe('all');
    expect(rangeFileLabel({ start: '2026-01-01', end: FAR_FUTURE })).toBe('2026-01-01_today');
  });
});
