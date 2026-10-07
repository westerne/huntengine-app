import { describe, expect, it } from 'vitest';
import { suggestCalendar, type SetupAnswers } from '../suggest';
import { calendarYears } from '../calendar';

const ys = calendarYears(2027);
const base: SetupAnswers = { homeState: 'CO', weapon: 'any', wait: 'long', newUnits: 'either', interests: [], points: [], knownUnits: [], bucket: [] };

describe('starting-calendar suggestions', () => {
  it('suggests a likely draw now and a hunt within reach of your points', () => {
    const r = suggestCalendar({ ...base, homeState: 'NV', interests: [{ state: 'OR', species: 'Deer' }], points: [{ state: 'OR', species: 'Deer', points: 4 }] }, ys);
    const targets = r.suggestions.filter((s) => s.kind === 'target');
    expect(targets.length).toBeGreaterThan(0);
    expect(targets[0].target_year).toBe(2027);
    expect(targets[0].why).toMatch(/drew it in 2026|at 4 points/);
    const later = targets.find((t) => t.target_year! > 2027);
    if (later) expect(later.why).toMatch(/it took \d+ points; you'd have that in 20\d\d/);
  });
  it('fills open years with OTC options and keeps residency rules', () => {
    const r = suggestCalendar({ ...base, homeState: 'CO', wait: 'now', interests: [{ state: 'WA', species: 'Elk' }, { state: 'SD', species: 'Elk' }] }, ys);
    const otc = r.suggestions.find((s) => s.kind === 'otc');
    expect(otc?.hunt_code).toMatch(/^GEN-/);
    expect(otc?.target_year).not.toBeNull();
    expect(r.suggestions.some((s) => s.state === 'SD')).toBe(false);
    expect(r.notes.join(' ')).toMatch(/South Dakota elk licenses are for residents only/);
  });
  it('can steer away from units you already know', () => {
    const known = suggestCalendar({ ...base, homeState: 'NV', interests: [{ state: 'OR', species: 'Deer' }], points: [{ state: 'OR', species: 'Deer', points: 4 }] }, ys);
    const first = known.suggestions[0];
    const fresh = suggestCalendar({ ...base, homeState: 'NV', newUnits: 'new', knownUnits: [{ state: 'OR', species: 'Deer', unit: first.unit! }], interests: [{ state: 'OR', species: 'Deer' }], points: [{ state: 'OR', species: 'Deer', points: 4 }] }, ys);
    expect(fresh.suggestions.every((s) => s.unit !== first.unit)).toBe(true);
  });
  it('turns bucket-list picks into someday hunts with honest advice', () => {
    const r = suggestCalendar({ ...base, homeState: 'CO', bucket: [{ state: 'AK', species: 'sheep' }, { state: 'AZ', species: 'Elk' }] }, ys);
    expect(r.suggestions).toEqual([
      expect.objectContaining({ kind: 'bucket', state: 'AK', species: 'Dall Sheep', why: expect.stringMatching(/Random draw, no points/) }),
      expect.objectContaining({ kind: 'bucket', state: 'AZ', species: 'Elk', why: expect.stringMatching(/Start buying points now/) }),
    ]);
  });
  it('works for the original hand-built states too', () => {
    const r = suggestCalendar({ ...base, homeState: 'CO', interests: [{ state: 'CO', species: 'Elk' }], points: [{ state: 'CO', species: 'Elk', points: 2 }] }, ys);
    expect(r.suggestions.length + r.notes.length).toBeGreaterThan(0);
  });
});

describe('suggestion guards', () => {
  it('leaves out private-land-only hunts and recommends one this-season draw per species', async () => {
    const { isPrivateOnly } = await import('../huntdata/shortlist');
    expect(isPrivateOnly({ huntCode: 'EF007P5R' })).toBe(true);
    expect(isPrivateOnly({ huntCode: 'E-F-007-P5-R' })).toBe(true);
    expect(isPrivateOnly({ huntCode: 'EE002E1R' })).toBe(false);
    const { isAntlerless } = await import('../huntdata/shortlist');
    expect(isAntlerless({ huntCode: 'DF056L1R' })).toBe(true);
    expect(isAntlerless({ huntCode: 'DM056O1R' })).toBe(false);
    expect(isAntlerless({ huntCode: '95-2', label: 'Any Elk - Rifle (Type 2)' })).toBe(false);
    expect(isPrivateOnly({ huntCode: '224C', label: 'Elk — Tioga Private' })).toBe(true);
    const r = suggestCalendar({ ...base, homeState: 'XX', interests: [{ state: 'CO', species: 'Deer' }, { state: 'OR', species: 'Deer' }, { state: 'OR', species: 'Elk' }], points: [{ state: 'OR', species: 'Elk', points: 6 }, { state: 'OR', species: 'Deer', points: 2 }] }, ys);
    expect(r.suggestions.some((s) => isPrivateOnly({ huntCode: s.hunt_code, label: s.label }))).toBe(false);
    const deerNow = r.suggestions.filter((s) => s.species === 'Deer' && s.kind === 'target' && s.target_year === 2027);
    expect(deerNow.filter((s) => s.recommended)).toHaveLength(Math.min(1, deerNow.length));
  });
});
