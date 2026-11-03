// Server-side shortlisting for Wyoming, which stays on its hand-tuned branch.
//
// Wyoming is not short of data — it is the richest state in here, with resident
// and non-resident pools, a separate special draw, quotas, applicant counts and
// two years of history. What it lacked was anyone choosing. The model was handed
// all 148 elk products and asked to pick, and on three identical requests it
// returned two hunts, then none, then three. Montana and Colorado, where the
// server shortlists, return eight every time.
//
// Moving Wyoming onto the shared builders would fix that and lose the rest: the
// shared format has no regular-versus-special split, no area patterns or hybrid
// upgrade notes, no guide or grizzly flags. So the shortlist comes to Wyoming
// instead. Entries are projected onto the few fields buildShortlist ranks by,
// ranked, and then the original objects are handed back untouched and in order.

import { buildShortlist, type ShortlistOptions } from './shortlist';

type Entry = Record<string, unknown>;

// "9.17%", "~100%", "0%" -> 9.17, 100, 0. "N/A" and friends -> null.
function pctOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if (!text || /^n\/?a$/i.test(text)) return null;
  const n = parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function pointsOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if (!text || /^n\/?a$/i.test(text)) return null;
  const n = parseInt(text, 10);
  return Number.isFinite(n) ? n : null;
}

export type LegacyRankOptions = {
  isResident: boolean;
  // The planner's "Include Wyoming Special Draw" toggle. The special pool
  // costs more and usually draws at fewer points, so including it changes
  // which hunts are within reach.
  includeSpecialDraw?: boolean;
  // What the hunter holds in this state, so hunts within reach rank first.
  hunterPoints?: number;
  size?: number;
  goal?: ShortlistOptions['goal'];
};

// The handful of fields buildShortlist reads, derived from whichever shape the
// hand-built dataset uses. Deer, elk and antelope all name them the same way.
// Wyoming's region general licences — "Region W" and friends — are a separate
// non-resident pool and publish no points or odds, so ranking them on those
// drops them entirely. They are the realistic option for a hunter without a
// pile of points, and the model reaches for them first: shortlisting without
// them, it recommended Region W anyway and the unit guard threw it away.
// buildShortlist already has a band for always-available hunts, so they go
// there.
function isGenerallyAvailable(entry: Entry): boolean {
  return entry.areaPattern === 'NR_REGION'
    || entry.huntTypeCode === 'general'
    || /^region\b/i.test(String(entry.unit ?? ''))
    || /general|region/i.test(String(entry.productType ?? ''));
}

function project(entry: Entry, opts: LegacyRankOptions, index: number) {
  const regular = pointsOf(entry.nrRegularMinPoints);
  const special = opts.includeSpecialDraw === false ? null : pointsOf(entry.nrSpecialMinPoints);
  const needed = [regular, special].filter((n): n is number => n != null);

  // Residents don't draw against the non-resident point pools, so they are
  // ranked on the resident odds instead.
  const needs = opts.isResident || !needed.length ? null : Math.min(...needed);

  // Reachability has to come first. Ranking purely on hunter success buried
  // the hunts this hunter can actually draw this year under better hunts they
  // can't, and the model answered by reaching outside the shortlist entirely.
  // A hunt within their points is scored on the odds at that point level —
  // the same thing buildGenericScoutDataset does for the shared states.
  const withinReach = needs != null && needs <= (opts.hunterPoints ?? 0);
  const oddsAtMin = pctOf(entry.nrRegularOddsAtMin) ?? pctOf(entry.nrSpecialOddsAtMin);

  const points = withinReach ? null : needs;
  const odds = opts.isResident
    ? pctOf(entry.residentOdds)
    : withinReach
    ? oddsAtMin ?? 100
    // Out of reach: ranked on what it would take. The random pool is all a
    // hunter without the points can play, so that stands in where there is
    // no point line at all.
    : needs != null ? null : pctOf(entry.nrRandomOdds);

  return {
    index,
    unit: entry.unit,
    huntCode: entry.unit,
    label: entry.huntType ?? entry.huntTypeLabel ?? null,
    otc: isGenerallyAvailable(entry),
    hunterSuccess: entry.hunterSuccess,
    drawSuccess: odds,
    fewestPointsToDraw: points,
  };
}

export function rankLegacy<T extends Entry>(entries: T[], opts: LegacyRankOptions): T[] {
  const projected = entries.map((e, i) => project(e, opts, i));
  const picked = buildShortlist(projected, { size: opts.size ?? 8, goal: opts.goal });
  return picked.map((p) => entries[p.index]);
}
