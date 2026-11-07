// How many older males a herd carries, in the measure each state publishes:
// males per 100 females (bulls per 100 cows, bucks per 100 does), or where a
// state manages its limited-entry hunts by it, the average age of harvested
// males. Either is the closest public stand-in for what a hunter asking about
// "bigger bulls" wants. Neither is antler size, and everything that shows them
// says so.
//
// One file per state, each built from that agency's own report:
//   CO  scripts/draw/buildCOHerd.mjs  CPW Population and Sex Ratio Estimates (by herd/DAU)
//   AZ  scripts/draw/buildAZHerd.mjs  AZGFD survey summaries (by unit, with animals counted)
//   UT  scripts/draw/buildUTHerd.mjs  DWR Big Game Annual Report (deer ratios; elk and
//                                     pronghorn average harvest age, limited-entry units)
//   WY  scripts/draw/buildWYHerd.mjs  WGFD Job Completion Reports (by herd, keyed by hunt area)

import co from './herd/co.json';
import az from './herd/az.json';
import ut from './herd/ut.json';
import wy from './herd/wy.json';

type HerdUnit = {
  malesPer100?: number;
  avgAge?: number;      // average age in years of harvested males
  objective?: string;   // the agency's goal for that measure on the unit ("6.5-7.0")
  herd?: string;        // the herd or report unit the figure is for ("herd unit (DAU) 12")
  population?: number;  // the herd's estimated size
  counted?: number;     // animals classified, where the figure is from a survey
  when?: string;        // this unit's own "when", where it differs from the species'
};
type HerdFile = {
  source: { name: string; url: string };
  // when: finishes the sentence, e.g. "after the 2025 season".
  species: Record<string, { year: number; when: string; units: Record<string, HerdUnit> }>;
};

const FILES: Record<string, HerdFile> = { CO: co as HerdFile, AZ: az as HerdFile, UT: ut as HerdFile, WY: wy as HerdFile };
const AGENCY: Record<string, string> = { CO: 'CPW', AZ: 'AZGFD', UT: 'DWR', WY: 'WGFD' };
export const HERD_STATES = Object.keys(FILES);

const NAMES: Record<string, [string, string]> = {
  ELK: ['bulls', 'cows'],
  DEER: ['bucks', 'does'],
  ANTELOPE: ['bucks', 'does'],
};

// Under this many animals classified, the ratio is said to be a small survey.
export const SMALL_SURVEY = 100;

export type Herd = {
  malesPer100: number | null;
  avgAge: number | null;
  score: number;           // whichever measure it has, for ranking units within a state
  label: string;           // short name of the measure: "Bulls / 100 cows", "Avg. bull age"
  males: string;           // "bulls"
  females: string;         // "cows"
  herd: string | null;     // "herd unit (DAU) 12"
  population: number | null;
  counted: number | null;
  year: number;
  source: string;
  agency: string;          // "CPW"
  text: string;            // "26 bulls per 100 cows after the 2025 season"
  short: string;           // "26 bulls / 100 cows", "bulls avg 9.1 yrs"
  caveat: string;
};

const normUnit = (u: string) => String(u).trim().toUpperCase().replace(/^(UNIT|GMU)\s+/, '').replace(/^0+(?=\d)/, '');
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function herdFor(state: string, speciesKey: string, unit: string | null | undefined): Herd | null {
  const sp = FILES[state]?.species[speciesKey];
  const names = NAMES[speciesKey];
  if (!sp || !names || !unit) return null;
  // Most states key by unit number; Utah keys by unit name. A hunt over
  // several areas ("23-26") takes their herd when every area is in the same one.
  const parts = String(unit).split('-').map(normUnit);
  const shared = parts.length > 1 && parts.every((p) => sp.units[p] && sp.units[p].herd != null && sp.units[p].herd === sp.units[parts[0]].herd) ? sp.units[parts[0]] : undefined;
  const u = sp.units[normUnit(unit)] ?? sp.units[String(unit).trim()] ?? shared;
  if (!u || (u.malesPer100 == null && u.avgAge == null)) return null;
  const [males, females] = names;
  const agency = AGENCY[state] ?? state;
  const goal = u.objective ? `; ${agency}'s goal for the unit is ${u.objective}` : '';
  const small = u.counted != null && u.counted < SMALL_SURVEY ? ` (a small survey: ${u.counted} animals)` : '';
  const age = u.malesPer100 == null;
  return {
    malesPer100: u.malesPer100 ?? null,
    avgAge: u.avgAge ?? null,
    score: (u.malesPer100 ?? u.avgAge)!,
    label: age ? `Avg. ${males.replace(/s$/, '')} age` : `${cap(males)} / 100 ${females}`,
    males, females,
    herd: u.herd ?? null,
    population: u.population ?? null,
    counted: u.counted ?? null,
    year: sp.year,
    source: FILES[state].source.name,
    agency,
    text: age
      ? `harvested ${males} averaged ${u.avgAge} years old ${u.when ?? sp.when}${goal}`
      : `${u.malesPer100} ${males} per 100 ${females} ${u.when ?? sp.when}${small}${goal}`,
    short: age ? `harvested ${males} avg ${u.avgAge} yrs` : `${u.malesPer100} ${males} / 100 ${females}`,
    caveat: age ? AGE_CAVEAT : HERD_CAVEAT,
  };
}

// Where the figure comes from, in a few words: "CPW, herd unit (DAU) 12".
export const herdWhere = (h: Herd) => [h.agency, h.herd].filter(Boolean).join(', ');

// Said wherever a figure is shown, so it's never read as antler size.
export const HERD_CAVEAT = 'More males per 100 females usually means more older males in the herd. It is not a measure of antler size.';
export const AGE_CAVEAT = 'Older males are usually bigger, but age is not a measure of antler size.';
