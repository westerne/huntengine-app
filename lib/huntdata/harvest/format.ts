// Shape of every generated harvest file: lib/huntdata/harvest/<st>.json,
// written by scripts/harvest/build<ST>Harvest.mjs from the agency's published
// harvest statistics. Adapters attach these rows to hunts by huntCode first,
// then by unit.

import type { SpeciesKey, StateCode, Weapon } from '../schema';

export type HarvestRow = {
  unit: string;              // unit / GMU / hunt area / district, same spelling as the draw data
  huntCode?: string;         // agency hunt code / license type when harvest is reported per hunt
  weapon?: Weapon;           // when reported per weapon/season
  residency?: 'resident' | 'nonresident'; // only if the agency splits by residency
  label?: string;            // e.g. "Type 1", "2nd rifle", "General any-weapon"
  hunters: number | null;    // hunters afield
  harvest: number | null;    // animals taken
  successPct: number;        // hunter success, 0–100 (harvest / hunters, or agency figure)
  daysPerHarvest?: number | null;
};

export type HarvestFile = {
  state: StateCode;
  year: number;              // hunting season the stats describe (newest, if species differ)
  // Per-species season when they differ (e.g. MT elk 2024, deer 2025).
  speciesYear?: Partial<Record<SpeciesKey, number>>;
  source: { name: string; url: string };
  notes?: string;            // caveats: survey-based, general seasons only, etc.
  species: Partial<Record<SpeciesKey, HarvestRow[]>>;
};
