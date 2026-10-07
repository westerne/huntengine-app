-- HuntQuarters: My Hunt Calendar (docs/SPEC_HUNT_CALENDAR.md).
-- Multi-year plan items: draw targets, bucket-list hunts and OTC options.
-- Run once in the Supabase SQL editor after 0001–0005. Safe to re-run.

create table if not exists public.plan_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  kind           text not null check (kind in ('target','bucket','otc')),
  state          text not null,
  species        text not null,
  unit           text,
  hunt_code      text,
  label          text,
  target_year    int check (target_year between 2000 and 2100),
  notes          text,
  saved_hunt_id  uuid references public.saved_hunts(id) on delete set null,
  position       int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists plan_items_user_year on public.plan_items (user_id, target_year);

drop trigger if exists touch_plan_items on public.plan_items;
create trigger touch_plan_items before update on public.plan_items
  for each row execute function public.touch_updated_at();

alter table public.plan_items enable row level security;
drop policy if exists "own plan items" on public.plan_items;
create policy "own plan items" on public.plan_items
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (
    saved_hunt_id is null or exists (
      select 1 from public.saved_hunts h where h.id = saved_hunt_id and h.user_id = auth.uid()
    )
  ));

-- Guided setup answers (interests, how long they'll wait, units they know,
-- bucket list) — kept so suggestions can be rebuilt later.
alter table public.profiles add column if not exists planning jsonb;

-- Make the API see the new columns right away.
notify pgrst, 'reload schema';
