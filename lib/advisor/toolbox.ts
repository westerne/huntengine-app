// What the model is told it can call, and what runs when it does
// (docs/SPEC_ADVISOR.md §5). Lookups return data with sources; the two
// "asks first" tools only propose — they come back to the hunter as buttons,
// and nothing is written until they tap one.

import { cleanPlanItem, type PlanItemInput } from '../planItems';
import { cleanFactText } from './facts';
import { shortDate } from '../huntdata/apply';
import { toStateCode } from '../huntdata/registry';
import type { ToolSpec } from './model';
import {
  compareHunts, deadlines, feesAndRules, getHunt, harvestReporting, searchHunts, yearlyCost,
  type Situation, type ToolResult,
} from './tools';
import { mySituation, myReports, type PlanSnapshot, type ReportRow } from './situation';

export type Action =
  | { kind: 'add_to_plan'; label: string; item: PlanItemInput }
  | { kind: 'reminder'; label: string; task: { title: string; due_on: string | null; state: string | null; species: string | null } }
  | { kind: 'remember'; label: string; fact: string };

export type Toolbox = {
  specs: ToolSpec[];
  call(name: string, args: Record<string, unknown>, evidence: string[]): Promise<{ result: ToolResult<unknown>; status: string; action?: Action }>;
};

const S = { type: 'string' } as const;
const stateSpecies = {
  state: { ...S, description: 'State code or name, e.g. "NV"' },
  species: { ...S, description: 'e.g. "elk", "mule deer", "pronghorn"' },
};
const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required, additionalProperties: false });

export const TOOL_SPECS: ToolSpec[] = [
  { name: 'my_situation', description: "The hunter's home state, points by state and species (with projections), and every hunt on their plan with its stage, deadline and outlook. Call this first for any question about their own plan or points.", parameters: obj({}, []) },
  { name: 'search_hunts', description: 'Hunts in one state and species within reach at the hunter\'s points, plus ones that come within reach if they keep applying. Odds are theirs only when oddsAreYours is true. For a month ("a November hunt") pass month, e.g. "Nov": seasons that run in that month. For how often they want to hunt pass maxPointsToDraw: hunts that drew at or below that many points last year ("every 2-3 years" = 2, since drawing resets points to 0). Matches come back in filtered; recommend from them and say how many matched.', parameters: obj({ ...stateSpecies, weapon: { type: 'string', enum: ['any', 'rifle', 'archery', 'muzzleloader'] }, month: S, maxPointsToDraw: { type: 'integer' } }, ['state', 'species']) },
  { name: 'get_hunt', description: 'One hunt by hunt code: odds at the hunter\'s points, cutoff, year-by-year outlook if they keep applying, hunter success, season. With a unit and no code, lists every hunt in that unit (seasons, weapons, points to draw, chance this year).', parameters: obj({ ...stateSpecies, huntCode: S, unit: S }, ['state', 'species']) },
  { name: 'compare_hunts', description: '2 to 4 hunts side by side, with the pick and why.', parameters: obj({ hunts: { type: 'array', maxItems: 4, items: obj({ ...stateSpecies, huntCode: S }, ['state', 'species', 'huntCode']) } }, ['hunts']) },
  { name: 'deadlines', description: 'The application deadline for a state and species, with its status: posted, expected, or last year\'s date.', parameters: obj({ ...stateSpecies, seasonYear: { type: 'integer' } }, ['state', 'species']) },
  { name: 'fees_and_rules', description: 'Posted fees and what the hunter needs before applying (licenses, hunter ed), with the application link.', parameters: obj(stateSpecies, ['state', 'species']) },
  { name: 'yearly_cost', description: 'What it costs per year to apply or buy points for a set of state/species: posted fees only, tags listed separately as "if drawn", anything not on file listed as missing.', parameters: obj({ items: { type: 'array', items: obj({ ...stateSpecies, mode: { type: 'string', enum: ['apply', 'points'] } }, ['state', 'species']) } }, ['items']) },
  { name: 'harvest_reporting', description: "A state's official harvest reporting rule for a species.", parameters: obj(stateSpecies, ['state', 'species']) },
  { name: 'my_reports', description: "Lessons from the hunter's own finished hunt reports (what worked, what didn't, what they'd change).", parameters: obj({ state: S, species: S }, []) },
  { name: 'propose_add_to_plan', description: 'Offer to add a hunt to the hunter\'s plan. Shows a button; nothing is saved unless they tap it.', parameters: obj({ ...stateSpecies, kind: { type: 'string', enum: ['target', 'bucket', 'otc'] }, year: { type: 'integer' }, huntCode: S, unit: S }, ['state', 'species', 'kind']) },
  { name: 'propose_remember', description: 'Offer to remember a lasting fact about the hunter (time off, budget, weapon, limits, goals) for future conversations. Shows a button; nothing is saved unless they tap it. Keep it short and in their words.', parameters: obj({ fact: S }, ['fact']) },
  { name: 'propose_reminder', description: 'Offer to set a reminder. Shows a button; nothing is saved unless they tap it. dueOn must be a date from a lookup this turn (YYYY-MM-DD), or omitted.', parameters: obj({ title: S, dueOn: S, state: S, species: S }, ['title']) },
];

const STATUS: Record<string, string> = {
  my_situation: 'Reading your plan',
  search_hunts: 'Searching hunts',
  get_hunt: 'Looking up the hunt',
  compare_hunts: 'Comparing hunts',
  deadlines: 'Checking deadlines',
  fees_and_rules: 'Checking fees',
  yearly_cost: 'Adding up fees',
  harvest_reporting: 'Checking reporting rules',
  my_reports: 'Reading your reports',
  propose_add_to_plan: 'Getting a plan entry ready',
  propose_reminder: 'Getting a reminder ready',
  propose_remember: 'Noting that',
};

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const fail = (reason: string) => ({ ok: false as const, reason });
const proposed = { ok: true as const, data: { proposed: true, note: 'Shown to the hunter as a button. Nothing is saved unless they tap it.' }, sources: [] };

export function makeToolbox(sit: Situation, deps: { plan: PlanSnapshot | null; reports: () => Promise<ReportRow[]>; today: string }): Toolbox {
  return {
    specs: TOOL_SPECS,
    async call(name, a, evidence) {
      const status = STATUS[name] ?? 'Looking that up';
      const state = String(a.state ?? '');
      const species = String(a.species ?? '');
      switch (name) {
        case 'my_situation':
          return { status, result: deps.plan ? mySituation(deps.plan) : fail("Couldn't load your plan just now.") };
        case 'search_hunts':
          return { status, result: searchHunts({ state, species, weapon: str(a.weapon), month: str(a.month), maxPointsToDraw: typeof a.maxPointsToDraw === 'number' ? a.maxPointsToDraw : null }, sit) };
        case 'get_hunt':
          return { status, result: getHunt({ state, species, huntCode: str(a.huntCode), unit: str(a.unit) }, sit) };
        case 'compare_hunts': {
          const hunts = (Array.isArray(a.hunts) ? a.hunts : []).map((h: Record<string, unknown>) => ({ state: String(h?.state ?? ''), species: String(h?.species ?? ''), huntCode: String(h?.huntCode ?? '') }));
          return { status, result: compareHunts({ hunts }, sit) };
        }
        case 'deadlines': {
          const result = deadlines({ state, species, seasonYear: Number.isInteger(a.seasonYear) ? (a.seasonYear as number) : undefined }, sit);
          if (!result.ok || result.data.status === 'none') return { status, result };
          // Every deadline comes with a reminder button, so the hunter gets one
          // whether or not the model thinks to offer it. Dated only when the
          // date is this season's; last year's date becomes "check when it's posted".
          const d = result.data;
          const what = `${d.state} ${d.species.toLowerCase()}`;
          const due = d.date && d.status !== 'last_year' && d.date >= deps.today ? d.date : null;
          const action: Action = {
            kind: 'reminder',
            label: due ? `Remind me: ${what} deadline (${shortDate(due)})` : `Remind me to check when ${d.state} posts its ${d.species.toLowerCase()} deadline`,
            task: { title: due ? `Apply: ${what} deadline` : `Check when ${d.state} posts its ${d.species.toLowerCase()} deadline`, due_on: due, state: d.state, species: d.species },
          };
          return { status, result: { ...result, data: { ...d, button: 'A reminder button for this deadline is shown under your answer.' } }, action };
        }
        case 'fees_and_rules':
          return { status, result: feesAndRules({ state, species }, sit) };
        case 'yearly_cost': {
          const items = (Array.isArray(a.items) ? a.items : []).slice(0, 20).map((i: Record<string, unknown>) => ({
            state: String(i?.state ?? ''), species: String(i?.species ?? ''), mode: i?.mode === 'points' ? 'points' as const : 'apply' as const,
          }));
          return { status, result: yearlyCost({ items }, sit) };
        }
        case 'harvest_reporting':
          return { status, result: harvestReporting({ state, species }) };
        case 'my_reports': {
          let rows: ReportRow[];
          try { rows = await deps.reports(); } catch { return { status, result: fail("Couldn't load your reports just now.") }; }
          return { status, result: myReports(rows, { state: str(a.state), species: str(a.species) }) };
        }
        case 'propose_add_to_plan': {
          const c = cleanPlanItem({ state, species, kind: a.kind, target_year: a.year ?? null, hunt_code: str(a.huntCode), unit: str(a.unit) });
          if ('error' in c) return { status, result: fail(c.error) };
          const i = c.item;
          const what = `${i.state} ${i.species.toLowerCase()}${i.hunt_code ? ` ${i.hunt_code}` : i.unit ? ` unit ${i.unit}` : ''}`;
          return { status, result: proposed, action: { kind: 'add_to_plan', label: `Add ${what}${i.target_year ? ` for ${i.target_year}` : ''} to my plan`, item: i } };
        }
        case 'propose_remember': {
          const fact = cleanFactText(a.fact);
          if (!fact) return { status, result: fail('Nothing to remember.') };
          return { status, result: proposed, action: { kind: 'remember', label: `Remember: “${fact}”`, fact } };
        }
        case 'propose_reminder': {
          const title = str(a.title)?.slice(0, 120);
          if (!title) return { status, result: fail('A reminder needs a title.') };
          // A due date is a claim like any other: it has to have come from a
          // lookup. And last year's date makes no reminder.
          const raw = str(a.dueOn);
          const iso = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw >= deps.today ? raw : null;
          const grounded = iso && evidence.some((e) => e.includes(iso)) ? iso : null;
          return {
            status, result: grounded || !raw ? proposed : { ...proposed, data: { ...proposed.data, note: `${proposed.data.note} The date was dropped: it was past or didn't come from a lookup.` } },
            action: { kind: 'reminder', label: grounded ? `Remind me: ${title} (${shortDate(grounded)})` : `Remind me: ${title}`, task: { title, due_on: grounded, state: str(a.state) ? toStateCode(String(a.state)) : null, species: str(a.species) } },
          };
        }
        default:
          return { status, result: fail(`There's no tool called ${name}.`) };
      }
    },
  };
}
