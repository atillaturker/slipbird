import { assertEquals } from 'jsr:@std/assert@1';

import { currentMonth, FREE_MONTHLY_PARSES, quotaEnforced } from './quota.ts';

const env = (vars: Record<string, string>) => ({ get: (k: string) => vars[k] });

Deno.test('the monthly limit is enforced unless PARSE_QUOTA_DISABLED is exactly "true"', () => {
  assertEquals(quotaEnforced(env({})), true);
  assertEquals(quotaEnforced(env({ PARSE_QUOTA_DISABLED: '' })), true);
  assertEquals(quotaEnforced(env({ PARSE_QUOTA_DISABLED: 'false' })), true);
  assertEquals(quotaEnforced(env({ PARSE_QUOTA_DISABLED: '1' })), true);
  assertEquals(quotaEnforced(env({ PARSE_QUOTA_DISABLED: 'true' })), false);
  assertEquals(quotaEnforced(env({ PARSE_QUOTA_DISABLED: ' TRUE ' })), false);
});

Deno.test('the free limit is still 15 and months are UTC', () => {
  assertEquals(FREE_MONTHLY_PARSES, 15);
  assertEquals(currentMonth(new Date(Date.UTC(2026, 9, 31, 23, 59))), '2026-10');
});
