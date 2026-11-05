// Validation for My Hunt Calendar items, shared by the API routes.

import { PLAN_KINDS, type PlanKind } from './calendar';
import { canonicalSpecies } from './species';
import { stateCodeOf } from './sheetImport';

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export type PlanItemInput = {
  kind: PlanKind; state: string; species: string; unit: string | null; hunt_code: string | null;
  label: string | null; target_year: number | null; notes: string | null;
};

// Full item (create / import). Unknown states or species are refused, not guessed.
export function cleanPlanItem(b: Record<string, unknown>): { item: PlanItemInput } | { error: string } {
  const state = typeof b.state === 'string' ? stateCodeOf(b.state) : null;
  if (!state) return { error: 'Pick one of the 17 states.' };
  const species = typeof b.species === 'string' ? canonicalSpecies(b.species, state) : null;
  if (!species) return { error: 'Pick a species.' };
  const kind = PLAN_KINDS.includes(b.kind as PlanKind) ? (b.kind as PlanKind) : null;
  if (!kind) return { error: 'Pick draw target, bucket list or OTC.' };
  const y = b.target_year == null || b.target_year === '' ? null : Number(b.target_year);
  if (y != null && !(Number.isInteger(y) && y >= 2000 && y <= 2100)) return { error: 'Year must be like 2028.' };
  return {
    item: {
      kind, state, species, target_year: y,
      unit: str(b.unit, 80), hunt_code: str(b.hunt_code, 60), label: str(b.label, 200), notes: str(b.notes, 2000),
    },
  };
}

// Plan entries are saved_hunts rows with source 'plan' (migration 0007).
export function planRow(i: PlanItemInput, userId: string) {
  return {
    user_id: userId, season_year: i.target_year, state: i.state, species: i.species, unit: i.unit, hunt_code: i.hunt_code,
    label: i.label, notes: i.notes, kind: i.kind, status: 'planned', source: 'plan',
  };
}
export function planPatchRow(p: Partial<PlanItemInput>) {
  const { target_year, ...rest } = p;
  return target_year === undefined ? rest : { ...rest, season_year: target_year };
}
// The same hunt twice in one year is one record (the saved_hunts unique indexes).
export const sameHuntKey = (r: { season_year: number | null; state: string; species: string; unit: string | null; hunt_code: string | null }) =>
  r.season_year == null ? null : [r.season_year, r.state, r.species, r.hunt_code ? `c:${r.hunt_code}` : `u:${r.unit ?? ''}`].join('|');

// Partial edits (move a year, change kind, notes).
export function cleanPlanPatch(b: Record<string, unknown>): { patch: Partial<PlanItemInput> } | { error: string } {
  const patch: Partial<PlanItemInput> = {};
  if (b.kind !== undefined) {
    if (!PLAN_KINDS.includes(b.kind as PlanKind)) return { error: 'Unknown type.' };
    patch.kind = b.kind as PlanKind;
  }
  if (b.target_year !== undefined) {
    const y = b.target_year === null || b.target_year === '' ? null : Number(b.target_year);
    if (y != null && !(Number.isInteger(y) && y >= 2000 && y <= 2100)) return { error: 'Year must be like 2028.' };
    patch.target_year = y;
  }
  for (const k of ['unit', 'hunt_code', 'label', 'notes'] as const) {
    if (b[k] !== undefined) patch[k] = str(b[k], k === 'notes' ? 2000 : 200);
  }
  if (!Object.keys(patch).length) return { error: 'Nothing to change.' };
  return { patch };
}
