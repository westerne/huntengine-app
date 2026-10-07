// My Hunt Calendar (docs/SPEC_HUNT_CALENDAR.md). Pure functions — tested
// without a database. Every estimate here is "if odds stay like last year's";
// nothing promises a draw year.

import type { Hunt, Residency, StateModule } from './huntdata/schema';
import { successAtPoints, successText } from './huntdata/generic';
import { speciesKeyOf } from './species';

export const CALENDAR_YEARS = 5;
export const PLAN_KINDS = ['target', 'bucket', 'otc'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];
export const KIND_LABEL: Record<PlanKind, string> = { target: 'Draw target', bucket: 'Bucket list', otc: 'OTC option' };

export type PlanItem = {
  id: string;
  kind: PlanKind;
  state: string;
  species: string;
  unit: string | null;
  hunt_code: string | null;
  label: string | null;
  target_year: number | null;
  notes: string | null;
  saved_hunt_id: string | null;
  position: number;
};

export type PointBalance = { state: string; species: string; points: number; as_of_year: number };

export function calendarYears(start: number, n = CALENDAR_YEARS): number[] {
  return Array.from({ length: n }, (_, i) => start + i);
}

// Species with no points at all inside a point state (verified in each
// state's research notes). Random-draw states (ID, NM, AK) have none anywhere.
const NO_POINT_SPECIES: Record<string, string[]> = {
  OR: ['BIGHORNSHEEP', 'MTNGOAT'],
  ND: ['ELK', 'MOOSE', 'BIGHORNSHEEP'],
};

export function usesPoints(mod: Pick<StateModule, 'code' | 'drawSystem'> | null, species: string): boolean {
  if (!mod || mod.drawSystem === 'random') return false;
  const key = speciesKeyOf(species);
  return !(key && NO_POINT_SPECIES[mod.code]?.includes(key));
}

// Points held at each year's draw: the balance you hold now counts for the
// first year, +1 for each year you don't draw, back to 0 the year after a draw.
// Assumes you apply (or buy a point) every year — the screen says so.
export function projectPoints(current: number, years: number[], drawYears: number[] = []): Record<number, number> {
  const out: Record<number, number> = {};
  let pts = Math.max(0, current);
  years.forEach((y, i) => {
    if (i > 0) pts = drawYears.includes(years[i - 1]) ? 0 : pts + 1;
    out[y] = pts;
  });
  return out;
}

// A plan item's hunt in the state's data: by hunt code, else the only hunt in
// that unit. Several hunts in the unit → null (the hunter picks one).
export function findHunt(mod: StateModule | null, species: string, huntCode: string | null, unit: string | null): Hunt | null {
  const key = speciesKeyOf(species);
  if (!mod || !key) return null;
  const hunts = mod.hunts(key);
  if (huntCode) {
    const hit = hunts.find((h) => h.huntCode.toLowerCase() === huntCode.trim().toLowerCase());
    if (hit) return hit;
  }
  if (unit) {
    const norm = (u: string) => u.trim().toLowerCase().replace(/^(unit|gmu)\s+/, '').replace(/^0+(?=\d)/, '');
    const inUnit = hunts.filter((h) => norm(h.unit) === norm(unit));
    if (inUnit.length === 1) return inUnit[0];
  }
  return null;
}

export type Outlook =
  | { kind: 'otc'; text: string }
  | { kind: 'closed'; text: string }
  | { kind: 'none'; text: string }
  | {
      kind: 'draw';
      basis: 'points' | 'overall';
      dataYear: number | null;
      minPoints: number | null;
      firstYearAtMin: number | null;
      perYear: Array<{ year: number; points: number | null; pct: number | null; cumulative: number | null }>;
      text: string;
    };

const pct1 = (x: number) => Math.round(x * 10) / 10;

export function drawOutlook(
  hunt: Hunt | null,
  residency: Residency,
  years: number[],
  pointsByYear: Record<number, number> | null,
): Outlook {
  if (!hunt) return { kind: 'none', text: 'Pick a specific hunt to see draw odds.' };
  if (hunt.otc) return { kind: 'otc', text: 'Over the counter — no draw needed.' };
  if (hunt.openTo && hunt.openTo !== residency) {
    return { kind: 'closed', text: hunt.openTo === 'resident' ? 'Residents only — not open to you.' : 'Non-residents only — not open to you.' };
  }
  const stat = residency === 'resident' ? hunt.draw.resident : hunt.draw.nonresident;
  const overall = stat?.successPct ?? (hunt.tags != null && hunt.applicants ? Math.min(100, (100 * hunt.tags) / hunt.applicants) : null);
  const minPoints = stat?.minPoints ?? null;

  let basis: 'points' | 'overall' = 'overall';
  let miss = 1;
  const perYear = years.map((year) => {
    const points = pointsByYear?.[year] ?? null;
    const atPts = points != null ? successAtPoints(hunt, residency, points) : null;
    if (atPts != null) basis = 'points';
    const p = atPts ?? overall;
    if (p == null) return { year, points, pct: null, cumulative: null };
    miss *= 1 - Math.min(100, p) / 100;
    return { year, points, pct: pct1(p), cumulative: pct1(100 * (1 - miss)) };
  });

  // Some states publish only the fewest points that drew (e.g. Wyoming
  // non-resident pools) — that's still an honest outlook.
  if (perYear.every((r) => r.pct == null) && minPoints == null) return { kind: 'none', text: 'No published draw odds for this hunt.' };

  const firstYearAtMin = minPoints != null && pointsByYear
    ? years.find((y) => (pointsByYear[y] ?? -1) >= minPoints) ?? null
    : null;
  const last = perYear[perYear.length - 1];
  const yr = hunt.drawYear ?? 'last year';
  const parts: string[] = [];
  if (minPoints != null && minPoints > 0) {
    const pts = minPoints === 1 ? '1 point' : `${minPoints} points`;
    parts.push(!pointsByYear
      ? `In ${yr} tags went to applicants with as few as ${pts}.`
      : firstYearAtMin
        ? `In ${yr} it took ${pts}; you'd have that in ${firstYearAtMin}.`
        : `In ${yr} it took ${pts} — more than you'd have by ${last.year}.`);
  }
  if (last.cumulative != null) {
    parts.push(last.cumulative >= 99
      ? `Very likely to draw by ${last.year} if odds stay like ${yr}'s.`
      : `About a ${Math.round(last.cumulative)}% chance of drawing at least once by ${last.year}, if odds stay like ${yr}'s.`);
  }
  if (hunt.harvest) parts.push(`Hunter success ${successText(hunt.harvest, hunt.tags)} (${hunt.harvest.year}).`);
  return { kind: 'draw', basis, dataYear: hunt.drawYear, minPoints, firstYearAtMin, perYear, text: parts.join(' ') };
}

export type YearFlag = { year: number; level: 'info' | 'warn'; text: string };

// Calendar-level flags: open years, duplicate state/species in one year, and
// targets placed before the hunter would likely have the points.
export function yearFlags(
  items: Array<Pick<PlanItem, 'kind' | 'state' | 'species' | 'target_year' | 'unit' | 'hunt_code'> & { outlook?: Outlook }>,
  years: number[],
): YearFlag[] {
  const flags: YearFlag[] = [];
  for (const y of years) {
    const inYear = items.filter((i) => i.target_year === y);
    if (!inYear.length) flags.push({ year: y, level: 'info', text: 'Open year — room for an OTC hunt or a bucket-list hunt.' });
    const seen = new Map<string, number>();
    for (const i of inYear.filter((x) => x.kind !== 'otc')) {
      const k = `${i.state}|${speciesKeyOf(i.species) ?? i.species}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    for (const [k, n] of seen) {
      if (n > 1) {
        const [st, sp] = k.split('|');
        flags.push({ year: y, level: 'warn', text: `${n} ${st} ${sp.toLowerCase()} draw hunts planned in ${y} — confirm you can apply for and hold both.` });
      }
    }
    for (const i of inYear) {
      const o = i.outlook;
      if (o?.kind === 'draw' && o.minPoints != null && o.minPoints > 0 && (o.firstYearAtMin == null || o.firstYearAtMin > y)) {
        flags.push({ year: y, level: 'warn', text: `${i.state} ${i.hunt_code ? `hunt ${i.hunt_code}` : i.unit ?? i.species}: last draw took ${o.minPoints} points; you'd have ${o.perYear.find((r) => r.year === y)?.points ?? '?'} in ${y}.` });
      }
      if (o?.kind === 'closed') flags.push({ year: y, level: 'warn', text: `${i.state} ${i.hunt_code ?? i.unit ?? ''}: ${o.text}` });
    }
  }
  return flags;
}
