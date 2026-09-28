/** Free parses per user per calendar month (UTC). The one place this number lives. */
export const FREE_MONTHLY_PARSES = 15;

export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}
