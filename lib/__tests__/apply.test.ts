import { describe, expect, it } from 'vitest';
import { applyFile, deadlineFor, deadlineText, feesFor, PENDING_OWNER_CHECK, prerequisitesFor, windowsFor } from '../huntdata/apply';
import { officialInfoFor } from '../huntdata/applicationInfo';

const STATES = ['AK', 'AZ', 'CA', 'CO', 'ID', 'KS', 'MT', 'ND', 'NE', 'NM', 'NV', 'OK', 'OR', 'SD', 'UT', 'WA', 'WY'];

describe('application data (owner-signed-off)', () => {
  it('covers every state, every row sourced and quoted', () => {
    for (const st of STATES) {
      if (PENDING_OWNER_CHECK.has(st)) continue;
      const f = applyFile(st)!;
      expect(f, st).toBeTruthy();
      expect(f.applyUrl ?? f.howToUrl, st).toMatch(/^https:\/\//);
      for (const r of [...f.draws, ...(f.pointOnly ?? []), ...f.fees, ...f.prerequisites]) {
        expect(r.source, st).toMatch(/^https?:\/\//);
        expect(r.quote, st).toBeTruthy();
      }
    }
  });
  it('holds Kansas back until the owner re-checks it by hand', () => {
    expect(applyFile('KS')).toBeNull();
    expect(officialInfoFor('KS', 'Deer', 2027).applyUrl).toBeNull();
  });
});

describe('deadlines', () => {
  it('offers a posted 2027 date as the deadline', () => {
    const d = deadlineFor('AK', 'MOOSE', 'nonresident', 2027)!;
    expect(d).toMatchObject({ kind: 'published', date: '2026-12-15', time: '17:00' });
    expect(officialInfoFor('AK', 'Moose', 2027, 'nonresident').deadline?.date).toBe('2026-12-15');
  });
  it('shows last year’s date for reference, never as this year’s', () => {
    const d = deadlineFor('WY', 'ELK', 'nonresident', 2027)!;
    expect(d).toMatchObject({ kind: 'last_year', date: '2026-02-02', year: 2026 });
    expect(deadlineText(d)).toBe('Last year Feb 2');
    const info = officialInfoFor('WY', 'Elk', 2027, 'nonresident');
    expect(info.deadline).toBeNull();
    expect(info.reference).toMatchObject({ kind: 'last_year', date: '2026-02-02' });
  });
  it('picks the main draw over special permits', () => {
    // Utah's 2027 sportsman permits close Nov 10 — the main draw is in spring.
    const d = deadlineFor('UT', 'ELK', 'resident', 2027)!;
    expect(d.kind).toBe('last_year');
    expect(d.date).toBe('2026-04-23');
  });
  it('fits the hunter’s residency', () => {
    expect(deadlineFor('ID', 'ELK', 'nonresident', 2027)).toMatchObject({ kind: 'published', date: '2026-12-15' });
    expect(deadlineFor('ID', 'ELK', 'resident', 2027)?.kind).toBe('last_year');
    expect(windowsFor('WY', 'ELK', 'resident').every((w) => w.residency !== 'nonresident')).toBe(true);
  });
  it('treats Nebraska’s calculated dates from an earlier year as last year’s', () => {
    expect(deadlineFor('NE', 'DEER', 'resident', 2027)?.kind).toBe('last_year');
  });
});

describe('fees and prerequisites', () => {
  it('returns the hunter’s fees with sources', () => {
    const fees = feesFor('WY', 'ELK', 'nonresident');
    expect(fees.length).toBeGreaterThan(0);
    expect(fees.every((f) => f.residency !== 'resident')).toBe(true);
    expect(prerequisitesFor('AK', 'DALLSHEEP', 'nonresident').some((p) => /guide|relative/i.test(p.text))).toBe(true);
  });
});
