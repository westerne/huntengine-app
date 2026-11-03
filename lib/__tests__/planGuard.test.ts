import { describe, expect, it } from 'vitest';
import { groundBrief, groundPlan, scrubUngrounded } from '../planGuard';
import { cleanPlan, type PlanContext, type PlanInputs } from '../plans';

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  state: 'AZ', stateName: 'Arizona', species: 'Elk', unit: '4B', huntCode: '3091',
  label: null, seasonYear: 2027, agencyName: 'AZGFD', agencyUrl: 'https://azgfd.com',
  regulationsUrl: null,
  harvest: '59% hunter success (2025)',
  publicLand: 'about 75% public land (sampled from BLM land status)',
  access: null, lessons: null, ...over,
});

const inputs = (over: Partial<PlanInputs> = {}): PlanInputs => ({
  hunt_start: null, hunt_end: null, days: null, party_size: null, weapon: null,
  camp_style: null, fitness: null, scouting: null, limitations: null,
  familiarity: null, goals: null, ...over,
} as PlanInputs);

const scrub = (t: string, i = inputs(), c = ctx()) => scrubUngrounded(t, c, i).text;

describe('ungrounded tag counts', () => {
  it('replaces invented quotas, which are never supplied to the model', () => {
    expect(scrub('The unit offers 250 tags each fall.')).toBe('The unit offers [tag numbers not supplied — check the regulations] each fall.');
    expect(scrub('A quota of 40 is typical.')).toBe('A [tag numbers not supplied — check the regulations] is typical.');
    expect(scrub('About 1,200 permits are issued.')).toMatch(/not supplied/);
  });

  it('leaves ordinary counts alone', () => {
    expect(scrub('Bring 3 water bottles and 2 knives.')).toBe('Bring 3 water bottles and 2 knives.');
  });
});

describe('ungrounded dates', () => {
  it('replaces day-level season dates the model made up', () => {
    expect(scrub('The rifle season opens September 15.')).toMatch(/\[dates not supplied/);
    expect(scrub('Hunt runs 10/15 to 10/28.')).toMatch(/\[dates not supplied/);
  });

  it('keeps the hunter’s own dates in every form a model writes them', () => {
    const i = inputs({ hunt_start: '2027-09-15', hunt_end: '2027-09-22' });
    expect(scrub('You hunt September 15 to September 22.', i)).toBe('You hunt September 15 to September 22.');
    expect(scrub('Arrive Sept. 15th and glass.', i)).toBe('Arrive Sept. 15th and glass.');
    expect(scrub('Opening day is September 1.', i)).toMatch(/\[dates not supplied/);
  });

  it('allows vague season language, which invents nothing', () => {
    const t = 'Early September is hot; by late October the rut is over.';
    expect(scrub(t)).toBe(t);
  });
});

describe('ungrounded figures and trophy scores', () => {
  it('keeps the figures the model was handed and replaces the rest', () => {
    expect(scrub('Hunter success was 59% in 2025.')).toBe('Hunter success was 59% in 2025.');
    expect(scrub('The unit is about 75% public land.')).toBe('The unit is about 75% public land.');
    expect(scrub('Draw odds sit near 12% at your points.')).toMatch(/\[figure not supplied]/);
  });

  it('ignores percentages that are not claims about the hunt', () => {
    expect(scrub('Spend 90% of your time glassing.')).toBe('Spend 90% of your time glassing.');
  });

  it('replaces invented trophy scores', () => {
    expect(scrub('Expect 320-inch bulls.')).toMatch(/\[trophy figures not supplied]/);
    expect(scrub('Bulls score B&C 350 here.')).toMatch(/\[trophy figures not supplied]/);
  });
});

describe('groundPlan', () => {
  it('cleans every section and the gear list, and reports what it caught', () => {
    const plan = cleanPlan({
      sections: {
        seasonal_strategy: 'Season opens October 3 with 150 tags.',
        scouting: 'Glass early; 59% hunter success is realistic.',
      },
      gear: [{ item: 'Rangefinder', why: 'Bulls run 340 inches' }],
    });
    const { plan: out, found } = groundPlan(plan, ctx(), inputs());
    expect(out.sections.seasonal_strategy).not.toMatch(/October 3|150 tags/);
    expect(out.sections.scouting).toContain('59%');
    expect(out.gear[0].why).toMatch(/\[trophy figures not supplied]/);
    expect(found.map((f) => f.kind).sort()).toEqual(['date', 'tags', 'trophy']);
  });

  it('leaves a clean plan untouched', () => {
    const plan = cleanPlan({ sections: { scouting: 'Glass the north-facing timber at first light.' }, gear: [{ item: 'Spotting scope' }] });
    const { plan: out, found } = groundPlan(plan, ctx(), inputs());
    expect(found).toEqual([]);
    expect(out.sections.scouting).toBe('Glass the north-facing timber at first light.');
  });
});

describe('grounding the unit brief', () => {
  // What the route hands the model: its assembled DATA blocks.
  const facts = 'HARVEST: 59% hunter success (2025). PUBLIC LAND: approximately 75% public land. TROPHY ESTIMATE: Typical Mature: 320 inches.';

  it('keeps every figure the brief was given', () => {
    const { brief, found } = groundBrief({
      odds: 'Hunter success ran 59% in 2025 and the unit is about 75% public land.',
      trophy: 'Mature bulls go 320 inches here.',
    }, facts);
    expect(found).toEqual([]);
    expect(brief.odds).toContain('59%');
    expect(brief.trophy).toContain('320 inches');
  });

  it('replaces figures it was not given', () => {
    const { brief, found } = groundBrief({
      tags: 'The unit offers 250 tags.',
      dates: 'The season opens September 15.',
      odds: 'Draw odds sit near 12% for non-residents.',
    }, facts);
    expect(brief.tags).toMatch(/\[tag numbers not supplied/);
    expect(brief.dates).toMatch(/\[dates not supplied/);
    expect(brief.odds).toMatch(/\[figure not supplied]/);
    expect(found.map((f) => f.kind).sort()).toEqual(['date', 'figure', 'tags']);
  });

  it('allows a tag count that was supplied', () => {
    const { brief, found } = groundBrief(
      { tags: 'There were 250 tags last year.' },
      'DRAW: 250 licences issued in 2026.',
    );
    expect(brief.tags).toContain('250 tags');
    expect(found).toEqual([]);
  });

  it('leaves non-string sections alone', () => {
    const { brief } = groundBrief({ list: ['a', 'b'], n: 3 }, facts);
    expect(brief.list).toEqual(['a', 'b']);
    expect(brief.n).toBe(3);
  });
});
