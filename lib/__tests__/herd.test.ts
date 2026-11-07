import { describe, expect, it } from 'vitest';
import { herdFor, herdWhere } from '../huntdata/herd';

describe('herd sex ratios by state', () => {
  it('Colorado: CPW herd estimates, for the whole herd a unit is in', () => {
    const h = herdFor('CO', 'ELK', '35')!;
    expect(h.text).toBe('26 bulls per 100 cows after the 2025 season');
    expect(herdWhere(h)).toBe('CPW, herd unit (DAU) 12');
    expect(herdFor('CO', 'ANTELOPE', '201')!.text).toMatch(/before the 2025 season/);
  });
  it('Arizona: AZGFD surveys by unit, with animals counted', () => {
    const h = herdFor('AZ', 'ELK', '01')!;
    expect(h).toMatchObject({ malesPer100: 20, counted: 1776, agency: 'AZGFD' });
    expect(h.text).toBe("20 bulls per 100 cows in AZGFD's 2025 survey");
  });
  it('applies a shared survey row to each unit, but a unit’s own row wins', () => {
    expect(herdFor('AZ', 'ELK', '3A')).toMatchObject({ malesPer100: 16, herd: 'surveyed together: units 3A, 3C' });
    expect(herdFor('AZ', 'ELK', '3C')).toMatchObject({ malesPer100: 25, herd: null });
  });
  it('says when a survey is small', () => {
    expect(herdFor('AZ', 'ELK', '10')!.text).toMatch(/a small survey: 40 animals/);
  });
  it('returns nothing where the state publishes no ratio', () => {
    expect(herdFor('NV', 'ELK', '161')).toBeNull();
    expect(herdFor('AZ', 'BIGHORNSHEEP', '22')).toBeNull();
  });
});

describe('Utah: DWR annual report', () => {
  it('gives deer bucks per 100 does by unit name, with the unit goal', () => {
    const h = herdFor('UT', 'DEER', 'Henry Mtns')!;
    expect(h.malesPer100).toBe(46);
    expect(h.text).toBe("46 bucks per 100 does after the season (2022-2024 average); DWR's goal for the unit is 40-55");
  });
  it('gives limited-entry elk as the average age of harvested bulls', () => {
    const h = herdFor('UT', 'ELK', 'Beaver, East')!;
    expect(h).toMatchObject({ avgAge: 9.1, malesPer100: null, score: 9.1, label: 'Avg. bull age' });
    expect(h.text).toMatch(/^harvested bulls averaged 9.1 years old/);
    expect(h.caveat).toMatch(/age is not a measure of antler size/);
    expect(herdFor('UT', 'ELK', 'San Juan')?.avgAge).toBe(7.9);
    expect(herdFor('UT', 'ELK', 'Cache, Meadowville')?.avgAge).toBe(5.5);
  });
});

describe('Wyoming: WGFD Job Completion Reports', () => {
  it('gives the herd ratio for a hunt area, named by herd', () => {
    const h = herdFor('WY', 'ELK', '100')!;
    expect(h.text).toBe("54 bulls per 100 cows in WGFD's 2025 herd count");
    expect(h.herd).toBe('Steamboat herd (EL426)');
  });
  it('falls back to the 5-year average, and says so, when a herd went uncounted', () => {
    expect(herdFor('WY', 'ELK', '15')!.text).toBe("31 bulls per 100 cows in WGFD's 2020-2024 average (no 2025 count)");
  });
  it('treats a 0 as no count, never as a herd without males', () => {
    expect(herdFor('WY', 'ELK', '124')).toBeNull(); // Petition: "0 0"
  });
  it('gives a hunt over several areas their herd when they share one', () => {
    expect(herdFor('WY', 'DEER', '23-26')?.malesPer100).toBe(45);
  });
});
