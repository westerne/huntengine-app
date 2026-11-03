import { describe, expect, it } from 'vitest';
import { cohortOf, matchWant, rankByWants, seasonText, isWantKey, isBlindSpot } from '../huntdata/wants';
import { getStateModule } from '../huntdata/registry';
import { buildGenericScoutDataset } from '../huntdata/generic';

const hunt = (over: Record<string, unknown>): Record<string, unknown> =>
  ({ unit: 'u', huntCode: 'c', label: null, weapon: null, tags: null, hunterSuccess: null, otc: false, ...over });

const ctx = (over: Partial<ReturnType<typeof cohortOf>> = {}, species = 'Elk') =>
  ({ species, cohort: { medianOpen: 915, quietTags: 10, goodSuccess: 60, ...over } });

describe('matching a want against one hunt', () => {
  it('counts an any-legal-weapon season as a rifle season, but not as archery', () => {
    const anyWeapon = hunt({ weapon: 'any' });
    expect(matchWant('rifle', anyWeapon, ctx())).toBe(true);
    expect(matchWant('archery', anyWeapon, ctx())).toBe(false);
    expect(matchWant('muzzleloader', anyWeapon, ctx())).toBe(false);
  });

  it('says it cannot tell rather than guessing when the weapon is unpublished', () => {
    expect(matchWant('archery', hunt({ weapon: null }), ctx())).toBe(null);
    expect(matchWant('rifle', hunt({ weapon: null }), ctx())).toBe(null);
  });

  it('puts a September elk season in the rut and an August one out of it', () => {
    const sept = hunt({ season: { open: '2025-09-10', close: '2025-09-30' } });
    const aug = hunt({ season: { open: '2025-08-01', close: '2025-08-15' } });
    expect(matchWant('rut', sept, ctx())).toBe(true);
    expect(matchWant('rut', aug, ctx())).toBe(false);
  });

  it('reads the rut by species, so November is deer and not elk', () => {
    const nov = hunt({ season: { open: '2025-11-15', close: '2025-11-25' } });
    expect(matchWant('rut', nov, ctx({}, 'Mule Deer'))).toBe(true);
    expect(matchWant('rut', nov, ctx({}, 'Elk'))).toBe(false);
  });

  it('handles a season that runs into January instead of reading it backwards', () => {
    // Nevada's late hunts are "Dec 5 – Jan 1": open 1205, close 0101. Compared
    // as plain numbers the season looks like it ends before it starts.
    const dec = hunt({ season: { open: '2025-12-05', close: '2026-01-01' } });
    expect(matchWant('rut', dec, ctx({}, 'Mule Deer'))).toBe(true);
    expect(matchWant('rut', dec, ctx({}, 'Elk'))).toBe(false);
  });

  it('cannot tell the rut without dates, or for a species we have no window for', () => {
    expect(matchWant('rut', hunt({}), ctx())).toBe(null);
    expect(matchWant('rut', hunt({ season: { open: '2025-09-10', close: '2025-09-30' } }), ctx({}, 'Mountain Goat')))
      .toBe(null);
  });

  it("takes the agency's own EARLY or LATE over the arithmetic", () => {
    // Opens before the median, but the hunt code says LATE.
    const late = hunt({ huntCode: '4151-104-LATE', season: { open: '2025-09-01', close: '2025-09-20' } });
    expect(matchWant('late', late, ctx())).toBe(true);
    expect(matchWant('early', late, ctx())).toBe(false);
  });

  it('judges early and late against the other hunts in the state', () => {
    const aug = hunt({ season: { open: '2025-08-01', close: '2025-08-20' } });
    const oct = hunt({ season: { open: '2025-10-01', close: '2025-10-20' } });
    expect(matchWant('early', aug, ctx())).toBe(true);
    expect(matchWant('late', aug, ctx())).toBe(false);
    expect(matchWant('late', oct, ctx())).toBe(true);
  });

  it('calls a hunt quiet only when its tag count is in the state’s bottom third', () => {
    expect(matchWant('quiet', hunt({ tags: 9 }), ctx())).toBe(true);
    expect(matchWant('quiet', hunt({ tags: 400 }), ctx())).toBe(false);
    expect(matchWant('quiet', hunt({ tags: null }), ctx())).toBe(null);
  });

  it('ignores a success figure drawn from too few hunters', () => {
    expect(matchWant('success', hunt({ hunterSuccess: '71%' }), ctx())).toBe(true);
    expect(matchWant('success', hunt({ hunterSuccess: '2 of 2 hunters (too few to judge)' }), ctx())).toBe(null);
  });

  it('calls a tag likely at better than even money, or over the counter', () => {
    expect(matchWant('likely', hunt({ drawSuccessAtYourPoints: 64 }), ctx())).toBe(true);
    expect(matchWant('likely', hunt({ drawSuccessAtYourPoints: 11 }), ctx())).toBe(false);
    expect(matchWant('likely', hunt({ otc: true }), ctx())).toBe(true);
    expect(matchWant('likely', hunt({}), ctx())).toBe(null);
  });

  it('reads antlered off the label, and treats meat-first as no constraint', () => {
    expect(matchWant('antleredOnly', hunt({ label: 'Antlered elk — Any Legal Weapon' }), ctx())).toBe(true);
    expect(matchWant('antleredOnly', hunt({ label: 'Antlerless elk — Archery' }), ctx())).toBe(false);
    expect(matchWant('anyAnimal', hunt({ label: 'Antlerless elk' }), ctx())).toBe(null);
  });
});

describe('ranking what is within reach against what he asked for', () => {
  const archeryRut = hunt({ huntCode: 'BOW', weapon: 'archery', tags: 8, drawSuccessAtYourPoints: 11, season: { open: '2025-09-10', close: '2025-09-30' } });
  const rifleRut = hunt({ huntCode: 'RIFLE', weapon: 'any', tags: 300, drawSuccessAtYourPoints: 40, season: { open: '2025-09-15', close: '2025-10-01' } });
  const archeryAug = hunt({ huntCode: 'BOW-AUG', weapon: 'archery', tags: 200, drawSuccessAtYourPoints: 60, season: { open: '2025-08-01', close: '2025-08-20' } });

  it('ranks the hunt that meets more of his asks above the one with better odds', () => {
    const { picks } = rankByWants([archeryAug, archeryRut], ['archery', 'rut', 'quiet'], ctx());
    expect(picks[0].entry.huntCode).toBe('BOW');
    expect(picks[0].matched).toEqual(['archery', 'rut', 'quiet']);
    expect(picks[1].matched).toEqual(['archery']);
  });

  it('drops hunts that break a hard want outright, and counts what it dropped', () => {
    const { picks, relaxed, excluded } = rankByWants([archeryRut, rifleRut], ['archery'], ctx());
    expect(picks.map((p) => p.entry.huntCode)).toEqual(['BOW']);
    expect(relaxed).toEqual([]);
    // A one-hunt answer has to be able to say it is one because the ask was
    // narrow, not because the state published nothing.
    expect(excluded).toBe(1);
  });

  it('counts nothing excluded when only soft wants were asked', () => {
    const { excluded } = rankByWants([archeryRut, rifleRut], ['rut', 'quiet'], ctx());
    expect(excluded).toBe(0);
  });

  it('shows the nearest thing, and says what it breaks, rather than an empty page', () => {
    const { picks, relaxed } = rankByWants([rifleRut], ['muzzleloader', 'rut'], ctx());
    expect(relaxed).toEqual(['muzzleloader']);
    expect(picks).toHaveLength(1);
    expect(picks[0].missed).toContain('muzzleloader');
    expect(picks[0].matched).toContain('rut');
  });

  it('never hangs a chip on a hunt for a want that only widened the pool', () => {
    // "Meat matters" decides which hunts are on the table; asked of one hunt it
    // has no answer, and it showed as "meat in the freezer unknown" on every row.
    const { picks } = rankByWants([rifleRut], ['anyAnimal', 'rifle'], ctx());
    expect(picks[0].matched).toEqual(['rifle']);
    expect(picks[0].unknown).toEqual([]);
    expect(picks[0].missed).toEqual([]);
  });

  it('keeps what it could not tell separate from what it matched', () => {
    const noDates = hunt({ huntCode: 'X', weapon: 'archery', tags: 5 });
    const { picks } = rankByWants([noDates], ['archery', 'rut', 'quiet'], ctx());
    expect(picks[0].matched).toEqual(['archery', 'quiet']);
    expect(picks[0].unknown).toEqual(['rut']);
    expect(picks[0].missed).toEqual([]);
  });

  it('falls back to odds when he asked for nothing we can match', () => {
    const { picks } = rankByWants([archeryRut, archeryAug, rifleRut], [], ctx());
    expect(picks.map((p) => p.entry.huntCode)).toEqual(['BOW-AUG', 'RIFLE', 'BOW']);
  });
});

describe('against the real draw data', () => {
  const mod = getStateModule('NV')!;
  const nvElk = buildGenericScoutDataset(mod, 'ELK' as never, 'nonresident', 'any', 6);

  it('carries the season dates Nevada publishes all the way through', () => {
    const dated = nvElk.filter((e) => e.season);
    expect(dated.length).toBe(nvElk.length);
    expect(seasonText(dated[0])).toMatch(/^[A-Z][a-z]+ \d+ – [A-Z][a-z]+ \d+$/);
  });

  it('finds a September bow hunt for an elk hunter who wants the rut', () => {
    const cohort = cohortOf(nvElk);
    const { picks, relaxed } = rankByWants(nvElk, ['archery', 'rut', 'antleredOnly'], { species: 'Elk', cohort });
    expect(relaxed).toEqual([]);
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) {
      expect(p.entry.weapon).toBe('archery');
      expect(String(p.entry.label)).toMatch(/Antlered/);
    }
    // At least one of them is actually in the bugle, not just a bow season.
    expect(picks.some((p) => p.matched.includes('rut'))).toBe(true);
  });

  it('ranks the quiet hunts first when that is what he asked for', () => {
    const cohort = cohortOf(nvElk);
    const { picks } = rankByWants(nvElk, ['quiet'], { species: 'Elk', cohort });
    expect(picks[0].matched).toEqual(['quiet']);
    expect(Number(picks[0].entry.tags)).toBeLessThanOrEqual(cohort.quietTags!);
  });
});

describe('the closed vocabulary', () => {
  it('refuses keys it did not define', () => {
    expect(isWantKey('archery')).toBe(true);
    expect(isWantKey('biggestBull')).toBe(false);
    expect(isBlindSpot('terrain')).toBe(true);
    expect(isBlindSpot('odds')).toBe(false);
  });
});
