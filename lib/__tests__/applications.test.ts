import { describe, expect, it } from 'vitest';
import { daysUntil, defaultChecklist, dueLabel, dueStatus, pointTaskTitle, progress, sortOpenTasks } from '../applications';
import { officialInfoFor } from '../huntdata/applicationInfo';

const today = new Date(2026, 9, 7); // Oct 7 2026, local

describe('deadlines', () => {
  it('counts calendar days and labels them', () => {
    expect(daysUntil('2026-10-07', today)).toBe(0);
    expect(daysUntil('2026-10-10', today)).toBe(3);
    expect(daysUntil('2026-10-01', today)).toBe(-6);
    expect(dueLabel('2026-10-07', today)).toBe('Due today');
    expect(dueLabel('2026-10-08', today)).toBe('Due tomorrow');
    expect(dueLabel('2026-10-01', today)).toBe('6 days overdue');
    expect(dueLabel(null, today)).toBe('No date');
    expect([dueStatus('2026-10-01', today), dueStatus('2026-10-07', today), dueStatus('2026-10-15', today), dueStatus('2026-12-01', today), dueStatus(null, today)])
      .toEqual(['overdue', 'today', 'soon', 'later', 'none']);
  });
});

describe('tasks', () => {
  it('sorts open tasks: dated (earliest first) before undated; done ones dropped', () => {
    const t = (id: string, due_on: string | null, done = false, position = 0) => ({ id, due_on, done_at: done ? 'x' : null, position });
    const out = sortOpenTasks([t('a', null), t('b', '2026-11-01'), t('c', '2026-10-01'), t('d', '2026-09-01', true)]);
    expect(out.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });

  it('progress counts real items only', () => {
    expect(progress([{ done_at: 'x' }, { done_at: null }, { done_at: null }])).toEqual({ done: 1, total: 3 });
    expect(progress([])).toEqual({ done: 0, total: 0 });
  });

  it('checklist is steps, not claimed facts', () => {
    const list = defaultChecklist('AZ', 'Elk');
    expect(list).toHaveLength(5);
    expect(list.map((x) => x.title).join(' ')).not.toMatch(/\$\d|\bdue (on|by) \d/i);
    expect(pointTaskTitle('CO', 'Elk', 2027)).toBe('Buy a CO elk point for 2027');
  });
});

describe('official info', () => {
  it('never offers another year\'s deadline', () => {
    expect(officialInfoFor('AZ', 'Elk', 2026).deadline).toBeNull();
    expect(officialInfoFor('ZZ', 'Elk', 2027)).toEqual({ applyUrl: null, datesPageUrl: null, prerequisites: null, deadline: null });
  });
});

describe('official info from the researched file', () => {
  it('links every live state to its official application site', () => {
    for (const st of ['WY', 'ID', 'CO', 'MT', 'UT', 'AZ', 'NM', 'NE']) {
      expect(officialInfoFor(st, 'Elk', 2027).applyUrl, st).toMatch(/^https:\/\//);
    }
  });
  it("never offers Arizona's spring turkey/bear deadline to an elk or deer hunter", () => {
    expect(officialInfoFor('AZ', 'Elk', 2027).deadline).toBeNull();
    expect(officialInfoFor('AZ', 'Mule Deer', 2027).deadline).toBeNull();
  });
});
