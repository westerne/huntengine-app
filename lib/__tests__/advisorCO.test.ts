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
