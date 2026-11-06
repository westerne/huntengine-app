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

import type { Hunt, Residency } from './schema';

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
