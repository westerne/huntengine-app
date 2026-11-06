import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { getStateModule, STATE_INFO, toStateCode } from '@/lib/huntdata/registry';
import { pointsSoldTo } from '@/lib/huntdata/apply';
import { cleanPrefs, DEFAULT_PREFS, rankHunts } from '@/lib/huntdata/fit';
import { usesPoints } from '@/lib/calendar';
import { canonicalSpecies, speciesKeyOf } from '@/lib/species';
import { titleCaseState } from '@/lib/scoutData';
import { currentSeasonYear } from '@/lib/hunts';

// GET  /api/huntdata/rank                        → { prefs }   (saved, or the defaults)
// POST /api/huntdata/rank { state, species, prefs } → the ranking (docs/SPEC_RANKING.md)
//
// Preferences sent with a ranking are saved to profiles.planning.huntPrefs, so
// Find opens with them next time and the advisor ranks the same way.

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('profiles').select('planning').eq('user_id', auth.viewer.userId!).maybeSingle();
  const saved = (data?.planning as { huntPrefs?: unknown } | null)?.huntPrefs;
  return NextResponse.json({ prefs: saved ? cleanPrefs(saved) : DEFAULT_PREFS, saved: !!saved });
}

export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const userId = auth.viewer.userId!;
  const body = await req.json().catch(() => null);
  const state = toStateCode(String(body?.state ?? ''));
  const mod = state ? getStateModule(state) : null;
  const key = state ? speciesKeyOf(String(body?.species ?? ''), state) : null;
  if (!state || !mod || !key || !mod.species.includes(key as never)) {
    return NextResponse.json({ error: 'We don’t have that state and species.' }, { status: 404 });
  }
  const prefs = cleanPrefs(body?.prefs);
  const species = canonicalSpecies(String(body.species), state) ?? String(body.species);

  const supabase = await supabaseServer();
  const [{ data: profile }, { data: balances }] = await Promise.all([
    supabase.from('profiles').select('home_state, planning').eq('user_id', userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
  ]);
  const home = profile?.home_state ? toStateCode(profile.home_state) : null;
  const residency = home === state ? 'resident' : 'nonresident';
  const points = Number((balances ?? []).find((b) => toStateCode(b.state) === state && speciesKeyOf(b.species, state) === key)?.points) || 0;
  // Points only count where this residency earns them (Wyoming residents don't, for elk).
  const earnsPoints = usesPoints(mod, species) && pointsSoldTo(state, key, residency) !== false;
  const seasonYear = currentSeasonYear();

  const stateName = titleCaseState(STATE_INFO[state].name);
  const ranking = rankHunts(mod.hunts(key as never), {
    residency, points: earnsPoints ? points : 0, usesPoints: earnsPoints, seasonYear, prefs, stateName, species,
  });

  // Remember the preferences; a failed save doesn't cost the hunter the answer.
  const planning = (profile?.planning ?? {}) as Record<string, unknown>;
  const { error } = await supabase.from('profiles').upsert({ user_id: userId, planning: { ...planning, huntPrefs: prefs } }, { onConflict: 'user_id' });
  if (error) console.warn('rank: preferences not saved', error.message);

  return NextResponse.json({ state, stateName, species, speciesKey: key, residency, points, earnsPoints, seasonYear, prefs, ...ranking });
}
