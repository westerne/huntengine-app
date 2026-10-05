import type { Hunt, SpeciesKey, StateInfo, StateModule } from '../schema';
import type { DrawFile } from '../draw/format';
import { harvestForHunt } from '../harvest';

// State module for any state whose draw results come from a generated
// lib/huntdata/draw/<st>.json (Arizona onward). Adding a state = import script +
// draw file + registry entry; SCOUT and BRIEF come from generic.ts.
export function drawFileModule(info: StateInfo, file: DrawFile): StateModule {
  const species = (Object.keys(file.species) as SpeciesKey[]).filter((s) => (file.species[s]?.length ?? 0) > 0);
  const cache = new Map<SpeciesKey, Hunt[]>();

  return {
    ...info,
    species,
    hunts(sp) {
      const hit = cache.get(sp);
      if (hit) return hit;
      const hunts: Hunt[] = (file.species[sp] ?? []).map((row) => ({
        state: info.code,
        species: sp,
        huntCode: row.huntCode,
        unit: row.unit,
        label: row.label,
        weapon: row.weapon,
        drawYear: file.year,
        dataQuality: 'official',
        tags: row.tags ?? null,
        draw: row.draw,
        pointLines: row.pointLines,
        harvest: harvestForHunt(info.code, sp, row.huntCode, row.unit, row.weapon),
      }));
      cache.set(sp, hunts);
      return hunts;
    },
  };
}
