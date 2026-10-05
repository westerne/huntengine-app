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

  it('has the live states wired in', () => {
    expect([...LIVE_STATES].sort()).toEqual(['AZ', 'CO', 'ID', 'MT', 'UT', 'WY']);
    for (const c of LIVE_STATES) expect(STATE_INFO[c].status).toBe('live');
  });

  it('resolves codes and full names', () => {
    expect(toStateCode('wy')).toBe('WY');
    expect(toStateCode('NEW MEXICO')).toBe('NM');
    expect(toStateCode('Narnia')).toBeNull();
    expect(getStateModule('NV')).toBeNull(); // planned, no data yet
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
        harvest: { successPct: 80, year: 2025, scope: 'hunt' } },
      { state: 'AZ', species: 'ELK', huntCode: '3002', unit: '1', weapon: 'archery', drawYear: 2026, dataQuality: 'official',
        draw: { resident: { tags: 50, applicants: 200, successPct: 25 }, nonresident: { tags: 5, applicants: 100, successPct: 5 } } },
      { state: 'AZ', species: 'ELK', huntCode: '3003', unit: '2', weapon: 'rifle', drawYear: 2026, dataQuality: 'official',
        draw: { resident: { tags: 100, applicants: 120, successPct: 83 }, nonresident: { tags: 10, applicants: 15, successPct: 66 } } },
    ],
  };

  it('lists one SCOUT entry per hunt and filters by weapon', () => {
    const all = buildGenericScoutDataset(fake, 'ELK', 'nonresident');
    expect(all).toHaveLength(3);
    expect(all[0]).toMatchObject({ unit: '1', huntCode: '3001', drawSuccess: 0.7, fewestPointsToDraw: 20, hunterSuccess: '80%', hunterSuccessYear: 2025 });

    const archery = buildGenericScoutDataset(fake, 'ELK', 'resident', 'archery');
    expect(archery).toHaveLength(1);
    expect(archery[0]).toMatchObject({ unit: '1', huntCode: '3002', drawSuccess: 25 });
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

describe('harvest (Idaho)', () => {
  it('attaches 2025 hunter success to controlled hunts by hunt number', () => {
    const elk = getStateModule('ID')!.hunts('ELK');
    const h = elk.find((x) => x.huntCode === '2001')!;
    expect(h.harvest).toMatchObject({ successPct: 56, year: 2025, hunters: 36, harvest: 20, scope: 'hunt' });
    const covered = elk.filter((x) => x.harvest).length / elk.length;
    expect(covered).toBeGreaterThan(0.8);
  });

  it('never borrows general-season success for a controlled hunt', () => {
    const elk = getStateModule('ID')!.hunts('ELK');
    expect(elk.every((x) => !x.harvest || x.harvest.scope === 'hunt')).toBe(true);
  });

  it('enriches the SCOUT dataset and writes a BRIEF block', async () => {
    const { enrichScoutDataset, buildHarvestBlock, harvestPromptNote } = await import('./harvest');
    const ds = enrichScoutDataset('ID', 'ELK', [{ unit: '11', huntNumber: 2001 }, { unit: '999', huntNumber: 99999 }]);
    expect(ds[0].hunterSuccess).toBe('56%');
    expect(ds[1].hunterSuccess).toBeUndefined();
    expect(harvestPromptNote(ds)).toContain('do NOT estimate');
    const block = buildHarvestBlock('ID', 'ELK', 'Elk', '11');
    expect(block).toContain('Controlled hunt 2001 — Any Weapon: 56% hunter success (20 harvested by 36 hunters)');
    expect(buildHarvestBlock('NV', 'ELK', 'Elk', '11')).toBe(''); // no harvest file yet
  });
});

describe('harvest (Montana, Utah)', () => {
  it('MT uses district totals with the right season per species', async () => {
    const { harvestYear } = await import('./harvest');
    expect(harvestYear('MT', 'ELK')).toBe(2024);
    expect(harvestYear('MT', 'DEER')).toBe(2025);
    const elk = getStateModule('MT')!.hunts('ELK');
    const withHarvest = elk.filter((h) => h.harvest);
    expect(withHarvest.length / elk.length).toBeGreaterThan(0.8);
    expect(withHarvest.every((h) => h.harvest!.scope === 'unit' && h.harvest!.year === 2024)).toBe(true);
  });

  it('MT district 100 elk matches FWP (84 of 1536 hunters, 5%)', async () => {
    const { harvestRowsForUnit } = await import('./harvest');
    expect(harvestRowsForUnit('MT', 'ELK', '100')[0]).toMatchObject({ hunters: 1536, harvest: 84, successPct: 5 });
  });

  it('UT units all get 2024 harvest, and Henry Mtns premium matches DWR', async () => {
    const { harvestRowsForUnit } = await import('./harvest');
    const ut = getStateModule('UT')!;
    // No confirmed DWR hunt for these app units yet; left unmatched on purpose.
    const unmapped = ['Uintas East Moose', 'Plateau'];
    for (const s of ut.species) for (const h of ut.hunts(s)) {
      if (unmapped.includes(h.unit)) expect(h.harvest, h.unit).toBeNull();
      else expect(h.harvest, `${s} ${h.unit}`).toBeTruthy();
    }
    const henry = harvestRowsForUnit('UT', 'DEER', 'Henry Mountains').find((r) => r.huntCode === 'DB1003');
    expect(henry).toMatchObject({ hunters: 27, harvest: 26, successPct: 96.2 });
  });
});

describe('harvest (Wyoming)', () => {
  it('joins 2025 WGFD harvest to draw keys by hunt code', () => {
    const wy = getStateModule('WY')!;
    const elk71 = wy.hunts('ELK').find((h) => h.huntCode === '7-1')!;
    expect(elk71.harvest).toMatchObject({ hunters: 1439, harvest: 756, successPct: 52.5, year: 2025, scope: 'hunt' });
    expect(wy.hunts('DEER').find((h) => h.huntCode === '141-1')!.harvest).toMatchObject({ hunters: 50, harvest: 35, successPct: 70 });
    for (const s of wy.species) {
      const hunts = wy.hunts(s);
      // 4 deer LQ codes group areas differently in WGFD's harvest report (e.g. 105-106-109-1).
      expect(hunts.filter((h) => h.harvest).length / hunts.length, s).toBeGreaterThan(0.9);
    }
  });
});

describe('harvest (Colorado)', () => {
  it('joins 2025 CPW harvest by hunt code', async () => {
    const co = getStateModule('CO')!;
    const elk = co.hunts('ELK');
    expect(elk.find((h) => h.huntCode === 'EE001E1R')!.harvest).toMatchObject({ hunters: 11, harvest: 6, successPct: 54.5, year: 2025, scope: 'hunt' });
    expect(elk.filter((h) => h.harvest).length / elk.length).toBeGreaterThan(0.9);
    const { enrichScoutDataset } = await import('./harvest');
    const [entry] = enrichScoutDataset('CO', 'ELK', [{ unit: '1', huntCodes: ['EE001E1R'] }]);
    expect(entry).toMatchObject({ hunterSuccess: '54.5%', hunterSuccessScope: 'hunt' });
  });
});

describe('BRIEF harvest block lookup', () => {
  it('finds WY rows when BRIEF passes a hunt key as the unit', async () => {
    const { harvestRowsForUnit } = await import('./harvest');
    const rows = harvestRowsForUnit('WY', 'ELK', '7-1');
    expect(rows[0]).toMatchObject({ huntCode: '7-1', successPct: 52.5 });
  });
});

describe('point-level odds', () => {
  it('reads the agency point table at the hunter\'s level, capped at the top row', async () => {
    const { successAtPoints } = await import('./generic');
    const h = {
      state: 'AZ', species: 'ELK', huntCode: '1', unit: '1', drawYear: 2026, dataQuality: 'official',
      draw: { resident: null, nonresident: null },
      pointLines: { nonresident: [{ points: 0, applicants: 200, drawn: 2 }, { points: 5, applicants: 40, drawn: 4 }, { points: 20, applicants: 10, drawn: 9 }] },
    } as Hunt;
    expect(successAtPoints(h, 'nonresident', 0)).toBe(1);
    expect(successAtPoints(h, 'nonresident', 5)).toBe(10);
    expect(successAtPoints(h, 'nonresident', 25)).toBe(90);
    expect(successAtPoints(h, 'nonresident', 3)).toBeNull(); // no row at 3 points
    expect(successAtPoints(h, 'resident', 5)).toBeNull();
  });
});

describe('Arizona (first state on the shared builders)', () => {
  const az = getStateModule('AZ')!;

  it('loads 2026 AZGFD draw results with point tables', () => {
    const elk = az.hunts('ELK');
    const h = elk.find((x) => x.huntCode === '3016')!;
    expect(h).toMatchObject({ unit: '5B', drawYear: 2026, tags: 772 });
    expect(h.draw.resident?.successPct).toBeCloseTo(13.9, 1);
    expect(h.draw.nonresident?.successPct).toBeCloseTo(9.2, 1);
    expect(h.pointLines?.nonresident?.length).toBeGreaterThan(0);
    expect(STATE_INFO.AZ.rulesVerified).toBe(true);
  });

  it('joins 2025 harvest by hunt number', () => {
    const covered = az.hunts('ELK').filter((h) => h.harvest).length / az.hunts('ELK').length;
    expect(covered).toBeGreaterThan(0.8);
  });

  it('builds SCOUT entries with odds at the hunter points and a BRIEF block', () => {
    const ds = buildGenericScoutDataset(az, 'ELK', 'nonresident', 'any', 5);
    const h3016 = ds.find((d) => d.huntCode === '3016')!;
    expect(h3016).toMatchObject({ unit: '5B', dataYear: 2026 });
    expect(typeof h3016.drawSuccessAtYourPoints).toBe('number');
    const brief = buildGenericDrawSummary(az, 'ELK', 'Elk', '5B', 'nonresident', 5);
    expect(brief).toContain('ARIZONA DRAW DATA (2026)');
    expect(brief).toContain('Hunt 3016');
    expect(brief).toContain('applicants with 5 points drew at');
    expect(brief).toContain('DRAW SYSTEM: Bonus points');
  });
});

describe('shared-state SCOUT facts', () => {
  it('fills odds and tier from the data and drops picks without a real hunt code', async () => {
    const { applyHuntFacts, tierFor } = await import('./scoutFacts');
    const dataset = [
      { unit: '1', huntCode: '3011', drawSuccess: 0.8, drawSuccessAtYourPoints: 1.3, dataYear: 2026 },
      { unit: '22', huntCode: '3027', drawSuccess: 60, drawSuccessAtYourPoints: null, dataYear: 2026 },
    ];
    const { result, dropped } = applyHuntFacts(
      { recommendations: [
        { huntCode: '3011', unit: 'wrong', tier: 'RANDOM_PLAY', currentOdds: '1.3' },
        { huntCode: '3027', tier: 'LONG_GAME' },
        { huntCode: '9999', unit: '5B' },
        { unit: '1' },
      ] },
      dataset,
    );
    expect(result.recommendations).toEqual([
      { huntCode: '3011', unit: '1', tier: 'LONG_GAME', currentOdds: '1.3% (2026 draw, at your points)' },
      { huntCode: '3027', unit: '22', tier: 'DRAW_NOW', currentOdds: '60% (2026 draw, first choice)' },
    ]);
    expect(dropped).toEqual(['9999', '1']);
    expect([tierFor(50), tierFor(15), tierFor(2), tierFor(1.9), tierFor(null)]).toEqual(['DRAW_NOW', 'RANDOM_PLAY', 'BUILD_AND_WAIT', 'LONG_GAME', 'BUILD_AND_WAIT']);
  });
});

describe('shared-state SCOUT facts — hunt code from text', () => {
  it('recovers the hunt code from whyItFits when the field is missing', async () => {
    const { applyHuntFacts } = await import('./scoutFacts');
    const { result, dropped } = applyHuntFacts(
      { recommendations: [{ unit: '1', whyItFits: 'Hunt 3011 (bull elk, rifle) has strong success.' }, { unit: '1', whyItFits: 'Hunt 4444 is great' }] },
      [{ unit: '1', huntCode: '3011', drawSuccess: 0.8, drawSuccessAtYourPoints: 1.3, dataYear: 2026 }],
    );
    expect(result.recommendations?.[0]).toMatchObject({ huntCode: '3011', tier: 'LONG_GAME' });
    expect(dropped).toEqual(['1']);
  });
});

describe('SCOUT shortlist (shared states)', () => {
  it('spreads picks across odds levels and skips restricted/antlerless hunts', async () => {
    const { buildShortlist } = await import('./shortlist');
    const mk = (code: string, odds: number, label = 'Bull elk', hs = 50) =>
      ({ unit: code, huntCode: code, label, drawSuccess: odds, drawSuccessAtYourPoints: null, hunterSuccess: `${hs}%` });
    const ds = [
      mk('L1', 80), mk('L2', 60), mk('L3', 55), mk('L4', 90, 'Bull elk', 10),
      mk('F1', 30), mk('F2', 20), mk('F3', 40), mk('F4', 16),
      mk('S1', 5), mk('S2', 1), mk('S3', 3),
      mk('Y1', 95, 'Bull elk — Youth only'), mk('C1', 99, 'Antlerless elk'),
    ];
    const picks = buildShortlist(ds).map((e) => e.huntCode);
    expect(picks).toHaveLength(8);
    expect(picks).not.toContain('Y1');
    expect(picks).not.toContain('C1');
    expect(picks.filter((c) => c.startsWith('L'))).toHaveLength(3);
    expect(picks.filter((c) => c.startsWith('F'))).toHaveLength(3);
    expect(picks.filter((c) => c.startsWith('S'))).toHaveLength(2);
    // opportunity hunters can see antlerless
    expect(buildShortlist(ds, { goal: 'opportunity' }).map((e) => e.huntCode)).toContain('C1');
  });

  it('shortlists real Arizona bull elk hunts for a 5-point non-resident', async () => {
    const { buildShortlist } = await import('./shortlist');
    const az = getStateModule('AZ')!;
    const picks = buildShortlist(buildGenericScoutDataset(az, 'ELK', 'nonresident', 'rifle', 5), { goal: 'trophy' });
    expect(picks.length).toBeGreaterThanOrEqual(6);
    expect(picks.every((p) => !/antlerless|youth/i.test(String(p.label)))).toBe(true);
  });
});
