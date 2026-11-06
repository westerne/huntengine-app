// Application windows, fees and prerequisites for all 17 states
// (lib/huntdata/apply/<st>.json — format in FORMAT.md). Researched from agency
// sources and signed off by the owner (docs/review/application-data-2026-11-04.md).
//
// Rules applied here, once, so every screen and the advisor agree:
//  - A date is "published" only for the hunt's own season year. Anything else
//    is last year's, shown labeled, and never offered as this year's deadline.
//  - Dates worked out from a regulation's formula are "expected", not published.
//  - States the owner hasn't cleared yet are held back entirely.

import type { Residency } from '../schema';
import ak from './ak.json';
import az from './az.json';
import ca from './ca.json';
import co from './co.json';
import id from './id.json';
import ks from './ks.json';
import mt from './mt.json';
import nd from './nd.json';
import ne from './ne.json';
import nm from './nm.json';
import nv from './nv.json';
import ok from './ok.json';
import or from './or.json';
import sd from './sd.json';
import ut from './ut.json';
import wa from './wa.json';
import wy from './wy.json';

type ResidencyOpt = 'resident' | 'nonresident' | 'both' | null;

export type ApplyWindow = {
  name: string;
  species: string[];
  residency: ResidencyOpt;
  year: number;
  status: 'published' | 'last_year';
  opens: string | null;
  deadline: string | null;
  timezone: string | null;
  resultsBy?: string | null;
  basis?: 'computed_from_rule';
  source: string;
  quote: string;
};
export type FeeLine = {
  item: string; label: string; species: string[]; residency: ResidencyOpt; amount: number | null;
  year: number | null; refundable?: boolean | null; notes?: string | null; source: string; quote: string;
};
export type Prerequisite = { text: string; residency: ResidencyOpt; species: string[]; source: string; quote: string };
export type ApplyFile = {
  state: string; checkedOn: string; applyUrl: string | null; howToUrl: string | null;
  draws: ApplyWindow[]; pointOnly?: ApplyWindow[]; fees: FeeLine[]; prerequisites: Prerequisite[]; notes?: string;
};

const FILES: Record<string, ApplyFile> = Object.fromEntries(
  [ak, az, ca, co, id, ks, mt, nd, ne, nm, nv, ok, or, sd, ut, wa, wy].map((f) => [(f as unknown as ApplyFile).state, f as unknown as ApplyFile]),
);

// Signed off with a condition: re-check by hand on the agency site first.
export const PENDING_OWNER_CHECK = new Set(['KS']);

export function applyFile(state: string): ApplyFile | null {
  const st = state.toUpperCase();
  if (PENDING_OWNER_CHECK.has(st)) return null;
  return FILES[st] ?? null;
}

const fits = (species: string[], key: string | null) => !key || species.includes('ALL') || species.includes(key);
const forRes = (r: ResidencyOpt, residency: Residency | null) => !residency || r == null || r === 'both' || r === residency;

export function windowsFor(state: string, speciesKey: string | null, residency: Residency | null): ApplyWindow[] {
  const f = applyFile(state);
  return f ? f.draws.filter((d) => fits(d.species, speciesKey) && forRes(d.residency, residency)) : [];
}

export type Deadline = {
  kind: 'published' | 'expected' | 'last_year';
  date: string;              // YYYY-MM-DD
  time: string | null;       // HH:MM
  timezone: string | null;
  name: string;
  year: number;
  source: string;
};

const toDeadline = (w: ApplyWindow, kind: Deadline['kind']): Deadline => {
  const [date, time] = (w.deadline ?? '').split('T');
  return { kind, date, time: time ? time.slice(0, 5) : null, timezone: w.timezone, name: w.name, year: w.year, source: w.source };
};

// Special draws (sportsman/conservation permits, youth, landowner, leftover,
// second draws, Tier subsistence) don't set "the" deadline for a hunt unless
// they're all the state has for it — e.g. Utah's sportsman permits close in
// November, months before the main draw.
const SPECIAL = /sportsman|conservation|expo|youth|landowner|leftover|second|tier\s*i|antlerless|reissue|guided/i;

// The deadline that matters for a hunt in a season: the main draw's, this
// season's if posted, otherwise last year's for reference. A date calculated
// from a rule is "expected" only for this season; for an earlier year it's
// simply last year's.
export function deadlineFor(state: string, speciesKey: string | null, residency: Residency | null, seasonYear: number): Deadline | null {
  const ws = windowsFor(state, speciesKey, residency).filter((w) => w.deadline);
  const soonest = (list: ApplyWindow[]) => [...list].sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
  const pick = (list: ApplyWindow[]) => {
    const current = soonest(list.filter((w) => w.status === 'published' && w.year === seasonYear));
    if (current) return toDeadline(current, current.basis === 'computed_from_rule' ? 'expected' : 'published');
    const prior = soonest(list.filter((w) => w.year < seasonYear));
    return prior ? toDeadline(prior, 'last_year') : null;
  };
  return pick(ws.filter((w) => !SPECIAL.test(w.name))) ?? pick(ws);
}

export function feesFor(state: string, speciesKey: string | null, residency: Residency | null): FeeLine[] {
  const f = applyFile(state);
  return f ? f.fees.filter((x) => fits(x.species, speciesKey) && forRes(x.residency, residency)) : [];
}

// Does this residency earn points for this species here? true / false, or
// null when the fee file can't say. Wyoming sells elk points only to
// non-residents, so a resident's chance is the same every year.
export function pointsSoldTo(state: string, speciesKey: string, residency: Residency): boolean | null {
  const f = applyFile(state);
  if (!f) return null;
  if (feesFor(state, speciesKey, residency).some((x) => x.item === 'point fee' && x.amount != null)) return true;
  const windows = (f.pointOnly ?? []).filter((w) => fits(w.species, speciesKey));
  if (windows.some((w) => forRes(w.residency, residency))) return true;
  return windows.length ? false : null;
}

export function prerequisitesFor(state: string, speciesKey: string | null, residency: Residency | null): Prerequisite[] {
  const f = applyFile(state);
  return f ? f.prerequisites.filter((x) => fits(x.species, speciesKey) && forRes(x.residency, residency)) : [];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// One line for lists: "Due Apr 7" / "Expected Jun 12" / "Last year Apr 7".
export function deadlineText(d: Deadline | null): string | null {
  if (!d) return null;
  if (d.kind === 'published') return `Due ${shortDate(d.date)}`;
  if (d.kind === 'expected') return `Expected ${shortDate(d.date)}`;
  return `Last year ${shortDate(d.date)}`;
}
