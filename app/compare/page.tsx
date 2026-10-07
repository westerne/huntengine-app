import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { currentSeasonYear } from '@/lib/hunts';
import { calendarYears, projectPoints, usesPoints } from '@/lib/calendar';
import { compareColumn, MAX_COMPARE, parseCompareKey, pickBest, type CompareColumn } from '@/lib/compare';
import { getStateModule } from '@/lib/huntdata/registry';
import { SPECIES_NAME, speciesKeyOf } from '@/lib/species';
import type { SpeciesKey } from '@/lib/huntdata/schema';
import CompareView, { type YourNotes } from './CompareView';

export const dynamic = 'force-dynamic';

// Compare 2–4 hunts: /compare?h=OR~ELK~210A2,WY~ELK~125-1
// The recommendation leads; the full table is below it.

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const { h } = await searchParams;
  const keys = (h ?? '').split(',').map((k) => parseCompareKey(decodeURIComponent(k.trim()))).filter((k): k is NonNullable<typeof k> => !!k).slice(0, MAX_COMPARE);

  const supabase = await supabaseServer();
  const [{ data: profile }, { data: points }, { data: items }, { data: reports }] = await Promise.all([
    supabase.from('profiles').select('home_state').eq('user_id', viewer.userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
    supabase.from('plan_items').select('state, species, unit, hunt_code, notes, target_year, kind'),
    supabase.from('hunt_reports').select('harvested, days_hunted, change_next, worked, completed_at, saved_hunts!inner(season_year, state, species, unit, hunt_code)').not('completed_at', 'is', null),
  ]);
  const home = profile?.home_state ?? null;
  const years = calendarYears(currentSeasonYear());

  const cols: CompareColumn[] = [];
  const notes: Record<string, YourNotes> = {};
  const missing: string[] = [];
  await Promise.all(keys.map(async (k) => {
    const mod = getStateModule(k.state);
    const hunt = mod?.hunts(k.speciesKey as SpeciesKey).find((x) => x.huntCode === k.code);
    if (!mod || !hunt) { missing.push(`${k.state} ${k.code}`); return; }
    const species = SPECIES_NAME[hunt.species];
    const residency = home === mod.code ? 'resident' : 'nonresident';
    const bal = (points ?? []).find((p) => p.state === mod.code && speciesKeyOf(p.species, p.state) === hunt.species);
    const byYear = usesPoints(mod, species) && bal ? projectPoints(Number(bal.points), years) : null;
    const c = compareColumn(hunt, residency, years, byYear);
    cols.push(c);

    const norm = (u: unknown) => String(u ?? '').trim().toLowerCase();
    const mine = (items ?? []).filter((i) => i.state === mod.code && speciesKeyOf(i.species, i.state) === hunt.species && (i.hunt_code === hunt.huntCode || norm(i.unit) === norm(hunt.unit)));
    const past = (reports ?? []).filter((r) => {
      const s = (Array.isArray(r.saved_hunts) ? r.saved_hunts[0] : r.saved_hunts) as { state: string; species: string; unit: string } | null;
      return s && s.state === mod.code && speciesKeyOf(s.species, s.state) === hunt.species && norm(s.unit) === norm(hunt.unit);
    });
    notes[c.key] = {
      planned: mine.map((i) => `${i.kind === 'otc' ? 'OTC option' : i.kind === 'bucket' ? 'Bucket list' : 'Draw target'}${i.target_year ? ` for ${i.target_year}` : ''}${i.notes ? ` — ${i.notes}` : ''}`),
      reports: past.map((r) => {
        const s = (Array.isArray(r.saved_hunts) ? r.saved_hunts[0] : r.saved_hunts) as { season_year: number };
        return `${s.season_year}: ${r.harvested ? 'harvested' : 'no harvest'}${r.days_hunted != null ? `, ${r.days_hunted} days` : ''}${r.change_next ? ` — next time: ${r.change_next}` : ''}`;
      }),
    };
  }));
  // Keep the order the hunter chose.
  cols.sort((a, b) => keys.findIndex((k) => `${k.state}~${k.speciesKey}~${k.code}` === a.key) - keys.findIndex((k) => `${k.state}~${k.speciesKey}~${k.code}` === b.key));

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <CompareView cols={cols} pick={pickBest(cols)} notes={notes} missing={missing} years={years} homeState={home} />
    </div>
  );
}
