// ─────────────────────────────────────────────────────────────────────────────
// DRAW DATA TYPES
// Wyoming Non-Resident Deer has 3 separate draw pools per unit:
//   regular  → 60% of tags, drawn in preference-point order (high→low)
//   special  → 40% of tags, drawn in preference-point order (high→low)
//   random   → 25% of all tags set aside BEFORE regular/special split,
//               awarded by pure random lottery (no points needed)
//
// Wyoming Resident Deer:
//   Pure random draw — no preference points used
//   Separate quota from NR draw
//   Source: Wyoming Game & Fish Demand Reports, 6/10/2025
//
// Source: Wyoming Game & Fish Demand Reports, 6/10/2025
// ─────────────────────────────────────────────────────────────────────────────

export type PrefPointPool = {
  quota: number;
  minPoints: number | null;
  oddsAtMin: string | null;
  totalApplicants?: number;
  notes?: string;
};

export type RandomPool = {
  quota: number;
  firstChoiceApplicants: number;
  approxOdds: string | null;
  notes?: string;
};

export type DrawInfo = {
  regular?: PrefPointPool;
  special?: PrefPointPool;
  random?: RandomPool;
};

export type ResidentDrawInfo = {
  drawType: 'random';
  quota: number;
  firstChoiceApplicants: number;
  approxOdds: string | null;
  notes?: string;
};

export type UnitStats = {
  typical: string;
  topEnd: string;
  trait: string;
  description: string;
  coords: { lat: number; lng: number };
  drawInfo?: DrawInfo;
  residentDrawInfo?: ResidentDrawInfo;
  utahDrawInfo?: UtahDrawInfo;
};

// ─────────────────────────────────────────────────────────────────────────────
// UTAH DRAW INFO TYPE
// ─────────────────────────────────────────────────────────────────────────────
export type UtahDrawInfo = {
  drawType: 'limited-entry' | 'premium-limited-entry' | 'once-in-a-lifetime' | 'general-season';
  pointSystem: 'bonus' | 'preference';
  nrAllocation: string;
  nrTagsApprox: number | null;
  bonusPointsToGuarantee: number | null;
  randomOddsNR: string | null;
  waitingPeriod: string;
  notes: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// WYOMING NON-RESIDENT DEER DRAW
// ─────────────────────────────────────────────────────────────────────────────
export const WY_DEER_DRAW: Record<string, DrawInfo> = {
  "008_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "71.43%", notes: "5 of 7 drew at 0 pts; 2 remaining drew from 1pt applicants" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "010_1": {
    regular: { quota: 6,  minPoints: 11,   oddsAtMin: "33.33%", notes: "112 applicants shut out at <11 pts" },
    special: { quota: 4,  minPoints: 9,    oddsAtMin: "50.00%", notes: "29 applicants at 0% below 8 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 29, approxOdds: "3.45%" },
  },
  "010_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "28.57%" },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 0,  firstChoiceApplicants: 0, approxOdds: null, notes: "No random quota" },
  },
  "011_3": {
    regular: { quota: 45, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 19, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 15, firstChoiceApplicants: 0, approxOdds: null },
  },
  "015_3": {
    regular: { quota: 74, minPoints: 0,    oddsAtMin: "96.97%" },
    special: { quota: 30, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 24, firstChoiceApplicants: 2, approxOdds: "100%", notes: "2 first-choice applicants, 24 tags" },
  },
  "022_1": {
    regular: { quota: 12, minPoints: 6,    oddsAtMin: "28.57%", notes: "143 applicants at 0% below 6 pts" },
    special: { quota: 9,  minPoints: 2,    oddsAtMin: "25.00%", notes: "7 applicants at 0% below 2 pts" },
    random:  { quota: 4,  firstChoiceApplicants: 148, approxOdds: "2.70%" },
  },
  "022_2": {
    regular: { quota: 168, minPoints: 0,   oddsAtMin: "100%",   notes: "All 0-pt applicants drew" },
    special: { quota: 68,  minPoints: 0,   oddsAtMin: "100%"   },
    random:  { quota: 56,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "022_3": {
    regular: { quota: 11, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "023_3": {
    regular: { quota: 228, minPoints: 0,   oddsAtMin: "100%"   },
    special: { quota: 92,  minPoints: 0,   oddsAtMin: "100%"   },
    random:  { quota: 76,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "024_3": {
    regular: { quota: 68, minPoints: 0,    oddsAtMin: "70.24%" },
    special: { quota: 30, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 22, firstChoiceApplicants: 25, approxOdds: "88.00%", notes: "22 tags, 25 first-choice applicants" },
  },
  "034_1": {
    regular: { quota: 10, minPoints: 14,   oddsAtMin: "33.33%", notes: "Partial draw at 14 pts; 106 applicants at 0% below 13" },
    special: { quota: 7,  minPoints: 13,   oddsAtMin: "50.00%", notes: "55 applicants at 0% below 12 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 110, approxOdds: "2.73%" },
  },
  "034_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "036_1": {
    regular: { quota: 9,  minPoints: 5,    oddsAtMin: "25.00%", notes: "58 applicants at 0% below 5 pts" },
    special: { quota: 6,  minPoints: 2,    oddsAtMin: "50.00%", notes: "8 applicants at 0% below 2 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 61, approxOdds: "4.92%" },
  },
  "037_1": {
    regular: { quota: 4,  minPoints: 12,   oddsAtMin: "75.00%", notes: "Only 4 tags; 40 applicants at 0% below 11 pts" },
    special: { quota: 3,  minPoints: 5,    oddsAtMin: "50.00%", notes: "9 applicants at 0% below 5 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 40, approxOdds: "2.50%" },
  },
  "037_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "75.00%" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 2, approxOdds: "100%"  },
  },
  "040_3": {
    regular: { quota: 6,  minPoints: 2,    oddsAtMin: "100%",   notes: "23 applicants at 0% below 1 pt" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "66.67%" },
    random:  { quota: 1,  firstChoiceApplicants: 23, approxOdds: "4.35%" },
  },
  "041_3": {
    regular: { quota: 19, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 6,  firstChoiceApplicants: 6, approxOdds: "100%"  },
  },
  "047_3": {
    regular: { quota: 9,  minPoints: 1,    oddsAtMin: "60.00%", notes: "18 applicants at 0% below 1 pt" },
    special: { quota: 6,  minPoints: 1,    oddsAtMin: "100%",   notes: "3 applicants at 0% below 1 pt" },
    random:  { quota: 3,  firstChoiceApplicants: 20, approxOdds: "15.00%" },
  },
  "059_3": {
    regular: { quota: 36, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 15, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 12, firstChoiceApplicants: 0, approxOdds: null },
  },
  "060_1": {
    regular: { quota: 9,  minPoints: 4,    oddsAtMin: "25.00%", notes: "Any Deer; 43 applicants at 0% below 3 pts" },
    special: { quota: 6,  minPoints: 2,    oddsAtMin: "50.00%", notes: "2 applicants at 0% below 1 pt" },
    random:  { quota: 3,  firstChoiceApplicants: 43, approxOdds: "6.98%" },
  },
  "060_2": {
    regular: { quota: 29, minPoints: 0,    oddsAtMin: "72.22%", notes: "Any Deer Off National Forest" },
    special: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 9,  firstChoiceApplicants: 5, approxOdds: "100%", notes: "9 tags, only 5 first-choice" },
  },
  "060_3": {
    regular: { quota: 51, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 21, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 16, firstChoiceApplicants: 0, approxOdds: null },
  },
  "064_2": {
    regular: { quota: 13, minPoints: 3,    oddsAtMin: "100%",   notes: "48 applicants at 0% below 3 pts" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 48, approxOdds: "8.33%" },
  },
  "065_3": {
    regular: { quota: 59, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 24, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 19, firstChoiceApplicants: 0, approxOdds: null },
  },
  "066_3": {
    regular: { quota: 15, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "070_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "83.33%" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 1, approxOdds: "100%"  },
  },
  "075_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "078_1": {
    regular: { quota: 21, minPoints: 7,    oddsAtMin: "100%",   notes: "94 applicants at 0% below 7 pts" },
    special: { quota: 15, minPoints: 3,    oddsAtMin: "100%",   notes: "19 applicants at 0% below 3 pts" },
    random:  { quota: 7,  firstChoiceApplicants: 94, approxOdds: "7.45%" },
  },
  "078_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "079_1": {
    regular: { quota: 21, minPoints: 4,    oddsAtMin: "13.33%", notes: "51 applicants at 0% below 4 pts" },
    special: { quota: 14, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 6,  firstChoiceApplicants: 63, approxOdds: "9.52%" },
  },
  "080_1": {
    regular: { quota: 12, minPoints: 7,    oddsAtMin: "33.33%", notes: "46 applicants at 0% below 7 pts" },
    special: { quota: 9,  minPoints: 3,    oddsAtMin: "66.67%", notes: "11 applicants at 0% below 3 pts" },
    random:  { quota: 4,  firstChoiceApplicants: 48, approxOdds: "8.33%" },
  },
  "081_1": {
    regular: { quota: 16, minPoints: 11,   oddsAtMin: "20.00%", notes: "112 applicants at 0% below 10 pts" },
    special: { quota: 11, minPoints: 7,    oddsAtMin: "100%",   notes: "24 applicants at 0% below 6 pts" },
    random:  { quota: 5,  firstChoiceApplicants: 112, approxOdds: "4.46%" },
  },
  "082_3": {
    regular: { quota: 3,  minPoints: 2,    oddsAtMin: "60.00%", notes: "6 applicants at 0% below 1 pt" },
    special: { quota: 2,  minPoints: 1,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 6, approxOdds: "16.67%" },
  },
  "084_1": {
    regular: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0 in regular draw" },
    special: { quota: 1,  minPoints: 7,    oddsAtMin: "25.00%", notes: "2 applicants at 0% below 6 pts; only 1 tag in special" },
    random:  { quota: 0,  firstChoiceApplicants: 10, approxOdds: null, notes: "No random quota; 10 first-choice applicants" },
  },
  "087_1": {
    regular: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0; 5 applicants at 18 pts drew 0%" },
    special: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0 in special draw too" },
    random:  { quota: 0,  firstChoiceApplicants: 77, approxOdds: null, notes: "No tags in any draw; 77 first-choice hopefuls" },
  },
  "089_1": {
    regular: { quota: 9,  minPoints: 15,   oddsAtMin: "33.33%", notes: "166 applicants shut out below 15 pts" },
    special: { quota: 6,  minPoints: 11,   oddsAtMin: "100%",   notes: "35 applicants at 0% below 11 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 169, approxOdds: "1.78%" },
  },
  "090_1": {
    regular: { quota: 4,  minPoints: 16,   oddsAtMin: "28.57%", notes: "Any Deer; 78 applicants at 0% below 16 pts" },
    special: { quota: 3,  minPoints: 16,   oddsAtMin: "100%",   notes: "33 applicants at 0% below 16 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 81, approxOdds: "1.23%" },
  },
  "092_3": {
    regular: { quota: 15, minPoints: 0,    oddsAtMin: "73.68%" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 5,  firstChoiceApplicants: 5, approxOdds: "100%"  },
  },
  "101_1": {
    regular: { quota: 2,  minPoints: 17,   oddsAtMin: "50.00%", notes: "81 applicants at 0% below 17 pts" },
    special: { quota: 2,  minPoints: 19,   oddsAtMin: "100%",   notes: "17 applicants at 0% below 19 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 82, approxOdds: null,   notes: "No random quota" },
  },
  "102_1": {
    regular: { quota: 9,  minPoints: 19,   oddsAtMin: "4.42%",  notes: "EXTREME — 4.42% even at max 19 pts. 581 applicants at 0% below 18 pts." },
    special: { quota: 7,  minPoints: 17,   oddsAtMin: "26.67%", notes: "141 applicants at 0% below 17 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 581, approxOdds: "0.52%", notes: "581 first-choice; 3 tags — lottery long shot" },
  },
  "105_1": {
    regular: { quota: 1,  minPoints: 19,   oddsAtMin: "100%",   notes: "Only 1 tag; 31 applicants at 0% below 19 pts" },
    special: { quota: 1,  minPoints: 19,   oddsAtMin: "50.00%", notes: "15 applicants at 0% below 19 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 31, approxOdds: null,   notes: "No random quota" },
  },
  "109_3": {
    regular: { quota: 6,  minPoints: 0,    oddsAtMin: "75.00%" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 1, approxOdds: "100%"  },
  },
  "110_1": {
    regular: { quota: 1,  minPoints: 18,   oddsAtMin: "100%",   notes: "31 applicants at 0% below 18 pts" },
    special: { quota: 2,  minPoints: 10,   oddsAtMin: "100%",   notes: "6 applicants at 0% below 10 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 31, approxOdds: null,   notes: "No random quota" },
  },
  "112_1": {
    regular: { quota: 3,  minPoints: 12,   oddsAtMin: "100%",   notes: "18 applicants at 0% below 12 pts" },
    special: { quota: 2,  minPoints: 8,    oddsAtMin: "100%",   notes: "12 applicants at 0% below 8 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 18, approxOdds: null,   notes: "No random quota" },
  },
  "112_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "116_1": {
    regular: { quota: 1,  minPoints: 16,   oddsAtMin: "100%",   notes: "19 applicants at 0% below 16 pts" },
    special: { quota: 2,  minPoints: 14,   oddsAtMin: "100%",   notes: "6 applicants at 0% below 14 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 19, approxOdds: null,   notes: "No random quota" },
  },
  "116_3": {
    regular: { quota: 11, minPoints: 0,    oddsAtMin: "60.00%" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 2, approxOdds: "100%"  },
  },
  "117_1": {
    regular: { quota: 3,  minPoints: 8,    oddsAtMin: "100%",   notes: "29 applicants at 0% below 8 pts" },
    special: { quota: 3,  minPoints: 3,    oddsAtMin: "100%",   notes: "5 applicants at 0% below 3 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 29, approxOdds: "3.45%" },
  },
  "118_1": {
    regular: { quota: 3,  minPoints: 12,   oddsAtMin: "100%",   notes: "8 applicants at 0% below 12 pts" },
    special: { quota: 2,  minPoints: 4,    oddsAtMin: "33.33%", notes: "4 applicants at 0% below 4 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 8, approxOdds: null,    notes: "No random quota" },
  },
  "119_1": {
    regular: { quota: 3,  minPoints: 18,   oddsAtMin: "42.86%", notes: "41 applicants at 0% below 18 pts" },
    special: { quota: 2,  minPoints: 16,   oddsAtMin: "50.00%", notes: "16 applicants at 0% below 16 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 44, approxOdds: null,   notes: "No random quota" },
  },
  "119_2": {
    regular: { quota: 3,  minPoints: 12,   oddsAtMin: "100%",   notes: "74 applicants at 0% below 12 pts" },
    special: { quota: 3,  minPoints: 15,   oddsAtMin: "60.00%", notes: "19 applicants at 0% below 14 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 74, approxOdds: "1.35%" },
  },
  "119_3": {
    regular: { quota: 14, minPoints: 0,    oddsAtMin: "27.78%" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 10, approxOdds: "40.00%" },
  },
  "120_1": {
    regular: { quota: 6,  minPoints: 7,    oddsAtMin: "50.00%", notes: "34 applicants at 0% below 6 pts" },
    special: { quota: 5,  minPoints: 4,    oddsAtMin: "60.00%", notes: "8 applicants at 0% below 3 pts" },
    random:  { quota: 2,  firstChoiceApplicants: 34, approxOdds: "5.88%" },
  },
  "121_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "122_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "124_3": {
    regular: { quota: 14, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "125_1": {
    regular: { quota: 6,  minPoints: 13,   oddsAtMin: "33.33%", notes: "58 applicants at 0% below 13 pts" },
    special: { quota: 5,  minPoints: 4,    oddsAtMin: "66.67%", notes: "9 applicants at 0% below 4 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 60, approxOdds: "1.67%" },
  },
  "127_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "128_1": {
    regular: { quota: 5,  minPoints: 19,   oddsAtMin: "4.42%",  notes: "THE hardest NR deer draw in WY. 1,244 applicants at 0% below 19 pts." },
    special: { quota: 3,  minPoints: 19,   oddsAtMin: "5.88%",  notes: "456 applicants shut out below 19 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 1352, approxOdds: "0.07%", notes: "1,352 first-choice applicants for 1 tag" },
  },
  "128_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "23.08%", notes: "13 applicants at 0 pts" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 10, approxOdds: "20.00%" },
  },
  "130_1": {
    regular: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0 in regular draw; 19pts still 0%" },
    special: { quota: 1,  minPoints: 19,   oddsAtMin: "100%",   notes: "16 applicants at 0% below 19 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 38, approxOdds: null,   notes: "No random quota" },
  },
  "132_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "25.00%" },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 0,  firstChoiceApplicants: 3, approxOdds: null,    notes: "No random quota" },
  },
  "138_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "141_1": {
    regular: { quota: 3,  minPoints: 17,   oddsAtMin: "50.00%", notes: "78 applicants at 0% below 16 pts" },
    special: { quota: 3,  minPoints: 14,   oddsAtMin: "100%",   notes: "36 applicants at 0% below 14 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 78, approxOdds: "1.28%" },
  },
  "145_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "20.00%" },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 0,  firstChoiceApplicants: 4, approxOdds: null,    notes: "No random quota" },
  },
  "148_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "149_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "157_3": {
    regular: { quota: 24, minPoints: 0,    oddsAtMin: "90.00%" },
    special: { quota: 11, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 8,  firstChoiceApplicants: 1, approxOdds: "100%"  },
  },
  "164_1": {
    regular: { quota: 6,  minPoints: 0,    oddsAtMin: "50.00%", notes: "Can draw at 0 pts" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 2, approxOdds: "50.00%" },
  },
  "164_3": {
    regular: { quota: 15, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 5,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "165_1": {
    regular: { quota: 5,  minPoints: 8,    oddsAtMin: "100%",   notes: "33 applicants at 0% below 8 pts" },
    special: { quota: 3,  minPoints: 1,    oddsAtMin: "100%",   notes: "1 applicant at 0% below 1 pt" },
    random:  { quota: 1,  firstChoiceApplicants: 33, approxOdds: "3.03%" },
  },
  "165_3": {
    regular: { quota: 13, minPoints: 0,    oddsAtMin: "14.29%", notes: "Competitive at 0 pts; only 14.29% drew" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 6, approxOdds: "66.67%" },
  },
  "171_3": {
    regular: { quota: 21, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 9,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 7,  firstChoiceApplicants: 0, approxOdds: null },
  },
  "A": {
    regular: { quota: 1250, minPoints: 0,  oddsAtMin: "15.80%", notes: "1,576 applicants at 0 pts; 15.8% drew" },
    special: { quota: 588,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 416,  firstChoiceApplicants: 1324, approxOdds: "31.42%" },
  },
  "B": {
    regular: { quota: 558,  minPoints: 0,  oddsAtMin: "1.81%",  notes: "VERY low odds at 0 pts" },
    special: { quota: 240,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 186,  firstChoiceApplicants: 487, approxOdds: "38.19%" },
  },
  "C": {
    regular: { quota: 1078, minPoints: 1,  oddsAtMin: "67.74%", notes: "773 applicants at 0 pts drew 0%" },
    special: { quota: 535,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 359,  firstChoiceApplicants: 821, approxOdds: "43.73%" },
  },
  "D": {
    regular: { quota: 164,  minPoints: 3,  oddsAtMin: "96.30%", notes: "329 applicants at 0% below 3 pts" },
    special: { quota: 85,   minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 54,   firstChoiceApplicants: 332, approxOdds: "16.27%" },
  },
  "F": {
    regular: { quota: 372,  minPoints: 0,  oddsAtMin: "6.95%",  notes: "331 applicants at 0 pts; only 6.95% drew" },
    special: { quota: 164,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 123,  firstChoiceApplicants: 307, approxOdds: "40.07%" },
  },
  "G": {
    regular: { quota: 93,  minPoints: 10,  oddsAtMin: "91.67%", notes: "Region G: Areas 135, 143-145." },
    special: { quota: 62,  minPoints: 6,   oddsAtMin: "44.44%" },
    random:  { quota: 30,  firstChoiceApplicants: 926, approxOdds: "3.24%" },
  },
  "H": {
    regular: { quota: 154,  minPoints: 6,  oddsAtMin: "6.94%",  notes: "648 applicants at 0% below 6 pts" },
    special: { quota: 104,  minPoints: 4,  oddsAtMin: "46.34%", notes: "150 applicants at 0% below 4 pts" },
    random:  { quota: 51,   firstChoiceApplicants: 714, approxOdds: "7.14%" },
  },
  "J": {
    regular: { quota: 477,  minPoints: 0,  oddsAtMin: "74.40%" },
    special: { quota: 217,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 158,  firstChoiceApplicants: 104, approxOdds: "100%", notes: "More tags than first-choice applicants" },
  },
  "K": {
    regular: { quota: 95,   minPoints: 4,  oddsAtMin: "81.25%", notes: "291 applicants at 0% below 4 pts" },
    special: { quota: 57,   minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 31,   firstChoiceApplicants: 297, approxOdds: "10.44%" },
  },
  "L": {
    regular: { quota: 105,  minPoints: 2,  oddsAtMin: "81.25%", notes: "185 applicants at 0% below 2 pts" },
    special: { quota: 58,   minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 34,   firstChoiceApplicants: 194, approxOdds: "17.53%" },
  },
  "M": {
    regular: { quota: 267,  minPoints: 1,  oddsAtMin: "32.67%", notes: "253 applicants at 0 pts drew 0%" },
    special: { quota: 117,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 89,   firstChoiceApplicants: 320, approxOdds: "27.81%" },
  },
  "Q": {
    regular: { quota: 37,   minPoints: 3,  oddsAtMin: "5.88%",  notes: "127 applicants at 0% below 2 pts" },
    special: { quota: 21,   minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 12,   firstChoiceApplicants: 138, approxOdds: "8.70%" },
  },
  "R": {
    regular: { quota: 282,  minPoints: 3,  oddsAtMin: "52.81%", notes: "420 applicants at 0% below 2 pts" },
    special: { quota: 148,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 94,   firstChoiceApplicants: 462, approxOdds: "20.35%" },
  },
  "T": {
    regular: { quota: 295,  minPoints: 0,  oddsAtMin: "100%"   },
    special: { quota: 120,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 98,   firstChoiceApplicants: 0, approxOdds: null },
  },
  "W": {
    regular: { quota: 393,  minPoints: 1,  oddsAtMin: "81.37%", notes: "379 applicants at 0 pts drew 0%" },
    special: { quota: 179,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 130,  firstChoiceApplicants: 398, approxOdds: "32.66%" },
  },
  "X": {
    regular: { quota: 64,   minPoints: 0,  oddsAtMin: "2.13%",  notes: "94 applicants at 0 pts; only 2.13% drew" },
    special: { quota: 30,   minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 21,   firstChoiceApplicants: 92, approxOdds: "22.83%" },
  },
  "Y": {
    regular: { quota: 661,  minPoints: 1,  oddsAtMin: "57.14%", notes: "681 applicants at 0 pts drew 0%" },
    special: { quota: 296,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 220,  firstChoiceApplicants: 810, approxOdds: "27.16%" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WYOMING RESIDENT DEER DRAW
// Pure random draw — no preference points used
// Source: Wyoming Game & Fish Demand Report, 6/10/2025
// ─────────────────────────────────────────────────────────────────────────────
export const WY_DEER_RESIDENT: Record<string, ResidentDrawInfo> = {
  "008_3": { drawType: 'random', quota: 40,   firstChoiceApplicants: 40,   approxOdds: "100%" },
  "010_1": { drawType: 'random', quota: 47,   firstChoiceApplicants: 702,  approxOdds: "6.70%",  notes: "High demand — 702 first-choice for 47 tags" },
  "010_3": { drawType: 'random', quota: 16,   firstChoiceApplicants: 45,   approxOdds: "35.56%" },
  "011_3": { drawType: 'random', quota: 160,  firstChoiceApplicants: 85,   approxOdds: "100%",   notes: "More tags than first-choice applicants" },
  "015_3": { drawType: 'random', quota: 397,  firstChoiceApplicants: 504,  approxOdds: "78.77%" },
  "022_1": { drawType: 'random', quota: 117,  firstChoiceApplicants: 249,  approxOdds: "47.19%" },
  "022_2": { drawType: 'random', quota: 200,  firstChoiceApplicants: 7,    approxOdds: "100%",   notes: "More tags than applicants" },
  "022_3": { drawType: 'random', quota: 56,   firstChoiceApplicants: 85,   approxOdds: "65.88%" },
  "023_3": { drawType: 'random', quota: 400,  firstChoiceApplicants: 121,  approxOdds: "100%",   notes: "More tags than applicants" },
  "024_3": { drawType: 'random', quota: 400,  firstChoiceApplicants: 336,  approxOdds: "100%",   notes: "More tags than applicants" },
  "034_1": { drawType: 'random', quota: 76,   firstChoiceApplicants: 979,  approxOdds: "7.76%",  notes: "High demand unit" },
  "034_3": { drawType: 'random', quota: 37,   firstChoiceApplicants: 46,   approxOdds: "80.43%" },
  "036_1": { drawType: 'random', quota: 66,   firstChoiceApplicants: 155,  approxOdds: "42.58%" },
  "037_1": { drawType: 'random', quota: 28,   firstChoiceApplicants: 148,  approxOdds: "18.92%", notes: "Competitive resident draw" },
  "037_3": { drawType: 'random', quota: 35,   firstChoiceApplicants: 44,   approxOdds: "79.55%" },
  "040_3": { drawType: 'random', quota: 40,   firstChoiceApplicants: 113,  approxOdds: "35.40%" },
  "041_3": { drawType: 'random', quota: 100,  firstChoiceApplicants: 135,  approxOdds: "74.07%" },
  "047_3": { drawType: 'random', quota: 80,   firstChoiceApplicants: 162,  approxOdds: "49.38%" },
  "059_3": { drawType: 'random', quota: 199,  firstChoiceApplicants: 196,  approxOdds: "100%",   notes: "More tags than applicants" },
  "060_1": { drawType: 'random', quota: 79,   firstChoiceApplicants: 658,  approxOdds: "12.01%", notes: "Competitive — 658 first-choice for 79 tags" },
  "060_2": { drawType: 'random', quota: 158,  firstChoiceApplicants: 152,  approxOdds: "100%",   notes: "More tags than applicants" },
  "060_3": { drawType: 'random', quota: 80,   firstChoiceApplicants: 7,    approxOdds: "100%",   notes: "Very few applicants" },
  "064_2": { drawType: 'random', quota: 78,   firstChoiceApplicants: 154,  approxOdds: "50.65%" },
  "065_3": { drawType: 'random', quota: 319,  firstChoiceApplicants: 344,  approxOdds: "92.73%" },
  "066_3": { drawType: 'random', quota: 80,   firstChoiceApplicants: 241,  approxOdds: "33.20%" },
  "070_3": { drawType: 'random', quota: 40,   firstChoiceApplicants: 53,   approxOdds: "75.47%" },
  "075_3": { drawType: 'random', quota: 60,   firstChoiceApplicants: 89,   approxOdds: "67.42%" },
  "078_1": { drawType: 'random', quota: 193,  firstChoiceApplicants: 1091, approxOdds: "17.69%", notes: "High demand — 1,091 first-choice for 193 tags" },
  "078_3": { drawType: 'random', quota: 32,   firstChoiceApplicants: 68,   approxOdds: "47.06%" },
  "079_1": { drawType: 'random', quota: 193,  firstChoiceApplicants: 382,  approxOdds: "50.52%" },
  "080_1": { drawType: 'random', quota: 118,  firstChoiceApplicants: 274,  approxOdds: "43.07%" },
  "081_1": { drawType: 'random', quota: 132,  firstChoiceApplicants: 560,  approxOdds: "23.57%", notes: "Competitive resident draw" },
  "082_3": { drawType: 'random', quota: 20,   firstChoiceApplicants: 26,   approxOdds: "76.92%" },
  "084_1": { drawType: 'random', quota: 11,   firstChoiceApplicants: 199,  approxOdds: "5.53%",  notes: "Very competitive — 199 first-choice for 11 tags" },
  "087_1": { drawType: 'random', quota: 25,   firstChoiceApplicants: 1167, approxOdds: "2.14%",  notes: "EXTREMELY competitive — 1,167 first-choice for 25 tags" },
  "089_1": { drawType: 'random', quota: 67,   firstChoiceApplicants: 871,  approxOdds: "7.69%",  notes: "High demand trophy unit" },
  "090_1": { drawType: 'random', quota: 25,   firstChoiceApplicants: 664,  approxOdds: "3.77%",  notes: "Very competitive resident draw" },
  "092_3": { drawType: 'random', quota: 80,   firstChoiceApplicants: 139,  approxOdds: "57.55%" },
  "101_1": { drawType: 'random', quota: 14,   firstChoiceApplicants: 660,  approxOdds: "2.12%",  notes: "Very competitive resident draw" },
  "102_1": { drawType: 'random', quota: 100,  firstChoiceApplicants: 3482, approxOdds: "2.87%",  notes: "EXTREMELY competitive — 3,482 first-choice for 100 tags" },
  "105_1": { drawType: 'random', quota: 15,   firstChoiceApplicants: 742,  approxOdds: "2.02%",  notes: "Very competitive resident draw" },
  "109_3": { drawType: 'random', quota: 28,   firstChoiceApplicants: 115,  approxOdds: "24.35%" },
  "110_1": { drawType: 'random', quota: 20,   firstChoiceApplicants: 319,  approxOdds: "6.27%",  notes: "Competitive resident draw" },
  "112_1": { drawType: 'random', quota: 20,   firstChoiceApplicants: 314,  approxOdds: "6.37%",  notes: "Competitive resident draw" },
  "112_3": { drawType: 'random', quota: 60,   firstChoiceApplicants: 75,   approxOdds: "80.00%" },
  "116_1": { drawType: 'random', quota: 52,   firstChoiceApplicants: 155,  approxOdds: "33.55%" },
  "116_3": { drawType: 'random', quota: 74,   firstChoiceApplicants: 179,  approxOdds: "41.34%" },
  "117_1": { drawType: 'random', quota: 40,   firstChoiceApplicants: 277,  approxOdds: "14.44%", notes: "Competitive resident draw" },
  "118_1": { drawType: 'random', quota: 9,    firstChoiceApplicants: 53,   approxOdds: "16.98%" },
  "119_1": { drawType: 'random', quota: 23,   firstChoiceApplicants: 445,  approxOdds: "5.17%",  notes: "Competitive resident draw" },
  "119_2": { drawType: 'random', quota: 40,   firstChoiceApplicants: 103,  approxOdds: "38.83%" },
  "119_3": { drawType: 'random', quota: 72,   firstChoiceApplicants: 80,   approxOdds: "90.00%" },
  "120_1": { drawType: 'random', quota: 47,   firstChoiceApplicants: 110,  approxOdds: "42.73%" },
  "121_3": { drawType: 'random', quota: 60,   firstChoiceApplicants: 111,  approxOdds: "54.05%" },
  "122_3": { drawType: 'random', quota: 60,   firstChoiceApplicants: 244,  approxOdds: "24.59%" },
  "124_3": { drawType: 'random', quota: 80,   firstChoiceApplicants: 112,  approxOdds: "71.43%" },
  "125_1": { drawType: 'random', quota: 46,   firstChoiceApplicants: 296,  approxOdds: "15.54%", notes: "Competitive resident draw" },
  "127_3": { drawType: 'random', quota: 38,   firstChoiceApplicants: 68,   approxOdds: "55.88%" },
  "128_1": { drawType: 'random', quota: 40,   firstChoiceApplicants: 3611, approxOdds: "1.11%",  notes: "EXTREMELY competitive — 3,611 first-choice for 40 tags. One of hardest resident draws in WY." },
  "128_3": { drawType: 'random', quota: 40,   firstChoiceApplicants: 151,  approxOdds: "26.49%" },
  "130_1": { drawType: 'random', quota: 4,    firstChoiceApplicants: 430,  approxOdds: "0.93%",  notes: "EXTREMELY competitive — 430 first-choice for only 4 tags" },
  "132_3": { drawType: 'random', quota: 17,   firstChoiceApplicants: 64,   approxOdds: "26.56%" },
  "138_3": { drawType: 'random', quota: 40,   firstChoiceApplicants: 62,   approxOdds: "64.52%" },
  "141_1": { drawType: 'random', quota: 38,   firstChoiceApplicants: 852,  approxOdds: "4.46%",  notes: "Very competitive — 852 first-choice for 38 tags" },
  "145_3": { drawType: 'random', quota: 20,   firstChoiceApplicants: 86,   approxOdds: "23.26%" },
  "148_3": { drawType: 'random', quota: 40,   firstChoiceApplicants: 62,   approxOdds: "64.52%" },
  "149_3": { drawType: 'random', quota: 20,   firstChoiceApplicants: 19,   approxOdds: "100%",   notes: "More tags than applicants" },
  "157_3": { drawType: 'random', quota: 132,  firstChoiceApplicants: 180,  approxOdds: "73.33%" },
  "164_1": { drawType: 'random', quota: 40,   firstChoiceApplicants: 101,  approxOdds: "39.60%" },
  "164_3": { drawType: 'random', quota: 80,   firstChoiceApplicants: 60,   approxOdds: "100%",   notes: "More tags than applicants" },
  "165_1": { drawType: 'random', quota: 40,   firstChoiceApplicants: 109,  approxOdds: "36.70%" },
  "165_3": { drawType: 'random', quota: 75,   firstChoiceApplicants: 150,  approxOdds: "50.00%" },
  "171_3": { drawType: 'random', quota: 120,  firstChoiceApplicants: 97,   approxOdds: "100%",   notes: "More tags than applicants" },
  "GEN":   { drawType: 'random', quota: 9999, firstChoiceApplicants: 2175, approxOdds: "100%",   notes: "General tag — essentially unlimited quota for residents" },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTAH UNIT ALIASES
// ─────────────────────────────────────────────────────────────────────────────
export const utahUnitAliases: Record<string, string> = {
  'henry mountains': 'Henry Mountains', 'henry mtns': 'Henry Mountains', 'henrys': 'Henry Mountains', 'henry': 'Henry Mountains', 'henry mtn': 'Henry Mountains',
  'paunsaugunt': 'Paunsaugunt', 'pauns': 'Paunsaugunt', 'paunsaugunt plateau': 'Paunsaugunt', 'bryce': 'Paunsaugunt',
  'book cliffs': 'Book Cliffs', 'book cliffs deer': 'Book Cliffs', 'book': 'Book Cliffs',
  'fillmore': 'Fillmore Oak Creek', 'oak creek': 'Fillmore Oak Creek', 'fillmore oak creek': 'Fillmore Oak Creek', 'fillmore deer': 'Fillmore Oak Creek',
  'san juan': 'San Juan', 'san juan deer': 'San Juan', 'southeast utah deer': 'San Juan',
  'la sal': 'La Sal Dolores Triangle', 'lasal': 'La Sal Dolores Triangle', 'la sal dolores': 'La Sal Dolores Triangle', 'dolores triangle': 'La Sal Dolores Triangle', 'la sal deer': 'La Sal Dolores Triangle', 'moab deer': 'La Sal Dolores Triangle',
  'diamond mountain': 'Diamond Mountain', 'diamond': 'Diamond Mountain', 'diamond mtn': 'Diamond Mountain', 'south slope': 'Diamond Mountain',
  'vernon': 'Vernon', 'west desert deer': 'Vernon', 'vernon deer': 'Vernon',
  'thousand lake': 'Thousand Lake', 'thousand lake mtn': 'Thousand Lake', 'thousand lake mountain': 'Thousand Lake',
  'boulder kaiparowits': 'Boulder Kaiparowits', 'boulder deer': 'Boulder Kaiparowits', 'kaiparowits deer': 'Boulder Kaiparowits', 'grand staircase deer': 'Boulder Kaiparowits',
  'monroe': 'Monroe', 'monroe deer': 'Monroe', 'monroe mountain deer': 'Monroe', 'monroe mountain': 'Monroe',
  'lasal general': 'LaSal General', 'la sal general': 'LaSal General', 'lasal gs': 'LaSal General',
  'san juan elk': 'San Juan', 'southeast utah elk': 'San Juan',
  'fillmore pahvant': 'Fillmore Pahvant', 'pahvant': 'Fillmore Pahvant', 'fillmore elk': 'Fillmore Pahvant', 'pahvant elk': 'Fillmore Pahvant',
  'monroe elk': 'Monroe Elk', 'monroe mountain elk': 'Monroe Elk', 'fishlake elk': 'Monroe Elk',
  'boulder elk': 'Boulder Elk', 'boulder mountain elk': 'Boulder Elk',
  'beaver elk': 'Beaver Elk', 'beaver': 'Beaver Elk', 'beaver unit elk': 'Beaver Elk',
  'southwest desert elk': 'Southwest Desert Elk', 'sw desert elk': 'Southwest Desert Elk', 'southwest desert': 'Southwest Desert Elk', 'sw desert': 'Southwest Desert Elk',
  'panguitch lake elk': 'Panguitch Lake Elk', 'panguitch elk': 'Panguitch Lake Elk', 'panguitch lake': 'Panguitch Lake Elk',
  'manti elk': 'Manti Elk', 'manti': 'Manti Elk', 'manti mountains elk': 'Manti Elk', 'manti la sal elk': 'Manti Elk',
  'mt dutton elk': 'Mt Dutton Elk', 'mount dutton elk': 'Mt Dutton Elk', 'mt dutton': 'Mt Dutton Elk', 'dutton elk': 'Mt Dutton Elk',
  'wasatch elk': 'Wasatch Elk', 'wasatch mountains elk': 'Wasatch Elk', 'wasatch': 'Wasatch Elk',
  'book cliffs elk': 'Book Cliffs Elk',
  'west desert': 'West Desert', 'west desert antelope': 'West Desert', 'utah west desert': 'West Desert',
  'plateau': 'Plateau', 'plateau antelope': 'Plateau', 'fishlake antelope': 'Plateau',
  'panguitch antelope': 'Panguitch Antelope', 'panguitch': 'Panguitch Antelope',
  'north slope uintas': 'North Slope Uintas', 'north slope': 'North Slope Uintas', 'uintas moose': 'North Slope Uintas', 'uinta moose': 'North Slope Uintas', 'north uintas': 'North Slope Uintas',
  'cache moose': 'Cache Moose', 'cache': 'Cache Moose', 'cache valley moose': 'Cache Moose', 'logan moose': 'Cache Moose',
  'uintas east moose': 'Uintas East Moose', 'east uintas moose': 'Uintas East Moose', 'uintas east': 'Uintas East Moose',
  'kaiparowits east': 'Kaiparowits East', 'kaiparowits east sheep': 'Kaiparowits East',
  'kaiparowits west': 'Kaiparowits West', 'kaiparowits west sheep': 'Kaiparowits West',
  'kaiparowits escalante': 'Kaiparowits Escalante', 'escalante sheep': 'Kaiparowits Escalante', 'escalante bighorn': 'Kaiparowits Escalante',
  'san rafael dirty devil': 'San Rafael Dirty Devil', 'san rafael': 'San Rafael Dirty Devil', 'dirty devil': 'San Rafael Dirty Devil', 'san rafael sheep': 'San Rafael Dirty Devil',
  'san rafael south': 'San Rafael South', 'san rafael south sheep': 'San Rafael South',
  'box elder': 'Box Elder Newfoundland RMBS', 'box elder sheep': 'Box Elder Newfoundland RMBS', 'newfoundland': 'Box Elder Newfoundland RMBS', 'box elder newfoundland': 'Box Elder Newfoundland RMBS',
  'fillmore oak creek rmbs': 'Fillmore Oak Creek RMBS', 'fillmore sheep': 'Fillmore Oak Creek RMBS', 'pahvant sheep': 'Fillmore Oak Creek RMBS', 'oak creek sheep': 'Fillmore Oak Creek RMBS',
};

// ─────────────────────────────────────────────────────────────────────────────
// HUNT DATA
// ─────────────────────────────────────────────────────────────────────────────
export const HUNT_DATA: Record<string, Record<string, UnitStats>> = {

  // ============================================================
  // WYOMING — MULE DEER
  // ============================================================
  WYOMING_DEER: {
    "102": {
      typical: '165-180"', topEnd: '200"+', trait: "High desert island genetics; deep forks.",
      description: "Southwest WY, South of Rock Springs. Focus: Little Mountain, Aspen Mountain. NOT Wyoming Range.",
      coords: { lat: 41.2448, lng: -109.185 },
      drawInfo: WY_DEER_DRAW["102_1"],
      residentDrawInfo: WY_DEER_RESIDENT["102_1"],
    },
    "128": {
      typical: '170-185"', topEnd: '200"+', trait: "Migration corridor; mass and beam length.",
      description: "Wind River Front near Dubois. Focus: East Fork and Horse Creek. Transitional mountain terrain.",
      coords: { lat: 43.5777, lng: -109.6397 },
      drawInfo: WY_DEER_DRAW["128_1"],
      residentDrawInfo: WY_DEER_RESIDENT["128_1"],
    },
    "87": {
      typical: '155-175"', topEnd: '190"', trait: "Sagebrush desert genetics; heavy mass.",
      description: "South Central WY near Baggs. Focus: Atlantic Rim and Muddy Creek. High desert sage ridges.",
      coords: { lat: 42.174, lng: -107.1266 },
      drawInfo: WY_DEER_DRAW["087_1"],
      residentDrawInfo: WY_DEER_RESIDENT["087_1"],
    },
    "141": {
      typical: '175-190"', topEnd: '210"+', trait: "True alpine giants; the 'Grey Ghost' genetics.",
      description: "Wyoming Range West of Daniel. Focus: Hoback Basin and McDougal Gap. Steep, high-altitude alpine.",
      coords: { lat: 43.2847, lng: -109.9553 },
      drawInfo: WY_DEER_DRAW["141_1"],
      residentDrawInfo: WY_DEER_RESIDENT["141_1"],
    },
    "135": {
      typical: '170-185"', topEnd: '200"+', trait: "Rugged high-country mass.",
      description: "Wyoming Range West of Big Piney. Focus: Bare Top and South Cottonwood. Steep canyons and timber.",
      coords: { lat: 42.0392, lng: -110.5025 },
    },
    "89": {
      typical: '160-175"', topEnd: '195"', trait: "Desert ridge genetics; wide frames.",
      description: "The 'Ferris Mountains' North of Rawlins. Focus: Granite peaks surrounded by sagebrush desert.",
      coords: { lat: 42.8218, lng: -107.0095 },
      drawInfo: WY_DEER_DRAW["089_1"],
      residentDrawInfo: WY_DEER_RESIDENT["089_1"],
    },
    "101": {
      typical: '155-170"', topEnd: '185"', trait: "Extreme desert survivalists.",
      description: "West of Unit 102. Focus: Bitter Creek and the Checkerboard lands. Flat sage and dry coulees.",
      coords: { lat: 41.3483, lng: -108.7096 },
      drawInfo: WY_DEER_DRAW["101_1"],
      residentDrawInfo: WY_DEER_RESIDENT["101_1"],
    },
    "105": {
      typical: '165-180"', topEnd: '195"', trait: "High desert migration stop.",
      description: "McCullough Peaks near Cody. Focus: Badlands and desert draws. Extreme clay terrain.",
      coords: { lat: 44.9287, lng: -109.4137 },
      drawInfo: WY_DEER_DRAW["105_1"],
      residentDrawInfo: WY_DEER_RESIDENT["105_1"],
    },
    "90": {
      typical: '160-175"', topEnd: '190"', trait: "Red Desert/Wind River transition.",
      description: "South of Lander. Focus: Sweetwater River drainage and Green Mountain. Sage/Timber mix.",
      coords: { lat: 42.9531, lng: -107.7987 },
      drawInfo: WY_DEER_DRAW["090_1"],
      residentDrawInfo: WY_DEER_RESIDENT["090_1"],
    },
    "130": {
      typical: '170-185"', topEnd: '205"+', trait: "Desert migration 'Staging' genetics.",
      description: "South of Pinedale. Focus: The 'Mesa' and Scab Creek. Transition from Wind River high country to desert.",
      coords: { lat: 42.4136, lng: -109.2384 },
      drawInfo: WY_DEER_DRAW["130_1"],
      residentDrawInfo: WY_DEER_RESIDENT["130_1"],
    },
    "143": {
      typical: '170-185"', topEnd: '190-200"', trait: "High alpine mule deer with premier genetics.",
      description: "Hunt Area 143, South Piney. Northeast portion of Region G. Extremely rugged vertical terrain. Valid with a Region G tag.",
      coords: { lat: 42.6542, lng: -110.8234 },
      drawInfo: WY_DEER_DRAW["G"],
    },
    "1":  { typical: '130-155"', topEnd: '170"+', trait: "Mixed mule/whitetail; ag edge bucks.", description: "Region A — NE WY near Hulett/Devils Tower.", coords: { lat: 44.7972, lng: -104.4013 }, drawInfo: WY_DEER_DRAW["A"] },
    "2":  { typical: '130-155"', topEnd: '170"+', trait: "Bear Lodge NF public land.", description: "Region A — NE WY near Hulett. Bear Lodge National Forest.", coords: { lat: 44.7005, lng: -104.3505 }, drawInfo: WY_DEER_DRAW["A"] },
    "3":  { typical: '130-155"', topEnd: '165"',  trait: "Rolling pine and ag mix.", description: "Region A — NE WY south of Sundance.", coords: { lat: 44.3939, lng: -104.7713 }, drawInfo: WY_DEER_DRAW["A"] },
    "4":  { typical: '130-155"', topEnd: '170"+', trait: "Black Hills fringe.", description: "Region A — Black Hills fringe near Newcastle.", coords: { lat: 44.3323, lng: -104.1729 }, drawInfo: WY_DEER_DRAW["A"] },
    "5":  { typical: '130-155"', topEnd: '165"',  trait: "Sage/pine transition.", description: "Region A — NE WY near Upton.", coords: { lat: 44.2327, lng: -104.5182 }, drawInfo: WY_DEER_DRAW["A"] },
    "6":  { typical: '130-155"', topEnd: '165"',  trait: "Southern Region A; creek bottom bucks.", description: "Region A — South of Newcastle.", coords: { lat: 44.0083, lng: -104.2778 }, drawInfo: WY_DEER_DRAW["A"] },
    "7":  { typical: '140-160"', topEnd: '175"',  trait: "High mature buck ratio; limited public access.", description: "Region B — N-central WY near Kaycee.", coords: { lat: 43.8813, lng: -104.5879 }, drawInfo: WY_DEER_DRAW["B"] },
    "8":  { typical: '140-160"', topEnd: '175"',  trait: "Powder River Basin; heavy private land dependency.", description: "Region B — Powder River Basin near Midwest.", coords: { lat: 43.9615, lng: -104.9063 }, drawInfo: WY_DEER_DRAW["B"] },
    "9":  { typical: '140-160"', topEnd: '172"',  trait: "East-central WY; sage and pine ridge terrain.", description: "Region B — East-central WY near Douglas.", coords: { lat: 43.6672, lng: -104.4119 }, drawInfo: WY_DEER_DRAW["B"] },
    "11": { typical: '140-160"', topEnd: '172"',  trait: "Powder River drainages; WGFD reports high buck ratios.", description: "Region B — Southeast of Gillette.", coords: { lat: 43.4143, lng: -104.4486 }, drawInfo: WY_DEER_DRAW["B"] },
    "12": { typical: '140-158"', topEnd: '170"',  trait: "Open pine and sagebrush.", description: "Region B — North of Douglas.", coords: { lat: 43.1067, lng: -104.2850 }, drawInfo: WY_DEER_DRAW["B"] },
    "13": { typical: '140-158"', topEnd: '170"',  trait: "Laramie Range foothills transition.", description: "Region B — East of Douglas.", coords: { lat: 42.8725, lng: -104.5187 }, drawInfo: WY_DEER_DRAW["B"] },
    "14": { typical: '140-158"', topEnd: '172"',  trait: "Ponderosa and sage near Glendo.", description: "Region B — Laramie Range foothills near Glendo.", coords: { lat: 43.0113, lng: -105.0225 }, drawInfo: WY_DEER_DRAW["B"] },
    "21": { typical: '140-158"', topEnd: '170"',  trait: "Powder River prairie breaks.", description: "Region B — SW of Gillette.", coords: { lat: 44.0002, lng: -105.2473 }, drawInfo: WY_DEER_DRAW["B"] },
    "17": { typical: '150-165"', topEnd: '180"',  trait: "Bighorn foothills; strong genetics in canyon breaks.", description: "Region C — Bighorn Basin foothills near Sheridan.", coords: { lat: 44.6145, lng: -105.7579 }, drawInfo: WY_DEER_DRAW["C"] },
    "18": { typical: '150-165"', topEnd: '178"',  trait: "Powder River headwaters.", description: "Region C — N-central WY near Buffalo.", coords: { lat: 44.6011, lng: -105.2082 }, drawInfo: WY_DEER_DRAW["C"] },
    "19": { typical: '148-163"', topEnd: '175"',  trait: "Pine and sage mix.", description: "Region C — South of Buffalo.", coords: { lat: 43.9192, lng: -105.8339 }, drawInfo: WY_DEER_DRAW["C"] },
    "23": { typical: '150-165"', topEnd: '178"',  trait: "Bighorn Basin river bottoms.", description: "Region C — Bighorn Basin near Worland.", coords: { lat: 44.8328, lng: -106.5541 }, drawInfo: WY_DEER_DRAW["C"] },
    "26": { typical: '150-165"', topEnd: '178"',  trait: "Ten Sleep Canyon breaks.", description: "Region C — East Bighorn Basin near Ten Sleep.", coords: { lat: 44.4662, lng: -106.4124 }, drawInfo: WY_DEER_DRAW["C"] },
    "29": { typical: '148-163"', topEnd: '175"',  trait: "Bighorn foothills transition.", description: "Region C — South of Ten Sleep.", coords: { lat: 43.9525, lng: -106.4210 }, drawInfo: WY_DEER_DRAW["C"] },
    "31": { typical: '148-162"', topEnd: '173"',  trait: "Nowood River area.", description: "Region C — Nowood River area west of Buffalo.", coords: { lat: 43.5354, lng: -106.3257 }, drawInfo: WY_DEER_DRAW["C"] },
    "66": { typical: '140-158"', topEnd: '170"',  trait: "Casper area; sage and mountain foothills.", description: "Region D — Casper area near Bessemer Bend.", coords: { lat: 42.6020, lng: -106.3500 }, drawInfo: WY_DEER_DRAW["D"] },
    "70": { typical: '140-158"', topEnd: '170"',  trait: "Central WY sage and mixed terrain.", description: "Region D — Central WY near Lander foothills.", coords: { lat: 42.1391, lng: -106.5534 }, drawInfo: WY_DEER_DRAW["D"] },
    "74": { typical: '145-160"', topEnd: '172"',  trait: "Laramie Range south; rocky pine and sage.", description: "Region D — Laramie Range south of Casper.", coords: { lat: 41.6512, lng: -106.0477 }, drawInfo: WY_DEER_DRAW["D"] },
    "75": { typical: '145-160"', topEnd: '172"',  trait: "Shirley Basin transition.", description: "Region D — Laramie Range near Shirley Basin.", coords: { lat: 41.4565, lng: -106.1534 }, drawInfo: WY_DEER_DRAW["D"] },
    "76": { typical: '145-162"', topEnd: '175"',  trait: "Southern Laramie Range.", description: "Region D — Southern Laramie Range near Wheatland.", coords: { lat: 41.2038, lng: -106.0345 }, drawInfo: WY_DEER_DRAW["D"] },
    "77": { typical: '143-160"', topEnd: '172"',  trait: "Rocky timber and open ridge.", description: "Region D — Laramie Range east of Laramie.", coords: { lat: 41.1027, lng: -105.7347 }, drawInfo: WY_DEER_DRAW["D"] },
    "78": { typical: '150-165"', topEnd: '178"',  trait: "Sierra Madre; spruce/sage mix.", description: "Region D — Sierra Madre foothills near Encampment.", coords: { lat: 41.1911, lng: -106.4473 }, drawInfo: WY_DEER_DRAW["D"], residentDrawInfo: WY_DEER_RESIDENT["078_1"] },
    "79": { typical: '148-163"', topEnd: '175"',  trait: "Carbon County; Medicine Bow foothills.", description: "Region D — Carbon County near Saratoga.", coords: { lat: 41.6277, lng: -106.6790 }, drawInfo: WY_DEER_DRAW["D"], residentDrawInfo: WY_DEER_RESIDENT["079_1"] },
    "80": { typical: '150-165"', topEnd: '178"',  trait: "Sierra Madre canyon terrain.", description: "Region D — Sierra Madre near Baggs.", coords: { lat: 41.4711, lng: -107.0235 }, drawInfo: WY_DEER_DRAW["D"], residentDrawInfo: WY_DEER_RESIDENT["080_1"] },
    "81": { typical: '150-165"', topEnd: '178"',  trait: "South-central WY desert.", description: "Region D — South-central WY near Rawlins.", coords: { lat: 41.0935, lng: -106.7152 }, drawInfo: WY_DEER_DRAW["D"], residentDrawInfo: WY_DEER_RESIDENT["081_1"] },
    "88": { typical: '140-158"', topEnd: '170"',  trait: "Casper Mountain south slopes.", description: "Region D — Casper Mountain south slopes.", coords: { lat: 42.7090, lng: -106.6388 }, drawInfo: WY_DEER_DRAW["D"] },
    "106": { typical: '150-168"', topEnd: '182"', trait: "Absaroka Range; rugged volcanic terrain.", description: "Region F — Absaroka Range near Cody.", coords: { lat: 44.7778, lng: -109.6880 }, drawInfo: WY_DEER_DRAW["F"] },
    "109": { typical: '150-168"', topEnd: '182"', trait: "Shoshone NF timbered drainages.", description: "Region F — Shoshone NF near Cody.", coords: { lat: 44.6885, lng: -109.2552 }, drawInfo: WY_DEER_DRAW["F"], residentDrawInfo: WY_DEER_RESIDENT["109_3"] },
    "111": { typical: '152-168"', topEnd: '183"', trait: "Absaroka foothills east of Yellowstone.", description: "Region F — Absaroka foothills east of Yellowstone.", coords: { lat: 44.4717, lng: -109.5317 }, drawInfo: WY_DEER_DRAW["F"] },
    "113": { typical: '152-170"', topEnd: '185"', trait: "South Absaroka near Dubois.", description: "Region F — South Absaroka near Dubois.", coords: { lat: 44.3101, lng: -109.2508 }, drawInfo: WY_DEER_DRAW["F"] },
    "114": { typical: '155-170"', topEnd: '185"', trait: "Wind River Range north side.", description: "Region F — Wind River Range north side near Dubois.", coords: { lat: 43.9507, lng: -109.7089 }, drawInfo: WY_DEER_DRAW["F"] },
    "115": { typical: '152-168"', topEnd: '183"', trait: "Togwotee Pass high country.", description: "Region F — Togwotee Pass area.", coords: { lat: 44.1053, lng: -109.9390 }, drawInfo: WY_DEER_DRAW["F"] },
    "138": { typical: '155-172"', topEnd: '188"', trait: "Upper Green River; high sage and timber mix.", description: "Region H — Upper Green River near Pinedale.", coords: { lat: 42.4568, lng: -109.7119 }, drawInfo: WY_DEER_DRAW["H"], residentDrawInfo: WY_DEER_RESIDENT["138_3"] },
    "139": { typical: '158-175"', topEnd: '192"', trait: "Gros Ventre Range; rugged alpine terrain.", description: "Region H — Gros Ventre Range near Pinedale.", coords: { lat: 42.8881, lng: -109.7153 }, drawInfo: WY_DEER_DRAW["H"] },
    "140": { typical: '158-175"', topEnd: '192"', trait: "Gros Ventre River drainage.", description: "Region H — Gros Ventre River drainage south of Jackson.", coords: { lat: 43.0412, lng: -109.9260 }, drawInfo: WY_DEER_DRAW["H"] },
    "142": { typical: '155-172"', topEnd: '188"', trait: "Snake River Range; timbered canyons.", description: "Region H — Snake River Range near Alpine.", coords: { lat: 42.8932, lng: -110.2856 }, drawInfo: WY_DEER_DRAW["H"] },
    "146": { typical: '158-175"', topEnd: '192"', trait: "Hoback Basin alpine.", description: "Region H — Hoback Basin near Jackson.", coords: { lat: 43.5236, lng: -110.0919 }, drawInfo: WY_DEER_DRAW["H"] },
    "149": { typical: '158-172"', topEnd: '188"', trait: "Teton Range east side.", description: "Region H — Teton Range east side near Jackson.", coords: { lat: 43.8582, lng: -110.9525 }, drawInfo: WY_DEER_DRAW["H"], residentDrawInfo: WY_DEER_RESIDENT["149_3"] },
    "150": { typical: '160-175"', topEnd: '192"', trait: "Gros Ventre Wilderness.", description: "Region H — Gros Ventre Wilderness near Jackson.", coords: { lat: 43.5463, lng: -110.8312 }, drawInfo: WY_DEER_DRAW["H"] },
    "151": { typical: '155-170"', topEnd: '187"', trait: "South Jackson Hole.", description: "Region H — South Jackson Hole.", coords: { lat: 43.3399, lng: -110.9195 }, drawInfo: WY_DEER_DRAW["H"] },
    "152": { typical: '155-170"', topEnd: '185"', trait: "Hoback River drainage.", description: "Region H — Hoback River drainage.", coords: { lat: 43.3100, lng: -110.5940 }, drawInfo: WY_DEER_DRAW["H"] },
    "153": { typical: '155-170"', topEnd: '185"', trait: "Upper Hoback near Bondurant.", description: "Region H — Upper Hoback near Bondurant.", coords: { lat: 43.1066, lng: -110.5032 }, drawInfo: WY_DEER_DRAW["H"] },
    "154": { typical: '158-172"', topEnd: '188"', trait: "Wyoming Range north.", description: "Region H — Wyoming Range north end near Merna.", coords: { lat: 43.1892, lng: -110.3101 }, drawInfo: WY_DEER_DRAW["H"] },
    "155": { typical: '158-173"', topEnd: '190"', trait: "Wyoming Range central.", description: "Region H — Wyoming Range central near Big Piney.", coords: { lat: 43.4979, lng: -110.4456 }, drawInfo: WY_DEER_DRAW["H"] },
    "156": { typical: '155-170"', topEnd: '187"', trait: "Upper Green River; open sage parks.", description: "Region H — Upper Green River.", coords: { lat: 43.6063, lng: -110.3541 }, drawInfo: WY_DEER_DRAW["H"] },
    "59": { typical: '145-162"', topEnd: '175"',  trait: "Laramie Range foothills.", description: "Region J — Laramie Range foothills near Cheyenne.", coords: { lat: 41.5891, lng: -105.1680 }, drawInfo: WY_DEER_DRAW["J"], residentDrawInfo: WY_DEER_RESIDENT["059_3"] },
    "61": { typical: '145-160"', topEnd: '172"',  trait: "Laramie Mountains south end.", description: "Region J — Laramie Mountains south end near Laramie.", coords: { lat: 41.0986, lng: -105.2775 }, drawInfo: WY_DEER_DRAW["J"] },
    "64": { typical: '148-165"', topEnd: '178"',  trait: "North Platte River valley.", description: "Region J — North Platte River valley near Wheatland.", coords: { lat: 42.1026, lng: -105.5897 }, drawInfo: WY_DEER_DRAW["J"], residentDrawInfo: WY_DEER_RESIDENT["064_2"] },
    "65": { typical: '145-162"', topEnd: '175"',  trait: "Platte Valley near Casper.", description: "Region J — Platte Valley near Casper.", coords: { lat: 42.5950, lng: -105.6046 }, drawInfo: WY_DEER_DRAW["J"], residentDrawInfo: WY_DEER_RESIDENT["065_3"] },
    "132": { typical: '152-168"', topEnd: '182"', trait: "Bridger-Teton NF west side.", description: "Region K — Bridger-Teton NF west side near Kemmerer.", coords: { lat: 41.2429, lng: -109.9452 }, drawInfo: WY_DEER_DRAW["K"], residentDrawInfo: WY_DEER_RESIDENT["132_3"] },
    "133": { typical: '155-170"', topEnd: '185"', trait: "Overthrust Belt near Evanston.", description: "Region K — Overthrust Belt near Evanston.", coords: { lat: 41.1544, lng: -110.7549 }, drawInfo: WY_DEER_DRAW["K"] },
    "134": { typical: '153-168"', topEnd: '182"', trait: "Bear River Divide.", description: "Region K — Bear River Divide near Evanston.", coords: { lat: 41.6134, lng: -110.5324 }, drawInfo: WY_DEER_DRAW["K"] },
    "168": { typical: '152-168"', topEnd: '182"', trait: "SW WY near Kemmerer.", description: "Region K — SW WY near Kemmerer/Fontenelle.", coords: { lat: 41.9800, lng: -110.5500 }, drawInfo: WY_DEER_DRAW["K"] },
    "92":  { typical: '155-170"', topEnd: '183"', trait: "Wind River Range west side.", description: "Region L — Wind River Range west side near Pinedale.", coords: { lat: 42.6848, lng: -108.9138 }, drawInfo: WY_DEER_DRAW["L"], residentDrawInfo: WY_DEER_RESIDENT["092_3"] },
    "94":  { typical: '153-168"', topEnd: '180"', trait: "Wind River Basin.", description: "Region L — Wind River Basin near Riverton.", coords: { lat: 42.4835, lng: -108.4837 }, drawInfo: WY_DEER_DRAW["L"] },
    "148": { typical: '158-173"', topEnd: '188"', trait: "Gros Ventre Range south.", description: "Region L — Gros Ventre Range south near Pinedale.", coords: { lat: 43.9657, lng: -110.2965 }, drawInfo: WY_DEER_DRAW["L"], residentDrawInfo: WY_DEER_RESIDENT["148_3"] },
    "157": { typical: '155-170"', topEnd: '183"', trait: "Wind River Range east foothills.", description: "Region L — Wind River Range east foothills.", coords: { lat: 43.5135, lng: -109.8458 }, drawInfo: WY_DEER_DRAW["L"], residentDrawInfo: WY_DEER_RESIDENT["157_3"] },
    "160": { typical: '155-170"', topEnd: '183"', trait: "Wyoming Range south.", description: "Region L — Wyoming Range south near Big Piney.", coords: { lat: 43.1672, lng: -110.1557 }, drawInfo: WY_DEER_DRAW["L"] },
    "171": { typical: '153-168"', topEnd: '180"', trait: "Green River Basin near Pinedale.", description: "Region L — Green River Basin near Pinedale.", coords: { lat: 42.8600, lng: -109.8500 }, drawInfo: WY_DEER_DRAW["L"], residentDrawInfo: WY_DEER_RESIDENT["171_3"] },
    "35": { typical: '148-163"', topEnd: '175"',  trait: "Wind River Canyon north.", description: "Region M — Wind River Canyon north near Thermopolis.", coords: { lat: 43.5212, lng: -107.3430 }, drawInfo: WY_DEER_DRAW["M"] },
    "36": { typical: '148-163"', topEnd: '175"',  trait: "Owl Creek Mountains.", description: "Region M — Owl Creek Mountains near Thermopolis.", coords: { lat: 43.3152, lng: -107.7048 }, drawInfo: WY_DEER_DRAW["M"] },
    "37": { typical: '150-165"', topEnd: '178"',  trait: "Wind River Range east foothills near Riverton.", description: "Region M — Wind River Range east foothills near Riverton.", coords: { lat: 43.6216, lng: -108.0202 }, drawInfo: WY_DEER_DRAW["M"] },
    "39": { typical: '148-162"', topEnd: '173"',  trait: "Bighorn Basin south.", description: "Region M — Bighorn Basin south near Worland.", coords: { lat: 43.6258, lng: -107.6587 }, drawInfo: WY_DEER_DRAW["M"] },
    "40": { typical: '148-162"', topEnd: '173"',  trait: "Bighorn Basin west.", description: "Region M — Bighorn Basin west near Thermopolis.", coords: { lat: 43.8661, lng: -107.3083 }, drawInfo: WY_DEER_DRAW["M"] },
    "164": { typical: '155-170"', topEnd: '182"', trait: "Wyoming Range south near Afton.", description: "Region M — Wyoming Range south near Afton/Star Valley.", coords: { lat: 42.5456, lng: -110.2263 }, drawInfo: WY_DEER_DRAW["M"], residentDrawInfo: WY_DEER_RESIDENT["164_1"] },
    "34": { typical: '150-165"', topEnd: '178"',  trait: "Laramie Range south of Douglas.", description: "Region Q — Laramie Range south of Douglas.", coords: { lat: 43.2053, lng: -106.7858 }, drawInfo: WY_DEER_DRAW["Q"], residentDrawInfo: WY_DEER_RESIDENT["034_1"] },
    "96": { typical: '148-163"', topEnd: '175"',  trait: "Carbon County high desert plateau.", description: "Region Q — Carbon County near Rawlins.", coords: { lat: 42.3594, lng: -107.8434 }, drawInfo: WY_DEER_DRAW["Q"] },
    "97": { typical: '150-165"', topEnd: '178"',  trait: "Atlantic Rim area.", description: "Region Q — Atlantic Rim area north of Rawlins.", coords: { lat: 42.5927, lng: -107.6180 }, drawInfo: WY_DEER_DRAW["Q"] },
    "98": { typical: '148-163"', topEnd: '175"',  trait: "Carbon County west.", description: "Region Q — Carbon County west of Rawlins.", coords: { lat: 41.9595, lng: -107.6732 }, drawInfo: WY_DEER_DRAW["Q"] },
    "41": { typical: '155-170"', topEnd: '183"',  trait: "Bighorn Mountains east slopes.", description: "Region R — Bighorn Mountains east slopes near Sheridan.", coords: { lat: 44.1522, lng: -107.6356 }, drawInfo: WY_DEER_DRAW["R"] },
    "46": { typical: '155-170"', topEnd: '183"',  trait: "Ten Sleep Canyon breaks.", description: "Region R — Bighorn Mountains near Ten Sleep Canyon.", coords: { lat: 44.3612, lng: -107.3059 }, drawInfo: WY_DEER_DRAW["R"] },
    "47": { typical: '158-172"', topEnd: '185"',  trait: "Bighorn Mountains west slopes.", description: "Region R — Bighorn Mountains west slopes.", coords: { lat: 44.4014, lng: -107.7434 }, drawInfo: WY_DEER_DRAW["R"] },
    "50": { typical: '155-170"', topEnd: '182"',  trait: "North Bighorn Mountains near Lovell.", description: "Region R — North Bighorn Mountains near Lovell.", coords: { lat: 44.6761, lng: -107.7078 }, drawInfo: WY_DEER_DRAW["R"] },
    "51": { typical: '150-165"', topEnd: '178"',  trait: "Bighorn Basin north near Greybull.", description: "Region R — Bighorn Basin north near Greybull.", coords: { lat: 44.5980, lng: -107.9057 }, drawInfo: WY_DEER_DRAW["R"] },
    "52": { typical: '155-170"', topEnd: '182"',  trait: "North Bighorn Mountains.", description: "Region R — North Bighorn Mountains near Lovell.", coords: { lat: 44.7151, lng: -108.0488 }, drawInfo: WY_DEER_DRAW["R"] },
    "53": { typical: '152-168"', topEnd: '180"',  trait: "Pryor Mountains near Lovell.", description: "Region R — Pryor Mountains near Lovell.", coords: { lat: 44.9022, lng: -108.0285 }, drawInfo: WY_DEER_DRAW["R"] },
    "15": { typical: '145-165"', topEnd: '178"',  trait: "Large SE WY region; classic ponderosa and sage.", description: "Region T — Laramie Range near Wheatland/Cheyenne.", coords: { lat: 41.9015, lng: -104.4918 }, drawInfo: WY_DEER_DRAW["T"] },
    "82":  { typical: '150-165"', topEnd: '180"', trait: "Little Snake River; open desert adjacent to Unit 87.", description: "Region W — Little Snake River area near Baggs.", coords: { lat: 41.2118, lng: -107.3855 }, drawInfo: WY_DEER_DRAW["W"], residentDrawInfo: WY_DEER_RESIDENT["082_3"] },
    "84":  { typical: '150-165"', topEnd: '180"', trait: "Washakie Basin; high desert sage.", description: "Region W — Washakie Basin near Rawlins.", coords: { lat: 41.5957, lng: -107.4793 }, drawInfo: WY_DEER_DRAW["W"] },
    "100": { typical: '148-163"', topEnd: '178"', trait: "Red Desert near Rock Springs.", description: "Region W — Red Desert near Rock Springs.", coords: { lat: 41.3417, lng: -108.0874 }, drawInfo: WY_DEER_DRAW["W"] },
    "131": { typical: '150-165"', topEnd: '178"', trait: "Upper Green River; sage and mountain transition.", description: "Region W — Upper Green River near Pinedale.", coords: { lat: 41.9533, lng: -108.9003 }, drawInfo: WY_DEER_DRAW["W"] },
    "121": { typical: '153-168"', topEnd: '182"', trait: "Absaroka near Meeteetse.", description: "Region X — Absaroka Range near Meeteetse.", coords: { lat: 44.7854, lng: -108.9844 }, drawInfo: WY_DEER_DRAW["X"], residentDrawInfo: WY_DEER_RESIDENT["121_3"] },
    "122": { typical: '150-165"', topEnd: '178"', trait: "Bighorn Basin east rim.", description: "Region X — Bighorn Basin east rim near Greybull.", coords: { lat: 44.7417, lng: -108.5693 }, drawInfo: WY_DEER_DRAW["X"], residentDrawInfo: WY_DEER_RESIDENT["122_3"] },
    "123": { typical: '152-168"', topEnd: '182"', trait: "South Absaroka near Meeteetse.", description: "Region X — South Absaroka near Meeteetse.", coords: { lat: 44.8933, lng: -108.2510 }, drawInfo: WY_DEER_DRAW["X"] },
    "124": { typical: '155-170"', topEnd: '183"', trait: "Wind River Range north near Dubois.", description: "Region X — Wind River Range north near Dubois.", coords: { lat: 44.4654, lng: -108.3124 }, drawInfo: WY_DEER_DRAW["X"], residentDrawInfo: WY_DEER_RESIDENT["124_3"] },
    "125": { typical: '155-170"', topEnd: '183"', trait: "Wind River Range central.", description: "Region X — Wind River Range central near Dubois.", coords: { lat: 44.1288, lng: -108.3381 }, drawInfo: WY_DEER_DRAW["X"], residentDrawInfo: WY_DEER_RESIDENT["125_1"] },
    "127": { typical: '152-168"', topEnd: '180"', trait: "Wind River Range SE near Lander.", description: "Region X — Wind River Range southeast near Lander.", coords: { lat: 43.8205, lng: -108.3115 }, drawInfo: WY_DEER_DRAW["X"], residentDrawInfo: WY_DEER_RESIDENT["127_3"] },
    "165": { typical: '153-168"', topEnd: '182"', trait: "Wyoming Range south near Kemmerer.", description: "Region X — Wyoming Range south near Kemmerer.", coords: { lat: 42.8427, lng: -109.9142 }, drawInfo: WY_DEER_DRAW["X"], residentDrawInfo: WY_DEER_RESIDENT["165_1"] },
    "24":  { typical: '150-165"', topEnd: '180"', trait: "Bighorn Basin near Worland; migration corridor.", description: "Region Y — Bighorn Basin near Worland.", coords: { lat: 44.7986, lng: -107.1640 }, drawInfo: WY_DEER_DRAW["Y"] },
    "25":  { typical: '150-165"', topEnd: '178"', trait: "Bighorn Basin north near Lovell.", description: "Region Y — Bighorn Basin north near Lovell.", coords: { lat: 44.7215, lng: -107.4416 }, drawInfo: WY_DEER_DRAW["Y"] },
    "27":  { typical: '148-163"', topEnd: '175"', trait: "Bighorn Basin south.", description: "Region Y — Bighorn Basin south near Worland.", coords: { lat: 44.3682, lng: -106.8034 }, drawInfo: WY_DEER_DRAW["Y"] },
    "28":  { typical: '148-163"', topEnd: '175"', trait: "South Bighorn Basin.", description: "Region Y — South Bighorn Basin near Ten Sleep.", coords: { lat: 44.2766, lng: -106.9904 }, drawInfo: WY_DEER_DRAW["Y"] },
    "30":  { typical: '148-163"', topEnd: '175"', trait: "Bighorn Basin east side near Buffalo.", description: "Region Y — Bighorn Basin east side near Buffalo.", coords: { lat: 44.0141, lng: -106.8321 }, drawInfo: WY_DEER_DRAW["Y"] },
    "32":  { typical: '148-163"', topEnd: '175"', trait: "Bighorn Basin south.", description: "Region Y — Bighorn Basin south near Worland.", coords: { lat: 43.7567, lng: -107.0416 }, drawInfo: WY_DEER_DRAW["Y"] },
    "33":  { typical: '148-163"', topEnd: '175"', trait: "East Bighorn Basin near Hyattville.", description: "Region Y — East Bighorn Basin near Hyattville.", coords: { lat: 43.6673, lng: -106.7737 }, drawInfo: WY_DEER_DRAW["Y"] },
    "163": { typical: '153-168"', topEnd: '180"', trait: "Wyoming Range south near Afton.", description: "Region Y — Wyoming Range south near Afton.", coords: { lat: 42.6020, lng: -110.5284 }, drawInfo: WY_DEER_DRAW["Y"] },
    "169": { typical: '153-168"', topEnd: '180"', trait: "Upper Green River near Pinedale.", description: "Region Y — Upper Green River near Pinedale.", coords: { lat: 43.6163, lng: -109.8052 }, drawInfo: WY_DEER_DRAW["Y"] },
  },

  // ============================================================
  // WYOMING — ANTELOPE
  // ============================================================
  WYOMING_ANTELOPE: {
    "57": { typical: '74-78"', topEnd: '84"+', trait: "Red Desert giants; long prongs.", description: "Southwest of Rawlins (South Wamsutter). Classic Red Desert sagebrush flats.", coords: { lat: 41.6521, lng: -108.2145 } },
    "60": { typical: '72-76"', topEnd: '82"',  trait: "High density; consistent horn length.", description: "Table Mountain area North of Rock Springs. Rolling sage hills.", coords: { lat: 41.9214, lng: -109.0521 } },
    "73": { typical: '72-77"', topEnd: '81"',  trait: "Massive public access (BLM).", description: "North of Casper. Expansive sagebrush flats and rolling prairie.", coords: { lat: 43.1524, lng: -106.3521 } },
  },

  // ============================================================
  // WYOMING — ELK
  // ============================================================
  WYOMING_ELK: {
    "100": { typical: '310-330"', topEnd: '370"+', trait: "Desert elk; massive travel distances.", description: "Red Desert region North of Rock Springs. Flat sage and sand dunes. No timber.", coords: { lat: 42.1524, lng: -108.4521 } },
    "124": { typical: '320-340"', topEnd: '380"+', trait: "Powder Rim genetics; high mass.", description: "Southwest WY near Baggs. Deep canyons, sage flats, and juniper ridges.", coords: { lat: 41.1524, lng: -107.9821 } },
    "7":   { typical: '320-340"', topEnd: '370"+', trait: "Laramie Peak giants; extreme mass.", description: "Laramie Peak area. Rugged granite peaks mixed with private ranch land.", coords: { lat: 42.4332, lng: -105.7001 } },
    "31":  { typical: '310-330"', topEnd: '360"',  trait: "Hat Six / Casper Mountain resident herds.", description: "Just South of Casper. Mixed private/public mountain and brush terrain.", coords: { lat: 42.7521, lng: -106.2821 } },
  },

  // ============================================================
  // WYOMING — MOOSE
  // ============================================================
  WYOMING_MOOSE: {
    "1":  { typical: '35-42" width', topEnd: '50"+', trait: "Shoshone river bottom genetics.", description: "Northwest WY, North of Cody. River bottoms and willow thickets.", coords: { lat: 44.7521, lng: -109.5241 } },
    "5":  { typical: '38-46" width', topEnd: '52"',  trait: "Upper Green River giants.", description: "North of Pinedale. High alpine river drainages and willow basins.", coords: { lat: 43.2524, lng: -109.9521 } },
    "38": { typical: '38-45" width', topEnd: '52"',  trait: "Snowy Range alpine moose.", description: "Medicine Bow Mountains near Laramie. High elevation timber and lakes.", coords: { lat: 41.3421, lng: -106.3124 } },
  },

  // ============================================================
  // WYOMING — BIGHORN SHEEP
  // ============================================================
  WYOMING_BIGHORNSHEEP: {
    "4":  { typical: '160-170"', topEnd: '180"+', trait: "Absaroka wilderness rams.", description: "Younts Peak area. Remote wilderness, extremely rugged volcanic rock.", coords: { lat: 43.9521, lng: -109.8142 } },
    "19": { typical: '175-182"', topEnd: '190"+', trait: "Laramie Peak giants.", description: "Laramie Peak. Granite outcrops and steep canyons. Fast-growing rams.", coords: { lat: 42.3241, lng: -105.8124 } },
  },

  // ============================================================
  // WYOMING — MOUNTAIN GOAT
  // ============================================================
  WYOMING_MTNGOAT: {
    "1": { typical: '8-9" horns', topEnd: '10"+',  trait: "Beartooth Plateau genetics.", description: "North of Cody, Beartooth Mountains. High alpine tundra above 10,000ft.", coords: { lat: 44.9524, lng: -109.4521 } },
    "3": { typical: '9" horns',   topEnd: '10.5"', trait: "North Absaroka herd.", description: "North of Sunlight Basin. Remote wilderness cliffs and alpine ridges.", coords: { lat: 44.8214, lng: -109.7521 } },
  },

  // ============================================================
  // IDAHO — MULE DEER
  // ============================================================
  IDAHO_DEER: {
    "67":  { typical: '150-165"', topEnd: '180"+', trait: "Steep terrain; migratory.", description: "Palisades area near Swan Valley and the Wyoming border. High elevation timber dropping into the South Fork Snake River.", coords: { lat: 43.4000, lng: -111.3000 } },
    "36B": { typical: '155-170"', topEnd: '185"+', trait: "Salmon River canyon genetics; almost entirely public land.", description: "Salmon Unit, central Idaho near Salmon. Rugged canyon to alpine terrain.", coords: { lat: 45.1821, lng: -114.0124 } },
    "28":  { typical: '155-168"', topEnd: '180"+', trait: "Big logged country; steep spotting terrain.", description: "Just west of Salmon, ID. Nearly 100% public land.", coords: { lat: 45.0214, lng: -114.3521 } },
    "45":  { typical: '158-172"', topEnd: '185"',  trait: "Lower hunter pressure; solid 160+ class bucks.", description: "Smokey-Bennett unit, south-central Idaho.", coords: { lat: 43.8521, lng: -115.0214 } },
    "44":  { typical: '160-175"', topEnd: '190"+', trait: "Controlled hunt quality; rugged backcountry.", description: "South-central Idaho near Fairfield.", coords: { lat: 43.5124, lng: -114.8821 } },
    "52":  { typical: '162-178"', topEnd: '195"+', trait: "Hells Canyon rim genetics; giant frames.", description: "Western Idaho near Weiser. Hells Canyon breaks and rimrock country.", coords: { lat: 44.7521, lng: -116.9821 } },
    "55":  { typical: '160-178"', topEnd: '190"+', trait: "South Hills early velvet genetics.", description: "South Hills near Twin Falls.", coords: { lat: 42.3521, lng: -114.5214 } },
    "40":  { typical: '158-172"', topEnd: '185"',  trait: "Central Idaho wilderness transition.", description: "Central Idaho near Challis.", coords: { lat: 44.5121, lng: -114.2214 } },
  },

  // ============================================================
  // IDAHO — ELK
  // ============================================================
  IDAHO_ELK: {
    "67": { typical: '270-300"', topEnd: '330"+', trait: "Palisades Zone; steep and thick.", description: "Palisades Zone near Swan Valley, Irwin, and the Wyoming border.", coords: { lat: 43.4000, lng: -111.3000 } },
    "54": { typical: '330-355"', topEnd: '390"+', trait: "Top trophy genetics in Idaho.", description: "South-central Idaho near Twin Falls.", coords: { lat: 42.5821, lng: -114.8124 } },
    "40": { typical: '320-345"', topEnd: '375"+', trait: "Remote wilderness bulls; extreme mass.", description: "Central Idaho Salmon River Mountains near Challis.", coords: { lat: 44.5121, lng: -114.2214 } },
    "42": { typical: '320-345"', topEnd: '370"+', trait: "Trophy controlled hunt; wilderness access required.", description: "Frank Church Wilderness, central Idaho.", coords: { lat: 44.8921, lng: -114.9521 } },
    "44": { typical: '315-340"', topEnd: '370"',  trait: "High alpine rut bulls; hard draw.", description: "South-central Idaho near Fairfield/Soldier Mountains.", coords: { lat: 43.5124, lng: -114.8821 } },
    "45": { typical: '310-335"', topEnd: '365"',  trait: "Smokey-Bennett bulls; lower pressure.", description: "Smokey-Bennett area south of Boise.", coords: { lat: 43.8521, lng: -115.0214 } },
    "30": { typical: '310-330"', topEnd: '360"',  trait: "Clearwater zone bulls; heavy timber.", description: "North-central Idaho, Clearwater River drainage.", coords: { lat: 46.5214, lng: -115.6821 } },
    "76": { typical: '305-325"', topEnd: '355"',  trait: "High harvest OTC; big desert elk.", description: "Southeast Idaho near Pocatello.", coords: { lat: 42.8521, lng: -112.4514 } },
  },

  // ============================================================
  // IDAHO — ANTELOPE
  // ============================================================
  IDAHO_ANTELOPE: {
    "56": { typical: '68-74"', topEnd: '80"+', trait: "Bennett Hills giants; top Idaho pronghorn.", description: "Bennett Hills area southwest of Gooding.", coords: { lat: 43.0214, lng: -115.2521 } },
    "57": { typical: '66-72"', topEnd: '78"',  trait: "Owyhee Desert long-prong genetics.", description: "Owyhee County, southwest Idaho.", coords: { lat: 42.4521, lng: -115.9821 } },
    "69": { typical: '65-71"', topEnd: '76"',  trait: "Magic Valley flats; good density.", description: "South-central Idaho near Twin Falls.", coords: { lat: 42.5821, lng: -114.1214 } },
    "67": { typical: '66-72"', topEnd: '77"',  trait: "Snake River Plain access.", description: "Eastern Snake River Plain near American Falls.", coords: { lat: 42.7821, lng: -113.0521 } },
  },

  // ============================================================
  // IDAHO — MOOSE
  // ============================================================
  IDAHO_MOOSE: {
    "29":  { typical: '38-46" width', topEnd: '52"+', trait: "Salmon River Shiras giants.", description: "Salmon River drainage, central Idaho.", coords: { lat: 45.1521, lng: -114.2821 } },
    "51":  { typical: '38-45" width', topEnd: '50"',  trait: "Lemhi zone; remote wilderness bulls.", description: "Lemhi Mountains, central Idaho near Leadore.", coords: { lat: 44.6821, lng: -113.3521 } },
    "73":  { typical: '36-44" width', topEnd: '50"',  trait: "Southeast Idaho; accessible draw unit.", description: "Southeast Idaho near Pocatello.", coords: { lat: 42.8714, lng: -112.5024 } },
    "37A": { typical: '40-48" width', topEnd: '54"+', trait: "Top trophy Shiras unit.", description: "Pioneer Mountains and Big Lost River drainage, central Idaho.", coords: { lat: 43.9214, lng: -114.0821 } },
  },

  // ============================================================
  // IDAHO — BIGHORN SHEEP
  // ============================================================
  IDAHO_BIGHORNSHEEP: {
    "36B": { typical: '155-168"', topEnd: '180"+', trait: "Salmon River canyon Rocky Mountain rams.", description: "Salmon unit, central Idaho.", coords: { lat: 45.1821, lng: -114.0124 } },
    "28":  { typical: '155-165"', topEnd: '175"',  trait: "Remote wilderness rams; low pressure.", description: "West of Salmon, ID.", coords: { lat: 45.0214, lng: -114.3521 } },
    "29":  { typical: '158-170"', topEnd: '182"+', trait: "Salmon drainage top-end rams.", description: "Salmon River Mountains.", coords: { lat: 45.1521, lng: -114.2821 } },
    "37A": { typical: '150-162"', topEnd: '172"',  trait: "Pioneer Mountains California bighorn.", description: "Central Idaho Pioneer Mountains.", coords: { lat: 43.9214, lng: -114.0821 } },
  },

  // ============================================================
  // IDAHO — MOUNTAIN GOAT
  // ============================================================
  IDAHO_MTNGOAT: {
    "10":  { typical: '8-9" horns',     topEnd: '10"',    trait: "Clearwater high country goats.", description: "North-central Idaho, Clearwater Mountains.", coords: { lat: 46.4821, lng: -115.1521 } },
    "20":  { typical: '8.5-9.5" horns', topEnd: '10.5"+', trait: "Salmon River Mountain goats.", description: "Central Idaho, Salmon River Mountains near Challis.", coords: { lat: 44.8521, lng: -114.4021 } },
    "29":  { typical: '8-9" horns',     topEnd: '10"',    trait: "Remote wilderness goats; best odds.", description: "Salmon drainage wilderness, central Idaho.", coords: { lat: 45.1521, lng: -114.2821 } },
    "36B": { typical: '8.5-9.5" horns', topEnd: '10.5"',  trait: "Salmon unit alpine cliffs.", description: "Salmon unit, central Idaho.", coords: { lat: 45.1821, lng: -114.0124 } },
  },

  // ============================================================
  // UTAH — MULE DEER
  // ============================================================
  UTAH_DEER: {
    "Henry Mountains": {
      typical: '170-190"', topEnd: '210"+', trait: "World-class desert giants; free-roaming bison herd; extreme terrain.",
      description: "Henry Mountains, south-central Utah. Isolated range rising from canyon country. Home to a free-roaming bison herd. Steep, rocky terrain demands high fitness.",
      coords: { lat: 37.9833, lng: -110.7833 },
      utahDrawInfo: { drawType: 'premium-limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: null, randomOddsNR: "~0.5% or less", waitingPeriod: "5 years", notes: "Roughly 3 NR rifle tags per year. Near-impossible NR draw. Conservation/CWMU tags available from outfitters ($20k-$40k)." }
    },
    "Paunsaugunt": {
      typical: '170-190"', topEnd: '205"+', trait: "Migration hunt; thick P-J terrain; rutting bucks vulnerable late season.",
      description: "Paunsaugunt Plateau, southwest Utah adjacent to Bryce Canyon. Pinion-juniper and ponderosa terrain. Migration-dependent hunt.",
      coords: { lat: 37.6500, lng: -112.2000 },
      utahDrawInfo: { drawType: 'premium-limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: null, randomOddsNR: "~0.5% or less", waitingPeriod: "5 years", notes: "Management and cactus buck hunts also available. Migration timing critical — go guided. Archery/ML recommended over rifle." }
    },
    "Book Cliffs": {
      typical: '150-170"', topEnd: '185"', trait: "High deer density; large roadless area.",
      description: "Book Cliffs, northeast Utah. Large, rugged unit with extensive roadless backcountry. High deer density with many mature 4-point bucks.",
      coords: { lat: 39.6500, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 8, bonusPointsToGuarantee: 12, randomOddsNR: "~1-2%", waitingPeriod: "5 years", notes: "HAMSS hunt also available Nov. Best for action hunters without needing a true giant." }
    },
    "Fillmore Oak Creek": {
      typical: '165-185"', topEnd: '200"+', trait: "Top-tier genetics; high Fishlake Plateau.",
      description: "Oak Creek/Fillmore area, central Utah. High Fishlake Plateau with oak brush and aspen. Consistently produces 180\"+ bucks.",
      coords: { lat: 38.9500, lng: -112.1000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: 18, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "Top 3 standard LE unit in Utah for trophy potential. Expect 15-20+ points to guarantee." }
    },
    "San Juan": {
      typical: '160-180"', topEnd: '195"+', trait: "Canyon country; deep draws; Canyonlands genetics.",
      description: "San Juan/southeast Utah. Canyon and mesa country bordering Colorado. Remote drainages hold mature bucks.",
      coords: { lat: 37.5000, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 15, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "Consistent 180\"+ producer. Physical hunt." }
    },
    "La Sal Dolores Triangle": {
      typical: '160-178"', topEnd: '192"', trait: "La Sal Mountains; 13,000ft peaks; Colorado border genetics.",
      description: "La Sal Mountains, southeast Utah near Moab. Dramatic terrain from canyon desert to alpine peaks.",
      coords: { lat: 38.4500, lng: -109.2500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 12, randomOddsNR: "~1-2%", waitingPeriod: "5 years", notes: "Good DIY potential." }
    },
    "Diamond Mountain": {
      typical: '155-172"', topEnd: '185"', trait: "Northeast Utah; accessible; better draw odds.",
      description: "Diamond Mountain/South Slope, northeast Utah. Timbered ridges and sage parks.",
      coords: { lat: 40.7000, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 8, bonusPointsToGuarantee: 10, randomOddsNR: "~2-3%", waitingPeriod: "5 years", notes: "Recommended for hunters wanting to burn points sooner on a quality hunt." }
    },
    "Vernon": {
      typical: '155-172"', topEnd: '185"', trait: "West Desert freaks; 90% public BLM.",
      description: "Vernon/West Desert, west-central Utah. 90% public BLM land. Known for producing surprise freaks and tall forkies.",
      coords: { lat: 40.0900, lng: -112.4200 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 6, bonusPointsToGuarantee: 10, randomOddsNR: "~2-3%", waitingPeriod: "5 years", notes: "Good value for hunters wanting public land without burning max points." }
    },
    "Thousand Lake": {
      typical: '158-175"', topEnd: '190"', trait: "Newly moved to LE 2025; improving trophy quality.",
      description: "Thousand Lake Mountain, south-central Utah. Moved from general to limited-entry in 2025.",
      coords: { lat: 38.3500, lng: -111.5500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: null, randomOddsNR: "Unknown — new LE unit 2025", waitingPeriod: "5 years", notes: "New LE unit as of 2025. Restricted muzzleloader/rifle only." }
    },
    "Boulder Kaiparowits": {
      typical: '155-172"', topEnd: '183"', trait: "Grand Staircase canyon country; remote.",
      description: "Boulder/Kaiparowits area, south-central Utah. Grand Staircase-Escalante country.",
      coords: { lat: 37.7500, lng: -111.4000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 10, randomOddsNR: "~1-2%", waitingPeriod: "5 years", notes: "Restricted weapon 2025. HAMSS hunt in November for rutting buck opportunity." }
    },
    "Monroe": {
      typical: '145-162"', topEnd: '175"', trait: "General season preference draw; roadless and steep.",
      description: "Monroe Mountain, central Utah. Roadless, steep Fishlake NF terrain.",
      coords: { lat: 38.6200, lng: -112.1500 },
      utahDrawInfo: { drawType: 'general-season', pointSystem: 'preference', nrAllocation: "10% of total tags", nrTagsApprox: 10, bonusPointsToGuarantee: 5, randomOddsNR: "~5-8% at 0 points", waitingPeriod: "Points reset to 0 upon drawing", notes: "Preference point draw. Highest points draw first." }
    },
    "LaSal General": {
      typical: '140-160"', topEnd: '172"', trait: "General season; desert to alpine terrain.",
      description: "La Sal Mountains general season unit, southeast Utah.",
      coords: { lat: 38.4500, lng: -109.2500 },
      utahDrawInfo: { drawType: 'general-season', pointSystem: 'preference', nrAllocation: "10% of total tags", nrTagsApprox: 12, bonusPointsToGuarantee: 3, randomOddsNR: "~8-12% at 0 points", waitingPeriod: "Points reset to 0 upon drawing", notes: "General season preference draw. Good DIY terrain." }
    },
  },

  // ============================================================
  // UTAH — ELK
  // ============================================================
  UTAH_ELK: {
    "San Juan": {
      typical: '340-370"', topEnd: '400"+', trait: "Utah most coveted elk tag; world-class bulls.",
      description: "San Juan unit, southeast Utah. Canyon and mesa terrain producing some of the largest bulls in the West annually.",
      coords: { lat: 37.5000, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 2, bonusPointsToGuarantee: null, randomOddsNR: "< 0.1%", waitingPeriod: "5 years", notes: "Effectively lottery-only for NR. World-class 400\"+ bulls documented annually." }
    },
    "Fillmore Pahvant": {
      typical: '340-370"', topEnd: '400"+', trait: "Pahvant Range; highest elk density; rutting bulls everywhere.",
      description: "Pahvant Range, central Utah near Fillmore. Highest elk density among trophy units.",
      coords: { lat: 38.9000, lng: -112.3000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 2, bonusPointsToGuarantee: null, randomOddsNR: "< 0.1%", waitingPeriod: "5 years", notes: "NR essentially lottery-only. World-class 400\"+ bulls." }
    },
    "Monroe Elk": {
      typical: '340-365"', topEnd: '395"+', trait: "Fishlake high country; roadless timber.",
      description: "Monroe Mountain, central Utah. High Fishlake Plateau. Roadless and steep.",
      coords: { lat: 38.6200, lng: -112.1500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: null, randomOddsNR: "< 0.2%", waitingPeriod: "5 years", notes: "Effectively lottery-only for NR. Top 3 elk unit in Utah." }
    },
    "Boulder Elk": {
      typical: '340-368"', topEnd: '395"+', trait: "Boulder Mountain high plateau; dense timber.",
      description: "Boulder Mountain, south-central Utah. High plateau with dense timber and open parks.",
      coords: { lat: 37.9000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: null, randomOddsNR: "< 0.2%", waitingPeriod: "5 years", notes: "Near-impossible NR draw. Top-7." }
    },
    "Beaver Elk": {
      typical: '340-368"', topEnd: '395"+', trait: "Open parks and timbered ridges; great rut hunting.",
      description: "Beaver unit, southwest Utah. Mix of open parks and timbered ridges.",
      coords: { lat: 38.2700, lng: -112.6500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 2, bonusPointsToGuarantee: null, randomOddsNR: "< 0.2%", waitingPeriod: "5 years", notes: "Beaver East has 1 tag — pure lottery for everyone. Top-7 unit." }
    },
    "Southwest Desert Elk": {
      typical: '335-365"', topEnd: '390"+', trait: "Open desert elk; spot and stalk; long shots.",
      description: "Southwest Desert unit, Utah. Open desert and sage terrain unlike any other Utah elk hunt.",
      coords: { lat: 38.4000, lng: -113.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: 9, randomOddsNR: "~0.5%", waitingPeriod: "5 years", notes: "Slightly better NR odds than most top-tier units. Consider for hunters with 8-12 points." }
    },
    "Panguitch Lake Elk": {
      typical: '335-362"', topEnd: '390"+', trait: "Southern Utah; accessible terrain; better draw odds.",
      description: "Panguitch Lake area, southwest Utah. Accessible terrain with mix of forest and open country.",
      coords: { lat: 37.7200, lng: -112.6500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: 12, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "Best relative value among top-7 units. Early rifle any-weapon tag added in 2025." }
    },
    "Manti Elk": {
      typical: '320-355"', topEnd: '380"+', trait: "Manti-La Sal NF; accessible; second-tier.",
      description: "Manti Mountains, central Utah. Manti-La Sal National Forest.",
      coords: { lat: 39.5000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 15, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "20+ points for guaranteed early rifle as of 2024. Good value for 12-18 point holders." }
    },
    "Mt Dutton Elk": {
      typical: '320-352"', topEnd: '378"+', trait: "Southern Utah plateau; second-tier; good DIY potential.",
      description: "Mt. Dutton, south-central Utah. High plateau south of Escalante.",
      coords: { lat: 37.7500, lng: -112.0000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 14, randomOddsNR: "~1%", waitingPeriod: "5 years", notes: "Good value unit for hunters with 10-15 points." }
    },
    "Wasatch Elk": {
      typical: '315-350"', topEnd: '375"+', trait: "Wasatch Mountains; second-tier; accessible from SLC.",
      description: "Wasatch Mountains, north-central Utah.",
      coords: { lat: 40.5000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 17, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "17+ points for guaranteed early rifle as of 2024." }
    },
    "Book Cliffs Elk": {
      typical: '310-345"', topEnd: '370"+', trait: "Large roadless elk unit; backcountry effort required.",
      description: "Book Cliffs, northeast Utah. Large roadless backcountry elk unit.",
      coords: { lat: 39.6500, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 6, bonusPointsToGuarantee: 10, randomOddsNR: "~2%", waitingPeriod: "5 years", notes: "Better-than-average NR draw odds for LE unit. Multi-season tag available." }
    },
  },

  // ============================================================
  // UTAH — ANTELOPE
  // ============================================================
  UTAH_ANTELOPE: {
    "West Desert": {
      typical: '70-78"', topEnd: '83"', trait: "Large open BLM desert; best public land antelope in Utah.",
      description: "West Desert unit, west-central Utah. Large BLM-dominated desert basin.",
      coords: { lat: 40.2000, lng: -113.0000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 8, bonusPointsToGuarantee: 6, randomOddsNR: "~3-5%", waitingPeriod: "2 years", notes: "Best NR draw odds among Utah antelope units." }
    },
    "Plateau": {
      typical: '70-77"', topEnd: '82"', trait: "High plateau antelope; unique terrain.",
      description: "Plateau/Fishlake area, central Utah.",
      coords: { lat: 38.9000, lng: -111.8000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 7, randomOddsNR: "~2-4%", waitingPeriod: "2 years", notes: "Decent NR draw odds." }
    },
    "Panguitch Antelope": {
      typical: '68-76"', topEnd: '80"', trait: "Southern Utah antelope; good numbers; accessible.",
      description: "Panguitch area, southwest Utah.",
      coords: { lat: 37.8000, lng: -112.4000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 5, randomOddsNR: "~3-5%", waitingPeriod: "2 years", notes: "Good option for burning points sooner." }
    },
  },

  // ============================================================
  // UTAH — MOOSE
  // ============================================================
  UTAH_MOOSE: {
    "North Slope Uintas": {
      typical: '40-48" spread', topEnd: '50"+', trait: "Best Shiras moose density in Utah.",
      description: "North Slope of the Uinta Mountains, northeast Utah. Highest Shiras moose density in the state.",
      coords: { lat: 40.9000, lng: -110.5000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "Hardest OIL species to draw in Utah. Apply every year." }
    },
    "Cache Moose": {
      typical: '38-45" spread', topEnd: '48"+', trait: "Northern Utah Cache Valley; accessible Shiras moose hunt.",
      description: "Cache Valley and adjacent mountains, northern Utah near Logan.",
      coords: { lat: 41.7000, lng: -111.7000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. More accessible terrain than Uintas." }
    },
    "Uintas East Moose": {
      typical: '40-47" spread', topEnd: '50"+', trait: "East Uinta drainage; remote Shiras moose country.",
      description: "East Uinta Mountains and drainages, northeast Utah.",
      coords: { lat: 40.7000, lng: -109.8000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Remote unit. Apply annually for random draw." }
    },
  },

  // ============================================================
  // UTAH — BIGHORN SHEEP
  // ============================================================
  UTAH_BIGHORNSHEEP: {
    "Kaiparowits East": {
      typical: '160-175"', topEnd: '185"+', trait: "Best desert bighorn unit in Utah; world-class rams.",
      description: "Kaiparowits Plateau East, south-central Utah. Grand Staircase-Escalante canyon country.",
      coords: { lat: 37.4000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Top desert bighorn trophy potential in Utah." }
    },
    "Kaiparowits West": {
      typical: '158-172"', topEnd: '183"', trait: "Excellent ram quality; slightly more accessible.",
      description: "Kaiparowits Plateau West, south-central Utah.",
      coords: { lat: 37.3500, lng: -112.0000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Apply annually." }
    },
    "Kaiparowits Escalante": {
      typical: '155-170"', topEnd: '180"', trait: "Escalante canyon desert bighorn; recovering population.",
      description: "Escalante River canyon country, south-central Utah.",
      coords: { lat: 37.7000, lng: -111.6000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. NR permit returned in 2024. Apply annually." }
    },
    "San Rafael Dirty Devil": {
      typical: '150-165"', topEnd: '175"', trait: "San Rafael Swell canyon country; stable population.",
      description: "San Rafael Swell/Dirty Devil River, central Utah.",
      coords: { lat: 38.5000, lng: -110.5000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Stable population. Worth the application fee annually." }
    },
    "San Rafael South": {
      typical: '148-163"', topEnd: '172"', trait: "Southern San Rafael Swell; accessible canyon terrain.",
      description: "San Rafael Swell south, central Utah.",
      coords: { lat: 38.2000, lng: -110.7000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. More accessible than Kaiparowits." }
    },
    "Box Elder Newfoundland RMBS": {
      typical: '155-170"', topEnd: '180"', trait: "Best NR draw odds for Rocky Mountain bighorn in Utah.",
      description: "Box Elder/Newfoundland Mountains, northwest Utah.",
      coords: { lat: 41.5000, lng: -113.0000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "~1-2%", waitingPeriod: "Once in a lifetime", notes: "RMBS — separate bonus points from desert bighorn. Best NR random odds in Utah for RMBS." }
    },
    "Fillmore Oak Creek RMBS": {
      typical: '158-172"', topEnd: '183"', trait: "Pahvant Range Rocky Mountain bighorn; strong genetics.",
      description: "Fillmore/Oak Creek Pahvant Range, central Utah.",
      coords: { lat: 38.9000, lng: -112.3000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "~0.5-1%", waitingPeriod: "Once in a lifetime", notes: "RMBS OIL permit. Good trophy quality. Apply annually." }
    },
  },
};