// Post-hunt reports (Milestone 4). Pure functions — tested without a database.
// A report is the hunter's private record. It never files anything with a
// state agency; official harvest reporting is a separate task.

export const PRESSURE = ['low', 'moderate', 'high'] as const;
export type Pressure = (typeof PRESSURE)[number];

export const TEXT_FIELDS = [
  'animal', 'measurements', 'sightings', 'access_issues', 'conditions', 'worked', 'didnt_work', 'change_next',
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export const FIELD_LABEL: Record<TextField, string> = {
  animal: 'What you took',
  measurements: 'Measurements (optional)',
  sightings: 'What you saw',
  access_issues: 'Access problems',
  conditions: 'Weather and conditions',
  worked: 'What worked',
  didnt_work: 'What didn’t work',
  change_next: 'What you’d change next time',
};

export type HuntReport = {
  hunt_id: string;
  started_on: string | null;
  ended_on: string | null;
  days_hunted: number | null;
  harvested: boolean | null;
  pressure: Pressure | null;
  photos: string[];
  completed_at: string | null;
  updated_at?: string;
} & Record<TextField, string | null>;

export type ReportFields = Omit<HuntReport, 'hunt_id' | 'photos' | 'completed_at' | 'updated_at'>;

const isDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

// Validate the hunter's form. Unknown fields are ignored; nothing is guessed.
export function parseReport(body: Record<string, unknown>): { fields: ReportFields } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const date = (k: 'started_on' | 'ended_on') => {
    const v = body[k];
    if (v == null || v === '') return null;
    if (!isDate(v)) { errors[k] = 'Use a valid date'; return null; }
    return v;
  };
  const started_on = date('started_on');
  const ended_on = date('ended_on');
  if (started_on && ended_on && ended_on < started_on) errors.ended_on = 'End date is before the start date';

  let days_hunted: number | null = null;
  if (body.days_hunted != null && body.days_hunted !== '') {
    const n = Number(body.days_hunted);
    if (!Number.isInteger(n) || n < 0 || n > 120) errors.days_hunted = 'Days must be 0–120';
    else days_hunted = n;
  }

  const harvested = body.harvested === true || body.harvested === 'yes' ? true
    : body.harvested === false || body.harvested === 'no' ? false : null;
  const pressure = PRESSURE.includes(body.pressure as Pressure) ? (body.pressure as Pressure) : null;

  const text = {} as Record<TextField, string | null>;
  for (const k of TEXT_FIELDS) {
    const v = body[k];
    text[k] = typeof v === 'string' && v.trim() ? v.trim().slice(0, 4000) : null;
  }
  // Nothing taken means nothing to describe.
  if (harvested !== true) { text.animal = null; text.measurements = null; }

  if (Object.keys(errors).length) return { errors };
  return { fields: { started_on, ended_on, days_hunted, harvested, pressure, ...text } };
}

// A report can be finished once the outcome is known; the rest is optional.
export function missingToComplete(f: Pick<ReportFields, 'harvested'>): string[] {
  return f.harvested == null ? ['harvested'] : [];
}

// Days between two dates, inclusive — a suggestion, the hunter can change it.
export function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end || !isDate(start) || !isDate(end) || end < start) return null;
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}

// Photo paths must sit in this hunter's folder for this hunt — never anyone
// else's. Storage policies enforce the same rule on upload.
export function cleanPhotoPaths(raw: unknown, userId: string, huntId: string): string[] {
  if (!Array.isArray(raw)) return [];
  const prefix = `${userId}/${huntId}/`;
  return [...new Set(raw.filter((p): p is string =>
    typeof p === 'string' && p.startsWith(prefix) && /^[\w./-]+$/.test(p) && !p.includes('..')))].slice(0, 12);
}

export type PastReport = {
  season_year: number;
  state: string;
  species: string;
  unit: string;
  hunt_code: string | null;
  report: Pick<HuntReport, 'harvested' | 'days_hunted' | 'pressure' | 'worked' | 'didnt_work' | 'change_next' | 'access_issues' | 'conditions'>;
};

// The hunter's own lessons, for future plans. Most relevant first: same unit,
// then same species in the state, then newest. Clearly labeled as the
// hunter's notes so the model treats them as context, not instructions.
export function lessonsBlock(past: PastReport[], hunt: { state: string; species: string; unit: string }, max = 3): string | null {
  const unit = (u: string) => u.trim().toLowerCase();
  const rank = (p: PastReport) =>
    (p.state === hunt.state && p.species === hunt.species && unit(p.unit) === unit(hunt.unit) ? 0 : p.state === hunt.state && p.species === hunt.species ? 1 : 2);
  const useful = past
    .filter((p) => p.state === hunt.state || p.species === hunt.species)
    .filter((p) => p.report.worked || p.report.didnt_work || p.report.change_next || p.report.access_issues)
    .sort((a, b) => rank(a) - rank(b) || b.season_year - a.season_year)
    .slice(0, max);
  if (!useful.length) return null;
  const clip = (s: string | null) => (s ? s.replace(/\s+/g, ' ').slice(0, 400) : null);
  return useful.map((p) => {
    const r = p.report;
    const head = `${p.season_year} ${p.state} ${p.species}, unit ${p.unit}${p.hunt_code ? ` (hunt ${p.hunt_code})` : ''}: ${r.harvested ? 'harvested' : r.harvested === false ? 'no harvest' : 'outcome not recorded'}${r.days_hunted != null ? `, ${r.days_hunted} days` : ''}${r.pressure ? `, ${r.pressure} pressure` : ''}`;
    const lines = [
      r.worked && `worked: ${clip(r.worked)}`,
      r.didnt_work && `didn't work: ${clip(r.didnt_work)}`,
      r.change_next && `change next time: ${clip(r.change_next)}`,
      r.access_issues && `access problems: ${clip(r.access_issues)}`,
    ].filter(Boolean);
    return `- ${head}. ${lines.join('; ')}`;
  }).join('\n');
}
