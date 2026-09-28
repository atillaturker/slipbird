import { differenceInCalendarDays, format, isValid, parse } from 'date-fns';
import { enGB, tr } from 'date-fns/locale';

/** Receipts store dates as YYYY-MM-DD and times as HH:mm, in local time. */
export const ISO_DATE = 'yyyy-MM-dd';

function dateLocale(language: string) {
  return language === 'tr' ? tr : enGB;
}

export function toISODate(date: Date): string {
  return format(date, ISO_DATE);
}

/** Parses YYYY-MM-DD as a local calendar date; null when it isn't one (e.g. 2026-02-31). */
export function fromISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = parse(iso, ISO_DATE, new Date());
  return isValid(date) && format(date, ISO_DATE) === iso ? date : null;
}

export function isISODate(iso: string): boolean {
  return fromISODate(iso) !== null;
}

export type DayLabel = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'date'; text: string };

/**
 * The label for a day: today, yesterday, "12 Oct" this year, "12 Oct 2025" otherwise.
 * Callers translate today/yesterday and upper-case section headers.
 */
export function dayLabel(iso: string, now: Date, language: string): DayLabel {
  const date = fromISODate(iso);
  if (!date) return { kind: 'date', text: iso };
  const diff = differenceInCalendarDays(now, date);
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'yesterday' };
  const pattern = date.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy';
  return { kind: 'date', text: format(date, pattern, { locale: dateLocale(language) }) };
}

/** The receipt's own date and time as printed on the detail screen: "12 Oct 2026 18:42". */
export function formatReceiptDate(iso: string, time: string | null, language: string): string {
  const date = fromISODate(iso);
  if (!date) return iso;
  const day = format(date, 'd MMM yyyy', { locale: dateLocale(language) });
  return time ? `${day} ${time}` : day;
}

/** Groups items that are already sorted newest first into consecutive days. */
export function groupByDay<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}
