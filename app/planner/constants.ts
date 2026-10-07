import type { Profile, PlannerFlags } from './types';

export const STATES = ['WY', 'CO', 'MT', 'ID', 'UT', 'AZ', 'NM', 'NE', 'ND', 'KS', 'NV', 'OK', 'CA', 'WA', 'OR'];
// Shown but not selectable until their draw data is wired in.
export const COMING_SOON_STATES = ['SD'];
export const SPECIES = ['Mule Deer', 'Elk', 'Antelope', 'Moose', 'Bighorn Sheep', 'Mountain Goat'];
// Species with data, for states that don't have all six (Arizona has no moose or goat).
const STATE_SPECIES: Record<string, string[]> = {
  AZ: ['Mule Deer', 'Elk', 'Antelope', 'Bighorn Sheep'],
  NM: ['Mule Deer', 'Elk', 'Antelope', 'Bighorn Sheep'],
  NE: ['Mule Deer', 'Elk', 'Antelope'],
  ND: ['Mule Deer', 'Elk', 'Antelope', 'Moose', 'Bighorn Sheep'],
  KS: ['Mule Deer', 'Antelope'],   // KDWP publishes no per-hunt elk draw stats
  NV: ['Mule Deer', 'Elk', 'Antelope', 'Bighorn Sheep', 'Mountain Goat'],
  OK: ['Mule Deer', 'Elk', 'Antelope'],
  CA: ['Mule Deer', 'Elk', 'Antelope', 'Bighorn Sheep'],
  WA: ['Mule Deer', 'Elk', 'Moose', 'Bighorn Sheep', 'Mountain Goat'],
  OR: ['Mule Deer', 'Elk', 'Antelope', 'Bighorn Sheep', 'Mountain Goat'],   // controlled hunts only; "deer" is mostly whitetail
};
export const speciesFor = (st: string) => STATE_SPECIES[st] ?? SPECIES;

// Switching state keeps the species if the new state has it, else its first.
export const withState = (p: Profile, st: string): Partial<Profile> => ({
  states: [st],
  species: speciesFor(st).includes(p.species) ? p.species : speciesFor(st)[0],
});

export const WEAPON_OPTIONS = ['Any', 'Rifle', 'Archery', 'Muzzleloader'];
export const FITNESS_LEVELS = ['Moderate', 'High', 'Elite'];
export const STYLE_OPTIONS = ['Hotel/Town Based', 'Base Camp/Truck', 'Backcountry'];
export const SEASON_WINDOWS = [
  { id: 'Early', label: 'Early (Aug-Sept)' },
  { id: 'Mid', label: 'Mid (Oct)' },
  { id: 'Late', label: 'Late (Nov)' },
];
export const EXPERIENCE_OPTIONS = [
  'First time hunting this species',
  'Hunted this species before',
  'Multiple years experience',
];
export const SACRIFICE_OPTIONS = [
  { value: 'yes', label: 'Hunt every year — best drawable option' },
  { value: 'no', label: 'Holding out for a trophy unit' },
  { value: 'middle', label: 'Somewhere in between' },
];
export const TIMELINES = ['This Year', '1-3 Years', '5 Years', '10+ Years'] as const;
export const SCOUTING_OPTIONS = ['None', 'Minimal', 'Several Days', 'Local'];

export const TROPHY_CONFIG: Record<string, { min: number; max: number; step: number; label: string } | null> = {
  'Elk': { min: 260, max: 380, step: 10, label: 'B&C Gross' },
  'Mule Deer': { min: 140, max: 200, step: 5, label: 'Typical Frames' },
  'Antelope': { min: 65, max: 80, step: 2, label: 'B&C Score' },
  'Bighorn Sheep': { min: 140, max: 180, step: 5, label: 'Total Score' },
  'Moose': null,
  'Mountain Goat': null,
};

// States with grizzly bear populations relevant to hunting
const GRIZZLY_STATES = ['WY', 'MT', 'ID'];
// States with special draw pools (Wyoming only currently)
const SPECIAL_DRAW_STATES = ['WY'];
// Pure random draws with no points at all.
const RANDOM_DRAW_STATES = ['ID', 'NM'];

export function plannerFlags(p: Profile): PlannerFlags {
  const selState = p.states[0];
  const isWyResidentNoPoints = selState === 'WY' && p.residency === 'Resident'
    && (p.species === 'Mule Deer' || p.species === 'Antelope' || p.species === 'Elk');
  return {
    selState,
    noPointSystem: isWyResidentNoPoints || RANDOM_DRAW_STATES.includes(selState),
    showGrizzlyOption: GRIZZLY_STATES.includes(selState),
    showSpecialDrawOption: SPECIAL_DRAW_STATES.includes(selState) && p.residency === 'Non-Resident',
  };
}

export const SCOUT_STEPS = ['scout-1', 'scout-2', 'scout-3', 'scout-4'] as const;
export const PLAN_STEPS = ['plan-1', 'plan-2', 'plan-3', 'plan-4'] as const;
