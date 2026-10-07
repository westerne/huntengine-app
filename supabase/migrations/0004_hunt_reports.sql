-- HuntQuarters Milestone 4: post-hunt reports (+ private photos).
-- Run once in the Supabase SQL editor after 0001–0003.
--
-- A report is private to its owner. Completing it does NOT file anything
-- with a state agency — official harvest reporting is a separate task.

create table if not exists public.hunt_reports (
  hunt_id        uuid primary key references public.saved_hunts(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  started_on     date,
  ended_on       date,
  days_hunted    int check (days_hunted between 0 and 120),
  harvested      boolean,
  animal         text,           -- what was taken, in their words (e.g. "6x6 bull")
  measurements   text,           -- score / weight, in their words
  sightings      text,
  pressure       text check (pressure in ('low','moderate','high')),
  access_issues  text,
  conditions     text,
  worked         text,
  didnt_work     text,
  change_next    text,
  photos         text[] not null default '{}',   -- storage paths in the report-photos bucket
  completed_at   timestamptz,    -- set when the hunter finishes the report
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ended_on is null or started_on is null or ended_on >= started_on)
);

drop trigger if exists touch_hunt_reports on public.hunt_reports;
create trigger touch_hunt_reports before update on public.hunt_reports
  for each row execute function public.touch_updated_at();

alter table public.hunt_reports enable row level security;
drop policy if exists "own reports" on public.hunt_reports;
create policy "own reports" on public.hunt_reports
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.saved_hunts h where h.id = hunt_id and h.user_id = auth.uid()
  ));

-- ── Private photo storage: <user_id>/<hunt_id>/<file>, owner-only ──────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "own report photos read" on storage.objects;
create policy "own report photos read" on storage.objects for select
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own report photos write" on storage.objects;
create policy "own report photos write" on storage.objects for insert
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own report photos delete" on storage.objects;
create policy "own report photos delete" on storage.objects for delete
  using (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Official harvest-report reminders are their own task kind ──────────────
alter table public.tasks drop constraint if exists tasks_kind_check;
alter table public.tasks add constraint tasks_kind_check
  check (kind in ('application','point','prep','custom','harvest_report'));
