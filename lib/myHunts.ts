// "My hunt": one record per hunt moving through stages (docs/SPEC_ARCHITECTURE.md §2).
// Until the tables are merged, this builds that view from calendar items
// (plan_items) and saved hunts. Pure — tested without a database.

import type { Outlook, PlanItem } from './calendar';
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
  season_year: number;
  state: string;
  species: string;
  unit: string;
  hunt_code: string | null;
  label: string | null;
  status: string;
  application_result: string | null;
  applications?: { decision: string | null; deadline_on: string | null; submitted_at: string | null } | Array<{ decision: string | null; deadline_on: string | null; submitted_at: string | null }> | null;
  hunt_reports?: { completed_at: string | null; harvested: boolean | null } | Array<{ completed_at: string | null; harvested: boolean | null }> | null;
};

export type MyHunt = {
  key: string;                 // "s:<saved id>" or "p:<plan item id>"
  savedId: string | null;
  planItemId: string | null;
  state: string;
  species: string;
  unit: string | null;
  huntCode: string | null;
  label: string | null;
  year: number | null;
  stage: Stage;
  otc: boolean;
  bucket: boolean;
  deadline: string | null;     // YYYY-MM-DD, when known
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

export function buildMyHunts(saved: SavedHuntRow[], items: PlanItem[]): MyHunt[] {
  const out: MyHunt[] = saved.map((h) => {
    const app = one(h.applications);
    const rep = one(h.hunt_reports);
    const linked = items.find((i) => i.saved_hunt_id === h.id);
    return {
      key: `s:${h.id}`, savedId: h.id, planItemId: linked?.id ?? null,
      state: h.state, species: h.species, unit: h.unit, huntCode: h.hunt_code, label: h.label,
      year: h.season_year, stage: stageOfSaved(h), otc: linked?.kind === 'otc', bucket: false,
      deadline: app?.deadline_on ?? null, harvested: rep?.harvested ?? null, notes: linked?.notes ?? null,
    };
  });
  for (const i of items) {
    if (i.saved_hunt_id && saved.some((h) => h.id === i.saved_hunt_id)) continue;   // shown via its saved hunt
    out.push({
      key: `p:${i.id}`, savedId: null, planItemId: i.id,
      state: i.state, species: i.species, unit: i.unit, huntCode: i.hunt_code, label: i.label,
      year: i.target_year, stage: i.kind === 'bucket' && !i.target_year ? 'idea' : 'planned',
      otc: i.kind === 'otc', bucket: i.kind === 'bucket', deadline: null, harvested: null, notes: i.notes,
    });
  }
  return out;
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
  if (last?.cumulative != null) return { text: `~${Math.round(last.cumulative)}% by ${last.year}`, tier: 'long' };
  if (o.minPoints != null) return { text: `Needs ${o.minPoints} pts`, tier: 'long' };
  return null;
}
