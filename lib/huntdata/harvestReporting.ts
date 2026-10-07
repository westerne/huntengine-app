// Official post-hunt harvest-reporting rules per state, from
// lib/huntdata/harvestReporting.json (researched from agency sources only; see
// its checkedOn date). The app's own hunt report never satisfies these.

import data from './harvestReporting.json';

export type HarvestRule = {
  species: string[];
  applies: string;
  type: 'mandatory_report' | 'mandatory_check' | 'survey';
  deadline: string | null;
  consequence: string | null;
  source: string;
  quote?: string;
};

export type HarvestReportingInfo = {
  // yes: a verified mandatory report/check covers this species
  // survey: only a voluntary/random survey was found
  // unknown: nothing verified for this species — tell them to check
  required: 'yes' | 'survey' | 'unknown';
  rules: HarvestRule[];
  reportUrl: string | null;
  summary: string | null;
  checkedOn: string | null;
};

type FileShape = { checkedOn: string | null; states: Record<string, { rules?: HarvestRule[]; reportUrl?: string | null; summary?: string | null }> };
const DATA = data as unknown as FileShape;

export const SPECIES_KEY: Record<string, string> = {
  'Mule Deer': 'DEER', 'Elk': 'ELK', 'Antelope': 'ANTELOPE', 'Moose': 'MOOSE', 'Bighorn Sheep': 'BIGHORNSHEEP', 'Mountain Goat': 'MTNGOAT',
};

export function harvestReportingFor(state: string, species: string): HarvestReportingInfo {
  const e = DATA.states?.[state];
  const key = SPECIES_KEY[species] ?? species.toUpperCase();
  const rules = (e?.rules ?? []).filter((r) => r.species?.includes(key));
  const required = rules.some((r) => r.type !== 'survey') ? 'yes' : rules.length ? 'survey' : 'unknown';
  return {
    required,
    rules,
    // The state's reporting link can be species-specific (CO/MT point at
    // their bighorn pages), so only offer it when a rule covers this species.
    reportUrl: required === 'yes' ? e?.reportUrl ?? null : null,
    summary: e?.summary ?? null,
    checkedOn: DATA.checkedOn ?? null,
  };
}

// The task title for My Season. Plain about what we know and don't.
export function harvestTaskTitle(state: string, species: string, info: HarvestReportingInfo): string | null {
  if (info.required === 'yes') return `File your official ${state} ${species.toLowerCase()} harvest report (if your tag requires it)`;
  if (info.required === 'unknown') return `Check whether ${state} requires a harvest report for your ${species.toLowerCase()} tag`;
  return null; // survey only: nothing to file unless contacted
}
