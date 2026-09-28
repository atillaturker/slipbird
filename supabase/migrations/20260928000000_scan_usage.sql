-- Monthly parse quota per user (docs/SPEC.md §1.4). Only the parse-receipt function (service role)
-- reads and writes it; the free limit lives in supabase/functions/parse-receipt/quota.ts.

create table public.scan_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  count integer not null default 0 check (count >= 0),
  primary key (user_id, month)
);

alter table public.scan_usage enable row level security;
-- No policies on purpose: app clients (anon/authenticated) can't read or change usage.
revoke all on table public.scan_usage from anon, authenticated;

-- Counts one successful parse and returns the new monthly total.
create or replace function public.record_scan (p_user uuid, p_month text)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.scan_usage (user_id, month, count)
  values (p_user, p_month, 1)
  on conflict (user_id, month) do update set count = public.scan_usage.count + 1
  returning count;
$$;

revoke all on function public.record_scan (uuid, text) from public, anon, authenticated;
grant execute on function public.record_scan (uuid, text) to service_role;
