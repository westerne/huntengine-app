import { supabaseServer } from '@/lib/supabase/server';
import { currentSeasonYear } from '@/lib/hunts';
import {
  calendarYears, drawOutlook, findHunt, projectPoints, usesPoints, yearsCovering,
  type Outlook, type PointBalance,
} from '@/lib/calendar';
import { buildMyHunts, shortOutlook, type MyHunt, type SavedHuntRow } from '@/lib/myHunts';
import { getStateModule } from '@/lib/huntdata/registry';
import { speciesKeyOf } from '@/lib/species';
import { readProfile } from '../calendar/readProfile';
import { deadlineFor, deadlineText, type Deadline } from '@/lib/huntdata/apply';
import { cutoffIsMilestone } from '@/lib/huntdata/drawSystem';

export type PlanHunt = MyHunt & {
  due: string | null;          // "Due Apr 7" / "Expected Jun 12" / "Last year Apr 7"
  agencyDeadline: Deadline | null;
  outlook: Outlook | null;
  short: { text: string; tier: 'good' | 'fair' | 'long' | 'stop' } | null;
  huntLabel: string | null;
  compareKey: string | null;
};
export type PointsRow = {
  state: string; species: string; current: number | null; usesPoints: boolean; live: boolean;
  byYear: Record<number, number> | null; cutoff: number | null; drawYear: number | null;
};

type Client = Awaited<ReturnType<typeof supabaseServer>>;

// Everything the Plan (and Today) screens show, from the hunter's own records
// plus the state draw data. Outlooks are "if odds stay like last year's".
export async function loadPlan(supabase: Client, userId: string) {
  const [{ data: savedRows, error: e2 }, { data: pointRows }, { data: profile }] = await Promise.all([
    supabase.from('saved_hunts').select('id, season_year, state, species, unit, hunt_code, label, status, application_result, source, kind, notes, hunt_start, hunt_end, applications(decision, deadline_on, submitted_at), hunt_reports(completed_at, harvested)')
      .order('season_year', { ascending: false, nullsFirst: false }).order('position').order('created_at'),
    supabase.from('hunter_points').select('state, species, points, as_of_year'),
    readProfile(supabase, userId),
  ]);
  const balances = (pointRows ?? []) as PointBalance[];
  const home = profile?.home_state ?? null;
  const homeKnown = !!home || (profile?.planning as { homeState?: string } | null)?.homeState === 'XX';
  const thisYear = currentSeasonYear();
  const hunts = buildMyHunts((savedRows ?? []) as SavedHuntRow[]);
  const years = yearsCovering(calendarYears(thisYear), hunts.map((h) => (h.year != null && h.year >= thisYear ? h.year : null)));
  const residencyFor = (state: string) => (home && home === state ? 'resident' : 'nonresident') as 'resident' | 'nonresident';
  const pairKey = (state: string, species: string) => `${state}|${speciesKeyOf(species, state) ?? species}`;

  // Points: every balance, plus any point-draw pair the hunter plans.
  const pairs = new Map<string, { state: string; species: string; current: number | null }>();
  for (const b of balances) pairs.set(pairKey(b.state, b.species), { state: b.state, species: b.species, current: Number(b.points) });
  for (const h of hunts) {
    const k = pairKey(h.state, h.species);
    if (!pairs.has(k) && h.stage !== 'passed' && h.year != null && h.year >= thisYear && usesPoints(getStateModule(h.state), h.species)) pairs.set(k, { state: h.state, species: h.species, current: null });
  }
  const projections = new Map<string, Record<number, number>>();
  const drawTargets = (k: string) => hunts.filter((h) => !h.otc && h.year != null && h.year >= thisYear
    && ['planned', 'applied', 'drew', 'prepping'].includes(h.stage) && pairKey(h.state, h.species) === k);

  const withOutlook: PlanHunt[] = [];
  const points: PointsRow[] = [...pairs.entries()].map(([k, p]) => {
    const mod = getStateModule(p.state);
    const uses = usesPoints(mod, p.species);
    const targets = drawTargets(k);
    const byYear = uses && p.current != null ? projectPoints(p.current, years, targets.map((t) => t.year!)) : null;
    if (byYear) projections.set(k, byYear);
    // The cutoff shown is the soonest planned target's last-draw minimum.
    const first = [...targets].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))[0];
    const hunt = first ? findHunt(mod, first.species, first.huntCode, first.unit) : null;
    const res = residencyFor(p.state);
    // No cutoff line in a lottery or a modeled draw: there it's only who happened to win.
    const cutoff = hunt && cutoffIsMilestone(p.state) ? (res === 'resident' ? hunt.draw.resident : hunt.draw.nonresident)?.minPoints ?? null : null;
    return { state: p.state, species: p.species, current: p.current, usesPoints: uses, live: !!mod, byYear, cutoff, drawYear: first?.year ?? null };
  }).sort((a, b) => a.state.localeCompare(b.state) || a.species.localeCompare(b.species));

  for (const h of hunts) {
    const mod = getStateModule(h.state);
    const hunt = findHunt(mod, h.species, h.huntCode, h.unit);
    const future = h.year == null || h.year >= thisYear;
    let outlook: Outlook | null = null;
    if (future && ['idea', 'considering', 'planned', 'points', 'applied'].includes(h.stage)) {
      if (!mod) outlook = { kind: 'none', text: `We don't have ${h.state} draw data.` };
      else if (!hunt && h.otc) outlook = { kind: 'otc', text: 'Over-the-counter option.' };
      else outlook = drawOutlook(hunt, residencyFor(h.state), years, projections.get(pairKey(h.state, h.species)) ?? null);
    }
    withOutlook.push({
      ...h, outlook, short: shortOutlook(outlook, h.year), huntLabel: hunt?.label ?? null,
      // The application deadline matters until they've applied (OTC tags have none).
      ...(() => {
        const d = !h.otc && h.year != null && h.year >= thisYear && ['considering', 'planned', 'points'].includes(h.stage)
          ? deadlineFor(h.state, speciesKeyOf(h.species, h.state), residencyFor(h.state), h.year)
          : null;
        return { due: deadlineText(d), agencyDeadline: d };
      })(),
      compareKey: hunt ? `${hunt.state}~${hunt.species}~${hunt.huntCode}` : null,
    });
  }

  return { thisYear, years, hunts: withOutlook, points, home, homeKnown, loadError: !!e2 };
}
