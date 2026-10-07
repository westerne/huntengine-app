import type { Hunt, SpeciesKey, StateInfo, StateModule } from '../schema';
import type { DrawFile } from '../draw/format';
import { harvestForHunt } from '../harvest';
import type { Weapon } from '../schema';

// Some draw files leave weapon unset (e.g. Nebraska "Statewide Archery"); read
// it from the label so a rifle search doesn't surface archery-only permits.
export function weaponFromLabel(label: string | undefined): Weapon | undefined {
  const l = (label ?? '').toLowerCase();
  if (/\barchery\b|\bbow\b/.test(l)) return 'archery';
  if (/muzzleloader|muzzle-loader/.test(l)) return 'muzzleloader';
  if (/\brifle\b|\bfirearm\b|any legal (weapon|sporting arm)/.test(l)) return 'rifle';
  return undefined;
}

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
        weapon: row.weapon ?? weaponFromLabel(`${row.label ?? ''} ${row.huntCode}`),
        drawYear: file.year,
        dataQuality: 'official',
        tags: row.tags ?? null,
        applicants: row.applicants ?? null,
        draw: row.draw,
        otc: row.otc || undefined,
        openTo: row.openTo,
        season: row.season,
        pointLines: row.pointLines,
        harvest: harvestForHunt(info.code, sp, row.huntCode, row.unit, row.weapon ?? weaponFromLabel(`${row.label ?? ''} ${row.huntCode}`)),
      }));
      cache.set(sp, hunts);
      return hunts;
    },
  };
}
