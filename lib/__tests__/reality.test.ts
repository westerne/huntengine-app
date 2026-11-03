import { describe, expect, it } from 'vitest';
import { drawReality } from '../huntdata/reality';
import { getStateModule } from '../huntdata/registry';
import { buildGenericScoutDataset } from '../huntdata/generic';

const hunt = (over: Record<string, unknown>): Record<string, unknown> =>
  ({ unit: 'u', huntCode: 'c', label: null, dataYear: 2026, ...over });

describe('what your points actually buy', () => {
  it('leads with the odds when something is a safe bet', () => {
    const r = drawReality([hunt({ huntCode: 'A', drawSuccessAtYourPoints: 92, hunterSuccess: '60%' })],
      { points: 4, state: 'Colorado', species: 'Elk', thisYear: 2027 });
    expect(r.headline).toMatch(/With 4 points you can draw elk in Colorado this year/);
    expect(r.headline).toMatch(/92%/);
    expect(r.best?.huntCode).toBe('A');
  });

  it('says plainly when the chance is slim rather than calling it reachable', () => {
    const r = drawReality([hunt({ huntCode: 'A', drawSuccessAtYourPoints: 7.7, hunterSuccess: '65%' })],
      { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027 });
    expect(r.headline).toMatch(/within reach/);
    expect(r.headline).toMatch(/only just/);
    expect(r.headline).toMatch(/7\.7%/);
  });

  it('gives a dated timeline when nothing draws yet', () => {
    const r = drawReality([hunt({ huntCode: 'A', drawSuccessAtYourPoints: 0, fewestPointsToDraw: 10, hunterSuccess: '70%' })],
      { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027 });
    expect(r.reachable).toHaveLength(0);
    expect(r.soon[0]).toMatchObject({ pointsNeeded: 10, yearsAway: 4, year: 2031, farOff: false });
    expect(r.headline).toMatch(/took 10 points, which you'd have in 2031/);
  });

  it('says the points only buy a ticket where the draw is a lottery', () => {
    const r = drawReality(
      [hunt({ huntCode: 'A', drawSuccessAtYourPoints: 0, fewestPointsToDraw: 7, drawSuccessAtPointsNeeded: 0.4 })],
      { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027, cutoffIsADate: false },
    );
    expect(r.soon[0].oddsAtThatLevel).toBe(0.4);
    expect(r.headline).toMatch(/you'd have in 2028/);
    expect(r.headline).toMatch(/Nevada draws by lottery/);
    expect(r.headline).toMatch(/only 0\.4% of applicants drew/);
    expect(r.headline).toMatch(/in the hat, not the tag/);
  });

  it('leaves the date to stand where tags go out in point order', () => {
    const r = drawReality(
      [hunt({ huntCode: 'A', drawSuccessAtYourPoints: 0, fewestPointsToDraw: 7 })],
      { points: 6, state: 'Colorado', species: 'Elk', thisYear: 2027, cutoffIsADate: true },
    );
    expect(r.headline).toMatch(/you'd have in 2028/);
    expect(r.headline).not.toMatch(/lottery/);
  });

  it('still warns about the lottery when the level has no published figure', () => {
    const r = drawReality(
      [hunt({ huntCode: 'A', drawSuccessAtYourPoints: 0, fewestPointsToDraw: 7 })],
      { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027, cutoffIsADate: false },
    );
    expect(r.soon[0].oddsAtThatLevel).toBeNull();
    expect(r.headline).toMatch(/into the draw rather than the tag/);
  });

  it('refuses to dress up a twenty-year wait as a plan', () => {
    const r = drawReality([hunt({ huntCode: 'A', drawSuccessAtYourPoints: 0, fewestPointsToDraw: 23 })],
      { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027 });
    expect(r.soon[0].farOff).toBe(true);
    expect(r.headline).toMatch(/17 years away/);
    expect(r.headline).toMatch(/isn't really a plan/);
  });

  it('always carries the point-creep caveat, dated to the draw it used', () => {
    const r = drawReality([hunt({ drawSuccessAtYourPoints: 50 })],
      { points: 2, state: 'Utah', species: 'Elk', thisYear: 2027 });
    expect(r.caveat).toMatch(/Based on the 2026 draw/);
    expect(r.caveat).toMatch(/Point creep and demand/);
    expect(r.caveat).toMatch(/not a promise/);
  });

  it('says so when the state has nothing loaded', () => {
    const r = drawReality([], { points: 5, state: 'Wyoming', species: 'Moose', thisYear: 2027 });
    expect(r.headline).toMatch(/don't have moose hunts loaded for Wyoming/);
  });
});

describe('against the real draw data', () => {
  it('Nevada elk at six points is thin, and says why', () => {
    const mod = getStateModule('NV')!;
    const hunts = buildGenericScoutDataset(mod, 'ELK' as never, 'nonresident', 'rifle', 6);
    const r = drawReality(hunts, { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027 });
    expect(r.reachable.length).toBeGreaterThan(0);
    expect(r.reachable.length).toBeLessThan(10);
    expect(r.best!.odds!).toBeLessThan(50);          // nothing close to a sure thing
    expect(r.headline).toMatch(/Nevada/);
  });

  it('Colorado admits it cannot price the hunter, because the data cannot', () => {
    const mod = getStateModule('CO')!;
    const hunts = buildGenericScoutDataset(mod, 'ELK' as never, 'nonresident', 'rifle', 3);
    const r = drawReality(hunts, { points: 3, state: 'Colorado', species: 'Elk', thisYear: 2027 });
    expect(r.basis).toBe('published-rate');
    expect(r.reachable).toHaveLength(0);
    expect(r.headline).toMatch(/not by point level/);
    expect(r.headline).toMatch(/can't put a number on your own chance/);
  });

  it('Nevada at six points is cow tags, and says so instead of claiming 100%', () => {
    const mod = getStateModule('NV')!;
    const hunts = buildGenericScoutDataset(mod, 'ELK' as never, 'nonresident', 'rifle', 6);
    const r = drawReality(hunts, { points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027 });
    // Every easily-drawn Nevada elk tag at this level is antlerless. Counting
    // them as "reachable" put 100% in the headline for a bull hunter.
    expect(r.antlerless.length).toBeGreaterThan(r.reachable.length);
    expect(r.bestAntlerless!.odds!).toBeGreaterThan(r.best!.odds!);
    expect(r.headline).not.toMatch(/100%/);
  });

  it("carries Nevada's real point-level odds through, not just the cutoff", () => {
    const mod = getStateModule('NV')!;
    const hunts = buildGenericScoutDataset(mod, 'ELK' as never, 'nonresident', 'rifle', 6);
    const r = drawReality(hunts, {
      points: 6, state: 'Nevada', species: 'Elk', thisYear: 2027, cutoffIsADate: false,
    });
    // NDOW gave unit 111's early hunt 7 tags against 4,279 applicants, and 1 of
    // the 267 holding 7 points drew. "You'd have 7 points in 2028" on its own
    // sent a hunter building toward a 0.4% chance.
    const early = r.soon.find((h) => h.huntCode === '4151-111-Early')!;
    expect(early.pointsNeeded).toBe(7);
    expect(early.oddsAtThatLevel!).toBeLessThan(1);
    expect(early.cutoffIsADate).toBe(false);
  });

  it('Wyoming clears a bar rather than quoting odds it does not publish', () => {
    const mod = getStateModule('WY')!;
    const hunts = buildGenericScoutDataset(mod, 'ELK' as never, 'nonresident', 'rifle', 3);
    const r = drawReality(hunts, { points: 3, state: 'Wyoming', species: 'Elk', thisYear: 2027 });
    expect(r.basis).toBe('points-to-draw');
    expect(r.reachable.length).toBeGreaterThan(0);
    expect(r.headline).toMatch(/a bar you clear, not a chance/);
  });
});
