import { describe, expect, it } from 'vitest';
import { rankLegacy } from '../huntdata/legacyRank';

// The shape Wyoming's hand-built datasets share across deer, elk and antelope.
const hunt = (over: Record<string, unknown>): Record<string, unknown> => ({
  unit: 'X', huntType: 'Type 1 — Any Elk', residentOdds: 'N/A',
  nrRegularMinPoints: 'N/A', nrSpecialMinPoints: 'N/A', nrRandomOdds: 'N/A', ...over,
});

describe('shortlisting Wyoming in place', () => {
  it('hands back the original objects, not projections', () => {
    const a = hunt({ unit: '1-1', nrRegularMinPoints: 2, hunterSuccess: '40%', grizzlyPresence: true });
    const out = rankLegacy([a], { isResident: false });
    expect(out[0]).toBe(a);
    expect(out[0].grizzlyPresence).toBe(true);   // domain fields survive
  });

  it('ranks a non-resident by hunter success, then by points needed', () => {
    const rows = [
      hunt({ unit: 'far', nrRegularMinPoints: 14, hunterSuccess: '30%' }),
      hunt({ unit: 'good', nrRegularMinPoints: 14, hunterSuccess: '70%' }),
      hunt({ unit: 'near', nrRegularMinPoints: 1, hunterSuccess: '70%' }),
    ];
    // near and good are both 70%, so the one within reach of fewer points
    // comes first; far is a worse hunt at the same price as good.
    expect(rankLegacy(rows, { isResident: false }).map((r) => r.unit)).toEqual(['near', 'good', 'far']);
  });

  it('uses the special pool only when the hunter asked for it', () => {
    const rows = [hunt({ unit: 'a', nrRegularMinPoints: 16, nrSpecialMinPoints: 2, hunterSuccess: '50%' })];
    // Special included: 2 points is within reach, so it is a near hunt.
    expect(rankLegacy(rows, { isResident: false, includeSpecialDraw: true })).toHaveLength(1);
    // Excluded: still shortlisted, but on the regular pool's 16.
    expect(rankLegacy(rows, { isResident: false, includeSpecialDraw: false })).toHaveLength(1);
  });

  it('ranks a resident on resident odds, ignoring the non-resident pools', () => {
    const rows = [
      hunt({ unit: 'long', residentOdds: '9.17%', nrRegularMinPoints: 0 }),
      hunt({ unit: 'likely', residentOdds: '77.78%', nrRegularMinPoints: 16 }),
    ];
    expect(rankLegacy(rows, { isResident: true }).map((r) => r.unit)).toEqual(['likely', 'long']);
  });

  it('reads the odds strings Wyoming actually publishes', () => {
    const rows = [
      hunt({ unit: 'tilde', residentOdds: '~100%' }),
      hunt({ unit: 'zero', residentOdds: '0%' }),
      hunt({ unit: 'na', residentOdds: 'N/A' }),
    ];
    const out = rankLegacy(rows, { isResident: true }).map((r) => r.unit);
    expect(out[0]).toBe('tilde');
    expect(out).not.toContain('na');            // nothing to rank it on
  });

  it('caps at the requested size', () => {
    const rows = Array.from({ length: 30 }, (_, i) => hunt({ unit: `u${i}`, nrRegularMinPoints: i, hunterSuccess: '50%' }));
    expect(rankLegacy(rows, { isResident: false, size: 8 })).toHaveLength(8);
  });
});

describe('Wyoming region general licences', () => {
  it('keeps them even though they publish no points or odds', () => {
    const rows = [
      hunt({ unit: 'Region W', areaPattern: 'NR_REGION' }),
      hunt({ unit: '8-1', nrRegularMinPoints: 1, hunterSuccess: '60%' }),
    ];
    expect(rankLegacy(rows, { isResident: false }).map((r) => r.unit)).toContain('Region W');
  });

  it('recognises them however the dataset labels them', () => {
    for (const row of [
      hunt({ unit: 'Region E', areaPattern: 'NR_REGION' }),
      hunt({ unit: 'G', huntTypeCode: 'general' }),
      hunt({ unit: 'Region C', productType: 'REGION_GENERAL' }),
    ]) {
      expect(rankLegacy([row], { isResident: false })).toHaveLength(1);
    }
  });
});
