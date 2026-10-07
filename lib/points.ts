// Point-balance validation, shared by /api/points and the calendar import.

import { canonicalSpecies } from './species';
import { stateCodeOf } from './sheetImport';
import { currentSeasonYear } from './hunts';

export type PointRow = { user_id: string; state: string; species: string; points: number; as_of_year: number };

export function cleanPoints(list: unknown[], userId: string): { list: PointRow[] } | { error: string } {
  const out: PointRow[] = [];
  for (const r of list.slice(0, 200) as Array<Record<string, unknown>>) {
    const state = typeof r.state === 'string' ? stateCodeOf(r.state) : null;
    const species = state && typeof r.species === 'string' ? canonicalSpecies(r.species, state) : null;
    const points = Number(r.points);
    if (!state || !species || !Number.isFinite(points) || points < 0 || points > 40) {
      return { error: 'Each balance needs a state, a species and points from 0 to 40.' };
    }
    out.push({ user_id: userId, state, species, points, as_of_year: currentSeasonYear() });
  }
  return { list: out };
}
