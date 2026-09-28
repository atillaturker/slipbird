/** Free parses per user per calendar month (UTC). The one place this number lives. */
export const FREE_MONTHLY_PARSES = 15;

/**
 * DEVELOPMENT ONLY: `PARSE_QUOTA_DISABLED=true` in the function's environment lifts the monthly limit so parsing
 * can be tested freely. Usage is still counted (and logged). It must never be set in production — before release,
 * check `supabase secrets list` shows no PARSE_QUOTA_DISABLED.
 */
export function quotaEnforced(env: { get(key: string): string | undefined }): boolean {
  return env.get('PARSE_QUOTA_DISABLED')?.trim().toLowerCase() !== 'true';
}

export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}
