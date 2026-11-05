// "My hunt": one record per hunt moving through stages (docs/SPEC_ARCHITECTURE.md §2).
// Since migration 0007 every hunt is one saved_hunts row, from "someday"
// through the report. Pure — tested without a database.

import type { Outlook, PlanKind } from './calendar';
import type { TierKind } from '@/app/ui';

export const STAGES = ['idea', 'considering', 'planned', 'points', 'applied', 'didnt', 'drew', 'prepping', 'hunted', 'reported', 'passed'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE: Record<Stage, { label: string; tier: TierKind }> = {
  idea: { label: 'Someday', tier: 'long' },
  considering: { label: 'Considering', tier: 'long' },
  planned: { label: 'Planned', tier: 'long' },
  points: { label: 'Points only', tier: 'long' },
  applied: { label: 'Applied', tier: 'fair' },
  didnt: { label: "Didn't draw", tier: 'long' },
  drew: { label: 'Drew', tier: 'good' },
  prepping: { label: 'Prepping', tier: 'good' },
  hunted: { label: 'Hunted', tier: 'good' },
  reported: { label: 'Reported', tier: 'good' },
  passed: { label: 'Passed', tier: 'long' },
};

export type SavedHuntRow = {
  id: string;
  season_year: number | null;   // null = someday
  state: string;
  species: string;
  unit: string | null;
  hunt_code: string | null;
  label: string | null;
  status: string;
  application_result: string | null;
  source?: string | null;        // 'plan' = on the plan, application not started
  kind?: PlanKind | null;
  notes?: string | null;
  hunt_start?: string | null;
  hunt_end?: string | null;
  applications?: { decision: string | null; deadline_on: string | null; submitted_at: string | null } | Array<{ decision: string | null; deadline_on: string | null; submitted_at: string | null }> | null;
  hunt_reports?: { completed_at: string | null; harvested: boolean | null } | Array<{ completed_at: string | null; harvested: boolean | null }> | null;
};

export type MyHunt = {
  key: string;                 // "s:<id>"
  savedId: string | null;      // set once the application is started (opens its own page)
  planItemId: string | null;   // set while it's only on the plan (edited in place)
  state: string;
  species: string;
  unit: string | null;
  huntCode: string | null;
  label: string | null;
  year: number | null;
  stage: Stage;
  otc: boolean;
  bucket: boolean;
  deadline: string | null;     // YYYY-MM-DD the hunter (or agency) set on their application
  huntStart: string | null;
  huntEnd: string | null;
  harvested: boolean | null;
  notes: string | null;
};

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export function stageOfSaved(h: SavedHuntRow): Stage {
  const app = one(h.applications);
  const rep = one(h.hunt_reports);
  switch (h.status) {
    case 'considering': return app?.decision === 'build_points' ? 'points' : 'considering';
    case 'planned': return app?.decision === 'build_points' ? 'points' : 'planned';
    case 'applied':
      if (h.application_result === 'unsuccessful') return 'didnt';
      if (h.application_result === 'withdrawn') return 'passed';
      return 'applied';
    case 'tag_secured': return 'drew';
    case 'preparing': return 'prepping';
    case 'completed': return rep?.completed_at ? 'reported' : 'hunted';
    case 'archived':
      if (rep?.completed_at) return 'reported';
      if (h.application_result === 'unsuccessful') return 'didnt';
      return 'passed';
    default: return 'considering';
  }
}

export function buildMyHunts(saved: SavedHuntRow[]): MyHunt[] {
  return saved.map((h) => {
    const app = one(h.applications);
    const rep = one(h.hunt_reports);
    const planOnly = h.source === 'plan';
    return {
      key: `s:${h.id}`, savedId: planOnly ? null : h.id, planItemId: planOnly ? h.id : null,
      state: h.state, species: h.species, unit: h.unit, huntCode: h.hunt_code, label: h.label,
      year: h.season_year,
      stage: planOnly ? (h.kind === 'bucket' && h.season_year == null ? 'idea' : 'planned') : stageOfSaved(h),
      otc: h.kind === 'otc', bucket: h.kind === 'bucket',
      deadline: app?.deadline_on ?? null, huntStart: h.hunt_start ?? null, huntEnd: h.hunt_end ?? null,
      harvested: rep?.harvested ?? null, notes: h.notes ?? null,
    };
  });
}

// Where each hunt shows up on the Plan timeline.
export function planSections(hunts: MyHunt[], thisYear: number) {
  const active = (h: MyHunt) => h.stage !== 'passed';
  return {
    thisSeason: hunts.filter((h) => h.year === thisYear && active(h)),
    ahead: hunts.filter((h) => h.year != null && h.year > thisYear && active(h)),
    someday: hunts.filter((h) => h.year == null),
    past: hunts.filter((h) => h.year != null && (h.year < thisYear || (h.year === thisYear && !active(h)))),
  };
}

// A one-line read of a hunt's odds for list rows; the full sentence stays on the hunt page.
export function shortOutlook(o: Outlook | null, year: number | null): { text: string; tier: TierKind } | null {
  if (!o) return null;
  if (o.kind === 'otc') return { text: 'Over the counter', tier: 'good' };
  if (o.kind === 'closed') return { text: o.text.replace(/ — not open to you\.?$/, ''), tier: 'stop' };
  if (o.kind === 'none') return null;
  const likely = o.perYear.find((r) => (r.cumulative ?? 0) >= 50)?.year ?? null;
  const last = o.perYear[o.perYear.length - 1];
  if (likely != null) return { text: `Likely by ${likely}`, tier: year != null && likely <= year ? 'good' : 'fair' };
  if (o.firstYearAtMin != null) return { text: `Clears ${o.minPoints}-pt cutoff ${o.firstYearAtMin}`, tier: year != null && o.firstYearAtMin <= year ? 'good' : 'fair' };
  // A real but tiny chance (a Nevada lottery ticket) must not round to "0%".
  if (last?.cumulative != null) return { text: last.cumulative < 1 ? `Under 1% by ${last.year}` : `~${Math.round(last.cumulative)}% by ${last.year}`, tier: 'long' };
  if (o.minPoints != null) return { text: o.pointsBar ? `Needs ${o.minPoints} pts` : `Drew at ${o.minPoints}+ pts last time`, tier: 'long' };
  return null;
}
