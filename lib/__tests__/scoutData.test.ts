import { describe, expect, it } from 'vitest';
import { hasDrawSignal, noDataAnswer, pointsForState, titleCaseState } from '../scoutData';
import { prefillWeapon } from '../plans';
import { getStateModule } from '../huntdata/registry';
import { HAND_BUILT_SCOUT_STATES } from '../huntdata/scoutStates';
import { buildGenericScoutDataset } from '../huntdata/generic';
import { buildShortlist } from '../huntdata/shortlist';
import { speciesFor, STATES } from '../../app/planner/constants';
import { speciesKeyOf } from '../species';

describe('no data for a state and species', () => {
  it('says so plainly instead of leaving the model to fill the gap', () => {
    const a = noDataAnswer('COLORADO', 'Mountain Goat');
    expect(a.noData).toBe(true);
    expect(a.recommendations).toEqual([]);
    expect(a.drawableUnits).toEqual([]);
    expect(a.drawReality.summary).toContain('mountain goat');
    expect(a.drawReality.summary).toContain('Colorado');
    expect(a.drawReality.summary).toMatch(/rather tell you that than guess/);
    expect(a.actionPlan.headline).toBe('No mountain goat data for Colorado yet');
  });

  it('reports zeroes rather than a figure the hunter might read as real', () => {
    const { drawReality } = noDataAnswer('UTAH', 'Mountain Goat');
    expect(drawReality.regularPoolUnits).toBe(0);
    expect(drawReality.randomPoolUnits).toBe(0);
    expect(drawReality.pointsToNextUnit).toBe(0);
    expect(drawReality.bestLimitedUnit).toBe('');
  });

  it('titles multi-word states', () => {
    expect(titleCaseState('NEW MEXICO')).toBe('New Mexico');
    expect(titleCaseState('WYOMING')).toBe('Wyoming');
  });
});

describe('weapon prefill', () => {
  it('takes the saved search first', () => {
    expect(prefillWeapon(['Archery'], ['Rifle', 'Archery'])).toBe('Archery');
    expect(prefillWeapon(['Any', 'Muzzleloader'], ['Rifle'])).toBe('Muzzleloader');
  });

  it('uses the profile only when it names one weapon', () => {
    expect(prefillWeapon(null, ['Archery'])).toBe('Archery');
    expect(prefillWeapon([], ['Rifle', 'Archery', 'Muzzleloader'])).toBeUndefined();
  });

  it('leaves it unset rather than guessing', () => {
    expect(prefillWeapon(null, null)).toBeUndefined();
    expect(prefillWeapon(['Any'], ['Any'])).toBeUndefined();
  });
});

describe('points for the state being searched', () => {
  const points = { WY: 3, UT: 8 };

  it('uses the state the hunter is searching', () => {
    expect(pointsForState(points, 'WY')).toBe(3);
    expect(pointsForState(points, 'UT')).toBe(8);
  });

  it('returns zero for a state with no balance, never another state’s', () => {
    // SCOUT used to fall back to Wyoming here, so a Colorado search was priced
    // at three points the hunter doesn't hold.
    expect(pointsForState(points, 'CO')).toBe(0);
    expect(pointsForState(points, 'AZ')).toBe(0);
  });

  it('treats missing, empty and junk balances as none', () => {
    expect(pointsForState(null, 'WY')).toBe(0);
    expect(pointsForState({}, 'WY')).toBe(0);
    expect(pointsForState({ WY: Number.NaN }, 'WY')).toBe(0);
    expect(pointsForState({ WY: -2 }, 'WY')).toBe(0);
  });
});

describe('states SCOUT still hand-builds', () => {
  it('is down to Wyoming alone', () => {
    expect(HAND_BUILT_SCOUT_STATES).toEqual(['WYOMING']);
  });

  it('Utah returns every DWR bonus-draw hunt plus its over-the-counter general elk (was 36 hand-entered units)', () => {
    const mod = getStateModule('UT')!;
    const sizes: Record<string, number> = { DEER: 195, ELK: 216, ANTELOPE: 88, MOOSE: 36, BIGHORNSHEEP: 33 };
    expect(mod.species).toEqual(Object.keys(sizes));
    for (const [species, n] of Object.entries(sizes)) {
      expect(buildGenericScoutDataset(mod, species as never, 'nonresident', 'any', 3)).toHaveLength(n);
    }
  });

  it('Montana keeps every species and gains hunts on the shared builders', () => {
    const mod = getStateModule('MT')!;
    // What buildMontanaScoutDataset produced per species, measured before the
    // move. The shared adapter beat all six, which is why Montana went first.
    const handBuilt: Record<string, number> = {
      DEER: 30, ELK: 34, ANTELOPE: 54, MOOSE: 74, BIGHORNSHEEP: 35, MTNGOAT: 31,
    };
    for (const [species, was] of Object.entries(handBuilt)) {
      expect(mod.species).toContain(species);
      const now = buildGenericScoutDataset(mod, species as never, 'nonresident', 'any', 3).length;
      expect(now).toBeGreaterThanOrEqual(was);
    }
  });
});

describe('Colorado on the shared builders', () => {
  const mod = () => getStateModule('CO')!;

  it('can be shortlisted: every hunt someone applied for has a draw figure', () => {
    for (const species of ['DEER', 'ELK', 'ANTELOPE', 'MOOSE']) {
      const hunts = buildGenericScoutDataset(mod(), species as never, 'nonresident', 'any', 3);
      expect(hunts.length).toBeGreaterThan(0);
      expect(hunts.filter((h) => Number(h.applicants) > 0).every((h) => h.drawSuccess != null)).toBe(true);
      expect(buildShortlist(hunts as never, { size: 8 })).toHaveLength(8);
    }
  });

  it('filters by weapon, which the hand-built dataset could not', () => {
    const all = buildGenericScoutDataset(mod(), 'ELK' as never, 'nonresident', 'any', 3).length;
    const rifle = buildGenericScoutDataset(mod(), 'ELK' as never, 'nonresident', 'rifle', 3).length;
    const archery = buildGenericScoutDataset(mod(), 'ELK' as never, 'nonresident', 'archery', 3).length;
    expect(rifle).toBeLessThan(all);
    expect(archery).toBeLessThan(rifle);
    expect(archery).toBeGreaterThan(0);
  });
});

describe('why Wyoming and Utah have not moved', () => {
  it('Wyoming shortlists now that points-that-drew is rankable', () => {
    const mod = getStateModule('WY')!;
    for (const species of ['DEER', 'ELK', 'ANTELOPE']) {
      const hunts = buildGenericScoutDataset(mod, species as never, 'nonresident', 'any', 3);
      // Still no published odds — that is the data, and it is not the blocker.
      expect(hunts.every((h) => h.drawSuccess == null)).toBe(true);
      expect(hunts.filter((h) => h.fewestPointsToDraw != null).length).toBeGreaterThan(0);
      expect(buildShortlist(hunts as never, { size: 8 })).toHaveLength(8);
    }
  });

  it('and its adapter covers three species where SCOUT answers for six', () => {
    expect(getStateModule('WY')!.species).toEqual(['DEER', 'ELK', 'ANTELOPE']);
  });

  it('Idaho returns the same rows it always did, so only who picks changed', () => {
    const mod = getStateModule('ID')!;
    const sizes: Record<string, number> = {
      DEER: 147, ELK: 182, ANTELOPE: 54, MOOSE: 94, BIGHORNSHEEP: 28, MTNGOAT: 19,
    };
    for (const [species, n] of Object.entries(sizes)) {
      expect(buildGenericScoutDataset(mod, species as never, 'nonresident', 'any', 3)).toHaveLength(n);
    }
  });
});

describe('shortlisting hunts that publish no odds', () => {
  const hunt = (over: Record<string, unknown>) => ({ unit: '1', huntCode: 'X', label: null, otc: false, ...over });

  it('prefers a published figure over points-that-drew', () => {
    const withOdds = hunt({ huntCode: 'ODDS', drawSuccess: 60, hunterSuccess: '20%' });
    const pointsOnly = hunt({ huntCode: 'PTS', fewestPointsToDraw: 2, hunterSuccess: '90%' });
    const picked = buildShortlist([pointsOnly, withOdds] as never, { size: 1 });
    expect((picked[0] as { huntCode: string }).huntCode).toBe('ODDS');
  });

  it('ranks points-only hunts by hunter success, then by points needed', () => {
    const a = hunt({ huntCode: 'A', fewestPointsToDraw: 9, hunterSuccess: '50%' });
    const b = hunt({ huntCode: 'B', fewestPointsToDraw: 1, hunterSuccess: '50%' });
    const c = hunt({ huntCode: 'C', fewestPointsToDraw: 9, hunterSuccess: '80%' });
    const order = buildShortlist([a, b, c] as never, { size: 3 }).map((h) => (h as { huntCode: string }).huntCode);
    expect(order).toEqual(['C', 'B', 'A']);
  });

  it('still drops a hunt with neither', () => {
    expect(buildShortlist([hunt({ hunterSuccess: '90%' })] as never, { size: 3 })).toHaveLength(0);
  });
});

describe('hunts that say nothing about drawing them', () => {
  it('spots the real fields in either dataset shape', () => {
    expect(hasDrawSignal({ drawSuccess: 42 })).toBe(true);
    expect(hasDrawSignal({ fewestPointsToDraw: 3 })).toBe(true);
    expect(hasDrawSignal({ otc: true })).toBe(true);
    expect(hasDrawSignal({ nrRegularMinPoints: 5 })).toBe(true);
    expect(hasDrawSignal({ resDrawSuccess: '20-80%' })).toBe(true);
  });

  it('treats the hand-built placeholder as nothing', () => {
    // What Wyoming moose actually looks like: description only, every draw
    // field the legacy mapper fills set to the string N/A.
    expect(hasDrawSignal({
      unit: '1', typical: '35-42" width', topEnd: '50"+',
      trait: 'Shoshone river bottom genetics.', description: 'Northwest WY, north of Cody.',
      residentOdds: 'N/A', nrRegularMinPoints: 'N/A', nrRandomOdds: 'N/A',
    })).toBe(false);
    expect(hasDrawSignal({})).toBe(false);
    expect(hasDrawSignal({ drawSuccess: null, tags: '' })).toBe(false);
  });
});

describe('every state and species the planner offers', () => {
  // Wyoming answers from hand-tuned branches that this can't rebuild; its
  // three species are covered by the live checks instead.
  const sharedStates = STATES.filter((s) => s !== 'WY');

  it('has at least one hunt with something to say about drawing it', () => {
    const dead: string[] = [];
    for (const state of sharedStates) {
      const mod = getStateModule(state);
      if (!mod) { dead.push(`${state}: no adapter`); continue; }
      for (const species of speciesFor(state)) {
        const key = speciesKeyOf(species, state);
        if (!key || !mod.species.includes(key as never)) { dead.push(`${state} ${species}: not in adapter`); continue; }
        // Resident-only species answer with the residency rule, which is a
        // real answer and not an invented one, so they need no draw data.
        if (mod.residentOnly?.[key as never]) continue;
        const rows = buildGenericScoutDataset(mod, key as never, 'nonresident', 'any', 3);
        if (!rows.some((r) => hasDrawSignal(r))) dead.push(`${state} ${species}: ${rows.length} hunts, none with draw data`);
      }
    }
    // A pair with nothing behind it is a dead end: the hunter picks it and is
    // told we have no data. Don't offer it.
    expect(dead).toEqual([]);
  });
});

describe('shortlisting when the hunter cannot draw most of it', () => {
  const hunt = (over: Record<string, unknown>): Record<string, unknown> =>
    ({ unit: 'u', huntCode: 'c', label: null, otc: false, ...over });

  it('puts a hunt they can draw above a better one they cannot', () => {
    const trophy = hunt({ huntCode: 'TROPHY', hunterSuccess: '84%', drawSuccessAtYourPoints: 0, drawSuccess: 0.2 });
    const reachable = hunt({ huntCode: 'REACHABLE', hunterSuccess: '65%', drawSuccessAtYourPoints: 7.7, drawSuccess: 0.9 });
    const order = buildShortlist([trophy, reachable] as never, { size: 2 }).map((h) => (h as { huntCode: string }).huntCode);
    expect(order).toEqual(['REACHABLE', 'TROPHY']);
  });

  it('still ranks on hunter success once both are drawable', () => {
    // Same odds band, so the band quotas don't decide it and rank does.
    const better = hunt({ huntCode: 'BETTER', hunterSuccess: '80%', drawSuccessAtYourPoints: 20 });
    const worse = hunt({ huntCode: 'WORSE', hunterSuccess: '50%', drawSuccessAtYourPoints: 25 });
    const order = buildShortlist([worse, better] as never, { size: 2 }).map((h) => (h as { huntCode: string }).huntCode);
    expect(order).toEqual(['BETTER', 'WORSE']);
  });

  it('keeps the undrawable ones rather than dropping them', () => {
    // A hunter with no chance this year still wants to see what to build toward.
    const rows = [
      hunt({ huntCode: 'A', hunterSuccess: '84%', drawSuccessAtYourPoints: 0 }),
      hunt({ huntCode: 'B', hunterSuccess: '70%', drawSuccessAtYourPoints: 0 }),
    ];
    expect(buildShortlist(rows as never, { size: 8 })).toHaveLength(2);
  });
});
