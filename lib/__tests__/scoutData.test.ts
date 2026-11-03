import { describe, expect, it } from 'vitest';
import { noDataAnswer, titleCaseState } from '../scoutData';
import { prefillWeapon } from '../plans';

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
