import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { getStateModule, STATE_INFO, toStateCode } from '@/lib/huntdata/registry';
import { buildGenericScoutDataset } from '@/lib/huntdata/generic';
import { drawReality } from '@/lib/huntdata/reality';
import { speciesKeyOf, canonicalSpecies } from '@/lib/species';
import { titleCaseState } from '@/lib/scoutData';
import { currentSeasonYear } from '@/lib/hunts';
import type { SpeciesKey } from '@/lib/huntdata/schema';

// GET /api/huntdata/reality?state=NV&species=Elk[&weapon=rifle]
//
// What this hunter's points actually buy, worked out from the draw data. No
// model call, so it costs nothing and can't invent — which is why the new
// Find a Hunt flow can show it before asking any questions.
export async function GET(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const state = (searchParams.get('state') || '').toUpperCase();
  const speciesRaw = searchParams.get('species');
  const mod = getStateModule(state);
  const key = speciesKeyOf(speciesRaw, state);
  if (!mod || !key || !mod.species.includes(key)) {
    return NextResponse.json({ error: 'We don’t have that state and species.' }, { status: 404 });
  }

  const weaponRaw = (searchParams.get('weapon') || 'any').toLowerCase();
  const weapon = (['rifle', 'archery', 'muzzleloader'] as const).find((w) => w === weaponRaw) ?? 'any';
  const species = canonicalSpecies(speciesRaw ?? '', state) ?? String(speciesRaw ?? '').trim();

  // Residency and the hunter's own balance come from their account, not the
  // query — the whole point is that they shouldn't have to tell us twice.
  const supabase = await supabaseServer();
  const [{ data: profile }, { data: balances }] = await Promise.all([
    supabase.from('profiles').select('home_state').eq('user_id', auth.viewer.userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
  ]);
  const home = profile?.home_state ? toStateCode(profile.home_state) : null;
  const residency = home && home === mod.code ? 'resident' : 'nonresident';
  const points = Number(
    (balances ?? []).find((b) => toStateCode(b.state) === mod.code && speciesKeyOf(b.species, mod.code) === key)?.points,
  ) || 0;

  const hunts = buildGenericScoutDataset(mod, key as SpeciesKey, residency, weapon, points);
  const reality = drawReality(hunts, {
    points,
    // STATE_INFO holds them upper-cased; this ends up in a sentence.
    state: titleCaseState(STATE_INFO[mod.code]?.name ?? mod.code),
    species,
    thisYear: currentSeasonYear(),
  });

  return NextResponse.json({ ...reality, state: mod.code, species, residency, weapon });
}
