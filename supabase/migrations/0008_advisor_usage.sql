-- HuntQuarters: advisor usage (docs/SPEC_ADVISOR.md §6).
-- One row per question asked, so pricing (e.g. credits past a monthly amount)
-- can be decided from real numbers, and a 200-a-day guard can stop runaway cost.
-- Run once in the Supabase SQL editor after 0001–0007. Safe to re-run.
--
-- Members can read and add their own rows but never change or delete them, so
-- the daily guard can't be reset from the browser.

create table if not exists public.advisor_usage (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  model          text not null,
  input_tokens   int not null default 0,
  output_tokens  int not null default 0,
  cost_usd       numeric(10, 5) not null default 0,   -- estimate from list prices
  model_calls    int not null default 0,
  tool_calls     int not null default 0,
  flagged        int not null default 0,              -- claims the answer check caught
  retried        boolean not null default false
);
create index if not exists advisor_usage_user_time on public.advisor_usage (user_id, created_at desc);

alter table public.advisor_usage enable row level security;
drop policy if exists "read own advisor usage" on public.advisor_usage;
create policy "read own advisor usage" on public.advisor_usage
  for select using (auth.uid() = user_id);
drop policy if exists "log own advisor usage" on public.advisor_usage;
create policy "log own advisor usage" on public.advisor_usage
  for insert with check (auth.uid() = user_id);

-- Check: should return 0 rows and no error.
-- select * from public.advisor_usage limit 1;

-- Rollback:
-- drop table if exists public.advisor_usage;
