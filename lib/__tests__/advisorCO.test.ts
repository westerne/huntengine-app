import { describe, expect, it } from 'vitest';
import { getHunt, searchHunts, type Situation } from '../advisor/tools';
import { findHunt } from '../calendar';
import { getStateModule } from '../huntdata/registry';

// From an owner transcript (2026-11-06): Colorado deer, a November hunt they
// can draw every 2-3 years, then "unit 35 2nd or 3rd season" and "DM0353R".
const sit: Situation = { home: 'WY', balances: [{ state: 'CO', species: 'Deer', points: 2 }], years: [2027, 2028, 2029], seasonYear: 2027 };

describe('Colorado deer questions the advisor got wrong', () => {
  it('lists every hunt in a unit when asked by unit', () => {
    const r = getHunt({ state: 'CO', species: 'Deer', unit: '35' }, sit);
    expect(r.ok).toBe(true);
    if (!r.ok || !('hunts' in r.data)) throw new Error('expected a unit list');
    const codes = r.data.hunts.map((h) => h.huntCode);
    expect(codes).toEqual(expect.arrayContaining(['DM035O2R', 'DM035O3R']));
    const third = r.data.hunts.find((h) => h.huntCode === 'DM035O3R')!;
    expect(third.season).toEqual({ open: '2026-11-07', close: '2026-11-15' });
    expect(third.seasonMonths).toEqual(['Nov']);
    expect(third.pointsToDraw).not.toBeNull();
  });

  it('reads hunt codes the way hunters write them', () => {
    const co = getStateModule('CO');
    for (const typed of ['DM0353R', 'D-M-035-O3-R', 'dm35o3r']) expect(findHunt(co, 'Deer', typed, null)?.huntCode, typed).toBe('DM035O3R');
  });

  it('filters to November seasons that drew at 2 points or less', () => {
    const r = searchHunts({ state: 'CO', species: 'Deer', month: 'November', maxPointsToDraw: 2 }, sit);
    if (!r.ok) throw new Error(r.reason);
    const f = r.data.filtered!;
    expect(f.month).toBe('Nov');
    expect(f.matched).toBeGreaterThan(3);
    for (const h of f.matches) {
      expect(h.seasonMonths).toContain('Nov');
      expect(h.pointsToDraw!).toBeLessThanOrEqual(2);
    }
  });
});

describe('Colorado season dates from the brochures', () => {
  const co = getStateModule('CO')!;
  const season = (sp: string, code: string) => co.hunts(sp as never).find((h) => h.huntCode === code)?.season;
  it('reads dates printed on the hunt row, with or without spaces', () => {
    expect(season('ELK', 'EF214W2R')).toEqual({ open: '2026-11-28', close: '2026-12-02' }); // "Nov.28–Dec.2 Cow"
    expect(season('DEER', 'DE052P6R')).toEqual({ open: '2026-08-15', close: '2026-08-25' }); // "■Aug. 15–25 Either"
  });
  it('puts a January-only season in the next year', () => {
    expect(season('DEER', 'DF103L2R')).toEqual({ open: '2027-01-01', close: '2027-01-15' });
  });
  it('takes a table header date for its own weapon only', () => {
    expect(season('ELK', 'EE003V1A')).toEqual({ open: '2026-09-02', close: '2026-09-30' });
    expect(season('ANTELOPE', 'AF001O1M')).toEqual({ open: '2026-09-21', close: '2026-09-29' });
  });
  it('spans a moose season choice, and dates sheep and goat from their own brochure', () => {
    expect(season('MOOSE', 'MM004O1X')).toEqual({ open: '2026-09-12', close: '2026-10-14' });
    expect(season('BIGHORNSHEEP', 'SMS32O2A')).toEqual({ open: '2026-08-20', close: '2026-09-07' });
    expect(season('MTNGOAT', 'GEG02O1R')).toEqual({ open: '2026-09-08', close: '2026-10-08' });
  });
  it('leaves only a handful of private-land and ranch hunts undated', () => {
    const undated = ['ELK', 'DEER', 'ANTELOPE', 'MOOSE', 'BIGHORNSHEEP', 'MTNGOAT'].flatMap((sp) => co.hunts(sp as never).filter((h) => !h.season));
    expect(undated.length).toBeLessThan(30);
  });
});
