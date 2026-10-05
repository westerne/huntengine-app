import type { Hunt, SpeciesKey, StateInfo, StateModule } from '../schema';
import { stat, weaponFromLetter } from '../util';
import { COLORADO_DRAW, COLORADO_DRAW_YEAR } from '@/app/api/strategy/coloradoDraw';
import { harvestForHunt } from '../harvest';

export function coloradoModule(info: StateInfo): StateModule {
  return {
    ...info,
    species: ['DEER', 'ELK', 'ANTELOPE', 'MOOSE', 'BIGHORNSHEEP', 'MTNGOAT'],
    hunts(species: SpeciesKey): Hunt[] {
      return (COLORADO_DRAW[species] || []).map((h) => ({
        state: 'CO',
        species,
        huntCode: h.code,
        unit: String(h.unit),
        // CPW hunt codes end in the method letter: R rifle, A archery, M muzzleloader.
        weapon: weaponFromLetter(h.code.slice(-1)),
        drawYear: COLORADO_DRAW_YEAR,
        dataQuality: 'official',
        applicants: h.apps,
        draw: {
          resident: stat({ successPct: h.resSuccessPct }),
          nonresident: stat({ successPct: h.nonResSuccessPct }),
        },
        harvest: harvestForHunt('CO', species, h.code, String(h.unit), weaponFromLetter(h.code.slice(-1))),
      }));
    },
  };
}
