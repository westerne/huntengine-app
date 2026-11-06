// "How do my odds go up as I build points?" for one hunt.
//
// byPoints[p] is the yearly chance for someone holding p points, so the page
// can redraw the ladder for any starting balance without a round trip. In
// Nevada it's modeled from the whole point table (weightedDraw.ts); elsewhere
// it's the agency's own result at that level, and where a state publishes no
// figures by point level there is one overall rate and we say so.

import type { Hunt, PointLine, Residency } from './schema';
import { successAtPoints } from './generic';
import { DRAW_WEIGHT, chancesAt } from './weightedDraw';
import { isWeightedPreference, weightedChances } from './preferenceDraw';

export const MAX_LADDER_POINTS = 40;

export type Ladder = {
  basis: 'modeled' | 'by-points' | 'overall' | 'none';
  byPoints: number[];            // yearly chance (0–100) at 0..MAX_LADDER_POINTS points
  overall: number | null;        // the pool's overall draw rate
  chances: number[] | null;      // draw numbers per points level, where the state works that way
  pointTable: PointLine[];       // last year's applicants and draws by level
};

export function ladderFor(hunt: Hunt, residency: Residency): Ladder {
  const stat = residency === 'resident' ? hunt.draw.resident : hunt.draw.nonresident;
  const overall = stat?.successPct ?? null;
  const lines = hunt.pointLines?.[residency] ?? [];
  const levels = Array.from({ length: MAX_LADDER_POINTS + 1 }, (_, p) => p);
  const weighted = !!DRAW_WEIGHT[hunt.state] && lines.length > 0;
  const modeled = weighted || (!!hunt.drawnOut?.[residency] && lines.length > 0);
  if (lines.length) {
    return {
      basis: modeled ? 'modeled' : 'by-points',
      byPoints: levels.map((p) => successAtPoints(hunt, residency, p) ?? 0),
      overall,
      chances: weighted ? levels.map((p) => chancesAt(hunt.state, p)!) : isWeightedPreference(hunt) ? levels.map(weightedChances) : null,
      pointTable: lines,
    };
  }
  return { basis: overall != null ? 'overall' : 'none', byPoints: levels.map(() => overall ?? 0), overall, chances: null, pointTable: [] };
}

export type LadderRow = { year: number; points: number; chance: number; cumulative: number; chances: number | null };

// Apply every year from `start` points, never drawing: a point a year.
export function ladderRows(l: Ladder, start: number, firstYear: number, years: number): LadderRow[] {
  let miss = 1;
  return Array.from({ length: years }, (_, i) => {
    const points = Math.min(MAX_LADDER_POINTS, start + i);
    const chance = l.byPoints[points] ?? 0;
    miss *= 1 - Math.min(100, chance) / 100;
    return { year: firstYear + i, points, chance, cumulative: 100 * (1 - miss), chances: l.chances?.[points] ?? null };
  });
}

// Where space is tight (chart labels, the big number).
export const chanceShort = (n: number) => chanceText(n).replace('under ', '<');

// A chance in words that never turns a real long shot into "0%".
export function chanceText(n: number): string {
  if (n <= 0) return '0%';
  if (n < 0.1) return 'under 0.1%';
  if (n < 1) return `${n.toFixed(2).replace(/0$/, '')}%`;
  if (n < 10) return `${n.toFixed(1).replace(/\.0$/, '')}%`;
  if (n >= 99.5) return '100%';
  return `${Math.round(n)}%`;
}
