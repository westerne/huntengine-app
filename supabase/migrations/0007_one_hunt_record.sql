-- HuntQuarters: one record per hunt (docs/SPEC_ARCHITECTURE.md §2).
-- Calendar items (plan_items) move into saved_hunts, so a hunt is the same
-- record from "someday" through the report. Run once in the Supabase SQL
-- editor after 0001–0006. Safe to re-run.
--
-- plan_items is left in place, untouched, as the backup. The app stops
-- reading it once this has run. Rollback is at the bottom.

-- 1. saved_hunts can now hold plan-stage hunts: no year yet ("someday"),
--    no unit yet ("AZ sheep, any unit"), a plan type and notes.
alter table public.saved_hunts alter column season_year drop not null;
alter table public.saved_hunts alter column unit drop not null;
alter table public.saved_hunts add column if not exists kind text not null default 'target';
alter table public.saved_hunts add column if not exists notes text;
alter table public.saved_hunts add column if not exists position int not null default 0;

alter table public.saved_hunts drop constraint if exists saved_hunts_kind_check;
alter table public.saved_hunts add constraint saved_hunts_kind_check check (kind in ('target','bucket','otc'));
alter table public.saved_hunts drop constraint if exists saved_hunts_season_year_check;
alter table public.saved_hunts add constraint saved_hunts_season_year_check check (season_year is null or season_year between 2000 and 2100);
-- 'plan' = on the plan, application not started yet.
alter table public.saved_hunts drop constraint if exists saved_hunts_source_check;
alter table public.saved_hunts add constraint saved_hunts_source_check check (source in ('scout','has_tag','manual','plan'));

-- 2. Calendar items already linked to a saved hunt: carry the type and notes over.
update public.saved_hunts h
   set kind = p.kind,
       notes = coalesce(h.notes, p.notes),
       position = p.position
  from public.plan_items p
 where p.saved_hunt_id = h.id;

-- 3. A calendar item that matches a saved hunt it was never linked to: link it.
update public.plan_items p
   set saved_hunt_id = h.id
  from public.saved_hunts h
 where p.saved_hunt_id is null
   and h.user_id = p.user_id and h.season_year = p.target_year
   and h.state = p.state and h.species = p.species
   and ((p.hunt_code is not null and h.hunt_code = p.hunt_code)
     or (p.hunt_code is null and h.hunt_code is null and h.unit = p.unit));

-- 4. Every other calendar item becomes a hunt with the same id, so links
--    and bookmarks keep working.
insert into public.saved_hunts
  (id, user_id, season_year, state, species, unit, hunt_code, label, status, source, kind, notes, position, created_at, updated_at)
select p.id, p.user_id, p.target_year, p.state, p.species, p.unit, p.hunt_code, p.label,
       'planned', 'plan', p.kind, p.notes, p.position, p.created_at, p.updated_at
  from public.plan_items p
 where p.saved_hunt_id is null
   and not exists (select 1 from public.saved_hunts h where h.id = p.id);

create index if not exists saved_hunts_user_kind on public.saved_hunts (user_id, kind);

notify pgrst, 'reload schema';

-- ── Check (should return 0 rows: every calendar item has a hunt)
-- select p.id from public.plan_items p
--  where not exists (select 1 from public.saved_hunts h where h.id = p.id or h.id = p.saved_hunt_id);

-- ── Rollback (only if something is wrong; hunts added to the plan after
--    the merge are lost, the old calendar items come back as they were)
-- delete from public.saved_hunts where source = 'plan';
-- update public.saved_hunts set season_year = extract(year from now())::int where season_year is null;
-- alter table public.saved_hunts alter column season_year set not null;
-- update public.saved_hunts set unit = coalesce(hunt_code, '?') where unit is null;
-- alter table public.saved_hunts alter column unit set not null;
-- alter table public.saved_hunts drop constraint if exists saved_hunts_source_check;
-- alter table public.saved_hunts add constraint saved_hunts_source_check check (source in ('scout','has_tag','manual'));
-- alter table public.saved_hunts drop column if exists kind, drop column if exists notes, drop column if exists position;
-- notify pgrst, 'reload schema';
