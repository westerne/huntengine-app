import type { Hunt, SpeciesKey, StateInfo, StateModule, Weapon } from '../schema';
import { parsePct, stat, sumKnown } from '../util';
import { WYOMING_DEER_UNITS } from '@/app/api/strategy/wyodeerdata';
import { WYOMING_ELK_UNITS } from '@/app/api/strategy/wyoelkdata';
import { WYOMING_ANTELOPE_UNITS } from '@/app/api/strategy/wyoantelopedata';

// WGFD demand-report shape shared by the deer, elk and antelope datasets.
type WyoDrawYear = {
  year: number;
  resident: { quota: number; firstChoiceApplicants: number; approxOdds: string | null };
  nr_regular: { quota: number; minPoints: number | null; oddsAtMin: string | null };
  nr_special: { quota: number; minPoints: number | null; oddsAtMin: string | null };
  nr_random: { quota: number; firstChoiceApplicants: number; approxOdds: string | null };
  nr_special_random: { quota: number; firstChoiceApplicants: number; approxOdds: string | null };
};

type WyoProduct = { drawHistory?: WyoDrawYear[]; productType?: string; huntType?: string; huntTypeLabel?: string };

// Type 9 = archery everywhere in WY; antelope type 0 = muzzleloader/handgun.
function weaponFor(species: SpeciesKey, key: string): Weapon | undefined {
  const type = key.includes('-') ? key.split('-').pop() : undefined;
  if (type === '9') return 'archery';
  if (species === 'ANTELOPE' && type === '0') return 'muzzleloader';
  if (type && /^\d+$/.test(type)) return 'rifle';
  return undefined;
}

function toHunt(species: SpeciesKey, key: string, p: WyoProduct): Hunt | null {
  // UNIT_IN_REGION deer entries are geography inside a general region, not a
  // separate license — their draw lives on the parent region.
  if (p.productType === 'UNIT_IN_REGION') return null;
  const history = [...(p.drawHistory ?? [])].sort((a, b) => b.year - a.year);
  const latest = history[0];
  if (!latest) return null;

  const pools = [
    { name: 'regular', tags: latest.nr_regular.quota, applicants: null, successPct: parsePct(latest.nr_regular.oddsAtMin), minPoints: latest.nr_regular.minPoints },
    { name: 'special', tags: latest.nr_special.quota, applicants: null, successPct: parsePct(latest.nr_special.oddsAtMin), minPoints: latest.nr_special.minPoints },
    { name: 'random', tags: latest.nr_random.quota, applicants: latest.nr_random.firstChoiceApplicants, successPct: parsePct(latest.nr_random.approxOdds) },
    { name: 'special-random', tags: latest.nr_special_random.quota, applicants: latest.nr_special_random.firstChoiceApplicants, successPct: parsePct(latest.nr_special_random.approxOdds) },
  ];

  return {
    state: 'WY',
    species,
    huntCode: key,
    unit: key.includes('-') ? key.slice(0, key.lastIndexOf('-')) : key,
    label: p.huntTypeLabel ?? p.huntType,
    weapon: weaponFor(species, key),
    drawYear: latest.year,
    dataQuality: 'official',
    draw: {
      resident: stat({
        tags: latest.resident.quota,
        applicants: latest.resident.firstChoiceApplicants,
        successPct: parsePct(latest.resident.approxOdds),
      }),
      nonresident: stat({
        tags: sumKnown(pools.map((x) => x.tags)),
        minPoints: latest.nr_regular.minPoints,
        pools,
      }),
    },
  };
}

const SOURCES: Partial<Record<SpeciesKey, Record<string, WyoProduct>>> = {
  DEER: WYOMING_DEER_UNITS as unknown as Record<string, WyoProduct>,
  ELK: WYOMING_ELK_UNITS as unknown as Record<string, WyoProduct>,
  ANTELOPE: WYOMING_ANTELOPE_UNITS as unknown as Record<string, WyoProduct>,
};

export function wyomingModule(info: StateInfo): StateModule {
  return {
    ...info,
    species: ['DEER', 'ELK', 'ANTELOPE'],
    hunts(species) {
      const src = SOURCES[species];
      if (!src) return [];
      return Object.entries(src)
        .map(([key, p]) => toHunt(species, key, p))
        .filter((h): h is Hunt => h !== null);
    },
  };
}
