// Today: what needs doing now, from the hunter's real dates (docs/SPEC_ARCHITECTURE.md §4).
// Pure — tested without a database. Nothing here is a guess about the calendar:
// items come from posted deadlines, the hunter's own dates and open tasks.

import type { Deadline } from './huntdata/apply';
import type { Stage } from './myHunts';

export type TodayHunt = {
  key: string; savedId: string | null; state: string; species: string; unit: string | null; huntCode: string | null;
  year: number | null; stage: Stage; otc: boolean;
  deadline: string | null;            // the hunter's own application deadline, if set
  agencyDeadline: Deadline | null;    // from the signed-off state data
  huntStart: string | null; huntEnd: string | null;
};
export type TodayTask = { id: string; title: string; due_on: string | null; kind: string; hunt_id: string | null; done_at: string | null };

export type TodayItem = {
  key: string;
  kind: 'deadline' | 'task' | 'hunt' | 'results' | 'report';
  title: string;
  sub: string;
  date: string | null;               // YYYY-MM-DD
  days: number | null;               // days from today (negative = overdue)
  href: string;
  tone: 'stop' | 'fair' | 'good' | 'long';
};

const DAY = 86400000;
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}
export function whenText(days: number): string {
  if (days < 0) return days === -1 ? 'yesterday' : `${-days} days ago`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

const name = (h: TodayHunt) => `${h.state} ${h.species.toLowerCase()}${h.huntCode ? ` · ${h.huntCode}` : h.unit ? ` · ${h.unit}` : ''}`;
const hrefOf = (h: TodayHunt) => (h.savedId ? `/season/${h.savedId}` : '/plan');

export function buildToday(hunts: TodayHunt[], tasks: TodayTask[], today: string) {
  const items: TodayItem[] = [];

  for (const h of hunts) {
    // 1. Applications still to send: the hunter's own date wins, else a posted one.
    if (['considering', 'planned', 'points'].includes(h.stage) && !h.otc) {
      const date = h.deadline ?? (h.agencyDeadline?.kind === 'published' ? h.agencyDeadline.date : null);
      if (date) {
        const days = daysBetween(today, date);
        if (days >= -3) {
          items.push({
            key: `d:${h.key}`, kind: 'deadline', title: `${h.stage === 'points' ? 'Buy your point' : 'Apply'}: ${name(h)}`,
            sub: `Deadline ${days < 0 ? 'passed' : whenText(days)}${h.agencyDeadline?.time && !h.deadline ? ` · ${h.agencyDeadline.time} ${tz(h.agencyDeadline.timezone)}` : ''}`,
            date, days, href: hrefOf(h), tone: days <= 7 ? 'stop' : days <= 30 ? 'fair' : 'long',
          });
        }
      }
    }
    // 2. Waiting on a draw: once the deadline has passed, nudge to record the result.
    if (h.stage === 'applied') {
      const passed = h.deadline ? daysBetween(today, h.deadline) < 0 : false;
      items.push({
        key: `r:${h.key}`, kind: 'results', title: `${passed ? 'Did you draw?' : 'Applied'} ${name(h)}`,
        sub: passed ? 'Record your result when the state posts it' : h.deadline ? `Draw closes ${whenText(daysBetween(today, h.deadline))}` : 'Waiting on the draw',
        date: null, days: null, href: hrefOf(h), tone: passed ? 'fair' : 'long',
      });
    }
    // 3. Tags in hand: count down to opening day.
    if (['drew', 'prepping'].includes(h.stage) && h.huntStart) {
      const days = daysBetween(today, h.huntStart);
      const endDays = h.huntEnd ? daysBetween(today, h.huntEnd) : days;
      if (endDays >= 0) {
        items.push({
          key: `h:${h.key}`, kind: 'hunt', title: days <= 0 ? `Hunting now: ${name(h)}` : `${name(h)} opens ${whenText(days)}`,
          sub: h.stage === 'drew' ? 'Start your hunt plan' : 'Finish your hunt plan and gear list',
          date: h.huntStart, days, href: hrefOf(h), tone: days <= 14 ? 'good' : 'long',
        });
      }
    }
    // 4. Hunt over, no report yet.
    if (h.stage === 'hunted') {
      items.push({ key: `p:${h.key}`, kind: 'report', title: `Write your report: ${name(h)}`, sub: 'And check the official harvest report', date: null, days: null, href: hrefOf(h), tone: 'fair' });
    }
  }

  // 5. Open tasks with a date (checklists, point purchases, official harvest reports).
  for (const t of tasks) {
    if (t.done_at || !t.due_on) continue;
    const days = daysBetween(today, t.due_on);
    if (days > 120) continue;
    items.push({
      key: `t:${t.id}`, kind: 'task', title: t.title, sub: days < 0 ? `Overdue · was due ${whenText(days)}` : `Due ${whenText(days)}`,
      date: t.due_on, days, href: t.hunt_id ? `/season/${t.hunt_id}` : '/season', tone: days < 0 ? 'stop' : days <= 7 ? 'stop' : days <= 30 ? 'fair' : 'long',
    });
  }

  const dated = items.filter((i) => i.days != null).sort((a, b) => a.days! - b.days!);
  const undated = items.filter((i) => i.days == null);
  // Lead: the soonest dated thing within two weeks (overdue first); otherwise
  // a report owed or a result to record.
  const lead = dated.find((i) => i.days! <= 14) ?? undated.find((i) => i.kind === 'report') ?? undated.find((i) => i.kind === 'results' && i.tone === 'fair') ?? null;
  const rest = items.filter((i) => i !== lead);
  return {
    lead,
    thisWeek: rest.filter((i) => i.days != null && i.days <= 14).sort((a, b) => a.days! - b.days!),
    comingUp: rest.filter((i) => i.days != null && i.days > 14 && i.days <= 90).sort((a, b) => a.days! - b.days!),
    later: rest.filter((i) => i.days != null && i.days > 90).sort((a, b) => a.days! - b.days!),
    waiting: rest.filter((i) => i.days == null),
  };
}

function tz(t: string | null): string {
  if (!t) return '';
  const m: Record<string, string> = { 'America/Denver': 'MT', 'America/Boise': 'MT', 'America/Phoenix': 'AZ time', 'America/Los_Angeles': 'PT', 'America/Chicago': 'CT', 'America/Anchorage': 'AK time' };
  return m[t] ?? t.replace('America/', '').replace('_', ' ');
}

// Posted deadlines for states the hunter follows but hasn't planned this
// season — "the clock is running" reminders.
export function upcomingOpenDeadlines(list: Array<{ state: string; species: string; deadline: Deadline | null }>, today: string) {
  return list
    .filter((x) => x.deadline?.kind === 'published' && daysBetween(today, x.deadline.date) >= 0)
    .map((x) => ({ ...x, days: daysBetween(today, x.deadline!.date) }))
    .sort((a, b) => a.days - b.days);
}
