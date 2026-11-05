import { describe, expect, it } from 'vitest';
import { compareColumn, compareKey, parseCompareKey, pickBest } from '../compare';
import { calendarYears, findHunt, projectPoints } from '../calendar';
import { getStateModule } from '../huntdata/registry';

const ys = calendarYears(2027);
const col = (st: string, sp: string, code: string, res: 'resident' | 'nonresident', pts: number | null) => {
  const h = findHunt(getStateModule(st), sp, code, null)!;
  return compareColumn(h, res, ys, pts == null ? null : projectPoints(pts, ys));
};

describe('compare columns', () => {
  it('round-trips keys, including codes with dashes', () => {
    expect(parseCompareKey(compareKey('WY', 'ELK', '125-1'))).toEqual({ state: 'WY', speciesKey: 'ELK', code: '125-1' });
    expect(parseCompareKey('junk')).toBeNull();
  });
  it('labels how much to trust the odds, per state', () => {
    expect(col('OR', 'Deer', '112', 'resident', 6).reliability).toMatch(/^Good/);
    expect(col('OK', 'Elk', '1020', 'resident', 0).reliability).toMatch(/backup choices/);
    expect(col('WY', 'Elk', '125-1', 'nonresident', 3).reliability).toMatch(/fewest points/);
    expect(col('WA', 'Elk', 'GEN-101-archery', 'nonresident', null).oddsNow).toBe('Over the counter');
  });
  it('never fakes trophy or cost data, and flags closed hunts', () => {
    const c = col('AK', 'Moose', 'DM160', 'resident', null);
    expect(c.openToYou).toBe(false);
    expect(c.oddsNow).toMatch(/Non-residents only/);
    expect(c.trophy).toMatch(/No trophy data/);
    expect(c.cost).toMatch(/Not researched/);
    expect(col('OK', 'Antelope', '2001', 'resident', 0).season).toBe('Sep 4 – Sep 7');
  });
});

describe('clearing the points bar is not the same as drawing', () => {
  it('refuses to date a Nevada hunt off the points cutoff', () => {
    // NDOW published "6 points drew" and "11.1% at 6 points" for this hunt.
    // Nevada is squared-bonus, so the cutoff is a door, not a date — reading it
    // as one put "likely to draw by 2027" above an 11% chance.
    const c = col('NV', 'Elk', '4151-104-Late', 'nonresident', 6);
    // A pure lottery has no bar to clear at all: the chance is modeled from
    // (points² + 1) draw numbers each year instead (weightedDraw.ts).
    expect(c.clearsBarIn).toBeNull();
    expect(c.likelyBy).toBeNull();
    expect(c.chanceBy5!).toBeLessThan(50);
  });

  it('still dates a Kansas hunt off the cutoff, because tags go in point order', () => {
    // Kansas is a preference state: clearing the bar really is the tag.
    const c = col('KS', 'Antelope', 'ANTELOPE-R-ML-2', 'resident', 1);
    expect(c.clearsBarIn).toBe(2027);
    expect(c.likelyBy).toBe(2027);
  });

  it('states the window as a year rather than a hard-coded five', () => {
    expect(col('NV', 'Elk', '4151-104-Late', 'nonresident', 6).throughYear).toBe(ys[ys.length - 1]);
  });
});

describe('the recommendation', () => {
  it('weighs drawing odds against hunter success and states the tradeoff', () => {
    const easy = col('OR', 'Elk', '210A2', 'nonresident', 6);
    const hard = col('OR', 'Deer', '112', 'resident', 6);
    const closed = col('AK', 'Moose', 'DM160', 'resident', null);
    const r = pickBest([hard, easy, closed])!;
    expect(r.key).not.toBe(closed.key);
    expect(r.why).toMatch(/hunter success/);
    expect(pickBest([closed])).toBeNull();
  });

  it('never offers an earlier year as the reason an alternative lost', () => {
    // The old wording was always "but you'd likely wait until <year>", which
    // read as a downside even when that year was sooner than the pick's.
    const cow = col('NV', 'Elk', '4181-076-Late', 'nonresident', 6);   // 25%, 50.7% fill
    const bull = col('NV', 'Elk', '4151-104-Late', 'nonresident', 6);  // 11%, 65.2% fill
    const r = pickBest([cow, bull])!;
    expect(r.key).toBe(cow.key);
    expect(r.tradeoff).toMatch(/higher hunter success \(65\.2%\)/);
    expect(r.tradeoff).toMatch(/chance of drawing it .* is lower/);
    expect(r.tradeoff).not.toMatch(/wait until/);
  });

  it('says a bar was cleared rather than claiming a date, where that is all we have', () => {
    const wy = col('WY', 'Elk', '125-1', 'nonresident', 9);
    if (wy.likelyBy == null && wy.chanceBy5 == null) {
      const r = pickBest([wy])!;
      expect(r.why).toMatch(/clear the points bar|no published odds/);
      expect(r.why).not.toMatch(/likely to draw by/);
    }
  });
});
