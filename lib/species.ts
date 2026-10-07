// Species names as the app shows and stores them. "Deer" covers mule deer and
// whitetail — many states (NE, KS, OK, SD, ND, WA…) draw both, and the hunt's
// own description says which. "Mule Deer" is the old name; it's still accepted
// everywhere and stored as "Deer".

import type { SpeciesKey } from './huntdata/schema';

export const DEER = 'Deer';

export function normalizeSpecies(s: string): string;
export function normalizeSpecies(s: string | null | undefined): string | null;
export function normalizeSpecies(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return /^mule\s*deer$/i.test(t) ? DEER : t;
}

export const SPECIES_NAME: Record<SpeciesKey, string> = {
  DEER: 'Deer', ELK: 'Elk', ANTELOPE: 'Antelope', MOOSE: 'Moose', BIGHORNSHEEP: 'Bighorn Sheep',
  MTNGOAT: 'Mountain Goat', CARIBOU: 'Caribou', DALLSHEEP: 'Dall Sheep', BISON: 'Bison', MUSKOX: 'Muskox',
};

// What hunters actually type in a spreadsheet.
const WORDS: Array<[RegExp, SpeciesKey]> = [
  [/^(mule ?deer|muley?s?|deer|white-?tail(ed)?( deer)?|black-?tail(ed)?( deer)?|sitka.*deer|coues( deer)?)$/i, 'DEER'],
  [/^(elk|bull elk|cow elk|roosevelt elk|rocky mountain elk)$/i, 'ELK'],
  [/^(antelope|pronghorn( antelope)?|speedgoat)$/i, 'ANTELOPE'],
  [/^(moose|shiras( moose)?|alaska(-yukon)? moose)$/i, 'MOOSE'],
  [/^(bighorn( sheep)?|desert bighorn( sheep)?|rocky mountain bighorn( sheep)?|california bighorn( sheep)?)$/i, 'BIGHORNSHEEP'],
  [/^(mountain goat|goat|rocky mountain goat)$/i, 'MTNGOAT'],
  [/^(caribou)$/i, 'CARIBOU'],
  [/^(dall( sheep)?|dall's sheep)$/i, 'DALLSHEEP'],
  [/^(bison|buffalo|wood bison|plains bison)$/i, 'BISON'],
  [/^(musk ?ox(en)?)$/i, 'MUSKOX'],
];

// Name → key. "Sheep" alone means Dall sheep in Alaska, bighorn elsewhere.
export function speciesKeyOf(raw: string | null | undefined, state?: string | null): SpeciesKey | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  if (/^sheep$/i.test(t)) return state?.toUpperCase() === 'AK' ? 'DALLSHEEP' : 'BIGHORNSHEEP';
  for (const [re, key] of WORDS) if (re.test(t)) return key;
  const byName = (Object.entries(SPECIES_NAME) as Array<[SpeciesKey, string]>).find(([, n]) => n.toLowerCase() === t.toLowerCase());
  return byName ? byName[0] : null;
}

export function canonicalSpecies(raw: string | null | undefined, state?: string | null): string | null {
  const k = speciesKeyOf(raw, state);
  return k ? SPECIES_NAME[k] : null;
}
