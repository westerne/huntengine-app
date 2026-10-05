import type { Hunt, SpeciesKey, StateInfo, StateModule } from '../schema';
import { parsePct, stat } from '../util';
import { HUNT_DATA, type UnitStats } from '@/app/api/strategy/data';
import { harvestForHunt } from '../harvest';

// Utah is still hand-entered (ROADMAP Phase 1: replace with DWR draw odds), so
// every hunt is marked "estimated" and carries no draw year.
export function utahModule(info: StateInfo): StateModule {
  return {
    ...info,
    species: ['DEER', 'ELK', 'ANTELOPE', 'MOOSE', 'BIGHORNSHEEP'],
    hunts(species: SpeciesKey): Hunt[] {
      const units: Record<string, UnitStats> = HUNT_DATA[`UTAH_${species}`] || {};
      return Object.entries(units)
        .filter(([, u]) => u.utahDrawInfo)
        .map(([key, u]) => {
          const d = u.utahDrawInfo!;
          return {
            state: 'UT',
            species,
            huntCode: key,
            unit: key,
            label: d.drawType,
            drawYear: null,
            dataQuality: 'estimated',
            otc: d.drawType === 'general-season',
            draw: {
              resident: null,
              nonresident: stat({ tags: d.nrTagsApprox, successPct: parsePct(d.randomOddsNR) }),
            },
            harvest: harvestForHunt('UT', species, key, key),
          };
        });
    },
  };
}
