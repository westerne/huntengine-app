// Everything the Find a Hunt routes need about one hunter in one state and
// species: their residency, their point balance, and the hunts on offer.
//
// Shared by /api/huntdata/reality and /api/huntdata/narrow so the two can never
// disagree about what a hunter holds — the second step narrows exactly the list
// the first step said was within reach.

import { supabaseServer } from '@/lib/supabase/server';
import { getStateModule, STATE_INFO, toStateCode } from './registry';
import { buildGenericScoutDataset } from './generic';
import { speciesKeyOf, canonicalSpecies } from '@/lib/species';
import { titleCaseState } from '@/lib/scoutData';
import type { Residency, SpeciesKey, StateModule, Weapon } from './schema';

export type DrawContext = {
  mod: StateModule;
  key: SpeciesKey;
  species: string;         // canonical label, e.g. "Elk"
  stateName: string;       // title case, for sentences
  residency: Residency;
  weapon: Weapon;
  points: number;
  hunts: Array<Record<string, unknown>>;
};

export const asWeapon = (raw: string | null): Weapon =>
  (['rifle', 'archery', 'muzzleloader'] as const).find((w) => w === (raw || '').toLowerCase()) ?? 'any';

export async function loadDrawContext(
  userId: string | null,
  stateRaw: string,
  speciesRaw: string | null,
  weapon: Weapon = 'any',
): Promise<DrawContext | null> {
  const mod = getStateModule((stateRaw || '').toUpperCase());
  const key = speciesKeyOf(speciesRaw, (stateRaw || '').toUpperCase());
  if (!mod || !key || !mod.species.includes(key)) return null;

  // Residency and the hunter's own balance come from their account, not the
  // query — the whole point is that they shouldn't have to tell us twice.
  const supabase = await supabaseServer();
  const [{ data: profile }, { data: balances }] = await Promise.all([
    supabase.from('profiles').select('home_state').eq('user_id', userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
  ]);
  const home = profile?.home_state ? toStateCode(profile.home_state) : null;
  const residency: Residency = home && home === mod.code ? 'resident' : 'nonresident';
  const points = Number(
    (balances ?? []).find((b) => toStateCode(b.state) === mod.code && speciesKeyOf(b.species, mod.code) === key)?.points,
  ) || 0;

  return {
    mod,
    key,
    species: canonicalSpecies(speciesRaw ?? '', mod.code) ?? String(speciesRaw ?? '').trim(),
    // STATE_INFO holds them upper-cased; this ends up in a sentence.
    stateName: titleCaseState(STATE_INFO[mod.code]?.name ?? mod.code),
    residency,
    weapon,
    points,
    hunts: buildGenericScoutDataset(mod, key, residency, weapon, points),
  };
}
