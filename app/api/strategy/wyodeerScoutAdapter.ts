// wyodeerScoutAdapter.ts
// Flattens WYOMING_DEER_UNITS (V2 schema) into a scout-ready dataset.
//
// Input: WYOMING_DEER_UNITS — a mix of GENERAL_REGION, UNIT_IN_REGION,
//        LIMITED_QUOTA, and LIMITED_QUOTA_WHITETAIL entries (~162 total).
//
// Output: 46 "hunt products" — the things a hunter can actually apply for.
//   - 17 GENERAL_REGION entries, each with a nested notableUnits[] carrying
//     the UNIT_IN_REGION children's detail for whyItFits enrichment
//   - 29 LIMITED_QUOTA entries
//   - (LIMITED_QUOTA_WHITETAIL excluded from SCOUT by default — opt-in via flag)
//
// SCOUT sees real draw decisions, not geographic substructure.

import { WYOMING_DEER_UNITS, WyomingDeerUnit } from "./wyodeerdata";

export type ScoutNotableUnit = {
  areaNumber: number;
  unitName: string;          // the V2 key, e.g. "143-GEN"
  typical: string;
  topEnd: string;
  trait: string;
  terrain: string;           // 2-4 word descriptor extracted from trait
  publicPct?: number;
  wildernessPct?: number;
  buckPerHundredDoe?: number;
};

export type ScoutDeerEntry = {
  unit: string;              // region key like "G" or LQ key like "141-1"
  productType: "GENERAL_REGION" | "LIMITED_QUOTA" | "LIMITED_QUOTA_WHITETAIL";
  areaNumbers: number[];
  typical: string;
  topEnd: string;
  trait: string;
  description: string;
  huntType: string;
  seasons: WyomingDeerUnit["seasons"];

  // Habitat
  publicPct: number | null;
  wildernessPct: number | null;
  buckPerHundredDoe: number | null;
  devNotes: string | null;

  // Draw data (always populated — LQ/REGION own it, flattened here)
  residentOdds: string;
  residentOdds2025: string;
  residentOdds2024: string;
  residentQuota: number | string;
  residentApplicants: number | string;
  nrRegularMinPoints: number | string;
  nrRegularOddsAtMin: string;
  nrSpecialMinPoints: number | string;
  nrSpecialOddsAtMin: string;
  nrRandomOdds: string;
  nrRandomOdds2025: string;
  nrRandomOdds2024: string;
  nrSpecialRandomOdds: string;
  nrSpecialRandomQuota: number | string;
  nrSpecialRandomApplicants: number | string;
  dataYear: number | string;
  priorYear: number | string;

  // Geographic drill-down (only for GENERAL_REGION entries)
  notableUnits: ScoutNotableUnit[];

  // Compatibility flags (carried through for SCOUT's guide/grizzly filters)
  requiresGuide: boolean;
  grizzlyPresence: boolean;
};

/**
 * Extract a short 2-4 word terrain descriptor from a trait string.
 * Trait strings follow the pattern "Name — description; more detail" — this
 * grabs the first meaningful phrase after the em-dash.
 */
function extractTerrain(trait: string): string {
  if (!trait) return "";
  // Split on em-dash, take the second half; then split on semicolon, take first
  const parts = trait.split("—");
  const afterDash = (parts[1] ?? parts[0] ?? "").split(";")[0].trim();
  // Truncate to ~5 words
  const words = afterDash.split(/\s+/).slice(0, 5).join(" ");
  return words.replace(/[.,]$/, "");
}

/**
 * Determine grizzly presence by geography. Wyoming grizzly habitat covers
 * NW Wyoming roughly: Regions F, H, plus the Wyoming Range (G). This is a
 * rough approximation — field audit recommended.
 */
function inferGrizzlyPresence(unit: WyomingDeerUnit): boolean {
  const lat = unit.coords?.lat ?? 0;
  const lng = unit.coords?.lng ?? 0;
  // NW Wyoming grizzly zone: roughly lat > 43.0 AND lng < -109.5
  return lat > 43.0 && lng < -109.5;
}

/**
 * For NR hunters, Wilderness Area units require a licensed guide (Wyoming
 * state law, not federal). This is a rough proxy — wildernessPct > 30
 * indicates a unit where wilderness access is non-trivial.
 */
function inferRequiresGuide(unit: WyomingDeerUnit): boolean {
  return (unit.wildernessPct ?? 0) >= 30;
}

/**
 * Sort drawHistory descending by year and return latest + prior.
 */
function splitHistory(unit: WyomingDeerUnit) {
  const sorted = [...(unit.drawHistory ?? [])].sort((a, b) => b.year - a.year);
  return { latest: sorted[0] ?? null, prior: sorted[1] ?? null };
}

/**
 * Build the scout-ready entry for one hunt product.
 * For GENERAL_REGION entries, nests UNIT_IN_REGION children as notableUnits.
 */
function buildScoutEntry(key: string, unit: WyomingDeerUnit): ScoutDeerEntry {
  const { latest, prior } = splitHistory(unit);

  // Collect notable units if this is a GENERAL_REGION
  const notableUnits: ScoutNotableUnit[] = [];
  if (unit.productType === "GENERAL_REGION") {
    for (const [childKey, childUnit] of Object.entries(WYOMING_DEER_UNITS)) {
      if (
        childUnit.productType === "UNIT_IN_REGION" &&
        childUnit.parentRegion === key &&
        (childUnit.areaNumbers?.length ?? 0) > 0
      ) {
        notableUnits.push({
          areaNumber: childUnit.areaNumbers![0],
          unitName: childKey,
          typical: childUnit.typical,
          topEnd: childUnit.topEnd,
          trait: childUnit.trait,
          terrain: extractTerrain(childUnit.trait),
          publicPct: childUnit.publicPct,
          wildernessPct: childUnit.wildernessPct,
          buckPerHundredDoe: childUnit.buckPerHundredDoe,
        });
      }
    }
    // Sort by area number for stable output
    notableUnits.sort((a, b) => a.areaNumber - b.areaNumber);
  }

  return {
    unit: key,
    productType: unit.productType as "GENERAL_REGION" | "LIMITED_QUOTA" | "LIMITED_QUOTA_WHITETAIL",
    areaNumbers: unit.areaNumbers ?? [],
    typical: unit.typical,
    topEnd: unit.topEnd,
    trait: unit.trait,
    description: unit.description,
    huntType: unit.huntType,
    seasons: unit.seasons,

    publicPct: unit.publicPct ?? null,
    wildernessPct: unit.wildernessPct ?? null,
    buckPerHundredDoe: unit.buckPerHundredDoe ?? null,
    devNotes: unit.devNotes ?? null,

    residentOdds:     latest?.resident.approxOdds ?? "N/A",
    residentOdds2025: latest?.resident.approxOdds ?? "N/A",
    residentOdds2024: prior?.resident.approxOdds ?? "N/A",
    residentQuota:    latest?.resident.quota ?? "N/A",
    residentApplicants: latest?.resident.firstChoiceApplicants ?? "N/A",

    nrRegularMinPoints:   latest?.nr_regular.minPoints ?? "N/A",
    nrRegularOddsAtMin:   latest?.nr_regular.oddsAtMin ?? "N/A",
    nrSpecialMinPoints:   latest?.nr_special.minPoints ?? "N/A",
    nrSpecialOddsAtMin:   latest?.nr_special.oddsAtMin ?? "N/A",
    nrRandomOdds:         latest?.nr_random.approxOdds ?? "N/A",
    nrRandomOdds2025:     latest?.nr_random.approxOdds ?? "N/A",
    nrRandomOdds2024:     prior?.nr_random.approxOdds ?? "N/A",
    nrSpecialRandomOdds:  latest?.nr_special_random.approxOdds ?? "N/A",
    nrSpecialRandomQuota: latest?.nr_special_random.quota ?? "N/A",
    nrSpecialRandomApplicants: latest?.nr_special_random.firstChoiceApplicants ?? "N/A",

    dataYear:  latest?.year ?? "N/A",
    priorYear: prior?.year ?? "N/A",

    notableUnits,

    requiresGuide: inferRequiresGuide(unit),
    grizzlyPresence: inferGrizzlyPresence(unit),
  };
}

export type BuildOptions = {
  includeWhitetail?: boolean; // default false — Type 3 tags excluded unless species === whitetail
};

/**
 * Main export: build the scout-ready dataset.
 * Returns 46 entries by default (17 regions + 29 LQ mule deer).
 */
export function buildWyomingDeerScoutDataset(options: BuildOptions = {}): ScoutDeerEntry[] {
  const { includeWhitetail = false } = options;
  const entries: ScoutDeerEntry[] = [];

  for (const [key, unit] of Object.entries(WYOMING_DEER_UNITS)) {
    if (unit.productType === "UNIT_IN_REGION") continue; // absorbed into parent
    if (unit.productType === "LIMITED_QUOTA_WHITETAIL" && !includeWhitetail) continue;

    entries.push(buildScoutEntry(key, unit));
  }

  return entries;
}

/**
 * Helper for the planner / BRIEF mode: resolve a user-entered unit string
 * to the correct hunt product, handling bare-number inputs and dereferencing
 * UNIT_IN_REGION entries to their parent region for draw data.
 */
export function resolveWyoDeerUnit(rawInput: string): {
  key: string | null;
  unit: WyomingDeerUnit | null;
  drawSource: WyomingDeerUnit | null;
} {
  const input = rawInput.trim();

  // 1. Exact match (handles "A", "G", "128-1", "128-GEN", "11-12-13-14-3")
  let key = Object.keys(WYOMING_DEER_UNITS).find(
    k => k.toLowerCase() === input.toLowerCase()
  );

  // 2. Bare number — prefer LQ first, then general season
  if (!key && /^\d+$/.test(input)) {
    if (WYOMING_DEER_UNITS[`${input}-1`]) key = `${input}-1`;
    else if (WYOMING_DEER_UNITS[`${input}-GEN`]) key = `${input}-GEN`;
  }

  if (!key) return { key: null, unit: null, drawSource: null };

  const unit = WYOMING_DEER_UNITS[key];
  const drawSource =
    unit.productType === "UNIT_IN_REGION" && unit.parentRegion
      ? WYOMING_DEER_UNITS[unit.parentRegion] ?? null
      : unit;

  return { key, unit, drawSource };
}