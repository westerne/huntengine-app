// Odds in a weighted lottery, modeled from the agency's point table instead of
// read off last year's results.
//
// Nevada gives every applicant (points² + 1) random numbers and the lowest
// numbers win. Last year's "drew at 6 points" column is just who happened to
// win: 0 of 176 non-residents at 6 points drew unit 111 archery elk, which
// read as "0% until you have 11 points". In fact every one of them held 37
// chances against everyone else's, and next year any of them could draw.
//
// The model: each applicant's best number behaves like an exponential clock
// with rate equal to their chance count, and the tags go to the first clocks
// to ring. Find the time t at which the expected number of winners equals the
// tags handed out; a hunter with w chances then draws with 1 − e^(−w·t).
// Checked against Nevada's 2025 results across every hunt: expected draws by
// point level land within a few percent of the actual (828 vs 835 at 6 points,
// 155 vs 144 at 10). Only states checked that way are listed here.

import type { PointLine } from './schema';

export const DRAW_WEIGHT: Record<string, (points: number) => number> = {
  NV: (p) => p * p + 1,
};

export function chancesAt(state: string, points: number): number | null {
  const w = DRAW_WEIGHT[state];
  return w ? w(Math.max(0, Math.floor(points))) : null;
}

// Percent chance (0–100) that a hunter holding `points` draws, given last
// year's applicants by point level and how many of them drew. The tags are
// the ones that actually went to this pool's applicants, so second-choice and
// leftover tags elsewhere don't inflate it.
export function weightedOdds(lines: PointLine[], points: number, weight: (p: number) => number): number | null {
  const pool = lines.filter((l) => l.applicants > 0).map((l) => ({ n: l.applicants, w: weight(l.points) }));
  const applicants = pool.reduce((s, l) => s + l.n, 0);
  const tags = lines.reduce((s, l) => s + Math.min(l.drawn, l.applicants), 0);
  if (!applicants) return null;
  if (tags <= 0) return 0;
  if (tags >= applicants) return 100;
  const expected = (t: number) => pool.reduce((s, l) => s + l.n * (1 - Math.exp(-l.w * t)), 0);
  let lo = 0;
  let hi = 1;
  while (expected(hi) < tags) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (expected(mid) < tags) lo = mid; else hi = mid;
  }
  return 100 * (1 - Math.exp(-weight(Math.max(0, Math.floor(points))) * hi));
}
