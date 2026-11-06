import { describe, expect, it } from 'vitest';
import { getStateModule } from '../huntdata/registry';
import { successAtPoints } from '../huntdata/generic';
import { preferenceOdds } from '../huntdata/preferenceDraw';
import { ladderFor } from '../huntdata/ladder';

const co = getStateModule('CO')!;
const elk = (code: string) => co.hunts('ELK').find((h) => h.huntCode === code)!;

describe('Colorado preference draw', () => {
  it('reproduces who actually drew in 2026, point level by point level', () => {
    // Expected first-choice draws from the drawn-out levels (plus hybrid), summed
    // over every elk, deer and pronghorn hunt, against CPW's own successful counts.
    let expected = 0;
    let actual = 0;
    const off: string[] = [];
    for (const sp of ['ELK', 'DEER', 'ANTELOPE'] as const) {
      for (const h of co.hunts(sp)) {
        for (const r of ['resident', 'nonresident'] as const) {
          let e = 0;
          let a = 0;
          for (const l of h.pointLines?.[r] ?? []) {
            e += (l.applicants * (preferenceOdds(h, r, l.points) ?? 0)) / 100;
            a += l.drawn;
          }
          expected += e;
          actual += a;
          if (Math.abs(e - a) > Math.max(2, 0.2 * a)) off.push(`${h.huntCode} ${r}: ${e.toFixed(1)} vs ${a}`);
        }
      }
    }
    expect(Math.abs(expected - actual) / actual).toBeLessThan(0.02);
    // All but about 1% of the 4,664 hunt pools land within two licenses or 20%.
    // The rest drew a few less than modeled above the level: group applications
    // draw at the group's average points, and some applicants turn out ineligible.
    expect(off.length).toBeLessThan(60);
  });

  it('is certain above the level, partial at it, and zero below it without a hybrid draw', () => {
    // EE002E1R residents: ran out at 28 points, 14 of 25 drew there; 5 licenses went by hybrid draw.
    const h = elk('EE002E1R');
    expect(successAtPoints(h, 'resident', 29)).toBe(100);
    expect(successAtPoints(h, 'resident', 28)).toBe(56);
    expect(successAtPoints(h, 'resident', 10)!).toBeGreaterThan(0);
    expect(successAtPoints(h, 'resident', 10)!).toBeLessThan(2);
    expect(successAtPoints(h, 'resident', 4)).toBe(0);
    const plain = co.hunts('ELK').find((x) => !x.hybridTags && x.drawnOut?.resident?.kind === 'points' && (x.drawnOut.resident.points ?? 0) > 5)!;
    expect(successAtPoints(plain, 'resident', 2)).toBe(0);
  });

  it('builds a ladder that jumps to certain once points pass the level', () => {
    const l = ladderFor(elk('EE001E1R'), 'resident');
    expect(l.basis).toBe('modeled');
    expect(l.chances).toBeNull();
    expect(l.byPoints[21]).toBe(100);
  });
});
