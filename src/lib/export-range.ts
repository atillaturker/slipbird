import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from 'date-fns';

import { toISODate } from './dates';
import type { DateRange } from './spending';

export type RangePreset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom';

/** Earliest possible date, for "all time". */
export const EPOCH = '0000-01-01';
export const FAR_FUTURE = '9999-12-31';

/** The inclusive date range for a preset; `custom` uses the person's own bounds (open ends = all). */
export function presetRange(preset: RangePreset, today: Date, custom?: { from: string | null; to: string | null }): DateRange {
  switch (preset) {
    case 'thisMonth':
      return { start: toISODate(startOfMonth(today)), end: toISODate(today) };
    case 'lastMonth': {
      const last = subMonths(today, 1);
      return { start: toISODate(startOfMonth(last)), end: toISODate(endOfMonth(last)) };
    }
    case 'thisYear':
      return { start: toISODate(startOfYear(today)), end: toISODate(today) };
    case 'all':
      return { start: EPOCH, end: FAR_FUTURE };
    case 'custom':
      return { start: custom?.from ?? EPOCH, end: custom?.to ?? FAR_FUTURE };
  }
}

/** True when the custom range is valid (start not after end). */
export function isValidRange(range: DateRange): boolean {
  return range.start <= range.end;
}

/** The last `count` calendar months, newest first, including this one: for the PDF month chips. */
export function recentMonths(today: Date, count = 12): { month: string; range: DateRange }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = subMonths(startOfMonth(today), i);
    return { month: format(d, 'yyyy-MM'), range: { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) } };
  });
}

/** The range of one calendar month ("2026-10"). */
export function monthRange(month: string): DateRange {
  return { start: `${month}-01`, end: toISODate(endOfMonth(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1))) };
}

/** A file-name-safe label for a range: "2026-10-01_2026-10-12", "all" for everything. */
export function rangeFileLabel(range: DateRange): string {
  if (range.start === EPOCH && range.end === FAR_FUTURE) return 'all';
  const start = range.start === EPOCH ? 'start' : range.start;
  const end = range.end === FAR_FUTURE ? 'today' : range.end;
  return `${start}_${end}`;
}
