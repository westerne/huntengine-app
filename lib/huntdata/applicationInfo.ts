// Official application links, prerequisites and published deadlines per state,
// from lib/huntdata/applications.json (researched from agency sources; see its
// checkedOn date). Only agency-published deadlines for the hunt's own season
// year are ever offered — earlier years' dates are reference only.

import type { OfficialInfo } from '@/app/season/[id]/ApplicationPanel';
import applications from './applications.json';

type Deadline = { group: string; deadline: string; timezone?: string | null; source: string; quote?: string };
type StateEntry = {
  applyUrl?: string | null;
  datesPageUrl?: string | null;
  prerequisites?: { text: string; source: string } | null;
  deadlines2027?: Deadline[];
};
type ApplicationsFile = { checkedOn: string | null; states: Record<string, StateEntry> };

const DATA = applications as unknown as ApplicationsFile;

const SPECIES_WORDS: Record<string, RegExp> = {
  'Deer': /\bdeer\b/i,
  'Mule Deer': /\bdeer\b/i,
  'Elk': /\belk\b/i,
  'Antelope': /\b(antelope|pronghorn)\b/i,
  'Moose': /\bmoose\b/i,
  'Bighorn Sheep': /\b(sheep|bighorn)\b/i,
  'Mountain Goat': /\bgoat\b/i,
  'Caribou': /\bcaribou\b/i,
  'Dall Sheep': /\b(sheep|dall)\b/i,
  'Bison': /\bbison\b/i,
  'Muskox': /\bmusk ?ox(en)?\b/i,
};

export function officialInfoFor(state: string, species: string, seasonYear: number): OfficialInfo {
  const e = DATA.states[state];
  if (!e) return { applyUrl: null, datesPageUrl: null, prerequisites: null, deadline: null };
  const list = seasonYear === 2027 ? e.deadlines2027 ?? [] : [];
  const word = SPECIES_WORDS[species];
  // Only a deadline group that names this species. (No "single deadline"
  // fallback: AZ's only 2027 date is its spring turkey/javelina/bear draw,
  // which must never be shown to an elk hunter.)
  const match = word ? list.find((d) => word.test(d.group)) : undefined;
  const [date, time] = match ? match.deadline.split('T') : [];
  return {
    applyUrl: e.applyUrl ?? null,
    datesPageUrl: e.datesPageUrl ?? null,
    prerequisites: e.prerequisites ?? null,
    deadline: match ? { date, time: time ?? null, timezone: match.timezone ?? null, group: match.group, source: match.source } : null,
  };
}
