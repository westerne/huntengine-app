// Planner ↔ account helpers (only used when Supabase accounts are configured).

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Profile } from './types';
import { FITNESS_LEVELS, STATES, STYLE_OPTIONS, speciesFor, withState } from './constants';

export type Me =
  | { accounts: false }
  | { accounts: true; signedIn: boolean; member: false }
  | { accounts: true; signedIn: true; member: true; profile: any | null; points: Array<{ state: string; species: string; points: number }> };

// Fill the questionnaire from saved preferences. Only sets what the member
// saved; anything else keeps the planner default, and every field stays
// editable for this search.
export function prefillFromAccount(base: Profile, me: Extract<Me, { member: true }>): Profile {
  const p = me.profile ?? {};
  let next: Profile = { ...base };
  if (p.home_state && STATES.includes(p.home_state)) next = { ...next, ...withState(next, p.home_state) };
  const interest = (p.species_interests ?? []).find((s: string) => speciesFor(next.states[0]).includes(s));
  if (interest) next.species = interest;
  const weapons = (p.weapons ?? []).filter((w: string) => ['Rifle', 'Archery', 'Muzzleloader'].includes(w));
  if (weapons.length) next.weapons = weapons;
  const styles = (p.hunt_styles ?? []).filter((s: string) => STYLE_OPTIONS.includes(s));
  if (styles.length) next.huntStyles = styles;
  if (FITNESS_LEVELS.includes(p.fitness)) next.fitness = p.fitness;
  if (p.experience) next.pastExperience = p.experience;
  if (typeof p.grizzly_ok === 'boolean') next.grizzlyComfort = p.grizzly_ok;
  // Residency: resident only in the member's home state.
  next.residency = p.home_state && p.home_state === next.states[0] ? 'Resident' : p.home_state ? 'Non-Resident' : next.residency;
  next.points = pointsFor(me.points, next.species);
  return next;
}

// The planner keeps one points number per state for the current species.
export function pointsFor(rows: Array<{ state: string; species: string; points: number }>, species: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) if (r.species === species) out[r.state] = Number(r.points) || 0;
  return out;
}

// A recommendation card → POST /api/hunts body.
export function savePayload(rec: any, profile: Profile, extra: { status?: string; source?: string } = {}) {
  const { states, species, residency, points, weapons, seasons, drawTimeline, sacrificeTrophy } = profile;
  return {
    state: rec.state && rec.state.length <= 3 ? rec.state : states[0],
    species,
    unit: String(rec.unit ?? profile.unit ?? ''),
    huntCode: rec.huntCode ?? null,
    label: rec.label ?? null,
    status: extra.status,
    source: extra.source ?? 'scout',
    searchInputs: { states, species, residency, points, weapons, seasons, drawTimeline, sacrificeTrophy },
    recommendation: rec.currentOdds || rec.whyItFits
      ? { currentOdds: rec.currentOdds, tier: rec.tier, whyItFits: rec.whyItFits, tradeoffs: rec.tradeoffs, season: rec.season }
      : null,
  };
}
