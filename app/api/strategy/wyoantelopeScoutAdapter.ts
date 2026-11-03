// wyoantelopeScoutAdapter.ts
// Flattens WYOMING_ANTELOPE_UNITS into a SCOUT-ready dataset.
//
// Antelope is simpler than deer: every product is a limited-quota area+weapon
// tag (no general regions, no UNIT_IN_REGION substructure, no wilderness/guide
// rules). So this is a flat map of the latest draw year per product.

import { trophyFacts } from "@/lib/trophy";
import { WYOMING_ANTELOPE_UNITS } from "./wyoantelopedata";

export type ScoutAntelopeEntry = {
  unit: string;                 // "57-1"
  areaNumber: number;
  huntType: string;
  // Null for all but 3 of Wyoming's 121 antelope products: the file says its
  // trophy figures are "placeholders — not yet sourced. Do not present as field
  // truth." So they are withheld rather than softened in the prompt.
  typical: string | null;
  topEnd: string | null;
  trophySourced: boolean;
  trophyNote: string | null;
  trait: string;
  description: string;

  residentOdds: string;
  residentQuota: number | string;
  residentApplicants: number | string;

  nrRegularMinPoints: number | string;
  nrRegularOddsAtMin: string;
  nrSpecialMinPoints: number | string;
  nrSpecialOddsAtMin: string;
  nrRandomOdds: string;
  nrSpecialRandomOdds: string;

  dataYear: number | string;
};

// allowedTypes filters by the weapon code in the key suffix
// (1 = rifle, 2 = alt rifle, 9 = archery, 0 = muzzleloader/handgun).
export function buildWyomingAntelopeScoutDataset(allowedTypes: string[]): ScoutAntelopeEntry[] {
  return Object.entries(WYOMING_ANTELOPE_UNITS)
    .filter(([key]) => allowedTypes.includes(key.split("-")[1]))
    .map(([key, unit]) => {
      const history = [...(unit.drawHistory ?? [])].sort((a, b) => b.year - a.year);
      const latest = history[0] ?? null;
      return {
        unit: key,
        areaNumber: unit.areaNumbers?.[0] ?? 0,
        huntType: unit.huntType,
        typical: trophyFacts(unit).typical,
        topEnd: trophyFacts(unit).topEnd,
        trophySourced: trophyFacts(unit).sourced,
        trophyNote: trophyFacts(unit).note,
        trait: unit.trait,
        description: unit.description,
        residentOdds: latest?.resident.approxOdds ?? "N/A",
        residentQuota: latest?.resident.quota ?? "N/A",
        residentApplicants: latest?.resident.firstChoiceApplicants ?? "N/A",
        nrRegularMinPoints: latest?.nr_regular.minPoints ?? "N/A",
        nrRegularOddsAtMin: latest?.nr_regular.oddsAtMin ?? "N/A",
        nrSpecialMinPoints: latest?.nr_special.minPoints ?? "N/A",
        nrSpecialOddsAtMin: latest?.nr_special.oddsAtMin ?? "N/A",
        nrRandomOdds: latest?.nr_random.approxOdds ?? "N/A",
        nrSpecialRandomOdds: latest?.nr_special_random.approxOdds ?? "N/A",
        dataYear: latest?.year ?? "N/A",
      };
    });
}
