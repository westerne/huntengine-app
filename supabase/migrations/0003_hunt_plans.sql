-- HuntQuarters Milestone 3: hunt preparation ("Your Hunt Plan").
-- Run once in the Supabase SQL editor after 0001 and 0002.

-- Actual hunt dates live on the hunt so My Season can show them.
alter table public.saved_hunts add column if not exists hunt_start date;
alter table public.saved_hunts add column if not exists hunt_end   date;
alter table public.saved_hunts drop constraint if exists saved_hunts_dates_order;
alter table public.saved_hunts add constraint saved_hunts_dates_order
  check (hunt_start is null or hunt_end is null or hunt_end >= hunt_start);

-- Every generation is kept as a version. The hunter's edits live in `edited`
-- (section → text) on top of the generated content, so regenerating never
-- overwrites them: a new version is added, and the hunter chooses which is
-- current.
create table if not exists public.hunt_plans (
  id          uuid primary key default gen_random_uuid(),
  hunt_id     uuid not null references public.saved_hunts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  version     int  not null,
  inputs      jsonb not null,            -- what the hunter told us for this plan
  generated   jsonb not null,            -- sections as generated
  edited      jsonb not null default '{}'::jsonb,   -- the hunter's replacements, by section key
  is_current  boolean not null default false,
  model       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (hunt_id, version)
);
-- At most one current plan per hunt.
create unique index if not exists hunt_plans_one_current on public.hunt_plans (hunt_id) where is_current;

drop trigger if exists touch_hunt_plans on public.hunt_plans;
create trigger touch_hunt_plans before update on public.hunt_plans
  for each row execute function public.touch_updated_at();

alter table public.hunt_plans enable row level security;
drop policy if exists "own plans" on public.hunt_plans;
create policy "own plans" on public.hunt_plans
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.saved_hunts h where h.id = hunt_id and h.user_id = auth.uid()
  ));
