import { describe, expect, it } from 'vitest';
import {
  allowedTrophyByUnit, groundScoutTrophy, sourcedTopEndInches, trophyFacts, trophySourced,
} from '../trophy';
import { WYOMING_DEER_UNITS } from '../../app/api/strategy/wyodeerdata';
import { WYOMING_ANTELOPE_UNITS } from '../../app/api/strategy/wyoantelopedata';
import { buildWyomingDeerScoutDataset } from '../../app/api/strategy/wyodeerScoutAdapter';
import { buildWyomingAntelopeScoutDataset } from '../../app/api/strategy/wyoantelopeScoutAdapter';

describe('which trophy figures we can stand behind', () => {
  it('trusts only field-sourced entries', () => {
    expect(trophySourced('FULL')).toBe(true);
    expect(trophySourced('NEEDS_TROPHY_DATA')).toBe(false);
    // "aggregated table data", per the file's own notes — not unit-sourced, and
    // this one was being handed to the brief as "PRIMARY TRUTH DATA".
    expect(trophySourced('NEEDS_FIELD_DATA')).toBe(false);
    expect(trophySourced(undefined)).toBe(false);
  });

  it('withholds an unsourced figure rather than softening it', () => {
    const f = trophyFacts({ typical: '125-145"', topEnd: '160"', dataCompleteness: 'NEEDS_TROPHY_DATA' });
    expect(f.typical).toBeNull();
    expect(f.topEnd).toBeNull();
    expect(f.sourced).toBe(false);
    expect(f.note).toMatch(/not sourced for this area/);
  });

  it('passes a sourced figure through untouched', () => {
    const f = trophyFacts({ typical: '175-190"', topEnd: '200"+', dataCompleteness: 'FULL' });
    expect(f).toMatchObject({ typical: '175-190"', topEnd: '200"+', sourced: true, note: null });
  });

  it('treats a placeholder string as unsourced even when the flag says FULL', () => {
    expect(trophyFacts({ typical: 'N/A', topEnd: 'N/A', dataCompleteness: 'FULL' }).sourced).toBe(false);
    expect(trophyFacts({ typical: 'TBD', topEnd: '160"', dataCompleteness: 'FULL' }).sourced).toBe(false);
  });

  it('only lets a sourced figure set the OTC baseline', () => {
    expect(sourcedTopEndInches({ typical: '175-190"', topEnd: '200"+', dataCompleteness: 'FULL' })).toBe(200);
    expect(sourcedTopEndInches({ typical: '125-145"', topEnd: '160"', dataCompleteness: 'NEEDS_TROPHY_DATA' })).toBeNull();
  });

  it('needs the whole pair, since half a sourced figure is a guess about the rest', () => {
    expect(sourcedTopEndInches({ topEnd: '200"+', dataCompleteness: 'FULL' })).toBeNull();
    expect(trophyFacts({ typical: '175-190"', dataCompleteness: 'FULL' }).sourced).toBe(false);
  });
});

describe('the Wyoming datasets as the model now receives them', () => {
  it('sends no antler figure for any unit inside a general region', () => {
    const ds = buildWyomingDeerScoutDataset();
    const regions = ds.filter((e) => e.productType === 'GENERAL_REGION');
    expect(regions.length).toBeGreaterThan(0);
    const notable = regions.flatMap((r) => r.notableUnits ?? []);
    // All 100 UNIT_IN_REGION entries are estimates, and they reach the hunter
    // as "notable units" cited inside a region recommendation.
    expect(notable.length).toBeGreaterThan(50);
    for (const n of notable) {
      expect(n.typical).toBeNull();
      expect(n.topEnd).toBeNull();
      expect(n.trophySourced).toBe(false);
      expect(n.trophyNote).toMatch(/not sourced/);
      // Geography still comes through — that's what they're cited for.
      expect(n.unitName).toBeTruthy();
    }
  });

  it('keeps the general regions own sourced figures, since those are measured', () => {
    const ds = buildWyomingDeerScoutDataset();
    const regions = ds.filter((e) => e.productType === 'GENERAL_REGION');
    expect(regions.every((r) => r.trophySourced)).toBe(true);
    expect(regions.every((r) => !!r.topEnd)).toBe(true);
  });

  it('sends no antler figure for the whitetail sub-tags', () => {
    // NEEDS_FIELD_DATA, and one devNote says the figures are legacy mule-deer
    // estimates. A whitetail hunter was being quoted them as truth.
    const wt = Object.values(WYOMING_DEER_UNITS).filter((u) => u.productType === 'LIMITED_QUOTA_WHITETAIL');
    expect(wt.length).toBeGreaterThan(10);
    for (const u of wt) expect(trophyFacts(u).sourced).toBe(false);
  });

  it('sends almost no antler figure for Wyoming antelope', () => {
    const ds = buildWyomingAntelopeScoutDataset(['1', '2', '9', '0']);
    const sourced = ds.filter((e) => e.trophySourced);
    expect(ds.length).toBeGreaterThan(100);
    // The file says its trophy figures are "placeholders — not yet sourced".
    expect(sourced.length).toBeLessThan(5);
    for (const e of ds.filter((x) => !x.trophySourced)) {
      expect(e.typical).toBeNull();
      expect(e.topEnd).toBeNull();
    }
    expect(Object.keys(WYOMING_ANTELOPE_UNITS).length).toBeGreaterThan(100);
  });
});

describe('guarding the shortlist after the model answers', () => {
  const dataset = [
    { unit: '141-1', typical: '175-190"', topEnd: '200"+' },   // sourced
    { unit: '143-GEN', typical: null, topEnd: null },           // not sourced
  ];

  it('builds the allowed figures per unit, empty where nothing was supplied', () => {
    const a = allowedTrophyByUnit(dataset);
    expect([...a.get('141-1')!].sort()).toEqual(['175', '190', '200']);
    expect(a.get('143-gen')!.size).toBe(0);
  });

  it('nulls a score the model invented for a unit we gave nothing for', () => {
    const { result, stripped } = groundScoutTrophy({
      recommendations: [{ unit: '143-GEN', typicalScore: '150-170"', topEnd: '180"', whyItFits: 'Bucks here push 180".' }],
    }, dataset);
    const pick = result.recommendations[0] as Record<string, unknown>;
    expect(pick.typicalScore).toBeNull();
    expect(pick.topEnd).toBeNull();
    expect(pick.whyItFits).toMatch(/\[antler size not sourced for this area\]/);
    expect(stripped.length).toBeGreaterThan(0);
  });

  it('leaves a figure alone when we supplied it for that unit', () => {
    const { result, stripped } = groundScoutTrophy({
      recommendations: [{ unit: '141-1', typicalScore: '175-190"', topEnd: '200"+', whyItFits: 'Typical bucks run 175-190".' }],
    }, dataset);
    const pick = result.recommendations[0] as Record<string, unknown>;
    expect(pick.typicalScore).toBe('175-190"');
    expect(pick.whyItFits).toMatch(/175-190"/);
    expect(stripped).toEqual([]);
  });

  it("refuses a figure borrowed from a different unit", () => {
    // The prompt names elite units with their figures; the model copying 200"
    // onto a mid-tier unit is the exact failure to catch.
    const { result } = groundScoutTrophy({
      recommendations: [{ unit: '143-GEN', typicalScore: '175-190"', topEnd: '200"+' }],
    }, dataset);
    expect((result.recommendations[0] as Record<string, unknown>).typicalScore).toBeNull();
  });

  it('guards the drawableUnits list as well as the recommendations', () => {
    const { result } = groundScoutTrophy({
      drawableUnits: [{ unit: '143-GEN', typicalScore: '160"', topEnd: '175"' }],
    }, dataset);
    expect((result.drawableUnits[0] as Record<string, unknown>).topEnd).toBeNull();
  });

  it('leaves odds, seasons and quotas untouched', () => {
    const { result } = groundScoutTrophy({
      recommendations: [{
        unit: '143-GEN', currentOdds: '11.1%', season: 'Sept 1 – Sept 30',
        whyItFits: 'Regular pool took 17 points and drew at 50%.',
      }],
    }, dataset);
    const pick = result.recommendations[0] as Record<string, unknown>;
    expect(pick.currentOdds).toBe('11.1%');
    expect(pick.season).toBe('Sept 1 – Sept 30');
    expect(pick.whyItFits).toMatch(/17 points and drew at 50%/);
  });
});
