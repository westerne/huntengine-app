import { describe, expect, it } from 'vitest';
import { getStateModule } from '../huntdata/registry';
import { successAtPoints } from '../huntdata/generic';
import { preferenceOdds, weightedPreferenceOdds } from '../huntdata/preferenceDraw';
import { chancesSentence, howItDraws } from '../huntdata/weightedDraw';
import { drawReality } from '../huntdata/reality';
import { buildGenericScoutDataset } from '../huntdata/generic';
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

describe('Colorado moose, sheep and goat weighted draw', () => {
  const moose = (code: string) => co.hunts('MOOSE').find((h) => h.huntCode === code)!;

  it('reproduces who drew in 2026 by point band, and nobody under 3 points', () => {
    const bands = { under3: [0, 0], low: [0, 0], high: [0, 0] } as Record<string, [number, number]>;
    for (const sp of ['MOOSE', 'BIGHORNSHEEP', 'MTNGOAT'] as const) {
      for (const h of co.hunts(sp)) {
        for (const r of ['resident', 'nonresident'] as const) {
          if (h.drawnOut?.[r]?.kind !== 'weighted') continue;
          const lines = h.pointLines?.[r] ?? [];
          for (const l of lines) {
            const b = bands[l.points < 3 ? 'under3' : l.points < 10 ? 'low' : 'high'];
            b[0] += (l.applicants * (weightedPreferenceOdds(lines, l.points) ?? 0)) / 100;
            b[1] += l.drawn;
          }
        }
      }
    }
    expect(bands.under3).toEqual([0, 0]);
    for (const k of ['low', 'high']) {
      const [exp, act] = bands[k];
      expect(act).toBeGreaterThan(200);
      expect(Math.abs(exp - act) / act).toBeLessThan(0.1);
    }
  });

  it('gives each point past 3 another chance: weighted points + 1', () => {
    const lines = [
      { points: 2, applicants: 50, drawn: 0 },
      { points: 3, applicants: 100, drawn: 2 },
      { points: 8, applicants: 100, drawn: 6 },
    ];
    // 2 + 6 tags = t·100·1 + t·100·6, so t = 8/700.
    expect(weightedPreferenceOdds(lines, 3)).toBeCloseTo(800 / 700, 5);
    expect(weightedPreferenceOdds(lines, 8)).toBeCloseTo(4800 / 700, 5);
    expect(weightedPreferenceOdds(lines, 2)).toBe(0);
  });

  it('prices a real hunt at the hunter’s points, rising with each point', () => {
    const h = moose('MM053O1X');
    const at = (p: number) => successAtPoints(h, 'resident', p)!;
    expect(at(2)).toBe(0);
    expect(at(3)).toBeGreaterThan(0);
    expect(at(8)).toBeCloseTo(at(3) * 6, 1);
    const l = ladderFor(h, 'resident');
    expect(l.basis).toBe('modeled');
    expect(l.chances?.slice(0, 6)).toEqual([0, 0, 0, 1, 2, 3]);
  });

  it('explains the draw as the weighted draw, not the preference draw', () => {
    const h = moose('MM053O1X');
    expect(howItDraws(h)).toMatch(/3 preference points/);
    expect(howItDraws(elk(co.hunts('ELK')[0].huntCode))).toMatch(/in point order/);
    expect(chancesSentence('CO', 8, h)).toMatch(/8 points are 6 chances/);
    expect(chancesSentence('CO', 1, h)).toMatch(/need 3 points/);
    expect(chancesSentence('CO', 8, elk(co.hunts('ELK')[0].huntCode))).toBeNull();
  });

  it('tells a hunter under 3 points when they’ll be in the draw', () => {
    const hunts = buildGenericScoutDataset(co, 'MOOSE' as never, 'resident', 'any', 1);
    const r = drawReality(hunts, { points: 1, state: 'Colorado', species: 'Moose', thisYear: 2027, lottery: true, entryPoints: 3 });
    expect(r.headline).toMatch(/You need 3 points to be in Colorado's moose draw/);
    expect(r.headline).toMatch(/in 2029/);
  });

  it('leaves out the 2025 fire-return licenses nobody can apply for', () => {
    expect(co.hunts('MOOSE').some((h) => h.huntCode[5] === 'G')).toBe(false);
  });
});
