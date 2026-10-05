// Shape of a generated draw file for states added through lib/huntdata:
// lib/huntdata/draw/<st>.json, written by scripts/draw/build<ST>Draw.mjs from
// the agency's published draw results. The state module turns each row into a
// Hunt (schema.ts); SCOUT and BRIEF use the shared builders in generic.ts.

import type { DrawStat, PointLine, SpeciesKey, StateCode, Weapon } from '../schema';

export type DrawRow = {
  huntCode: string;          // agency hunt number, e.g. AZ "3001"
  unit: string;              // primary unit / GMU, same spelling as the boundary source ("5A", "27")
  units?: string[];          // every unit the hunt covers, when it spans several
  label?: string;            // agency description, e.g. "Bull elk — General"
  weapon?: Weapon;
  season?: { open: string; close: string }; // ISO dates, only if published with the draw data
  tags?: number | null;      // total tags when not split by residency
  draw: {
    resident: DrawStat | null;
    nonresident: DrawStat | null;
  };
  pointLines?: Partial<Record<'resident' | 'nonresident', PointLine[]>>;
};

export type DrawFile = {
  state: StateCode;
  year: number;              // draw year the results describe
  source: { name: string; url: string };
  notes?: string;            // caveats: how successPct was computed, pools merged, etc.
  species: Partial<Record<SpeciesKey, DrawRow[]>>;
};
