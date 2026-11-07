// How many males a herd carries: the state's bulls per 100 cows (or bucks per
// 100 does) for the herd or unit a hunt is in. It's the closest public measure
// of how many older males survive hunting season, which is what a hunter
// asking about "bigger bulls" usually wants. It is not antler size, and
// everything that shows it says so.
//
// One file per state, each built from that agency's own report:
//   CO  scripts/draw/buildCOHerd.mjs  CPW Population and Sex Ratio Estimates (by herd/DAU)
//   AZ  scripts/draw/buildAZHerd.mjs  AZGFD survey summaries (by unit, with animals counted)

import co from './herd/co.json';
import az from './herd/az.json';

type HerdUnit = {
  malesPer100: number;
  herd?: string;        // the herd it belongs to, where the figure is for a herd ("DAU 12")
  population?: number;  // the herd's estimated size
  counted?: number;     // animals classified, where the figure is from a survey
};
type HerdFile = {
  source: { name: string; url: string };
  // when: finishes "26 bulls per 100 cows ___", e.g. "after the 2025 season".
  species: Record<string, { year: number; when: string; units: Record<string, HerdUnit> }>;
};

const FILES: Record<string, HerdFile> = { CO: co as HerdFile, AZ: az as HerdFile };
const AGENCY: Record<string, string> = { CO: 'CPW', AZ: 'AZGFD' };

const NAMES: Record<string, [string, string]> = {
  ELK: ['bulls', 'cows'],
  DEER: ['bucks', 'does'],
  ANTELOPE: ['bucks', 'does'],
};

// Under this many animals classified, the ratio is said to be a small survey.
export const SMALL_SURVEY = 100;

export type Herd = {
  malesPer100: number;
  males: string;           // "bulls"
  females: string;         // "cows"
  herd: string | null;     // "herd unit (DAU) 12"
  population: number | null;
  counted: number | null;
  year: number;
  source: string;
  agency: string;          // "CPW"
  text: string;            // "26 bulls per 100 cows after the 2025 season"
};

const normUnit = (u: string) => String(u).trim().toUpperCase().replace(/^(UNIT|GMU)\s+/, '').replace(/^0+(?=\d)/, '');

export function herdFor(state: string, speciesKey: string, unit: string | null | undefined): Herd | null {
  const sp = FILES[state]?.species[speciesKey];
  const names = NAMES[speciesKey];
  if (!sp || !names || !unit) return null;
  const u = sp.units[normUnit(unit)];
  if (!u) return null;
  const [males, females] = names;
  const small = u.counted != null && u.counted < SMALL_SURVEY ? ` (a small survey: ${u.counted} animals)` : '';
  return {
    malesPer100: u.malesPer100, males, females,
    herd: u.herd ?? null,
    population: u.population ?? null,
    counted: u.counted ?? null,
    year: sp.year,
    source: FILES[state].source.name,
    agency: AGENCY[state] ?? state,
    text: `${u.malesPer100} ${males} per 100 ${females} ${sp.when}${small}`,
  };
}

// Where the figure comes from, in a few words: "CPW, herd unit (DAU) 12".
export const herdWhere = (h: Herd) => [h.agency, h.herd].filter(Boolean).join(', ');

// Said wherever the ratio is shown, so it's never read as antler size.
export const HERD_CAVEAT = 'More males per 100 females usually means more older males in the herd. It is not a measure of antler size.';
