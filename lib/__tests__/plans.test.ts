import { describe, expect, it } from 'vitest';
import { buildPlanPrompt, cleanPlan, mergedSections, parseInputs, PLAN_SECTIONS, stripPhoneNumbers } from '../plans';

describe('plan inputs', () => {
  it('accepts a normal set and rejects bad dates/ranges without guessing', () => {
    const ok = parseInputs({ hunt_start: '2027-10-01', hunt_end: '2027-10-07', days: '6', party_size: 2, weapon: 'Rifle' });
    expect(ok).toMatchObject({ inputs: { hunt_start: '2027-10-01', days: 6, party_size: 2, weapon: 'Rifle' } });
    expect(parseInputs({ hunt_start: '2027-10-07', hunt_end: '2027-10-01' })).toEqual({ errors: { hunt_end: 'End date is before the start date' } });
    expect(parseInputs({ hunt_start: 'Oct 1', days: 0 })).toEqual({ errors: { hunt_start: 'Use a valid date', days: 'Days must be 1–60' } });
    expect(parseInputs({})).toMatchObject({ inputs: { hunt_start: null, days: null } });
  });
});

describe('plan output', () => {
  it('strips phone numbers (911 stays) and fills missing sections honestly', () => {
    expect(stripPhoneNumbers('Call (307) 555-0182 or 307.555.0182, or 911.')).toBe('Call [number removed — look it up on an official source] or [number removed — look it up on an official source], or 911.');
    const plan = cleanPlan({ sections: { seasonal_strategy: 'Glass early. Outfitter: 928-555-1234' }, gear: ['Rangefinder', { item: 'Game bags', why: 'meat care' }, { nope: 1 }] });
    expect(plan.sections.seasonal_strategy).not.toMatch(/555/);
    expect(plan.sections.emergency).toBe('Not generated — add your own notes here.');
    expect(plan.gear).toEqual([{ item: 'Rangefinder', why: undefined }, { item: 'Game bags', why: 'meat care' }]);
    expect(Object.keys(plan.sections)).toHaveLength(PLAN_SECTIONS.length);
  });

  it('shows the hunter’s edit over the generated text, per section', () => {
    const m = mergedSections({ scouting: 'gen', camp_travel: 'gen2' }, { scouting: 'mine' });
    expect(m.scouting).toEqual({ text: 'mine', edited: true });
    expect(m.camp_travel).toEqual({ text: 'gen2', edited: false });
  });
});

describe('plan prompt', () => {
  it('carries the guardrails and only the data it was given', () => {
    const p = buildPlanPrompt(
      { state: 'AZ', stateName: 'ARIZONA', species: 'Elk', unit: '4B', huntCode: '3091', label: 'Any elk', seasonYear: 2027, agencyName: 'Arizona Game and Fish Department', agencyUrl: 'https://www.azgfd.com', regulationsUrl: null, harvest: '59% hunter success (2025)', publicLand: null, access: null },
      { hunt_start: null, hunt_end: null, days: 5, weapon: 'Rifle', party_size: 2, camp_style: null, fitness: null, limitations: null, scouting: null, familiarity: null, goals: null },
    );
    expect(p).toContain('hunt 3091');
    expect(p).toContain('59% hunter success (2025)');
    expect(p).toMatch(/never write a phone number/i);
    expect(p).toMatch(/Never give precise animal locations/);
    expect(p).toContain('Hunt dates: not set yet');
  });
});
