import { describe, expect, it } from 'vitest';
import { ALL_STATES, LIVE_STATES, STATE_INFO, getStateModule, toStateCode } from './registry';
import { validateHunts } from './validate';
import { filterToKnownUnits, normalizeUnit } from './unitGuard';
import { buildGenericDrawSummary, buildGenericScoutDataset } from './generic';
import { parsePct } from './util';
import type { Hunt, StateModule } from './schema';

describe('registry', () => {
  it('covers all 17 roadmap states', () => {
    expect(ALL_STATES).toHaveLength(17);
  });

  it('has the five live states wired in', () => {
    expect([...LIVE_STATES].sort()).toEqual(['CO', 'ID', 'MT', 'UT', 'WY']);
    for (const c of LIVE_STATES) expect(STATE_INFO[c].status).toBe('live');
  });

  it('resolves codes and full names', () => {
    expect(toStateCode('wy')).toBe('WY');
    expect(toStateCode('NEW MEXICO')).toBe('NM');
    expect(toStateCode('Narnia')).toBeNull();
    expect(getStateModule('AZ')).toBeNull(); // planned, no data yet
  });
});

describe.each(LIVE_STATES)('%s data', (code) => {
  const mod = getStateModule(code)!;

  it.each(mod.species)('%s hunts pass validation', (species) => {
    const hunts = mod.hunts(species);
    const problems = validateHunts(hunts);
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it('has hunts for at least one species', () => {
    expect(mod.species.some((s) => mod.hunts(s).length > 0)).toBe(true);
  });
});

describe('spot checks against source data', () => {
  it('WY antelope 1-1 keeps its 2025 WGFD numbers', () => {
    const h = getStateModule('WY')!.hunts('ANTELOPE').find((x) => x.huntCode === '1-1')!;
    expect(h.drawYear).toBe(2025);
    expect(h.unit).toBe('1');
    expect(h.draw.resident).toMatchObject({ tags: 319, applicants: 91, successPct: 100 });
    expect(h.draw.nonresident?.minPoints).toBe(3);
    expect(h.draw.nonresident?.pools?.find((p) => p.name === 'random')).toMatchObject({ tags: 48, applicants: 250, successPct: 19.2 });
  });

  it('ID controlled hunt 1001 keeps its odds', () => {
    const h = getStateModule('ID')!.hunts('DEER').find((x) => x.huntCode === '1001')!;
    expect(h).toMatchObject({ unit: '1-1', tags: 60, applicants: 1315 });
    expect(h.draw.nonresident?.successPct).toBe(5);
  });

  it('CO hunt codes map the method letter to a weapon', () => {
    const elk = getStateModule('CO')!.hunts('ELK');
    expect(elk.find((h) => h.huntCode.endsWith('R'))?.weapon).toBe('rifle');
    expect(elk.find((h) => h.huntCode.endsWith('A'))?.weapon).toBe('archery');
  });

  it('UT hand-entered data is marked estimated', () => {
    const ut = getStateModule('UT')!.hunts('DEER');
    expect(ut.length).toBeGreaterThan(0);
    expect(ut.every((h) => h.dataQuality === 'estimated' && h.drawYear === null)).toBe(true);
  });
});

describe('parsePct', () => {
  it('reads agency odds strings', () => {
    expect(parsePct('83.33%')).toBe(83.33);
    expect(parsePct('~100%')).toBe(100);
    expect(parsePct('~0.5% or less')).toBe(0.5);
    expect(parsePct('N/A')).toBeNull();
    expect(parsePct(null)).toBeNull();
  });
});

describe('validateHunts', () => {
  const base: Hunt = {
    state: 'AZ', species: 'ELK', huntCode: '1', unit: '1', drawYear: 2025, dataQuality: 'official',
    draw: { resident: { tags: 10, applicants: 100, successPct: 10 }, nonresident: null },
  };

  it('catches bad numbers and duplicates', () => {
    const problems = validateHunts([
      base,
      { ...base },
      { ...base, huntCode: '2', draw: { resident: { tags: -1, applicants: 5, successPct: 140 }, nonresident: null } },
      { ...base, huntCode: '3', unit: '', drawYear: null },
    ]).map((p) => `${p.huntCode}: ${p.problem}`);
    expect(problems).toContain('1: duplicate huntCode');
    expect(problems.some((p) => p.startsWith('2: resident successPct'))).toBe(true);
    expect(problems.some((p) => p.startsWith('2: resident tags'))).toBe(true);
    expect(problems).toContain('3: missing unit');
    expect(problems).toContain('3: official data needs a drawYear');
  });
});

describe('SCOUT unit guard', () => {
  const dataset = [{ unit: '7-1' }, { unit: '100' }, { unit: 'G', notableUnits: [{ unitName: '143-GEN' }] }];

  it('normalizes common unit spellings', () => {
    expect(normalizeUnit('GMU 007')).toBe('7');
    expect(normalizeUnit('HD 100')).toBe('100');
    expect(normalizeUnit(' Area 57-1 ')).toBe('57-1');
  });

  it('drops units the model made up and keeps real ones', () => {
    const { result, dropped } = filterToKnownUnits(
      {
        recommendations: [{ unit: '7-1' }, { unit: 'HD 100' }, { unit: '999' }, { unit: 'G' }, { unit: '143-GEN' }],
        drawableUnits: [{ unit: 'Unit 100 (OTC archery)' }, { unit: 'Made Up Basin' }],
      },
      dataset,
    );
    expect(result.recommendations?.map((r) => r.unit)).toEqual(['7-1', 'HD 100', 'G', '143-GEN']);
    expect(result.drawableUnits?.map((r) => r.unit)).toEqual(['Unit 100 (OTC archery)']);
    expect(dropped).toEqual(['999', 'Made Up Basin']);
  });

  it('passes everything through when the dataset has no unit keys', () => {
    const input = { recommendations: [{ unit: 'anything' }] };
    expect(filterToKnownUnits(input, []).result).toEqual(input);
  });

  it('accepts every unit in each live state dataset', () => {
    for (const code of LIVE_STATES) {
      const mod = getStateModule(code)!;
      for (const species of mod.species) {
        const ds = buildGenericScoutDataset(mod, species, 'nonresident');
        const recs = ds.map((d) => ({ unit: d.unit }));
        expect(filterToKnownUnits({ recommendations: recs }, ds).dropped).toEqual([]);
      }
    }
  });
});

describe('generic builders (used by new states)', () => {
  const fake: StateModule = {
    ...STATE_INFO.AZ,
    rulesVerified: true,
    species: ['ELK'],
    hunts: () => [
      { state: 'AZ', species: 'ELK', huntCode: '3001', unit: '1', weapon: 'rifle', drawYear: 2026, dataQuality: 'official',
        draw: { resident: { tags: 20, applicants: 400, successPct: 5 }, nonresident: { tags: 2, applicants: 300, successPct: 0.7, minPoints: 20 } },
        harvest: { successPct: 80, year: 2025 } },
      { state: 'AZ', species: 'ELK', huntCode: '3002', unit: '1', weapon: 'archery', drawYear: 2026, dataQuality: 'official',
        draw: { resident: { tags: 50, applicants: 200, successPct: 25 }, nonresident: { tags: 5, applicants: 100, successPct: 5 } } },
      { state: 'AZ', species: 'ELK', huntCode: '3003', unit: '2', weapon: 'rifle', drawYear: 2026, dataQuality: 'official',
        draw: { resident: { tags: 100, applicants: 120, successPct: 83 }, nonresident: { tags: 10, applicants: 15, successPct: 66 } } },
    ],
  };

  it('aggregates SCOUT entries per unit and filters by weapon', () => {
    const all = buildGenericScoutDataset(fake, 'ELK', 'nonresident');
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ unit: '1', huntCount: 2, drawSuccess: '0.7-5%', bestDrawSuccess: 5, fewestPointsToDraw: 20, harvestSuccess: '80%' });

    const archery = buildGenericScoutDataset(fake, 'ELK', 'resident', 'archery');
    expect(archery).toHaveLength(1);
    expect(archery[0]).toMatchObject({ unit: '1', drawSuccess: '25%' });
  });

  it('writes a BRIEF draw block with the real numbers', () => {
    const text = buildGenericDrawSummary(fake, 'ELK', 'Elk', '01', 'nonresident');
    expect(text).toContain('ARIZONA DRAW DATA (2026)');
    expect(text).toContain('Hunt 3001: Non-resident: 2 tags, 300 first-choice applicants, draw success 0.7%, fewest points that drew: 20; hunter success 80% (2025).');
    expect(text).not.toContain('3003');
  });

  it('never feeds unverified rules to the prompt', () => {
    const text = buildGenericDrawSummary({ ...fake, rulesVerified: false }, 'ELK', 'Elk', '1', 'resident');
    expect(text).not.toContain(fake.drawSystemNote);
    expect(text).toContain('Confirm draw rules with Arizona Game and Fish Department');
  });
});
