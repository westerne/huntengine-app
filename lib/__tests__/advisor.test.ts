import { describe, expect, it } from 'vitest';
import { compareHunts, deadlines, feesAndRules, getHunt, harvestReporting, yearlyCost, type Situation } from '../advisor/tools';
import { unsupportedClaims } from '../advisor/check';

// A Wyoming hunter with Nevada elk points, planning 2027–2029.
const sit: Situation = {
  home: 'WY',
  balances: [{ state: 'NV', species: 'Elk', points: 6 }, { state: 'UT', species: 'Deer', points: 12 }],
  years: [2027, 2028, 2029],
  seasonYear: 2027,
};

describe('advisor tools', () => {
  it('gives a deadline with its status, never passing last year off as this year', () => {
    const r = deadlines({ state: 'Nevada', species: 'elk' }, sit);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.state).toBe('NV');
    expect(r.data.residency).toBe('nonresident');
    expect(['posted', 'expected', 'last_year', 'none']).toContain(r.data.status);
    if (r.data.status === 'last_year') expect(r.data.forYear).toBeLessThan(2027);
    if (r.data.status !== 'none') expect(r.sources[0].url).toMatch(/^https?:/);
  });

  it('says plainly when a state or species is not covered', () => {
    expect(deadlines({ state: 'TX', species: 'elk' }, sit)).toMatchObject({ ok: false });
    const r = getHunt({ state: 'NV', species: 'elk', huntCode: 'NOPE-1' }, sit);
    expect(r.ok).toBe(false);
  });

  it('lists posted fees and what you need before applying, with sources', () => {
    const r = feesAndRules({ state: 'NV', species: 'Elk' }, sit);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.fees.some((f) => f.kind === 'qualifying license' && f.amount != null)).toBe(true);
    expect(r.sources.length).toBeGreaterThan(0);
  });

  it('totals a yearly cost: one license per state, a fee per species, tags only if drawn', () => {
    const one = yearlyCost({ items: [{ state: 'NV', species: 'Elk', mode: 'points' }] }, sit);
    const two = yearlyCost({ items: [{ state: 'NV', species: 'Elk', mode: 'points' }, { state: 'NV', species: 'Deer', mode: 'points' }] }, sit);
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) return;
    const licenses = (d: typeof one.data) => d.lines.filter((l) => l.kind === 'qualifying license').length;
    expect(licenses(one.data)).toBe(1);
    expect(licenses(two.data)).toBe(1);
    expect(two.data.total).toBeGreaterThan(one.data.total);
    expect(one.data.total).toBe(one.data.lines.reduce((s, l) => s + l.amount, 0));
    expect(one.data.lines.some((l) => l.kind === 'tag fee')).toBe(false);
    expect(one.data.ifDrawn[0]).toMatchObject({ state: 'NV', species: 'Elk' });
  });

  it('counts the application fee when points are free, and leaves optional fees out of the total', () => {
    const co = yearlyCost({ items: [{ state: 'CO', species: 'Elk', mode: 'points' }] }, sit);
    if (co.ok) expect(co.data.lines.some((l) => l.kind === 'application fee' && l.amount > 0)).toBe(true);
    const wy = yearlyCost({ items: [{ state: 'WY', species: 'Elk', mode: 'points' }] }, sit);
    if (wy.ok) {
      expect(wy.data.lines.some((l) => /special management/i.test(l.label))).toBe(false);
      expect(wy.data.mayAlsoApply.some((l) => /special management/i.test(l.label))).toBe(true);
    }
    const ne = yearlyCost({ items: [{ state: 'NE', species: 'Elk', mode: 'points' }] }, sit);
    if (ne.ok) expect(ne.data.lines.some((l) => /landowner/i.test(l.label))).toBe(false);
  });

  it('lists what it could not price instead of guessing', () => {
    const r = yearlyCost({ items: [{ state: 'TX', species: 'elk' }] }, sit);
    expect(r.ok && r.data.total).toBe(0);
    if (r.ok) expect(r.data.missing.length).toBe(1);
  });

  it('reads one hunt at the hunter’s own points', () => {
    const r = getHunt({ state: 'NV', species: 'Elk', huntCode: '4161-131' }, sit);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.yourPoints).toBe(6);
    expect(r.data.residency).toBe('nonresident');
    expect(r.sources.map((s) => s.label).join(' ')).toMatch(/draw results/);
    expect(r.sources.map((s) => s.label).join(' ')).toMatch(/your NV elk points \(6\)/);
  });

  it('compares hunts and picks one, naming any it could not find', () => {
    const r = compareHunts({ hunts: [
      { state: 'NV', species: 'Elk', huntCode: '4161-131' },
      { state: 'NV', species: 'Elk', huntCode: '4151-111-Early' },
      { state: 'NV', species: 'Elk', huntCode: 'NOPE-1' },
    ] }, sit);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.hunts).toHaveLength(2);
    expect(r.data.notFound).toEqual(['NV NOPE-1']);
  });

  it('returns harvest reporting rules for a covered state', () => {
    expect(harvestReporting({ state: 'CO', species: 'Elk' }).ok).toBe(true);
  });
});

describe('answer check', () => {
  const evidence = [JSON.stringify({ date: '2026-05-13', odds: 12.3, points: 6, total: 169, year: 2029, fee: 1200 })];
  it('passes numbers and dates that came from the tools', () => {
    expect(unsupportedClaims('Apply by May 13. About 12% at 6 points, $169 a year, tag $1,200 if you draw, by 2029.', evidence)).toEqual([]);
  });
  it('catches numbers and dates the tools never returned', () => {
    const bad = unsupportedClaims('Expect about 35% odds, $2,000 a year, deadline June 1.', evidence);
    expect(bad.map((b) => b.text)).toEqual(['June 1', '35%', '$2,000']);
  });
  it('lets the hunter’s own numbers through, and ignores small counts', () => {
    expect(unsupportedClaims('With your $1,500 budget, in 2 years…', [...evidence, 'my budget is $1,500'])).toEqual([]);
  });
});
