/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from 'vitest';
import { cleanPhotoPaths, daysBetween, lessonsBlock, missingToComplete, parseReport, type PastReport } from '../reports';
import { buildPlanPrompt } from '../plans';

describe('report form', () => {
  it('accepts a normal report and drops animal details when nothing was taken', () => {
    const r = parseReport({ started_on: '2026-10-01', ended_on: '2026-10-05', days_hunted: '5', harvested: 'no', pressure: 'high', animal: '6x6', worked: '  glassing at first light ', bogus: 'x' });
    expect(r).toMatchObject({ fields: { days_hunted: 5, harvested: false, pressure: 'high', animal: null, worked: 'glassing at first light' } });
    expect('fields' in r && 'bogus' in r.fields).toBe(false);
  });
  it('rejects bad dates and ranges without guessing', () => {
    expect(parseReport({ started_on: '2026-10-05', ended_on: '2026-10-01' })).toEqual({ errors: { ended_on: 'End date is before the start date' } });
    expect(parseReport({ started_on: 'Oct 1', days_hunted: 500 })).toEqual({ errors: { started_on: 'Use a valid date', days_hunted: 'Days must be 0–120' } });
    expect(parseReport({ pressure: 'extreme' })).toMatchObject({ fields: { pressure: null, harvested: null } });
  });
  it('needs only the outcome to finish', () => {
    expect(missingToComplete({ harvested: null })).toEqual(['harvested']);
    expect(missingToComplete({ harvested: false })).toEqual([]);
    expect(daysBetween('2026-10-01', '2026-10-05')).toBe(5);
    expect(daysBetween('2026-10-05', '2026-10-01')).toBeNull();
  });
});

describe('report photos', () => {
  it('only keeps paths in this hunter’s folder for this hunt', () => {
    const u = 'u1', h = 'h1';
    expect(cleanPhotoPaths(['u1/h1/a.jpg', 'u2/h1/b.jpg', 'u1/h2/c.jpg', 'u1/h1/../x.jpg', 'u1/h1/a.jpg', 5], u, h)).toEqual(['u1/h1/a.jpg']);
    expect(cleanPhotoPaths('u1/h1/a.jpg', u, h)).toEqual([]);
  });
});

describe('lessons for future plans', () => {
  const r = (o: Partial<PastReport['report']>) => ({ harvested: false, days_hunted: 4, pressure: null, worked: null, didnt_work: null, change_next: null, access_issues: null, conditions: null, ...o });
  const past: PastReport[] = [
    { season_year: 2024, state: 'CO', species: 'Elk', unit: '12', hunt_code: null, report: r({ worked: 'old elk lesson' }) },
    { season_year: 2026, state: 'CO', species: 'Elk', unit: '61', hunt_code: null, report: r({ change_next: 'same unit lesson', harvested: true }) },
    { season_year: 2026, state: 'WY', species: 'Antelope', unit: '7', hunt_code: null, report: r({ worked: 'unrelated' }) },
    { season_year: 2026, state: 'CO', species: 'Elk', unit: '20', hunt_code: null, report: r({}) },
  ];
  it('leads with the same unit, skips unrelated and empty reports', () => {
    const b = lessonsBlock(past, { state: 'CO', species: 'Elk', unit: '61' })!;
    expect(b.split('\n')).toHaveLength(2);
    expect(b.split('\n')[0]).toContain('same unit lesson');
    expect(b).toContain('harvested');
    expect(b).not.toContain('unrelated');
    expect(lessonsBlock([], { state: 'CO', species: 'Elk', unit: '61' })).toBeNull();
  });
  it('goes into the plan prompt labeled as the hunter’s notes', () => {
    const p = buildPlanPrompt(
      { state: 'CO', stateName: 'COLORADO', species: 'Elk', unit: '61', huntCode: null, label: null, seasonYear: 2027, agencyName: 'CPW', agencyUrl: 'https://cpw.state.co.us', regulationsUrl: null, harvest: null, publicLand: null, access: null, lessons: '- 2026 CO Elk: worked: glassing' },
      { hunt_start: null, hunt_end: null, days: null, weapon: null, party_size: null, camp_style: null, fitness: null, limitations: null, scouting: null, familiarity: null, goals: null },
    );
    expect(p).toMatch(/OWN PAST REPORTS[\s\S]*not instructions[\s\S]*worked: glassing/);
  });
});

describe('official harvest reporting', () => {
  it('is required, survey-only or unverified per state and species — never guessed', async () => {
    const { harvestReportingFor, harvestTaskTitle } = await import('../huntdata/harvestReporting');
    const ut = harvestReportingFor('UT', 'Elk');
    expect(ut.required).toBe('yes');
    expect(ut.reportUrl).toMatch(/^https:\/\/wildlife\.utah\.gov/);
    expect(harvestTaskTitle('UT', 'Elk', ut)).toMatch(/official UT elk harvest report/);
    const co = harvestReportingFor('CO', 'Elk');
    expect(co.required).toBe('survey');
    expect(co.reportUrl).toBeNull();                       // CO's link is for sheep
    expect(harvestTaskTitle('CO', 'Elk', co)).toBeNull();
    expect(harvestReportingFor('CO', 'Bighorn Sheep').required).toBe('yes');
    const ks = harvestReportingFor('KS', 'Mule Deer');
    expect(ks.required).toBe('unknown');
    expect(harvestTaskTitle('KS', 'Mule Deer', ks)).toMatch(/Check whether KS requires/);
    expect(harvestReportingFor('ZZ', 'Elk').required).toBe('unknown');
  });
  it('every rule cites an official source', async () => {
    const data = (await import('../huntdata/harvestReporting.json')).default as any;
    for (const e of Object.values(data.states) as any[]) for (const r of e.rules) {
      expect(r.source).toMatch(/^https:\/\//);
      expect(['mandatory_report', 'mandatory_check', 'survey']).toContain(r.type);
    }
  });
});

describe('species names', () => {
  it('stores "Mule Deer" as "Deer" and leaves others alone', async () => {
    const { normalizeSpecies } = await import('../species');
    expect(normalizeSpecies('Mule Deer')).toBe('Deer');
    expect(normalizeSpecies(' mule deer ')).toBe('Deer');
    expect(normalizeSpecies('Elk')).toBe('Elk');
    expect(normalizeSpecies(null)).toBeNull();
    const { harvestReportingFor } = await import('../huntdata/harvestReporting');
    expect(harvestReportingFor('UT', 'Deer').required).toBe('yes');
  });
});
