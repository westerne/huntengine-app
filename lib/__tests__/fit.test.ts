import { describe, expect, it } from 'vitest';
import { getStateModule } from '../huntdata/registry';
import { cleanPrefs, DEFAULT_PREFS, rankHunts, GOOD_FIT, DRAW_NOW } from '../huntdata/fit';
import { isAntlerless } from '../huntdata/shortlist';

const nv = getStateModule('NV')!;
const rank = (prefs = DEFAULT_PREFS, points = 6) =>
  rankHunts(nv.hunts('ELK' as never), { residency: 'nonresident', points, usesPoints: true, seasonYear: 2027, prefs, stateName: 'Nevada', species: 'Elk' });

describe('ranking by fit, then draw', () => {
  it('leaves antlerless tags out unless asked, and says how many', () => {
    const r = rank();
    const all = [...r.drawNow, ...r.building, ...r.longShots];
    expect(all.some((h) => isAntlerless(h))).toBe(false);
    expect(r.hidden.antlerless).toBeGreaterThan(0);
    const withCow = rank(cleanPrefs({ ...DEFAULT_PREFS, antlerless: true }));
    expect(withCow.hidden.antlerless).toBe(0);
  });

  it('only shows good fits, each group ordered by fit, with reasons', () => {
    const r = rank();
    for (const g of [r.drawNow, r.building, r.longShots]) {
      for (let i = 0; i < g.length; i++) {
        expect(g[i].fit).toBeGreaterThanOrEqual(GOOD_FIT);
        expect(g[i].reasons.length).toBeGreaterThan(0);
        if (i) expect(g[i].fit).toBeLessThanOrEqual(g[i - 1].fit);
      }
    }
    for (const h of r.drawNow) expect(h.draw.now).toBeGreaterThanOrEqual(DRAW_NOW);
    for (const h of [...r.building, ...r.longShots]) expect(h.draw.now).toBeLessThan(DRAW_NOW);
  });

  it('keeps fit and draw apart: easy-to-draw hunts don’t rank up for it', () => {
    const r = rank();
    const easiest = [...r.drawNow, ...r.building, ...r.longShots].sort((a, b) => b.draw.now - a.draw.now)[0];
    const best = [...r.drawNow, ...r.building, ...r.longShots].sort((a, b) => b.fit - a.fit)[0];
    if (easiest && best && easiest !== best) expect(best.fit).toBeGreaterThan(easiest.fit);
  });

  it('honors the weapon as a hard filter', () => {
    const r = rank(cleanPrefs({ ...DEFAULT_PREFS, weapon: 'archery' }));
    for (const h of [...r.drawNow, ...r.building, ...r.longShots]) expect(['archery', null]).toContain(h.weapon);
    expect(r.hidden.weapon).toBeGreaterThan(0);
  });

  it('cleans preferences from anything sent', () => {
    expect(cleanPrefs({ weapon: 'spear', weights: { success: 9 }, horizon: 99 })).toMatchObject({ weapon: 'any', weights: { success: 2 }, horizon: 15 });
    expect(cleanPrefs({ timing: 'rut' }).weights.timing).toBe(2);
    expect(cleanPrefs({}).weights.timing).toBe(0);
  });
});

describe('where odds by points aren’t published', () => {
  it('ranks Colorado by fit alone, never dating a draw off an overall rate', () => {
    const co = getStateModule('CO')!;
    const r = rankHunts(co.hunts('ELK' as never), { residency: 'nonresident', points: 3, usesPoints: true, seasonYear: 2027, prefs: DEFAULT_PREFS, stateName: 'Colorado', species: 'Elk' });
    expect(r.drawNow.length + r.building.length + r.longShots.length).toBe(0);
    expect(r.unpriced.length).toBeGreaterThan(0);
    expect(r.unpriced.every((h) => !h.draw.yours)).toBe(true);
  });
  it('treats the overall rate as your chance where your residency has no points (Wyoming residents)', () => {
    const wy = getStateModule('WY')!;
    const r = rankHunts(wy.hunts('ELK' as never), { residency: 'resident', points: 0, usesPoints: false, seasonYear: 2027, prefs: DEFAULT_PREFS, stateName: 'Wyoming', species: 'Elk' });
    expect(r.drawNow.length).toBeGreaterThan(0);
    expect(r.drawNow.every((h) => h.draw.yours)).toBe(true);
  });
});
