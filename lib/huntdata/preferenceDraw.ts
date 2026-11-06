// Odds in Colorado's preference draw, from CPW's own "Drawn Out At" results.
//
// First-choice applicants are drawn in preference-point order, so a hunt's
// licenses run out at one point level: everyone above it drew, some at it did
// (CPW prints "14 of 25"), and nobody below it did. Across the 2026 elk, deer
// and pronghorn draws, not one applicant below that level drew on a hunt
// without a hybrid allocation.
//
// The exception is the hybrid draw: on the hardest hunt codes CPW sets aside
// up to 20% of the licenses for a random draw among applicants below the
// level. In 2026 all 244 of those winners held at least 5 points (0 of 10,693
// applicants under 5 drew), and the winners were spread across point levels
// the way an even draw would spread them, so it's modeled as an even chance
// for everyone at 5+ points below the level.

import type { Hunt, PointLine, Residency } from './schema';

export type DrawnOut = {
  // points: licenses ran out at `points`; choice: every first-choice applicant
  // drew; leftover: licenses were left after the draw; none: none drawn in this
  // pool; noApps: nobody applied; weighted: a weighted random draw (moose,
  // sheep, goat) above `minPoints`; na: not applicable.
  kind: 'points' | 'choice' | 'leftover' | 'none' | 'noApps' | 'weighted' | 'na';
  points?: number;
  drawnAtLevel?: number;
  appliedAtLevel?: number;
  minPoints?: number;
};

// Fewest points among 2026 hybrid-draw winners (see above).
export const HYBRID_MIN_POINTS = 5;

// Percent chance (0–100) for a first-choice applicant holding `points`, or null
// where the results don't say.
export function preferenceOdds(h: Hunt, residency: Residency, points: number): number | null {
  const o = h.drawnOut?.[residency];
  if (!o) return null;
  if (o.kind === 'choice' || o.kind === 'leftover') return 100;
  if (o.kind === 'none') return 0;
  if (o.kind === 'weighted') return weightedPreferenceOdds(h.pointLines?.[residency] ?? [], points, o.minPoints ?? WEIGHTED_FROM);
  if (o.kind !== 'points' || o.points == null) return null;
  const p = Math.max(0, Math.floor(points));
  if (p > o.points) return 100;
  if (p === o.points) return o.appliedAtLevel ? (100 * (o.drawnAtLevel ?? 0)) / o.appliedAtLevel : null;
  if (!h.hybridTags || p < HYBRID_MIN_POINTS) return 0;
  return hybridOdds(h, residency, o.points);
}

// Even chance for everyone at HYBRID_MIN_POINTS or more below the level: the
// licenses that went below it, over everyone eligible.
function hybridOdds(h: Hunt, residency: Residency, level: number): number {
  const eligible = (h.pointLines?.[residency] ?? []).filter((l) => l.points < level && l.points >= HYBRID_MIN_POINTS);
  const applicants = eligible.reduce((s, l) => s + l.applicants, 0);
  const drawn = eligible.reduce((s, l) => s + l.drawn, 0);
  return applicants ? Math.min(100, (100 * drawn) / applicants) : 0;
}

// Moose, bighorn sheep and mountain goat: points stop at 3 preference points,
// and every year after that adds a weighted point. When licenses run out among
// the 3-point applicants, CPW gives each of them a random number, divides it by
// weighted points + 1, and the lowest numbers draw (2026 brochure, p. 9). So a
// hunter's chance is t × (weighted + 1) for the one cutoff t that hands out the
// licenses that went. Points here are the total: 3 preference + weighted
// (5 weighted points = 8). Checked against 2026: expected and actual draws by
// level agree across the 271 hunts whose tables add up (see the test).
export const WEIGHTED_FROM = 3;
export const WEIGHTED_SPECIES = ['MOOSE', 'BIGHORNSHEEP', 'MTNGOAT'];

export const isWeightedPreference = (h: Pick<Hunt, 'drawnOut'>) =>
  Object.values(h.drawnOut ?? {}).some((o) => o?.kind === 'weighted');

// What drawReality needs to know about a state and species' draw.
export function entryPointsFor(state: string, speciesKey: string | null): number | undefined {
  return state === 'CO' && speciesKey && WEIGHTED_SPECIES.includes(speciesKey) ? WEIGHTED_FROM : undefined;
}

// Draw entries at a point total: none under 3, then weighted points + 1.
export const weightedChances = (points: number) => (points >= WEIGHTED_FROM ? Math.floor(points) - WEIGHTED_FROM + 1 : 0);

export function weightedPreferenceOdds(lines: PointLine[], points: number, from = WEIGHTED_FROM): number | null {
  const p = Math.max(0, Math.floor(points));
  const pool = lines.filter((l) => l.points >= from && l.applicants > 0);
  if (!pool.length) return null;
  if (p < from) return 0;
  const applicants = pool.reduce((s, l) => s + l.applicants, 0);
  const tags = pool.reduce((s, l) => s + Math.min(l.drawn, l.applicants), 0);
  if (tags <= 0) return 0;
  if (tags >= applicants) return 100;
  const share = (t: number, pts: number) => Math.min(1, t * (pts - from + 1));
  const expected = (t: number) => pool.reduce((s, l) => s + l.applicants * share(t, l.points), 0);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (expected(mid) < tags) lo = mid; else hi = mid;
  }
  return 100 * share(hi, p);
}
