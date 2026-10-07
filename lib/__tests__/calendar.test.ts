import { describe, expect, it } from 'vitest';
import { calendarYears, drawOutlook, findHunt, projectPoints, usesPoints, yearFlags } from '../calendar';
import { guessMapping, parseImport, splitRows, stateCodeOf } from '../sheetImport';
import { canonicalSpecies, speciesKeyOf } from '../species';
import { getStateModule } from '../huntdata/registry';

describe('points projection', () => {
  it('adds a point each year and resets the year after a draw', () => {
    const ys = calendarYears(2027);
    expect(ys).toEqual([2027, 2028, 2029, 2030, 2031]);
    expect(projectPoints(3, ys)).toEqual({ 2027: 3, 2028: 4, 2029: 5, 2030: 6, 2031: 7 });
    expect(projectPoints(3, ys, [2028])).toEqual({ 2027: 3, 2028: 4, 2029: 0, 2030: 1, 2031: 2 });
  });
  it('knows which draws have no points', () => {
    expect(usesPoints(getStateModule('CO'), 'Elk')).toBe(true);
    expect(usesPoints(getStateModule('NM'), 'Elk')).toBe(false);       // random draw
    expect(usesPoints(getStateModule('OR'), 'Bighorn Sheep')).toBe(false);
    expect(usesPoints(getStateModule('AK'), 'Moose')).toBe(false);
  });
});

describe('draw outlook', () => {
  const ys = calendarYears(2027);
  it('uses the point table and says when you’d have last year’s points', () => {
    const or = getStateModule('OR')!;
    const h = findHunt(or, 'Deer', '112', null)!;
    const o = drawOutlook(h, 'resident', ys, projectPoints(6, ys));
    expect(o.kind).toBe('draw');
    if (o.kind !== 'draw') return;
    expect(o.minPoints).toBe(10);
    expect(o.firstYearAtMin).toBe(2031);               // 6 → 10 by 2031
    expect(o.text).toMatch(/took 10 points; you'd have that in 2031/);
    const short = drawOutlook(h, 'resident', ys, projectPoints(5, ys));
    expect(short.text).toMatch(/took 10 points — more than you'd have by 2031/);
    const o2 = drawOutlook(h, 'resident', ys, projectPoints(8, ys));
    expect(o2.kind === 'draw' && o2.firstYearAtMin).toBe(2029);
  });
  it('gives a cumulative chance for random draws and never exceeds 100%', () => {
    const ak = getStateModule('AK')!;
    const h = findHunt(ak, 'Moose', 'DM160', null)!;
    expect(drawOutlook(h, 'resident', ys, null)).toMatchObject({ kind: 'closed' });   // non-residents only
    const o = drawOutlook(h, 'nonresident', ys, null);
    expect(o.kind).toBe('draw');
    if (o.kind === 'draw') {
      expect(o.perYear[0].pct).toBeCloseTo(0.5, 1);
      expect(o.perYear[4].cumulative!).toBeGreaterThan(o.perYear[0].cumulative!);
      expect(o.perYear[4].cumulative!).toBeLessThanOrEqual(100);
    }
  });
  it('treats general seasons as no-draw and asks for a hunt when a unit has several', () => {
    const wa = getStateModule('WA')!;
    expect(drawOutlook(findHunt(wa, 'Elk', 'GEN-101-archery', null), 'nonresident', ys, null).kind).toBe('otc');
    expect(drawOutlook(findHunt(getStateModule('CO')!, 'Elk', null, '61'), 'resident', ys, null).kind).toBe('none');
  });
});

describe('calendar flags', () => {
  it('flags open years, doubled-up draws and targets set too early', () => {
    const ys = [2027, 2028];
    const early = { kind: 'draw' as const, basis: 'points' as const, dataYear: 2026, minPoints: 10, firstYearAtMin: null, perYear: [{ year: 2027, points: 4, pct: 0, cumulative: 0 }], text: '' };
    const flags = yearFlags([
      { kind: 'target', state: 'CO', species: 'Elk', target_year: 2027, unit: '61', hunt_code: 'E-E-061-O1-R', outlook: early },
      { kind: 'target', state: 'CO', species: 'Elk', target_year: 2027, unit: '62', hunt_code: null },
    ], ys);
    expect(flags.find((f) => f.year === 2028)?.text).toMatch(/Open year/);
    expect(flags.some((f) => /2 CO elk draw hunts/.test(f.text))).toBe(true);
    expect(flags.some((f) => /took 10 points; you'd have 4 in 2027/.test(f.text))).toBe(true);
  });
});

describe('spreadsheet import', () => {
  it('reads a pasted sheet: points rows, planned hunts, bucket list and OTC', () => {
    const text = [
      'State\tSpecies\tPoints\tUnit\tYear\tType\tNotes',
      'Wyoming\tElk\t5\t\t\t\t',
      'CO\tmuley\t3\t61\t2028\t\tbuck',
      'AK\tsheep\t\t\t\tbucket list\tsomeday',
      'MT\tElk\t\t\t2027\tOTC fill-in\t',
      'TX\tElk\t2\t\t\t\t',
      'CO\tunicorn\t\t\t\t\t',
    ].join('\n');
    const rows = splitRows(text);
    const m = guessMapping(rows[0]);
    expect(m).toMatchObject({ state: 0, species: 1, points: 2, unit: 3, year: 4, kind: 5, notes: 6 });
    const r = parseImport(rows, m);
    expect(r.points).toEqual([{ state: 'WY', species: 'Elk', points: 5 }, { state: 'CO', species: 'Deer', points: 3 }]);
    expect(r.items).toEqual([
      { kind: 'target', state: 'CO', species: 'Deer', unit: '61', hunt_code: null, target_year: 2028, notes: 'buck' },
      { kind: 'bucket', state: 'AK', species: 'Dall Sheep', unit: null, hunt_code: null, target_year: null, notes: 'someday' },
      { kind: 'otc', state: 'MT', species: 'Elk', unit: null, hunt_code: null, target_year: 2027, notes: null },
    ]);
    expect(r.issues.map((i) => i.row)).toEqual([6, 7]);
  });
  it('reads quoted CSV and refuses without state and species columns', () => {
    const rows = splitRows('state,species,points,notes\n"NV","Elk",4,"needs ""luck"", lots"');
    expect(parseImport(rows, guessMapping(rows[0])).points).toEqual([{ state: 'NV', species: 'Elk', points: 4 }]);
    expect(parseImport(rows, {}).issues[0].text).toMatch(/State column/);
  });
  it('knows state names and species words', () => {
    expect(stateCodeOf('South Dakota')).toBe('SD');
    expect(stateCodeOf('Texas')).toBeNull();
    expect(speciesKeyOf('Pronghorn')).toBe('ANTELOPE');
    expect(canonicalSpecies('sheep', 'NV')).toBe('Bighorn Sheep');
    expect(canonicalSpecies('Mule Deer')).toBe('Deer');
  });
});
