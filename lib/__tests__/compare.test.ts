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
});
