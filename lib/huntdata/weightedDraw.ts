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
//
// Utah adds a step before the lottery: half of each hunt's permits go to the
// applicants with the most bonus points (PointLine.bonus says how many went at
// each level). Everyone those don't reach goes into the random draw with
// points + 1 chances.

import type { PointLine } from './schema';

export const DRAW_WEIGHT: Record<string, (points: number) => number> = {
  NV: (p) => p * p + 1,
  UT: (p) => p + 1,
};

// How each modeled draw works, in a phrase that finishes "…from the point
// table: ___".
export const HOW_IT_DRAWS: Record<string, string> = {
  NV: 'each applicant gets points squared plus one chances, and the lowest number wins',
  UT: 'half the permits go to the applicants with the most points, and everyone else gets points plus one chances in the random draw',
  // Not a weighted lottery, but its odds are worked out the same way (preferenceDraw.ts).
  CO: 'licenses go in point order, so above the level where they ran out you draw, at that level some do, and below it you don’t, except on hunts with a hybrid draw, where a few licenses go at random to applicants with 5 or more points',
};

// "so 6 points are 37 chances": how a hunter's points turn into draw entries.
export function chancesSentence(state: string, points: number): string | null {
  const n = chancesAt(state, points);
  if (n == null) return null;
  const pts = `${points} ${points === 1 ? 'point is' : 'points are'} ${n} ${n === 1 ? 'chance' : 'chances'}`;
  if (state === 'UT') return `Half the permits go to the most points; in the random draw for the rest you get one entry plus one per point, so ${pts}.`;
  return `Every application is a chance: you get your points squared plus one draw numbers, so ${pts}.`;
}

export function chancesAt(state: string, points: number): number | null {
  const w = DRAW_WEIGHT[state];
  return w ? w(Math.max(0, Math.floor(points))) : null;
}

// Percent chance (0–100) that a hunter holding `points` draws, given last
// year's applicants by point level and how many of them drew. The tags are
// the ones that actually went to this pool's applicants, so second-choice and
// leftover tags elsewhere don't inflate it.
export function weightedOdds(lines: PointLine[], points: number, weight: (p: number) => number): number | null {
  const p = Math.max(0, Math.floor(points));
  if (!lines.some((l) => l.applicants > 0)) return null;
  const top = topPointsShare(lines, p);
  // Whoever the top-points permits don't reach goes into the random draw.
  const rest = lines.map((l) => ({ ...l, applicants: l.applicants - Math.min(l.bonus ?? 0, l.applicants), drawn: Math.max(0, l.drawn - (l.bonus ?? 0)) }));
  const random = lotteryOdds(rest, p, weight) ?? 0;
  return 100 * (top + (1 - top) * (random / 100));
}

// Share (0–1) of a hunter at `points` who'd get one of the permits reserved for
// the most points: everyone above the level where they ran out, part of that level.
export function topPointsShare(lines: PointLine[], points: number): number {
  let left = lines.reduce((s, l) => s + (l.bonus ?? 0), 0);
  if (left <= 0) return 0;
  for (const l of [...lines].sort((a, b) => b.points - a.points)) {
    if (points > l.points) return left > 0 ? 1 : 0;
    if (points === l.points) return l.applicants ? Math.min(1, left / l.applicants) : left > 0 ? 1 : 0;
    left -= l.applicants;
    if (left <= 0) return 0;
  }
  return left > 0 ? 1 : 0;
}

function lotteryOdds(lines: PointLine[], points: number, weight: (p: number) => number): number | null {
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
  return 100 * (1 - Math.exp(-weight(points) * hi));
}
