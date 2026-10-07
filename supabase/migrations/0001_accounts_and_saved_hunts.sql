-- HuntQuarters Milestone 1: accounts, membership, hunter profile, saved hunts.
-- Run once in the Supabase SQL editor (or `supabase db push`).
--
-- Every table is owned by a user and protected by row-level security: a
-- signed-in user can only see and change their own rows. Membership rows are
-- written only by the Stripe webhook (service role), never by the browser.

-- ── Hunter profile (permanent preferences; season-specific answers live on hunts)
create table if not exists public.profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  display_name     text,
  home_state       text,                       -- residency state code, e.g. 'WY'
  species_interests text[] not null default '{}',
  weapons          text[] not null default '{}',
  hunt_styles      text[] not null default '{}',
  fitness          text,
  experience       text,
  grizzly_ok       boolean,
  access_notes     text,                       -- access limitations, in their words
  typical_budget   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Point balances, by state + species. Entered by the hunter, not verified
--    with the state — verified_on records when the hunter last checked.
create table if not exists public.hunter_points (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  state        text not null,
  species      text not null,
  points       numeric not null default 0 check (points >= 0),
  as_of_year   int not null,
  verified_on  date,
  updated_at   timestamptz not null default now(),
  unique (user_id, state, species)
);

-- ── Membership (one row per user, kept in sync by the Stripe webhook)
create table if not exists public.memberships (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id  text unique,
  stripe_subscription_id text unique,
  status              text not null default 'none',   -- Stripe subscription status, or 'none'
  current_period_end  timestamptz,
  updated_at          timestamptz not null default now()
);

-- ── Saved hunts: the central record (My Season)
-- Lifecycle status and application result are separate on purpose: an
-- unsuccessful application stays in history with status 'applied' → result
-- 'unsuccessful' instead of disappearing.
create table if not exists public.saved_hunts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  season_year     int not null,
  state           text not null,
  species         text not null,
  unit            text not null,
  hunt_code       text,                         -- agency hunt code when known
  label           text,
  status          text not null default 'considering'
                  check (status in ('considering','planned','applied','tag_secured','preparing','completed','archived')),
  application_result text
                  check (application_result in ('pending','successful','unsuccessful','alternate','withdrawn')),
  source          text not null default 'scout'  check (source in ('scout','has_tag','manual')),
  search_inputs   jsonb,                        -- questionnaire answers at save time
  recommendation  jsonb,                        -- the card as shown (odds, tier, explanation) — a snapshot, never re-generated
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- One record per hunt per season; NULL hunt codes compare as distinct, so
-- de-dupe those by unit instead.
create unique index if not exists saved_hunts_unique_code
  on public.saved_hunts (user_id, season_year, state, species, hunt_code) where hunt_code is not null;
create unique index if not exists saved_hunts_unique_unit
  on public.saved_hunts (user_id, season_year, state, species, unit) where hunt_code is null;
create index if not exists saved_hunts_user on public.saved_hunts (user_id, season_year);

-- ── Notes on a saved hunt
create table if not exists public.hunt_notes (
  id          uuid primary key default gen_random_uuid(),
  hunt_id     uuid not null references public.saved_hunts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (length(body) between 1 and 10000),
  created_at  timestamptz not null default now()
);
create index if not exists hunt_notes_hunt on public.hunt_notes (hunt_id, created_at);

-- ── updated_at maintenance
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','hunter_points','memberships','saved_hunts'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s; create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- ── Row-level security: owner-only
alter table public.profiles      enable row level security;
alter table public.hunter_points enable row level security;
alter table public.memberships   enable row level security;
alter table public.saved_hunts   enable row level security;
alter table public.hunt_notes    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own points" on public.hunter_points;
create policy "own points" on public.hunter_points
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Members can read their own membership; only the service role writes it.
drop policy if exists "read own membership" on public.memberships;
create policy "read own membership" on public.memberships
  for select using (auth.uid() = user_id);

drop policy if exists "own hunts" on public.saved_hunts;
create policy "own hunts" on public.saved_hunts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A note must belong to the user AND sit on one of the user's own hunts.
drop policy if exists "own notes" on public.hunt_notes;
create policy "own notes" on public.hunt_notes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.saved_hunts h where h.id = hunt_id and h.user_id = auth.uid()
  ));
