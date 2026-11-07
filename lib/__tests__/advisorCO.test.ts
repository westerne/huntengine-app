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

describe('Colorado herd sex ratios', () => {
  const elkSit: Situation = { home: 'WY', balances: [{ state: 'CO', species: 'Elk', points: 3 }], years: [2027, 2028, 2029], seasonYear: 2027 };
  it('ranks hunts by bulls per 100 cows when asked for bigger bulls', () => {
    const r = searchHunts({ state: 'CO', species: 'Elk', sortBy: 'malesPer100' }, elkSit);
    if (!r.ok) throw new Error(r.reason);
    const f = r.data.filtered!;
    expect(f.sortedBy).toMatch(/not a measure of antler size/);
    const ratios = f.matches.map((m) => m.malesPer100!);
    expect(ratios.length).toBeGreaterThan(2);
    expect([...ratios].sort((a, b) => b - a)).toEqual(ratios);
    expect(f.howToAnswer).toMatch(/not antler size/);
  });
  it('gives the herd ratio with a single hunt and with a unit', () => {
    const one = getHunt({ state: 'CO', species: 'Elk', huntCode: 'EE035O1R' }, elkSit);
    if (!one.ok) throw new Error(one.reason);
    expect((one.data as { herd?: { malesPer100: number; what: string } }).herd).toMatchObject({ malesPer100: 26, what: '26 bulls per 100 cows after the 2025 season' });
    const unit = getHunt({ state: 'CO', species: 'Deer', unit: '35' }, sit);
    if (!unit.ok) throw new Error(unit.reason);
    expect((unit.data as { herd?: { what: string } }).herd?.what).toBe('24 bucks per 100 does after the 2025 season');
  });
});

describe('Colorado over-the-counter licenses', () => {
  const co = getStateModule('CO')!;
  const nr: Situation = { home: 'WY', balances: [], years: [2027, 2028, 2029], seasonYear: 2027 };
  const res: Situation = { ...nr, home: 'CO' };
  it('reads each license, its dates and its units from the brochure', () => {
    const second = co.hunts('ELK').filter((h) => h.huntCode.startsWith('EM000U2R-'));
    expect(second.length).toBeGreaterThan(80);
    expect(second.every((h) => h.otc && h.season?.open === '2026-10-24' && h.season.close === '2026-11-01')).toBe(true);
    expect(co.hunts('ELK').find((h) => h.huntCode === 'EM128U5R-128')?.season).toEqual({ open: '2026-10-14', close: '2026-11-22' });
    expect(co.hunts('ANTELOPE').find((h) => h.huntCode === 'AE000U1A-1')?.season).toEqual({ open: '2026-08-15', close: '2026-09-20' });
    expect(co.hunts('ELK').find((h) => h.huntCode === 'EE000U1A-35')?.openTo).toBe('resident');
  });
  it('summarizes them by license in a search, and only the ones you can buy', () => {
    const lic = (s: Situation) => {
      const r = searchHunts({ state: 'CO', species: 'Elk' }, s);
      if (!r.ok) throw new Error(r.reason);
      return r.data.overTheCounter!.licenses;
    };
    const mine = lic(nr);
    expect(mine.find((l) => l.license === 'E-M-000-U2-R')?.unitCount).toBeGreaterThan(80);
    expect(mine.some((l) => l.license === 'E-E-000-U1-A')).toBe(false);
    expect(lic(res).find((l) => l.license === 'E-E-000-U1-A')?.residentsOnly).toBe(true);
  });
  it('marks them in a unit list as no draw, and leaves out licenses not open to you', () => {
    const r = getHunt({ state: 'CO', species: 'Elk', unit: '35' }, nr);
    if (!r.ok) throw new Error(r.reason);
    const d = r.data as { hunts: Array<{ huntCode: string; chanceThisYear: number | null; overTheCounter?: string }>; notOpenToYouLeftOut: number };
    expect(d.hunts.find((h) => h.huntCode === 'EM000U2R-35')).toMatchObject({ chanceThisYear: 100, overTheCounter: expect.stringMatching(/no draw/) });
    expect(d.hunts.some((h) => h.huntCode === 'EE000U1A-35')).toBe(false);
    expect(d.notOpenToYouLeftOut).toBe(1);
  });
});
