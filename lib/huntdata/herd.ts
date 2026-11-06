// How many males a herd carries: the state's post-hunt bulls per 100 cows (or
// bucks per 100 does) for the herd a unit belongs to. It's the closest public
// measure of how many older males survive hunting season, which is what a
// hunter asking about "bigger bulls" usually wants. It is not antler size, and
// everything that shows it says so.
//
// Colorado only for now (CPW's Population and Sex Ratio Estimates, built by
// scripts/draw/buildCOHerd.mjs).

import co from './herd/co.json';

type HerdFile = {
  source: { name: string; url: string };
  species: Record<string, { year: number; units: Record<string, { dau: string; population: number; malesPer100: number }> }>;
};

const FILES: Record<string, HerdFile> = { CO: co as HerdFile };

// Males, females, and when CPW counted (pronghorn are estimated before the hunt).
const RATIO_NAME: Record<string, [string, string, 'after' | 'before']> = {
  ELK: ['bulls', 'cows', 'after'],
  DEER: ['bucks', 'does', 'after'],
  ANTELOPE: ['bucks', 'does', 'before'],
};

export type Herd = {
  malesPer100: number;
  males: string;       // "bulls"
  females: string;     // "cows"
  herd: string;        // "herd unit (DAU) 12"
  population: number;  // the whole herd's estimate, not the unit's
  year: number;
  source: string;
  text: string;        // "26 bulls per 100 cows after the 2025 season"
};

export function herdFor(state: string, speciesKey: string, unit: string | null | undefined): Herd | null {
  const sp = FILES[state]?.species[speciesKey];
  const names = RATIO_NAME[speciesKey];
  if (!sp || !names || !unit) return null;
  const u = sp.units[String(unit).replace(/^0+(?=\d)/, '')];
  if (!u) return null;
  const [males, females, when] = names;
  return {
    malesPer100: u.malesPer100, males, females,
    herd: `herd unit (DAU) ${u.dau}`,
    population: u.population,
    year: sp.year,
    source: FILES[state].source.name,
    text: `${u.malesPer100} ${males} per 100 ${females} ${when} the ${sp.year} season`,
  };
}

// Said wherever the ratio is shown, so it's never read as antler size.
export const HERD_CAVEAT = 'More males per 100 females usually means more older males in the herd. It is not a measure of antler size.';
