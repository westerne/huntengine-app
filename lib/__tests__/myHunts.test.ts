import { describe, expect, it } from 'vitest';
import { buildMyHunts, planSections, shortOutlook, stageOfSaved, type SavedHuntRow } from '../myHunts';
import type { PlanItem } from '../calendar';

const saved = (o: Partial<SavedHuntRow>): SavedHuntRow => ({
  id: 'h1', season_year: 2027, state: 'OR', species: 'Elk', unit: '10', hunt_code: '210A2', label: null,
  status: 'planned', application_result: null, applications: null, hunt_reports: null, ...o,
});
const item = (o: Partial<PlanItem>): PlanItem => ({
  id: 'p1', kind: 'target', state: 'WY', species: 'Elk', unit: '125', hunt_code: '125-1', label: null,
  target_year: 2029, notes: null, saved_hunt_id: null, position: 0, ...o,
});

describe('stages', () => {
  it('reads a saved hunt’s stage the way a hunter would say it', () => {
    expect(stageOfSaved(saved({ status: 'applied', application_result: 'pending' }))).toBe('applied');
    expect(stageOfSaved(saved({ status: 'applied', application_result: 'unsuccessful' }))).toBe('didnt');
    expect(stageOfSaved(saved({ status: 'tag_secured' }))).toBe('drew');
    expect(stageOfSaved(saved({ status: 'preparing' }))).toBe('prepping');
    expect(stageOfSaved(saved({ status: 'completed', hunt_reports: { completed_at: '2026-10-01', harvested: true } }))).toBe('reported');
    expect(stageOfSaved(saved({ status: 'completed' }))).toBe('hunted');
    expect(stageOfSaved(saved({ status: 'planned', applications: { decision: 'build_points', deadline_on: null, submitted_at: null } }))).toBe('points');
    expect(stageOfSaved(saved({ status: 'archived', application_result: 'unsuccessful' }))).toBe('didnt');
  });
});

describe('one record per hunt', () => {
  it('shows a calendar item that became a saved hunt once, as the saved hunt', () => {
    const hunts = buildMyHunts([saved({ id: 'h1' })], [item({ id: 'p1', saved_hunt_id: 'h1', notes: 'w/ dad' }), item({ id: 'p2' })]);
    expect(hunts.map((h) => h.key)).toEqual(['s:h1', 'p:p2']);
    expect(hunts[0]).toMatchObject({ planItemId: 'p1', notes: 'w/ dad', stage: 'planned' });
  });
  it('puts bucket-list hunts in Someday and past years in history', () => {
    const hunts = buildMyHunts(
      [saved({ id: 'old', season_year: 2025, status: 'applied', application_result: 'unsuccessful' })],
      [item({ id: 'b', kind: 'bucket', target_year: null }), item({ id: 'n', target_year: 2027 })],
    );
    const s = planSections(hunts, 2027);
    expect(s.someday.map((h) => h.key)).toEqual(['p:b']);
    expect(s.thisSeason.map((h) => h.key)).toEqual(['p:n']);
    expect(s.past.map((h) => h.key)).toEqual(['s:old']);
  });
});

describe('one-line odds', () => {
  const draw = (perYear: Array<{ year: number; points: number | null; pct: number | null; cumulative: number | null }>, minPoints: number | null = null, firstYearAtMin: number | null = null) =>
    ({ kind: 'draw' as const, basis: 'points' as const, dataYear: 2026, minPoints, firstYearAtMin, perYear, text: '' });
  it('says when you would likely draw, and whether that is in time', () => {
    const o = draw([{ year: 2027, points: 6, pct: 30, cumulative: 30 }, { year: 2028, points: 7, pct: 40, cumulative: 58 }]);
    expect(shortOutlook(o, 2028)).toEqual({ text: 'Likely by 2028', tier: 'good' });
    expect(shortOutlook(o, 2027)).toEqual({ text: 'Likely by 2028', tier: 'fair' });
    expect(shortOutlook(draw([{ year: 2027, points: 3, pct: null, cumulative: null }], 5, 2029), 2029)).toEqual({ text: 'Clears 5-pt cutoff 2029', tier: 'good' });
    expect(shortOutlook({ kind: 'otc', text: '' }, 2027)?.text).toBe('Over the counter');
    expect(shortOutlook({ kind: 'closed', text: 'Residents only — not open to you.' }, 2027)).toEqual({ text: 'Residents only', tier: 'stop' });
  });
});
