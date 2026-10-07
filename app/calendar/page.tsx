import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { currentSeasonYear } from '@/lib/hunts';
import {
  calendarYears, drawOutlook, findHunt, projectPoints, usesPoints, yearFlags,
  type Outlook, type PlanItem, type PointBalance,
} from '@/lib/calendar';
import { getStateModule } from '@/lib/huntdata/registry';
import { speciesKeyOf } from '@/lib/species';
import CalendarView, { type CalItem, type LedgerRow } from './CalendarView';

export const dynamic = 'force-dynamic';

// My Hunt Calendar — the member's multi-year plan (docs/SPEC_HUNT_CALENDAR.md).
// Outlooks are computed here from the state draw data; the client only shows them.

export default async function CalendarPage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const supabase = await supabaseServer();
  const [{ data: itemRows, error }, { data: pointRows }, { data: profile }] = await Promise.all([
    supabase.from('plan_items').select('*').order('target_year', { nullsFirst: false }).order('position').order('created_at'),
    supabase.from('hunter_points').select('state, species, points, as_of_year'),
    supabase.from('profiles').select('home_state, planning').eq('user_id', viewer.userId).maybeSingle(),
  ]);
  const items = (itemRows ?? []) as PlanItem[];
  const balances = (pointRows ?? []) as PointBalance[];
  const home = profile?.home_state ?? null;
  // Setup answer "another state": non-resident everywhere, no need to ask again.
  const homeKnown = !!home || (profile?.planning as { homeState?: string } | null)?.homeState === 'XX';
  const years = calendarYears(currentSeasonYear());
  const residencyFor = (state: string) => (home && home === state ? 'resident' : 'nonresident') as 'resident' | 'nonresident';
  const pairKey = (state: string, species: string) => `${state}|${speciesKeyOf(species, state) ?? species}`;

  // Points ledger: every balance on file, plus any point-draw pair on the calendar.
  const pairs = new Map<string, { state: string; species: string; current: number | null }>();
  for (const b of balances) pairs.set(pairKey(b.state, b.species), { state: b.state, species: b.species, current: Number(b.points) });
  for (const i of items) {
    const k = pairKey(i.state, i.species);
    if (!pairs.has(k) && usesPoints(getStateModule(i.state), i.species)) pairs.set(k, { state: i.state, species: i.species, current: null });
  }
  const projections = new Map<string, Record<number, number>>();
  const ledger: LedgerRow[] = [...pairs.entries()].map(([k, p]) => {
    const mod = getStateModule(p.state);
    const uses = usesPoints(mod, p.species);
    // Planned draw targets reset points the year after.
    const drawYears = items.filter((i) => i.kind === 'target' && i.target_year && pairKey(i.state, i.species) === k).map((i) => i.target_year!);
    const byYear = uses && p.current != null ? projectPoints(p.current, years, drawYears) : null;
    if (byYear) projections.set(k, byYear);
    return { state: p.state, species: p.species, current: p.current, usesPoints: uses, live: !!mod, byYear };
  }).sort((a, b) => a.state.localeCompare(b.state) || a.species.localeCompare(b.species));

  const withOutlook: CalItem[] = items.map((i) => {
    const mod = getStateModule(i.state);
    const hunt = findHunt(mod, i.species, i.hunt_code, i.unit);
    let outlook: Outlook;
    if (!mod) outlook = { kind: 'none', text: `We don't have ${i.state} draw data.` };
    else if (!hunt && i.kind === 'otc') outlook = { kind: 'otc', text: 'Over-the-counter option.' };
    else outlook = drawOutlook(hunt, residencyFor(i.state), years, projections.get(pairKey(i.state, i.species)) ?? null);
    return { ...i, outlook, huntLabel: hunt?.label ?? null, residency: residencyFor(i.state) };
  });

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <CalendarView
        years={years}
        items={withOutlook}
        ledger={ledger}
        flags={yearFlags(withOutlook, years)}
        homeState={home}
        homeKnown={homeKnown}
        loadError={!!error}
      />
    </div>
  );
}
