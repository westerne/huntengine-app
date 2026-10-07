-- HuntQuarters Milestone 2: applications and tasks (checklists, reminders,
-- point-building). Run once in the Supabase SQL editor after 0001.

-- ── One application per saved hunt (the hunt's season_year is the application year)
create table if not exists public.applications (
  hunt_id             uuid primary key references public.saved_hunts(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  decision            text not null default 'apply'
                      check (decision in ('apply','build_points','watch','pass')),
  deadline_on         date,                 -- application deadline (local date at the agency)
  deadline_time       time,                 -- local time, when the agency states one
  deadline_tz         text,                 -- IANA timezone, e.g. 'America/Denver'
  deadline_source     text check (deadline_source in ('agency','hunter')),
  choice_rank         int check (choice_rank between 1 and 10),  -- where this hunt sits in their choices
  other_choices       text,                 -- the rest of their choices, in their words
  fee_note            text,                 -- what they expect to pay, in their words (not a verified fee)
  submitted_at        timestamptz,          -- set ONLY when the hunter marks it submitted
  confirmation_number text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Tasks: application checklist items, point-building tasks, reminders.
-- hunt_id is null for tasks that aren't about one saved hunt (e.g. "buy a
-- Colorado elk preference point"), which keeps point-building separate from
-- hunt records.
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  hunt_id     uuid references public.saved_hunts(id) on delete cascade,
  kind        text not null default 'custom' check (kind in ('application','point','prep','custom')),
  title       text not null check (length(title) between 1 and 300),
  due_on      date,
  state       text,
  species     text,
  season_year int,
  position    int not null default 0,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_user_due on public.tasks (user_id, done_at, due_on);
create index if not exists tasks_hunt on public.tasks (hunt_id, position);

do $$ declare t text; begin
  foreach t in array array['applications','tasks'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s; create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

alter table public.applications enable row level security;
alter table public.tasks        enable row level security;

-- Owner-only, and an application/task can only point at the owner's own hunt.
drop policy if exists "own applications" on public.applications;
create policy "own applications" on public.applications
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.saved_hunts h where h.id = hunt_id and h.user_id = auth.uid()
  ));

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and (hunt_id is null or exists (
    select 1 from public.saved_hunts h where h.id = hunt_id and h.user_id = auth.uid()
  )));
