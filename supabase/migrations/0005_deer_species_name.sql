-- HuntQuarters: "Mule Deer" is now "Deer" (many states draw whitetail too).
-- Renames stored rows. Safe to re-run. The app also accepts the old name.

-- Saved hunts (skip any that would duplicate an existing "Deer" save).
update public.saved_hunts h set species = 'Deer'
where h.species = 'Mule Deer'
  and not exists (
    select 1 from public.saved_hunts d
    where d.user_id = h.user_id and d.season_year = h.season_year and d.state = h.state
      and d.species = 'Deer' and coalesce(d.hunt_code, d.unit) = coalesce(h.hunt_code, h.unit)
  );

-- Point balances (one per member, state and species).
update public.hunter_points p set species = 'Deer'
where p.species = 'Mule Deer'
  and not exists (
    select 1 from public.hunter_points d
    where d.user_id = p.user_id and d.state = p.state and d.species = 'Deer'
  );

update public.tasks set species = 'Deer' where species = 'Mule Deer';

update public.profiles
set species_interests = array_replace(species_interests, 'Mule Deer', 'Deer')
where 'Mule Deer' = any(species_interests);
