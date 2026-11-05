-- HuntQuarters: saved advisor conversations (docs/SPEC_ADVISOR.md §7).
-- Run once in the Supabase SQL editor after 0001–0008. Safe to re-run.
--
-- Each member's conversations are theirs alone (owner-only RLS) and can be
-- deleted at any time; deleting a thread deletes its messages.
--
-- Facts the advisor learns ("one week off, in October") are NOT stored here:
-- they go on profiles.planning.facts (added in 0006), and only after the
-- hunter taps Yes.

create table if not exists public.advisor_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null default 'New conversation' check (char_length(title) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists advisor_threads_user_time on public.advisor_threads (user_id, updated_at desc);

drop trigger if exists touch_advisor_threads on public.advisor_threads;
create trigger touch_advisor_threads before update on public.advisor_threads
  for each row execute function public.touch_updated_at();

create table if not exists public.advisor_messages (
  id          bigint generated always as identity primary key,
  thread_id   uuid not null references public.advisor_threads(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null check (char_length(content) <= 4000),
  sources     jsonb not null default '[]'::jsonb,   -- the "Based on" list, as shown
  actions     jsonb not null default '[]'::jsonb,   -- the buttons offered, as shown
  created_at  timestamptz not null default now()
);
create index if not exists advisor_messages_thread_time on public.advisor_messages (thread_id, id);

alter table public.advisor_threads enable row level security;
drop policy if exists "own advisor threads" on public.advisor_threads;
create policy "own advisor threads" on public.advisor_threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.advisor_messages enable row level security;
drop policy if exists "own advisor messages" on public.advisor_messages;
create policy "own advisor messages" on public.advisor_messages
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.advisor_threads t where t.id = thread_id and t.user_id = auth.uid()
  ));

-- Check: both should return 0 rows and no error.
-- select * from public.advisor_threads limit 1;
-- select * from public.advisor_messages limit 1;

-- Rollback:
-- drop table if exists public.advisor_messages;
-- drop table if exists public.advisor_threads;
