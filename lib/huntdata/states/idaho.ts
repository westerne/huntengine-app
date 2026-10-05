import type { Hunt, SpeciesKey, StateInfo, StateModule } from '../schema';
import { stat } from '../util';
import { IDAHO_DRAW, IDAHO_DRAW_YEAR } from '@/app/api/strategy/idahoDraw';

export function idahoModule(info: StateInfo): StateModule {
  return {
    ...info,
    species: ['DEER', 'ELK', 'ANTELOPE', 'MOOSE', 'BIGHORNSHEEP', 'MTNGOAT'],
    hunts(species: SpeciesKey): Hunt[] {
      return (IDAHO_DRAW[species] || []).map((h) => ({
        state: 'ID',
        species,
        huntCode: String(h.hunt),
        unit: h.area,
        drawYear: IDAHO_DRAW_YEAR,
        dataQuality: 'official',
        tags: h.tags,
        applicants: h.applicants,
        draw: {
          resident: stat({ applicants: h.resApplicants, successPct: h.resOddsPct }),
          nonresident: stat({ applicants: h.nonResApplicants, successPct: h.nonResOddsPct }),
        },
      }));
    },
  };
}
