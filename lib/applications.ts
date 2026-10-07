// Application workflow rules (Milestone 2). Pure functions — tested without a database.

export const DECISIONS = ['apply', 'build_points', 'watch', 'pass'] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_LABEL: Record<Decision, string> = {
  apply: 'Apply',
  build_points: 'Build points',
  watch: 'Watch',
  pass: 'Pass',
};

export const DECISION_HELP: Record<Decision, string> = {
  apply: 'Apply for this hunt in the coming draw.',
  build_points: 'Don’t apply for this hunt this year — buy a point to build toward it.',
  watch: 'Keep it on your list without applying this year.',
  pass: 'Not for you — archive it (it stays in your history).',
};

export type Application = {
  hunt_id: string;
  decision: Decision;
  deadline_on: string | null;      // YYYY-MM-DD
  deadline_time: string | null;    // HH:MM[:SS]
  deadline_tz: string | null;
  deadline_source: 'agency' | 'hunter' | null;
  choice_rank: number | null;
  other_choices: string | null;
  fee_note: string | null;
  submitted_at: string | null;
  confirmation_number: string | null;
  notes: string | null;
};

export type Task = {
  id: string;
  hunt_id: string | null;
  kind: 'application' | 'point' | 'prep' | 'custom' | 'harvest_report';
  title: string;
  due_on: string | null;
  state: string | null;
  species: string | null;
  season_year: number | null;
  position: number;
  done_at: string | null;
};

// Checklist added when a hunter decides to apply. Every item is a step to
// take, not a fact we claim — fees, prerequisites and deadlines are checked
// on the agency site, because we don't publish ones we haven't verified.
export function defaultChecklist(state: string, species: string): Array<{ title: string; position: number }> {
  return [
    `Check this year's ${state} deadline and fees on the official site`,
    `Confirm the license or prerequisites ${state} requires to apply`,
    `Decide your ${species.toLowerCase()} hunt choices and their order`,
    'Submit your application on the official site',
    'Record your confirmation number here',
  ].map((title, position) => ({ title, position }));
}

export function pointTaskTitle(state: string, species: string, year: number): string {
  return `Buy a ${state} ${species.toLowerCase()} point for ${year}`;
}

// Whole days from today to a YYYY-MM-DD date (negative = past). Compared as
// calendar dates so a deadline "today" is 0 regardless of the hour.
export function daysUntil(dateIso: string, today = new Date()): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - now) / 86_400_000);
}

export type DueStatus = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export function dueStatus(dateIso: string | null, today = new Date()): DueStatus {
  if (!dateIso) return 'none';
  const n = daysUntil(dateIso, today);
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (n <= 14) return 'soon';
  return 'later';
}

export function dueLabel(dateIso: string | null, today = new Date()): string {
  if (!dateIso) return 'No date';
  const n = daysUntil(dateIso, today);
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return '1 day overdue';
  if (n === 0) return 'Due today';
  if (n === 1) return 'Due tomorrow';
  return `Due in ${n} days`;
}

// My Season "Next up": open tasks, overdue first, then by date; undated last.
export function sortOpenTasks<T extends Pick<Task, 'due_on' | 'done_at' | 'position'>>(tasks: T[]): T[] {
  return tasks
    .filter((t) => !t.done_at)
    .sort((a, b) => {
      if (a.due_on && b.due_on) return a.due_on.localeCompare(b.due_on) || a.position - b.position;
      if (a.due_on) return -1;
      if (b.due_on) return 1;
      return a.position - b.position;
    });
}

// Checklist progress from real items only — never an invented percentage.
export function progress(tasks: Array<Pick<Task, 'done_at'>>): { done: number; total: number } {
  return { done: tasks.filter((t) => t.done_at).length, total: tasks.length };
}
