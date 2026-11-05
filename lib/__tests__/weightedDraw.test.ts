import { describe, expect, it } from 'vitest';
import { getStateModule } from '../huntdata/registry';
import { DRAW_WEIGHT, weightedOdds } from '../huntdata/weightedDraw';
import { successAtPoints } from '../huntdata/generic';
import { drawOutlook, findHunt, projectPoints } from '../calendar';

const nv = getStateModule('NV')!;
const elk = (code: string) => findHunt(nv, 'Elk', code, null)!;
const ys = [2027, 2028, 2029];

describe('Nevada squared-bonus draw', () => {
  it('reproduces who actually drew in 2025, point level by point level', () => {
    // Expected draws by point level, summed over every Nevada hunt and pool,
    // against the real draws. This is the check that says points² + 1 is right.
    const band = new Map<number, { expected: number; actual: number }>();
    for (const sp of nv.species) {
      for (const h of nv.hunts(sp)) {
        for (const r of ['resident', 'nonresident'] as const) {
          const lines = h.pointLines?.[r];
          if (!lines?.length || !lines.some((l) => l.drawn)) continue;
          for (const l of lines) {
            const b = band.get(Math.min(l.points, 12)) ?? { expected: 0, actual: 0 };
            b.expected += (l.applicants * weightedOdds(lines, l.points, DRAW_WEIGHT.NV)!) / 100;
            b.actual += Math.min(l.drawn, l.applicants);
            band.set(Math.min(l.points, 12), b);
          }
        }
      }
    }
    for (const [pts, b] of band) {
      if (b.actual < 100) continue;
      expect(Math.abs(b.expected - b.actual) / b.actual, `at ${pts} points`).toBeLessThan(0.1);
    }
  });

  it('gives every applicant a chance, growing with points', () => {
    const h = elk('4161-111');
    const at = (p: number) => successAtPoints(h, 'nonresident', p)!;
    // Nobody at 6 points drew in 2025, but they held 37 numbers each.
    expect(at(6)).toBeGreaterThan(0);
    expect(at(6)).toBeLessThan(1);
    expect(at(10)).toBeGreaterThan(at(6));
    expect(at(20)).toBeGreaterThan(at(10));
  });

  it("doesn't pass one lucky draw off as the odds", () => {
    // 1 of 9 non-residents at 6 points drew 4161-131 in 2025: "11.1%".
    expect(successAtPoints(elk('4161-131'), 'nonresident', 6)!).toBeLessThan(2);
  });

  it('explains the lottery instead of quoting a points bar', () => {
    const o = drawOutlook(elk('4161-111'), 'nonresident', ys, projectPoints(6, ys));
    expect(o.kind).toBe('draw');
    if (o.kind !== 'draw') return;
    expect(o.pointsBar).toBe(false);
    expect(o.firstYearAtMin).toBeNull();
    expect(o.text).toMatch(/6 points are 37 chances/);
    expect(o.text).not.toMatch(/you'd have that in/);
  });
});

describe('Find in a lottery state', () => {
  it('lists only real chances, never "build toward" hunts, and names the best long shot', async () => {
    const { buildGenericScoutDataset } = await import('../huntdata/generic');
    const { drawReality } = await import('../huntdata/reality');
    const hunts = buildGenericScoutDataset(nv, 'ELK' as never, 'nonresident', 'archery', 6);
    const r = drawReality(hunts, { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027, lottery: true });
    expect(r.soon).toEqual([]);
    expect(r.reachable.every((h) => (h.odds ?? 0) >= 1)).toBe(true);
    if (!r.reachable.length) {
      expect(r.headline).toMatch(/draws by lottery/);
      expect(r.headline).not.toMatch(/you'd have in/);
    }
  });
});
