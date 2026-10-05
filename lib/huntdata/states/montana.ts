import type { Hunt, SpeciesKey, StateInfo, StateModule } from '../schema';
import { stat } from '../util';
import { MONTANA_DRAW, MONTANA_DRAW_YEAR } from '@/app/api/strategy/montanaDraw';
import { harvestForHunt } from '../harvest';

export function montanaModule(info: StateInfo): StateModule {
  return {
    ...info,
    species: ['DEER', 'ELK', 'ANTELOPE', 'MOOSE', 'BIGHORNSHEEP', 'MTNGOAT'],
    hunts(species: SpeciesKey): Hunt[] {
      return (MONTANA_DRAW[species] || []).map((p) => ({
        state: 'MT',
        species,
        huntCode: p.lpt,
        unit: p.district,
        drawYear: MONTANA_DRAW_YEAR,
        dataQuality: 'official',
        draw: {
          resident: stat({ applicants: p.resApps, successPct: p.resSuccessPct }),
          nonresident: stat({ applicants: p.nrApps, successPct: p.nrSuccessPct }),
        },
        // FWP reports district totals only, so this is scope "unit".
        harvest: harvestForHunt('MT', species, p.lpt, p.district),
      }));
    },
  };
}
