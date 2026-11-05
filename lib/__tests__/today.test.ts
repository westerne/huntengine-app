import { describe, expect, it } from 'vitest';
import { buildToday, daysBetween, upcomingOpenDeadlines, whenText, type TodayHunt, type TodayTask } from '../today';

const H = (o: Partial<TodayHunt>): TodayHunt => ({
  key: 's:1', savedId: '1', state: 'NV', species: 'Elk', unit: '131', huntCode: '4161-131', year: 2027, stage: 'planned', otc: false,
  deadline: null, agencyDeadline: null, huntStart: null, huntEnd: null, ...o,
});
const posted = (date: string) => ({ kind: 'published' as const, date, time: '17:00', timezone: 'America/Anchorage', name: 'Main draw', year: 2027, source: 'https://x' });
const lastYear = (date: string) => ({ ...posted(date), kind: 'last_year' as const, year: 2026 });
const T = (o: Partial<TodayTask>): TodayTask => ({ id: 't1', title: 'Buy a CO elk point', due_on: null, kind: 'point', hunt_id: null, done_at: null, ...o });

describe('dates', () => {
  it('counts days and says them plainly', () => {
    expect(daysBetween('2026-11-04', '2026-11-10')).toBe(6);
    expect(whenText(0)).toBe('today');
    expect(whenText(1)).toBe('tomorrow');
    expect(whenText(6)).toBe('in 6 days');
    expect(whenText(-2)).toBe('2 days ago');
    expect(whenText(30)).toBe('in 4 weeks');
  });
});

describe('Today', () => {
  it('leads with the soonest posted deadline and never uses last year’s date', () => {
    const t = buildToday([
      H({ key: 'a', agencyDeadline: posted('2026-11-10') }),
      H({ key: 'b', state: 'WY', agencyDeadline: lastYear('2026-02-02') }),
    ], [], '2026-11-04');
    expect(t.lead).toMatchObject({ kind: 'deadline', days: 6, tone: 'stop' });
    expect(t.lead!.sub).toMatch(/in 6 days · 17:00 AK time/);
    expect([...t.thisWeek, ...t.comingUp, ...t.later, ...t.waiting].some((i) => i.key === 'd:b')).toBe(false);
  });
  it('prefers the hunter’s own deadline, and puts overdue tasks first', () => {
    const t = buildToday([H({ key: 'a', deadline: '2026-12-01', agencyDeadline: posted('2026-12-15') })], [T({ due_on: '2026-11-01' })], '2026-11-04');
    expect(t.lead).toMatchObject({ kind: 'task', tone: 'stop' });
    expect(t.lead!.sub).toMatch(/Overdue/);
    expect(t.comingUp[0]).toMatchObject({ key: 'd:a', date: '2026-12-01' });
  });
  it('counts down to opening day and asks for results and reports', () => {
    const t = buildToday([
      H({ key: 'tag', stage: 'drew', huntStart: '2026-11-12', huntEnd: '2026-11-20' }),
      H({ key: 'app', stage: 'applied', deadline: '2026-10-01' }),
      H({ key: 'done', stage: 'hunted' }),
    ], [], '2026-11-04');
    expect(t.lead).toMatchObject({ kind: 'hunt', days: 8 });
    expect(t.lead!.title).toMatch(/opens in 8 days/);
    expect(t.waiting.map((i) => i.kind).sort()).toEqual(['report', 'results']);
    expect(t.waiting.find((i) => i.kind === 'results')!.title).toMatch(/Did you draw/);
  });
  it('has nothing to lead with when nothing is due soon', () => {
    const t = buildToday([H({ agencyDeadline: posted('2027-03-01') })], [], '2026-11-04');
    expect(t.lead).toBeNull();
    expect(t.later).toHaveLength(1);
  });
  it('lists posted deadlines for states the hunter follows', () => {
    const u = upcomingOpenDeadlines([
      { state: 'ID', species: 'Elk', deadline: posted('2026-12-15') },
      { state: 'WY', species: 'Elk', deadline: lastYear('2026-02-02') },
      { state: 'UT', species: 'Deer', deadline: posted('2026-10-01') },
    ], '2026-11-04');
    expect(u.map((x) => x.state)).toEqual(['ID']);
  });
});
