// The hunter's own records, shaped for the advisor: the situation the other
// tools read (home state, points, plan years), and the my_situation and
// my_reports tools. Pure — the route loads the rows; these only shape them.

import type { PlanHunt, PointsRow } from '@/app/plan/load';
import { toStateCode } from '../huntdata/registry';
import { STAGE } from '../myHunts';
import { speciesKeyOf } from '../species';
import type { Situation, Source, ToolResult } from './tools';

export type PlanSnapshot = {
  thisYear: number; years: number[]; home: string | null;
  hunts: PlanHunt[]; points: PointsRow[];
};

export function situationFromPlan(plan: PlanSnapshot): Situation {
  return {
    home: plan.home ? toStateCode(plan.home) : null,
    balances: plan.points.filter((p) => p.current != null).map((p) => ({ state: p.state, species: p.species, points: p.current! })),
    years: plan.years,
    seasonYear: plan.thisYear,
  };
}

// ── my_situation ────────────────────────────────────────────────────────────
export type SituationData = {
  home: string | null; seasonYear: number; planYears: number[];
  points: Array<{ state: string; species: string; points: number | null; usesPoints: boolean; projected: Record<number, number> | null }>;
  hunts: Array<{
    state: string; species: string; year: number | null; stage: string;
    huntCode: string | null; unit: string | null; kind: 'draw' | 'otc' | 'bucket';
    deadline: string | null; outlook: string | null;
  }>;
  pastHunts: number;
};
export function mySituation(plan: PlanSnapshot): ToolResult<SituationData> {
  const active = plan.hunts.filter((h) => h.stage !== 'passed' && (h.year == null || h.year >= plan.thisYear));
  return {
    ok: true,
    data: {
      home: plan.home ? toStateCode(plan.home) : null,
      seasonYear: plan.thisYear,
      planYears: plan.years,
      points: plan.points.filter((p) => p.live).map((p) => ({
        state: p.state, species: p.species, points: p.current, usesPoints: p.usesPoints, projected: p.byYear,
      })),
      hunts: active.map((h) => ({
        state: h.state, species: h.species, year: h.year, stage: STAGE[h.stage].label,
        huntCode: h.huntCode, unit: h.unit, kind: h.otc ? 'otc' : h.bucket ? 'bucket' : 'draw',
        // Their own date first, then the agency's (already labeled "Last year"/"Expected").
        deadline: h.deadline ?? h.due, outlook: h.short?.text ?? null,
      })),
      pastHunts: plan.hunts.length - active.length,
    },
    sources: [{ label: 'your plan' }, ...(plan.points.length ? [{ label: 'your points' }] : [])],
  };
}

// ── my_reports ──────────────────────────────────────────────────────────────
export type ReportRow = {
  started_on: string | null; days_hunted: number | null; harvested: boolean | null;
  pressure: string | null; worked: string | null; didnt_work: string | null; change_next: string | null;
  completed_at: string | null;
  saved_hunts: { state: string; species: string; season_year: number | null; unit: string | null; hunt_code: string | null } | null;
};
export type ReportData = Array<{
  state: string; species: string; year: number | null; unit: string | null; huntCode: string | null;
  harvested: boolean | null; daysHunted: number | null; pressure: string | null;
  worked: string | null; didntWork: string | null; changeNext: string | null;
}>;
// Only finished reports, and only the lessons — no sightings or access notes,
// which is where spots get written down.
export function myReports(rows: ReportRow[], args: { state?: string | null; species?: string | null }): ToolResult<ReportData> {
  const st = args.state ? toStateCode(args.state) : null;
  const want = (r: ReportRow) => {
    const h = r.saved_hunts;
    if (!h || !r.completed_at) return false;
    if (st && h.state !== st) return false;
    if (args.species && speciesKeyOf(h.species, h.state) !== speciesKeyOf(args.species, h.state)) return false;
    return true;
  };
  const clip = (t: string | null) => (t ? t.slice(0, 400) : null);
  const picked = rows.filter(want).slice(0, 8);
  if (!picked.length) return { ok: false, reason: 'No finished hunt reports match that yet.' };
  const sources = new Map<string, Source>();
  const data = picked.map((r) => {
    const h = r.saved_hunts!;
    const label = `your ${h.season_year ?? ''} ${h.state} ${h.species.toLowerCase()} report`.replace(/\s+/g, ' ');
    sources.set(label, { label });
    return {
      state: h.state, species: h.species, year: h.season_year, unit: h.unit, huntCode: h.hunt_code,
      harvested: r.harvested, daysHunted: r.days_hunted, pressure: r.pressure,
      worked: clip(r.worked), didntWork: clip(r.didnt_work), changeNext: clip(r.change_next),
    };
  });
  return { ok: true, data, sources: [...sources.values()] };
}
