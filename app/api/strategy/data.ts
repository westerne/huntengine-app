// ─────────────────────────────────────────────────────────────────────────────
// DRAW DATA TYPES
// Wyoming Non-Resident Deer has 3 separate draw pools per unit:
//   regular  → 60% of tags, drawn in preference-point order (high→low)
//   special  → 40% of tags, drawn in preference-point order (high→low)
//   random   → 25% of all tags set aside BEFORE regular/special split,
//               awarded by pure random lottery (no points needed)
//
// Source: Wyoming Game & Fish Demand Reports, 6/10/2025
// ─────────────────────────────────────────────────────────────────────────────

export type PrefPointPool = {
  quota: number;                    // Tags in this pool
  minPoints: number | null;         // Lowest point tier that drew (null = nobody drew / quota=0)
  oddsAtMin: string | null;         // Draw odds at that cutoff tier
  totalApplicants?: number;         // All applicants in this pool (where readable)
  notes?: string;
};

export type RandomPool = {
  quota: number;                    // Tags set aside for random draw
  firstChoiceApplicants: number;    // # who listed this as 1st choice
  approxOdds: string | null;        // quota/firstChoice if first>0, else null
  notes?: string;
};

export type DrawInfo = {
  regular?: PrefPointPool;          // Preference point draw (60% pool)
  special?: PrefPointPool;          // Special preference point draw (40% pool)
  random?: RandomPool;              // Pure random draw (25% of total tags)
};

export type UnitStats = {
  typical: string;
  topEnd: string;
  trait: string;
  description: string;
  coords: { lat: number; lng: number };
  drawInfo?: DrawInfo;
  utahDrawInfo?: UtahDrawInfo;
};

// ─────────────────────────────────────────────────────────────────────────────
// UTAH DRAW INFO TYPE
// Utah uses a HYBRID BONUS POINT system for LE / OIL species:
//   - 50% of tags go to highest bonus point holders
//   - 50% are randomly drawn (weighted by # of bonus points held)
//   - Non-residents receive 10% of total tags
//   - Once-in-a-lifetime species (moose, sheep, goat) are OIL — can only draw once ever
//   - LE deer/elk/antelope have a 5-yr (deer/elk) or 2-yr (antelope) waiting period after drawing
//   - General deer uses a true PREFERENCE POINT system (highest points draw first)
// Sources: UDWR, GOHUNT, Huntin' Fool, onX, 2024-2026 guidebooks
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
// WYOMING NON-RESIDENT DEER DRAW — ALL THREE POOLS
// Key format: "UNIT_TYPE" e.g. "128_1" = Unit 128 Type 1 (Any Deer)
//   Type 1 = Antlered / Any Mule Deer (limited quota)
//   Type 2 = Antlered Mule Deer Off National Forest
//   Type 3 = Any White-tailed Deer
//   General lettered regions = "A", "B", "C" etc.
// ─────────────────────────────────────────────────────────────────────────────

export const WY_DEER_DRAW: Record<string, DrawInfo> = {

  // ── UNIT 008 ──────────────────────────────────────────────────────────────
  "008_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "71.43%", notes: "5 of 7 drew at 0 pts; 2 remaining drew from 1pt applicants" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 010 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 011 ──────────────────────────────────────────────────────────────
  "011_3": {
    regular: { quota: 45, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 19, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 15, firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 015 ──────────────────────────────────────────────────────────────
  "015_3": {
    regular: { quota: 74, minPoints: 0,    oddsAtMin: "96.97%" },
    special: { quota: 30, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 24, firstChoiceApplicants: 2, approxOdds: "100%", notes: "2 first-choice applicants, 24 tags" },
  },

  // ── UNIT 022 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 023 ──────────────────────────────────────────────────────────────
  "023_3": {
    regular: { quota: 228, minPoints: 0,   oddsAtMin: "100%"   },
    special: { quota: 92,  minPoints: 0,   oddsAtMin: "100%"   },
    random:  { quota: 76,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 024 ──────────────────────────────────────────────────────────────
  "024_3": {
    regular: { quota: 68, minPoints: 0,    oddsAtMin: "70.24%" },
    special: { quota: 30, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 22, firstChoiceApplicants: 25, approxOdds: "88.00%", notes: "22 tags, 25 first-choice applicants" },
  },

  // ── UNIT 034 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 036 ──────────────────────────────────────────────────────────────
  "036_1": {
    regular: { quota: 9,  minPoints: 5,    oddsAtMin: "25.00%", notes: "58 applicants at 0% below 5 pts" },
    special: { quota: 6,  minPoints: 2,    oddsAtMin: "50.00%", notes: "8 applicants at 0% below 2 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 61, approxOdds: "4.92%" },
  },

  // ── UNIT 037 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 040 ──────────────────────────────────────────────────────────────
  "040_3": {
    regular: { quota: 6,  minPoints: 2,    oddsAtMin: "100%",   notes: "23 applicants at 0% below 1 pt" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "66.67%" },
    random:  { quota: 1,  firstChoiceApplicants: 23, approxOdds: "4.35%" },
  },

  // ── UNIT 041 ──────────────────────────────────────────────────────────────
  "041_3": {
    regular: { quota: 19, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 6,  firstChoiceApplicants: 6, approxOdds: "100%"  },
  },

  // ── UNIT 047 ──────────────────────────────────────────────────────────────
  "047_3": {
    regular: { quota: 9,  minPoints: 1,    oddsAtMin: "60.00%", notes: "18 applicants at 0% below 1 pt" },
    special: { quota: 6,  minPoints: 1,    oddsAtMin: "100%",   notes: "3 applicants at 0% below 1 pt" },
    random:  { quota: 3,  firstChoiceApplicants: 20, approxOdds: "15.00%" },
  },

  // ── UNIT 059 ──────────────────────────────────────────────────────────────
  "059_3": {
    regular: { quota: 36, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 15, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 12, firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 060 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 064 ──────────────────────────────────────────────────────────────
  "064_2": {
    regular: { quota: 13, minPoints: 3,    oddsAtMin: "100%",   notes: "48 applicants at 0% below 3 pts" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 48, approxOdds: "8.33%" },
  },

  // ── UNIT 065 ──────────────────────────────────────────────────────────────
  "065_3": {
    regular: { quota: 59, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 24, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 19, firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 066 ──────────────────────────────────────────────────────────────
  "066_3": {
    regular: { quota: 15, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 070 ──────────────────────────────────────────────────────────────
  "070_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "83.33%" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 1, approxOdds: "100%"  },
  },

  // ── UNIT 075 ──────────────────────────────────────────────────────────────
  "075_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 078 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 079 ──────────────────────────────────────────────────────────────
  "079_1": {
    regular: { quota: 21, minPoints: 4,    oddsAtMin: "13.33%", notes: "51 applicants at 0% below 4 pts" },
    special: { quota: 14, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 6,  firstChoiceApplicants: 63, approxOdds: "9.52%" },
  },

  // ── UNIT 080 ──────────────────────────────────────────────────────────────
  "080_1": {
    regular: { quota: 12, minPoints: 7,    oddsAtMin: "33.33%", notes: "46 applicants at 0% below 7 pts" },
    special: { quota: 9,  minPoints: 3,    oddsAtMin: "66.67%", notes: "11 applicants at 0% below 3 pts" },
    random:  { quota: 4,  firstChoiceApplicants: 48, approxOdds: "8.33%" },
  },

  // ── UNIT 081 ──────────────────────────────────────────────────────────────
  "081_1": {
    regular: { quota: 16, minPoints: 11,   oddsAtMin: "20.00%", notes: "112 applicants at 0% below 10 pts" },
    special: { quota: 11, minPoints: 7,    oddsAtMin: "100%",   notes: "24 applicants at 0% below 6 pts" },
    random:  { quota: 5,  firstChoiceApplicants: 112, approxOdds: "4.46%" },
  },

  // ── UNIT 082 ──────────────────────────────────────────────────────────────
  "082_3": {
    regular: { quota: 3,  minPoints: 2,    oddsAtMin: "60.00%", notes: "6 applicants at 0% below 1 pt" },
    special: { quota: 2,  minPoints: 1,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 6, approxOdds: "16.67%" },
  },

  // ── UNIT 084 ──────────────────────────────────────────────────────────────
  "084_1": {
    regular: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0 in regular draw" },
    special: { quota: 1,  minPoints: 7,    oddsAtMin: "25.00%", notes: "2 applicants at 0% below 6 pts; only 1 tag in special" },
    random:  { quota: 0,  firstChoiceApplicants: 10, approxOdds: null, notes: "No random quota; 10 first-choice applicants" },
  },

  // ── UNIT 087 ──────────────────────────────────────────────────────────────
  "087_1": {
    regular: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0; 5 applicants at 18 pts drew 0%" },
    special: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0 in special draw too" },
    random:  { quota: 0,  firstChoiceApplicants: 77, approxOdds: null, notes: "No tags in any draw; 77 first-choice hopefuls" },
  },

  // ── UNIT 089 ──────────────────────────────────────────────────────────────
  "089_1": {
    regular: { quota: 9,  minPoints: 15,   oddsAtMin: "33.33%", notes: "166 applicants shut out below 15 pts" },
    special: { quota: 6,  minPoints: 11,   oddsAtMin: "100%",   notes: "35 applicants at 0% below 11 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 169, approxOdds: "1.78%" },
  },

  // ── UNIT 090 ──────────────────────────────────────────────────────────────
  "090_1": {
    regular: { quota: 4,  minPoints: 16,   oddsAtMin: "28.57%", notes: "Any Deer; 78 applicants at 0% below 16 pts" },
    special: { quota: 3,  minPoints: 16,   oddsAtMin: "100%",   notes: "33 applicants at 0% below 16 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 81, approxOdds: "1.23%" },
  },

  // ── UNIT 092 ──────────────────────────────────────────────────────────────
  "092_3": {
    regular: { quota: 15, minPoints: 0,    oddsAtMin: "73.68%" },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 5,  firstChoiceApplicants: 5, approxOdds: "100%"  },
  },

  // ── UNIT 101 ──────────────────────────────────────────────────────────────
  "101_1": {
    regular: { quota: 2,  minPoints: 17,   oddsAtMin: "50.00%", notes: "81 applicants at 0% below 17 pts" },
    special: { quota: 2,  minPoints: 19,   oddsAtMin: "100%",   notes: "17 applicants at 0% below 19 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 82, approxOdds: null,   notes: "No random quota" },
  },

  // ── UNIT 102 ──────────────────────────────────────────────────────────────
  "102_1": {
    regular: { quota: 9,  minPoints: 19,   oddsAtMin: "4.42%",  notes: "EXTREME — 4.42% even at max 19 pts. 581 applicants at 0% below 18 pts." },
    special: { quota: 7,  minPoints: 17,   oddsAtMin: "26.67%", notes: "141 applicants at 0% below 17 pts" },
    random:  { quota: 3,  firstChoiceApplicants: 581, approxOdds: "0.52%", notes: "581 first-choice; 3 tags — lottery long shot" },
  },

  // ── UNIT 105 ──────────────────────────────────────────────────────────────
  "105_1": {
    regular: { quota: 1,  minPoints: 19,   oddsAtMin: "100%",   notes: "Only 1 tag; 31 applicants at 0% below 19 pts" },
    special: { quota: 1,  minPoints: 19,   oddsAtMin: "50.00%", notes: "15 applicants at 0% below 19 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 31, approxOdds: null,   notes: "No random quota" },
  },

  // ── UNIT 109 ──────────────────────────────────────────────────────────────
  "109_3": {
    regular: { quota: 6,  minPoints: 0,    oddsAtMin: "75.00%" },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 1, approxOdds: "100%"  },
  },

  // ── UNIT 110 ──────────────────────────────────────────────────────────────
  "110_1": {
    regular: { quota: 1,  minPoints: 18,   oddsAtMin: "100%",   notes: "31 applicants at 0% below 18 pts" },
    special: { quota: 2,  minPoints: 10,   oddsAtMin: "100%",   notes: "6 applicants at 0% below 10 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 31, approxOdds: null,   notes: "No random quota" },
  },

  // ── UNIT 112 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 116 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 117 ──────────────────────────────────────────────────────────────
  "117_1": {
    regular: { quota: 3,  minPoints: 8,    oddsAtMin: "100%",   notes: "29 applicants at 0% below 8 pts" },
    special: { quota: 3,  minPoints: 3,    oddsAtMin: "100%",   notes: "5 applicants at 0% below 3 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 29, approxOdds: "3.45%" },
  },

  // ── UNIT 118 ──────────────────────────────────────────────────────────────
  "118_1": {
    regular: { quota: 3,  minPoints: 12,   oddsAtMin: "100%",   notes: "8 applicants at 0% below 12 pts" },
    special: { quota: 2,  minPoints: 4,    oddsAtMin: "33.33%", notes: "4 applicants at 0% below 4 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 8, approxOdds: null,    notes: "No random quota" },
  },

  // ── UNIT 119 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 120 ──────────────────────────────────────────────────────────────
  "120_1": {
    regular: { quota: 6,  minPoints: 7,    oddsAtMin: "50.00%", notes: "34 applicants at 0% below 6 pts" },
    special: { quota: 5,  minPoints: 4,    oddsAtMin: "60.00%", notes: "8 applicants at 0% below 3 pts" },
    random:  { quota: 2,  firstChoiceApplicants: 34, approxOdds: "5.88%" },
  },

  // ── UNIT 121 ──────────────────────────────────────────────────────────────
  "121_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 122 ──────────────────────────────────────────────────────────────
  "122_3": {
    regular: { quota: 12, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 5,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 3,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 124 ──────────────────────────────────────────────────────────────
  "124_3": {
    regular: { quota: 14, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 6,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 4,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 125 ──────────────────────────────────────────────────────────────
  "125_1": {
    regular: { quota: 6,  minPoints: 13,   oddsAtMin: "33.33%", notes: "58 applicants at 0% below 13 pts" },
    special: { quota: 5,  minPoints: 4,    oddsAtMin: "66.67%", notes: "9 applicants at 0% below 4 pts" },
    random:  { quota: 1,  firstChoiceApplicants: 60, approxOdds: "1.67%" },
  },

  // ── UNIT 127 ──────────────────────────────────────────────────────────────
  "127_3": {
    regular: { quota: 7,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 128 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 130 ──────────────────────────────────────────────────────────────
  "130_1": {
    regular: { quota: 0,  minPoints: null, oddsAtMin: null,     notes: "Quota = 0 in regular draw; 19pts still 0%" },
    special: { quota: 1,  minPoints: 19,   oddsAtMin: "100%",   notes: "16 applicants at 0% below 19 pts" },
    random:  { quota: 0,  firstChoiceApplicants: 38, approxOdds: null,   notes: "No random quota" },
  },

  // ── UNIT 132 ──────────────────────────────────────────────────────────────
  "132_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "25.00%" },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 0,  firstChoiceApplicants: 3, approxOdds: null,    notes: "No random quota" },
  },

  // ── UNIT 138 ──────────────────────────────────────────────────────────────
  "138_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 141 ──────────────────────────────────────────────────────────────
 "141_1": {
    regular: { quota: 3, minPoints: 17, oddsAtMin: "50.00%", notes: "78 applicants at 0% below 16 pts" },
    special: { quota: 3, minPoints: 14, oddsAtMin: "100%", notes: "36 applicants at 0% below 14 pts" },
    random:  { quota: 1, firstChoiceApplicants: 78, approxOdds: "1.28%" },
  },
  

  // ── UNIT 145 ──────────────────────────────────────────────────────────────
  "145_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "20.00%" },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 0,  firstChoiceApplicants: 4, approxOdds: null,    notes: "No random quota" },
  },

  // ── UNIT 148 ──────────────────────────────────────────────────────────────
  "148_3": {
    regular: { quota: 8,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 2,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 149 ──────────────────────────────────────────────────────────────
  "149_3": {
    regular: { quota: 3,  minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 2,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 1,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── UNIT 157 ──────────────────────────────────────────────────────────────
  "157_3": {
    regular: { quota: 24, minPoints: 0,    oddsAtMin: "90.00%" },
    special: { quota: 11, minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 8,  firstChoiceApplicants: 1, approxOdds: "100%"  },
  },

  // ── UNIT 164 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 165 ──────────────────────────────────────────────────────────────
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

  // ── UNIT 171 ──────────────────────────────────────────────────────────────
  "171_3": {
    regular: { quota: 21, minPoints: 0,    oddsAtMin: "100%"   },
    special: { quota: 9,  minPoints: 0,    oddsAtMin: "100%"   },
    random:  { quota: 7,  firstChoiceApplicants: 0, approxOdds: null },
  },

  // ── LETTERED GENERAL REGIONS ───────────────────────────────────────────────
  "A": {
    regular: { quota: 1250, minPoints: 0,  oddsAtMin: "15.80%", notes: "1,576 applicants at 0 pts; 15.8% drew" },
    special: { quota: 588,  minPoints: 0,  oddsAtMin: "100%"   },
    random:  { quota: 416,  firstChoiceApplicants: 1324, approxOdds: "31.42%" },
  },
  "B": {
    regular: { quota: 558,  minPoints: 0,  oddsAtMin: "1.81%",  notes: "VERY low odds at 0 pts; 496 applicants competing for 9 remaining tags" },
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
    regular: { quota: 93, minPoints: 10, oddsAtMin: "91.67%", notes: "Region G: Areas 135, 143-145."},
    special: { quota: 62, minPoints: 6, oddsAtMin: "44.44%" },
    random:  { quota: 30, firstChoiceApplicants: 926, approxOdds: "3.24%" },
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
    random:  { quota: 98,   firstChoiceApplicants: 0, approxOdds: null, notes: "No first-choice applicants listed" },
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


export const HUNT_DATA: Record<string, Record<string, UnitStats>> = {

  // ============================================================
  // WYOMING — MULE DEER (127 Mapped Units)
  // drawInfo keys reference WY_DEER_DRAW above
  // Primary key used is Type 1 (limited mule deer) where it exists,
  // otherwise Type 3 (white-tailed). Use WY_DEER_DRAW directly for
  // full multi-type breakdowns.
  // ============================================================
  WYOMING_DEER: {  // --- TOP TIER DEER ---
    "102": {
      typical: '165-180"', topEnd: '200"+', trait: "High desert island genetics; deep forks.",
      description: "Southwest WY, South of Rock Springs. Focus: Little Mountain, Aspen Mountain. NOT Wyoming Range.",
      coords: { lat: 41.2448, lng: -109.185 },
      drawInfo: WY_DEER_DRAW["102_1"],
    },
    "128": {
      typical: '170-185"', topEnd: '200"+', trait: "Migration corridor; mass and beam length.",
      description: "Wind River Front near Dubois. Focus: East Fork and Horse Creek. Transitional mountain terrain.",
      coords: { lat: 43.5777, lng: -109.6397 },
      drawInfo: WY_DEER_DRAW["128_1"],
    },
    "87": {
      typical: '155-175"', topEnd: '190"', trait: "Sagebrush desert genetics; heavy mass.",
      description: "South Central WY near Baggs. Focus: Atlantic Rim and Muddy Creek. High desert sage ridges.",
      coords: { lat: 42.174, lng: -107.1266 },
      drawInfo: WY_DEER_DRAW["087_1"],
    },
    "141": {
      typical: '175-190"', topEnd: '210"+', trait: "True alpine giants; the 'Grey Ghost' genetics.",
      description: "Wyoming Range West of Daniel. Focus: Hoback Basin and McDougal Gap. Steep, high-altitude alpine.",
      coords: { lat: 43.2847, lng: -109.9553 },
      drawInfo: WY_DEER_DRAW["141_1"],
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
    },
    "101": {
      typical: '155-170"', topEnd: '185"', trait: "Extreme desert survivalists.",
      description: "West of Unit 102. Focus: Bitter Creek and the Checkerboard lands. Flat sage and dry coulees.",
      coords: { lat: 41.3483, lng: -108.7096 },
      drawInfo: WY_DEER_DRAW["101_1"],
    },
    "105": {
      typical: '165-180"', topEnd: '195"', trait: "High desert migration stop.",
      description: "McCullough Peaks near Cody. Focus: Badlands and desert draws. Extreme clay terrain.",
      coords: { lat: 44.9287, lng: -109.4137 },
      drawInfo: WY_DEER_DRAW["105_1"],
    },
    "90": {
      typical: '160-175"', topEnd: '190"', trait: "Red Desert/Wind River transition.",
      description: "South of Lander. Focus: Sweetwater River drainage and Green Mountain. Sage/Timber mix.",
      coords: { lat: 42.9531, lng: -107.7987 },
      drawInfo: WY_DEER_DRAW["090_1"],
    },
    "130": {
      typical: '170-185"', 
      topEnd: '205"+', trait: "Desert migration 'Staging' genetics.",
      description: "South of Pinedale. Focus: The 'Mesa' and Scab Creek. Transition from Wind River high country to desert.",
      coords: { lat: 42.4136, lng: -109.2384 },
      drawInfo: WY_DEER_DRAW["130_1"]
    },
    "143": {
      typical: '170-185"',
      topEnd: '190-200"',
      trait: "High alpine mule deer with premier genetics.",
      description: "Hunt Area 143, South Piney. Northeast portion of Region G. Extremely rugged vertical terrain. Valid with a Region G tag.",
      coords: { lat: 42.6542, lng: -110.8234 },
      drawInfo: WY_DEER_DRAW["G"],
    },

    // ── REGION A (Areas 1-6) — Black Hills/Northeast WY ──────────────────────
    // Not a trophy region; stable numbers; coexists with whitetail; 170"+ possible annually
    "1":  { typical: '130-155"', topEnd: '170"+', trait: "Mixed mule/whitetail; ag edge bucks.", description: "Region A — NE WY near Hulett/Devils Tower. Rolling hills and draws mixed with agriculture. General Region A tag valid for both species.", coords: { lat: 44.7972, lng: -104.4013 }, drawInfo: WY_DEER_DRAW["A"] },
    "2":  { typical: '130-155"', topEnd: '170"+', trait: "Bear Lodge NF public land; largest public tract in Region A.", description: "Region A — NE WY near Hulett. Bear Lodge National Forest. Largest contiguous public land block in region. Mule deer near ag edges.", coords: { lat: 44.7005, lng: -104.3505 }, drawInfo: WY_DEER_DRAW["A"] },
    "3":  { typical: '130-155"', topEnd: '165"',  trait: "Rolling pine and ag mix; good whitetail numbers.", description: "Region A — NE WY south of Sundance. Rolling ponderosa hills and ag edges. Good whitetail numbers alongside muleys.", coords: { lat: 44.3939, lng: -104.7713 }, drawInfo: WY_DEER_DRAW["A"] },
    "4":  { typical: '130-155"', topEnd: '170"+', trait: "Black Hills fringe; NF land holds mostly whitetail.", description: "Region A — Black Hills fringe near Newcastle. NF lands hold few muleys vs. whitetail. Best mule deer on private ag ground.", coords: { lat: 44.3323, lng: -104.1729 }, drawInfo: WY_DEER_DRAW["A"] },
    "5":  { typical: '130-155"', topEnd: '165"',  trait: "Sage/pine transition; moderate mule deer density.", description: "Region A — NE WY near Upton. Sage flats transitioning to pine breaks. Moderate mule deer density.", coords: { lat: 44.2327, lng: -104.5182 }, drawInfo: WY_DEER_DRAW["A"] },
    "6":  { typical: '130-155"', topEnd: '165"',  trait: "Southern Region A; creek bottom bucks.", description: "Region A — South of Newcastle. Rolling sagebrush hills and creek drainages. Mature bucks available near water.", coords: { lat: 44.0083, lng: -104.2778 }, drawInfo: WY_DEER_DRAW["A"] },

    // ── REGION B (Areas 7-9, 11-14, 21) — Powder River Basin/Casper area ─────
    // High mature buck ratios; limited public access; private land key
    "7":  { typical: '140-160"', topEnd: '175"',  trait: "High mature buck ratio; limited public access.", description: "Region B — N-central WY near Kaycee. Rolling sagebrush breaks and Powder River bottoms. High mature buck ratio but most deer on private land.", coords: { lat: 43.8813, lng: -104.5879 }, drawInfo: WY_DEER_DRAW["B"] },
    "8":  { typical: '140-160"', topEnd: '175"',  trait: "Powder River Basin; heavy private land dependency.", description: "Region B — Powder River Basin near Midwest. Open sage and badland draws. Secure private land permission before hunting.", coords: { lat: 43.9615, lng: -104.9063 }, drawInfo: WY_DEER_DRAW["B"] },
    "9":  { typical: '140-160"', topEnd: '172"',  trait: "East-central WY; sage and pine ridge terrain.", description: "Region B — East-central WY near Douglas. Sage and pine ridge terrain. Good mature buck ratios on private ranches.", coords: { lat: 43.6672, lng: -104.4119 }, drawInfo: WY_DEER_DRAW["B"] },
    "11": { typical: '140-160"', topEnd: '172"',  trait: "Powder River drainages; WGFD reports high buck ratios.", description: "Region B — Southeast of Gillette. Powder River drainages and sage flats. WGFD notes high ratios of mature bucks in this area.", coords: { lat: 43.4143, lng: -104.4486 }, drawInfo: WY_DEER_DRAW["B"] },
    "12": { typical: '140-158"', topEnd: '170"',  trait: "Open pine and sagebrush; moderate trophy potential.", description: "Region B — North of Douglas. Open pine and sagebrush breaks. Moderate but consistent mature buck presence.", coords: { lat: 43.1067, lng: -104.2850 }, drawInfo: WY_DEER_DRAW["B"] },
    "13": { typical: '140-158"', topEnd: '170"',  trait: "Laramie Range foothills transition.", description: "Region B — East of Douglas. Rolling prairie and Laramie Range foothills. Deer use pine/sage transition for cover.", coords: { lat: 42.8725, lng: -104.5187 }, drawInfo: WY_DEER_DRAW["B"] },
    "14": { typical: '140-158"', topEnd: '172"',  trait: "Ponderosa and sage near Glendo.", description: "Region B — Laramie Range foothills near Glendo. Ponderosa pine and sage terrain. Good mature buck opportunity on private ground.", coords: { lat: 43.0113, lng: -105.0225 }, drawInfo: WY_DEER_DRAW["B"] },
    "21": { typical: '140-158"', topEnd: '170"',  trait: "Powder River prairie breaks; ag edge opportunity.", description: "Region B — SW of Gillette. Open sage and mixed-grass prairie near Powder River. Mature bucks near ag edges and creek bottoms.", coords: { lat: 44.0002, lng: -105.2473 }, drawInfo: WY_DEER_DRAW["B"] },

    // ── REGION C (Areas 17-19, 23, 26, 29, 31) — Bighorn Basin/Foothills ─────
    // Outfitters report 150-165" typical; C & Y regions; 180"+ possible
    "17": { typical: '150-165"', topEnd: '180"',  trait: "Bighorn foothills; strong genetics in canyon breaks.", description: "Region C — Bighorn Basin foothills near Sheridan. Sage and ponderosa terrain. Outfitters in C/Y regions report 150-165\" typical with 180\"+ possible.", coords: { lat: 44.6145, lng: -105.7579 }, drawInfo: WY_DEER_DRAW["C"] },
    "18": { typical: '150-165"', topEnd: '178"',  trait: "Powder River headwaters; good buck-to-doe ratios.", description: "Region C — N-central WY near Buffalo. Powder River headwaters and Bighorn foothills. Good mature buck availability.", coords: { lat: 44.6011, lng: -105.2082 }, drawInfo: WY_DEER_DRAW["C"] },
    "19": { typical: '148-163"', topEnd: '175"',  trait: "Pine and sage mix; productive mid-range buck unit.", description: "Region C — South of Buffalo along Powder River breaks. Mixed pine and sage. Solid mid-range buck production.", coords: { lat: 43.9192, lng: -105.8339 }, drawInfo: WY_DEER_DRAW["C"] },
    "23": { typical: '150-165"', topEnd: '178"',  trait: "Bighorn Basin river bottoms; migration corridor bucks.", description: "Region C — Bighorn Basin near Worland. Open sage flats and river bottom terrain. Migration corridor adds trophy opportunity in late season.", coords: { lat: 44.8328, lng: -106.5541 }, drawInfo: WY_DEER_DRAW["C"] },
    "26": { typical: '150-165"', topEnd: '178"',  trait: "Ten Sleep Canyon breaks; limestone rimrock country.", description: "Region C — East Bighorn Basin near Ten Sleep. Canyon breaks and sage ridges. Rugged terrain holds mature bucks.", coords: { lat: 44.4662, lng: -106.4124 }, drawInfo: WY_DEER_DRAW["C"] },
    "29": { typical: '148-163"', topEnd: '175"',  trait: "Bighorn foothills transition; timbered pockets.", description: "Region C — South of Ten Sleep. Bighorn foothills with mixed sage and timber. Consistent mature buck harvest reported.", coords: { lat: 43.9525, lng: -106.4210 }, drawInfo: WY_DEER_DRAW["C"] },
    "31": { typical: '148-162"', topEnd: '173"',  trait: "Nowood River area; accessible public terrain.", description: "Region C — Nowood River area west of Buffalo. Sagebrush and mixed terrain. Good public land access via BLM.", coords: { lat: 43.5354, lng: -106.3257 }, drawInfo: WY_DEER_DRAW["C"] },

    // ── REGION D (Areas 66, 70, 74-81, 88) — Laramie Range/Sierra Madre ──────
    // Mid-tier region; typical 140-160"; some units like 78/80/81 approach 165-175"
    "66": { typical: '140-158"', topEnd: '170"',  trait: "Casper area; sage and mountain foothills.", description: "Region D — Casper area near Bessemer Bend. Sage and Casper Mountain foothills. Consistent but not top-tier trophy production.", coords: { lat: 42.6020, lng: -106.3500 }, drawInfo: WY_DEER_DRAW["D"] },
    "70": { typical: '140-158"', topEnd: '170"',  trait: "Central WY sage and mixed terrain.", description: "Region D — Central WY near Lander foothills. Sage and mixed terrain. Moderate buck quality typical of Region D.", coords: { lat: 42.1391, lng: -106.5534 }, drawInfo: WY_DEER_DRAW["D"] },
    "74": { typical: '145-160"', topEnd: '172"',  trait: "Laramie Range south; rocky pine and sage.", description: "Region D — Laramie Range south of Casper. Rocky pine ridges and sage parks. Better-than-average buck quality in timbered pockets.", coords: { lat: 41.6512, lng: -106.0477 }, drawInfo: WY_DEER_DRAW["D"] },
    "75": { typical: '145-160"', topEnd: '172"',  trait: "Shirley Basin transition; open sage and pine.", description: "Region D — Laramie Range near Shirley Basin. Open sagebrush and pine. Quality bucks available for hunters willing to work.", coords: { lat: 41.4565, lng: -106.1534 }, drawInfo: WY_DEER_DRAW["D"] },
    "76": { typical: '145-162"', topEnd: '175"',  trait: "Southern Laramie Range; pine timber and sage breaks.", description: "Region D — Southern Laramie Range near Wheatland. Pine timber and sage breaks. Consistent mature buck production.", coords: { lat: 41.2038, lng: -106.0345 }, drawInfo: WY_DEER_DRAW["D"] },
    "77": { typical: '143-160"', topEnd: '172"',  trait: "Rocky timber and open ridge; east of Laramie.", description: "Region D — Laramie Range east of Laramie. Rocky timber and open ridge terrain. Good glassing country.", coords: { lat: 41.1027, lng: -105.7347 }, drawInfo: WY_DEER_DRAW["D"] },
    "78": { typical: '150-165"', topEnd: '178"',  trait: "Sierra Madre; spruce/sage mix; mid-tier draw unit.", description: "Region D — Sierra Madre foothills near Encampment. Spruce and sage mix. Among the better units in Region D for trophy potential; limited quota available.", coords: { lat: 41.1911, lng: -106.4473 }, drawInfo: WY_DEER_DRAW["D"] },
    "79": { typical: '148-163"', topEnd: '175"',  trait: "Carbon County; Medicine Bow foothills.", description: "Region D — Carbon County near Saratoga. Open sage flats and Medicine Bow foothills. Good access and consistent mature buck production.", coords: { lat: 41.6277, lng: -106.6790 }, drawInfo: WY_DEER_DRAW["D"] },
    "80": { typical: '150-165"', topEnd: '178"',  trait: "Sierra Madre canyon terrain; quality bucks.", description: "Region D — Sierra Madre near Baggs. Rugged canyon and sage terrain. GOHUNT notes as worth considering for mid-tier point holders.", coords: { lat: 41.4711, lng: -107.0235 }, drawInfo: WY_DEER_DRAW["D"] },
    "81": { typical: '150-165"', topEnd: '178"',  trait: "South-central WY desert; quality-managed unit.", description: "Region D — South-central WY near Rawlins. Open desert sage and rock. GOHUNT-listed mid-tier unit with consistent mature buck harvest.", coords: { lat: 41.0935, lng: -106.7152 }, drawInfo: WY_DEER_DRAW["D"] },
    "88": { typical: '140-158"', topEnd: '170"',  trait: "Casper Mountain south slopes; timber and sage parks.", description: "Region D — Casper Mountain south slopes (formerly Region E). Mixed timber and sagebrush parks. Consistent deer numbers.", coords: { lat: 42.7090, lng: -106.6388 }, drawInfo: WY_DEER_DRAW["D"] },

    // ── REGION F (Areas 106, 109, 111, 113-115) — Absaroka/Shoshone NF ───────
    // Remote timbered Absaroka terrain; typical 150-168"; top-end 180"+
    "106": { typical: '150-168"', topEnd: '182"', trait: "Absaroka Range; rugged volcanic terrain.", description: "Region F — Absaroka Range near Cody. Rugged volcanic terrain and sage foothills. Remote backcountry produces mature bucks with good genetics.", coords: { lat: 44.7778, lng: -109.6880 }, drawInfo: WY_DEER_DRAW["F"] },
    "109": { typical: '150-168"', topEnd: '182"', trait: "Shoshone NF timbered drainages; good mature buck density.", description: "Region F — Shoshone NF near Cody. Timbered drainages and open ridges. Good mature buck density in remote basins.", coords: { lat: 44.6885, lng: -109.2552 }, drawInfo: WY_DEER_DRAW["F"] },
    "111": { typical: '152-168"', topEnd: '183"', trait: "Absaroka foothills east of Yellowstone; remote and low pressure.", description: "Region F — Absaroka foothills east of Yellowstone. Remote timbered terrain with lower hunting pressure than adjacent units.", coords: { lat: 44.4717, lng: -109.5317 }, drawInfo: WY_DEER_DRAW["F"] },
    "113": { typical: '152-170"', topEnd: '185"', trait: "South Absaroka near Dubois; steep drainages and alpine basins.", description: "Region F — South Absaroka near Dubois. Steep drainages and alpine basins. Higher trophy potential in upper elevation basins.", coords: { lat: 44.3101, lng: -109.2508 }, drawInfo: WY_DEER_DRAW["F"] },
    "114": { typical: '155-170"', topEnd: '185"', trait: "Wind River Range north side; high alpine genetics.", description: "Region F — Wind River Range north side near Dubois. High alpine and timbered slopes. Strong genetics from Wind River/Absaroka transition zone.", coords: { lat: 43.9507, lng: -109.7089 }, drawInfo: WY_DEER_DRAW["F"] },
    "115": { typical: '152-168"', topEnd: '183"', trait: "Togwotee Pass high country; alpine and timber mix.", description: "Region F — Togwotee Pass area. High elevation timber and open alpine meadows. Good spot-and-stalk terrain with quality mature bucks.", coords: { lat: 44.1053, lng: -109.9390 }, drawInfo: WY_DEER_DRAW["F"] },

    // ── REGION H (Areas 138-142, 146, 149-156) — Wyoming/Snake River Range ───
    // G&H known as WY's best general regions; typical 160-175"; top-end 190"+
    // Note: 2022-23 severe winter hurt these herds; recovery underway
    "138": { typical: '155-172"', topEnd: '188"', trait: "Upper Green River; high sage and timber mix.", description: "Region H — Upper Green River near Pinedale. High sage and timbered slopes. Part of the premier Wyoming Range G&H zone. Recovery underway post-2023 winter.", coords: { lat: 42.4568, lng: -109.7119 }, drawInfo: WY_DEER_DRAW["H"] },
    "139": { typical: '158-175"', topEnd: '192"', trait: "Gros Ventre Range; rugged alpine terrain.", description: "Region H — Gros Ventre Range near Pinedale. Rugged alpine terrain and willow basins. Higher elevation units hold the best mature bucks.", coords: { lat: 42.8881, lng: -109.7153 }, drawInfo: WY_DEER_DRAW["H"] },
    "140": { typical: '158-175"', topEnd: '192"', trait: "Gros Ventre River drainage; steep timbered ridges.", description: "Region H — Gros Ventre River drainage south of Jackson. Steep timbered ridges. Serious backcountry required for top-end bucks.", coords: { lat: 43.0412, lng: -109.9260 }, drawInfo: WY_DEER_DRAW["H"] },
    "142": { typical: '155-172"', topEnd: '188"', trait: "Snake River Range; timbered canyons and sage benches.", description: "Region H — Snake River Range near Alpine. Timbered canyons and sage benches. Good public land access via Bridger-Teton NF.", coords: { lat: 42.8932, lng: -110.2856 }, drawInfo: WY_DEER_DRAW["H"] },
    "146": { typical: '158-175"', topEnd: '192"', trait: "Hoback Basin alpine; high elevation late-season bucks.", description: "Region H — Hoback Basin near Jackson. Alpine meadows and steep timbered drainages. High-elevation bucks concentrated in early season basins.", coords: { lat: 43.5236, lng: -110.0919 }, drawInfo: WY_DEER_DRAW["H"] },
    "149": { typical: '158-172"', topEnd: '188"', trait: "Teton Range east side; extreme terrain, limited access.", description: "Region H — Teton Range east side near Jackson. Extreme terrain and limited motorized access forces low pressure hunting.", coords: { lat: 43.8582, lng: -110.9525 }, drawInfo: WY_DEER_DRAW["H"] },
    "150": { typical: '160-175"', topEnd: '192"', trait: "Gros Ventre Wilderness; remote high-country basins.", description: "Region H — Gros Ventre Wilderness near Jackson. Remote high-country basins. Pack-in or horseback access to find unmolested mature bucks.", coords: { lat: 43.5463, lng: -110.8312 }, drawInfo: WY_DEER_DRAW["H"] },
    "151": { typical: '155-170"', topEnd: '187"', trait: "South Jackson Hole; willow flats and timbered benches.", description: "Region H — South Jackson Hole. Willow flats and timbered benches above the Snake River. Good early-season spot-and-stalk opportunities.", coords: { lat: 43.3399, lng: -110.9195 }, drawInfo: WY_DEER_DRAW["H"] },
    "152": { typical: '155-170"', topEnd: '185"', trait: "Hoback River drainage; canyon sage and timber.", description: "Region H — Hoback River drainage. Canyon sage and timbered slopes. Accessible public land with good buck hunting for hunters willing to hike.", coords: { lat: 43.3100, lng: -110.5940 }, drawInfo: WY_DEER_DRAW["H"] },
    "153": { typical: '155-170"', topEnd: '185"', trait: "Upper Hoback near Bondurant; high alpine basins.", description: "Region H — Upper Hoback near Bondurant. High alpine basins and sage benches. One of the more accessible Region H units.", coords: { lat: 43.1066, lng: -110.5032 }, drawInfo: WY_DEER_DRAW["H"] },
    "154": { typical: '158-172"', topEnd: '188"', trait: "Wyoming Range north; timbered ridges and alpine meadows.", description: "Region H — Wyoming Range north end near Merna. Timbered ridges and alpine meadows. Part of the core Wyoming Range deer country.", coords: { lat: 43.1892, lng: -110.3101 }, drawInfo: WY_DEER_DRAW["H"] },
    "155": { typical: '158-173"', topEnd: '190"', trait: "Wyoming Range central; steep timber and sage.", description: "Region H — Wyoming Range central near Big Piney. Steep timber and sage transition. Among the more consistent producers in Region H.", coords: { lat: 43.4979, lng: -110.4456 }, drawInfo: WY_DEER_DRAW["H"] },
    "156": { typical: '155-170"', topEnd: '187"', trait: "Upper Green River; open sage parks and timber pockets.", description: "Region H — Upper Green River. Open sage parks and timbered pockets. Good glassing terrain with consistent mature buck presence.", coords: { lat: 43.6063, lng: -110.3541 }, drawInfo: WY_DEER_DRAW["H"] },

    // ── REGION J (Areas 59, 61, 64, 65) — Laramie Range/Platte Valley ────────
    // General region; typical 145-165"; Cross C Ranch reports 155-170" typical;
    // Season dates Oct 20-31 in Units 64 and 15
    "59": { typical: '145-162"', topEnd: '175"',  trait: "Laramie Range foothills; ponderosa and sage.", description: "Region J — Laramie Range foothills near Cheyenne. Ponderosa and sage terrain. Consistent mature buck opportunity on general tag.", coords: { lat: 41.5891, lng: -105.1680 }, drawInfo: WY_DEER_DRAW["J"] },
    "61": { typical: '145-160"', topEnd: '172"',  trait: "Laramie Mountains south end; pine timber and rocky ridges.", description: "Region J — Laramie Mountains south end near Laramie. Pine timber and rocky ridges. Good public land hunting on Medicine Bow NF.", coords: { lat: 41.0986, lng: -105.2775 }, drawInfo: WY_DEER_DRAW["J"] },
    "64": { typical: '148-165"', topEnd: '178"',  trait: "North Platte River valley; cottonwood bottoms and sage.", description: "Region J — North Platte River valley near Wheatland. Sage flats and cottonwood bottoms. Cross C Ranch hunts here; typical mature bucks 155-170\" on managed private land.", coords: { lat: 42.1026, lng: -105.5897 }, drawInfo: WY_DEER_DRAW["J"] },
    "65": { typical: '145-162"', topEnd: '175"',  trait: "Platte Valley near Casper; rolling sage and prairie.", description: "Region J — Platte Valley near Casper. Rolling sage and mixed-grass prairie. Consistent general tag opportunity with moderate trophy ceiling.", coords: { lat: 42.5950, lng: -105.6046 }, drawInfo: WY_DEER_DRAW["J"] },

    // ── REGION K (Areas 132-134, 168) — Overthrust Belt/Kemmerer ────────────
    // Western WY overthrust; typical 155-170"; public land access; 185"+ possible
    "132": { typical: '152-168"', topEnd: '182"', trait: "Bridger-Teton NF west side; sage and timber.", description: "Region K — Bridger-Teton NF west side near Kemmerer. Sage and timbered ridges. Good public land access with solid western WY genetics.", coords: { lat: 41.2429, lng: -109.9452 }, drawInfo: WY_DEER_DRAW["K"] },
    "133": { typical: '155-170"', topEnd: '185"', trait: "Overthrust Belt near Evanston; steep sage and conifer.", description: "Region K — Overthrust Belt near Evanston. Steep sage and mixed conifer terrain. Western WY genetics capable of producing 180\"+ bucks.", coords: { lat: 41.1544, lng: -110.7549 }, drawInfo: WY_DEER_DRAW["K"] },
    "134": { typical: '153-168"', topEnd: '182"', trait: "Bear River Divide; rolling sage and rimrock.", description: "Region K — Bear River Divide near Evanston. Rolling sage and rimrock country. Good glassing terrain with accessible public land.", coords: { lat: 41.6134, lng: -110.5324 }, drawInfo: WY_DEER_DRAW["K"] },
    "168": { typical: '152-168"', topEnd: '182"', trait: "SW WY near Kemmerer; open desert canyon terrain.", description: "Region K — SW WY near Kemmerer/Fontenelle. Open sage desert and canyon breaks. Consistent producer of mid-range mature bucks.", coords: { lat: 41.9800, lng: -110.5500 }, drawInfo: WY_DEER_DRAW["K"] },

    // ── REGION L (Areas 92, 94, 148, 157, 160, 171) — Wind River/Pinedale ────
    // West-central WY; typical 155-172"; Wind River genetics; 185"+ possible
    "92":  { typical: '155-170"', topEnd: '183"', trait: "Wind River Range west side; sage and timber.", description: "Region L — Wind River Range west side near Pinedale. Sage and timber mix. Strong Wind River genetics with consistent mature buck production.", coords: { lat: 42.6848, lng: -108.9138 }, drawInfo: WY_DEER_DRAW["L"] },
    "94":  { typical: '153-168"', topEnd: '180"', trait: "Wind River Basin; open sage and desert terrain.", description: "Region L — Wind River Basin near Riverton. Open sage and desert terrain. Consistent general tag opportunity with good genetics.", coords: { lat: 42.4835, lng: -108.4837 }, drawInfo: WY_DEER_DRAW["L"] },
    "148": { typical: '158-173"', topEnd: '188"', trait: "Gros Ventre Range south; remote timbered drainages.", description: "Region L — Gros Ventre Range south near Pinedale. Remote timbered drainages. Higher-elevation basins hold quality mature bucks.", coords: { lat: 43.9657, lng: -110.2965 }, drawInfo: WY_DEER_DRAW["L"] },
    "157": { typical: '155-170"', topEnd: '183"', trait: "Wind River Range east foothills; high sage parks.", description: "Region L — Wind River Range east foothills. High sage and timbered pockets. Accessible USFS terrain with good glassing opportunities.", coords: { lat: 43.5135, lng: -109.8458 }, drawInfo: WY_DEER_DRAW["L"] },
    "160": { typical: '155-170"', topEnd: '183"', trait: "Wyoming Range south; timbered ridges and sage.", description: "Region L — Wyoming Range south near Big Piney. Timbered ridges and open sage. Part of the broader Wyoming Range trophy zone.", coords: { lat: 43.1672, lng: -110.1557 }, drawInfo: WY_DEER_DRAW["L"] },
    "171": { typical: '153-168"', topEnd: '180"', trait: "Green River Basin near Pinedale; sage flats and timber.", description: "Region L — Green River Basin near Pinedale. Sage flats and timbered benches. Good road access and consistent deer numbers.", coords: { lat: 42.8600, lng: -109.8500 }, drawInfo: WY_DEER_DRAW["L"] },

    // ── REGION M (Areas 35-37, 39-40, 164) — Bighorn Basin/Wind River ────────
    // Mid-tier; typical 148-165"; Bighorn Basin transition; 178"+ possible
    "35": { typical: '148-163"', topEnd: '175"',  trait: "Wind River Canyon north; steep canyon and sage.", description: "Region M — Wind River Canyon north near Thermopolis. Steep canyon and sage terrain. Canyon-dwelling bucks can grow to impressive size.", coords: { lat: 43.5212, lng: -107.3430 }, drawInfo: WY_DEER_DRAW["M"] },
    "36": { typical: '148-163"', topEnd: '175"',  trait: "Owl Creek Mountains; steep sage and limestone.", description: "Region M — Owl Creek Mountains near Thermopolis. Steep sage and limestone terrain. Remote canyon areas hold better-than-average bucks.", coords: { lat: 43.3152, lng: -107.7048 }, drawInfo: WY_DEER_DRAW["M"] },
    "37": { typical: '150-165"', topEnd: '178"',  trait: "Wind River Range east foothills near Riverton.", description: "Region M — Wind River Range east foothills near Riverton. Sage and mixed terrain. Transition zone between basin and mountain holds quality bucks.", coords: { lat: 43.6216, lng: -108.0202 }, drawInfo: WY_DEER_DRAW["M"] },
    "39": { typical: '148-162"', topEnd: '173"',  trait: "Bighorn Basin south; open sage and river breaks.", description: "Region M — Bighorn Basin south near Worland. Open sage flats and river breaks. Consistent mid-tier buck production on general tag.", coords: { lat: 43.6258, lng: -107.6587 }, drawInfo: WY_DEER_DRAW["M"] },
    "40": { typical: '148-162"', topEnd: '173"',  trait: "Bighorn Basin west; sage hills and river bottom.", description: "Region M — Bighorn Basin west near Thermopolis. Sage hills and river bottom terrain. Accessible public land via BLM.", coords: { lat: 43.8661, lng: -107.3083 }, drawInfo: WY_DEER_DRAW["M"] },
    "164": { typical: '155-170"', topEnd: '182"', trait: "Wyoming Range south near Afton; timbered ridges.", description: "Region M — Wyoming Range south near Afton/Star Valley. Timbered ridges and high sage. Transition to western WY genetics improves trophy ceiling.", coords: { lat: 42.5456, lng: -110.2263 }, drawInfo: WY_DEER_DRAW["M"] },

    // ── REGION Q (Areas 34, 96-98) — Rawlins/Carbon County ──────────────────
    // Known for quality bucks; limited quota units 34/89 nearby; typical 148-165"
    "34": { typical: '150-165"', topEnd: '178"',  trait: "Laramie Range south of Douglas; quality-managed unit.", description: "Region Q — Laramie Range south of Douglas. Open pine and sage ridge country. WGFD manages for quality with high mature buck ratios; limited quota version also available.", coords: { lat: 43.2053, lng: -106.7858 }, drawInfo: WY_DEER_DRAW["Q"] },
    "96": { typical: '148-163"', topEnd: '175"',  trait: "Carbon County high desert plateau.", description: "Region Q — Carbon County near Rawlins. High desert sage and plateau terrain. Consistent mature buck presence on largely public BLM land.", coords: { lat: 42.3594, lng: -107.8434 }, drawInfo: WY_DEER_DRAW["Q"] },
    "97": { typical: '150-165"', topEnd: '178"',  trait: "Atlantic Rim area; rolling sage and rimrock.", description: "Region Q — Atlantic Rim area north of Rawlins. Rolling sage and rimrock country. Quality public land hunting adjacent to the top-tier Unit 87.", coords: { lat: 42.5927, lng: -107.6180 }, drawInfo: WY_DEER_DRAW["Q"] },
    "98": { typical: '148-163"', topEnd: '175"',  trait: "Carbon County west; open sage desert and dry washes.", description: "Region Q — Carbon County west of Rawlins. Open sage desert and dry washes. BLM-dominated public land with consistent mature buck opportunity.", coords: { lat: 41.9595, lng: -107.6732 }, drawInfo: WY_DEER_DRAW["Q"] },

    // ── REGION R (Areas 41, 46-47, 50-53) — Bighorn Mountains ───────────────
    // Bighorn Mtns; strong genetics; typical 155-172"; 185"+ possible on top-end bucks
    "41": { typical: '155-170"', topEnd: '183"',  trait: "Bighorn Mountains east slopes; timber and sage foothills.", description: "Region R — Bighorn Mountains east slopes near Sheridan. Timber and sage foothills. Strong Bighorn Mountain genetics with quality mature buck production.", coords: { lat: 44.1522, lng: -107.6356 }, drawInfo: WY_DEER_DRAW["R"] },
    "46": { typical: '155-170"', topEnd: '183"',  trait: "Ten Sleep Canyon breaks; limestone cliffs and timber.", description: "Region R — Bighorn Mountains near Ten Sleep Canyon. Rugged limestone cliffs and timber. Canyon terrain concentrates mature bucks.", coords: { lat: 44.3612, lng: -107.3059 }, drawInfo: WY_DEER_DRAW["R"] },
    "47": { typical: '158-172"', topEnd: '185"',  trait: "Bighorn Mountains west slopes; timbered drainages.", description: "Region R — Bighorn Mountains west slopes. Timbered drainages and open alpine parks. Among the better trophy units in Region R.", coords: { lat: 44.4014, lng: -107.7434 }, drawInfo: WY_DEER_DRAW["R"] },
    "50": { typical: '155-170"', topEnd: '182"',  trait: "North Bighorn Mountains near Lovell; timber and sage.", description: "Region R — North Bighorn Mountains near Lovell. Steep timber and sage benches. Good public land access via Bighorn NF.", coords: { lat: 44.6761, lng: -107.7078 }, drawInfo: WY_DEER_DRAW["R"] },
    "51": { typical: '150-165"', topEnd: '178"',  trait: "Bighorn Basin north near Greybull; sage and canyon.", description: "Region R — Bighorn Basin north near Greybull. Sage flats and canyon breaks. Consistent mid-range trophy production on general tag.", coords: { lat: 44.5980, lng: -107.9057 }, drawInfo: WY_DEER_DRAW["R"] },
    "52": { typical: '155-170"', topEnd: '182"',  trait: "North Bighorn Mountains; open ridge tops and timber.", description: "Region R — North Bighorn Mountains near Lovell. Open ridge tops and timbered slopes. Good glassing country with quality mature bucks.", coords: { lat: 44.7151, lng: -108.0488 }, drawInfo: WY_DEER_DRAW["R"] },
    "53": { typical: '152-168"', topEnd: '180"',  trait: "Pryor Mountains near Lovell; rugged limestone terrain.", description: "Region R — Pryor Mountains near Lovell. Rugged limestone terrain and open sage. Unique isolated range with distinct buck population.", coords: { lat: 44.9022, lng: -108.0285 }, drawInfo: WY_DEER_DRAW["R"] },

    // ── REGION T (Area 15) — Southeast WY/Wheatland area ─────────────────────
    // Large general region; typical 145-165"; Cross C Ranch reports 155-170" managed
    // Season dates Oct 20-31 per Cross C Ranch 2026 info
    "15": { typical: '145-165"', topEnd: '178"',  trait: "Large SE WY region; classic ponderosa and sage.", description: "Region T — Laramie Range near Wheatland/Cheyenne. Classic ponderosa pine and sage. Large general region covering much of SE WY. Cross C Ranch manages trophy hunts here; mature bucks 155-170\" on quality ground.", coords: { lat: 41.9015, lng: -104.4918 }, drawInfo: WY_DEER_DRAW["T"] },

    // ── REGION W (Areas 82, 84, 100, 131) — Baggs/Red Desert ─────────────────
    // High desert genetics adjacent to top-tier units 87/102; typical 150-168"
    "82":  { typical: '150-165"', topEnd: '180"', trait: "Little Snake River; open desert adjacent to Unit 87.", description: "Region W — Little Snake River area near Baggs. Open sage desert and canyon breaks. Adjacent to top-tier Unit 87; shared genetics with heavy-massed desert bucks.", coords: { lat: 41.2118, lng: -107.3855 }, drawInfo: WY_DEER_DRAW["W"] },
    "84":  { typical: '150-165"', topEnd: '180"', trait: "Washakie Basin; high desert sage and rock.", description: "Region W — Washakie Basin near Rawlins. High desert sage and rock outcrops. GOHUNT notes Unit 84 as worth mid-tier points; general tag adjacent unit.", coords: { lat: 41.5957, lng: -107.4793 }, drawInfo: WY_DEER_DRAW["W"] },
    "100": { typical: '148-163"', topEnd: '178"', trait: "Red Desert near Rock Springs; flat sage terrain.", description: "Region W — Red Desert near Rock Springs. Flat sage and sand dune terrain. Desert genetics can produce heavy-massed bucks on limited feed.", coords: { lat: 41.3417, lng: -108.0874 }, drawInfo: WY_DEER_DRAW["W"] },
    "131": { typical: '150-165"', topEnd: '178"', trait: "Upper Green River; sage and mountain transition.", description: "Region W — Upper Green River near Pinedale. Sage and mixed mountain terrain. Transition zone between desert and mountain holds quality mid-range bucks.", coords: { lat: 41.9533, lng: -108.9003 }, drawInfo: WY_DEER_DRAW["W"] },

    // ── REGION X (Areas 121-125, 127, 165) — Absaroka/Wind River ─────────────
    // Remote mountain terrain; typical 153-170"; 183"+ possible; lower hunter pressure
    "121": { typical: '153-168"', topEnd: '182"', trait: "Absaroka near Meeteetse; remote timbered basins.", description: "Region X — Absaroka Range near Meeteetse. Remote timbered drainages and alpine basins. Lower hunter pressure than adjacent regions produces older-age-class bucks.", coords: { lat: 44.7854, lng: -108.9844 }, drawInfo: WY_DEER_DRAW["X"] },
    "122": { typical: '150-165"', topEnd: '178"', trait: "Bighorn Basin east rim; steep sage and canyon.", description: "Region X — Bighorn Basin east rim near Greybull. Steep sage and canyon terrain. Accessible public land with consistent mature buck presence.", coords: { lat: 44.7417, lng: -108.5693 }, drawInfo: WY_DEER_DRAW["X"] },
    "123": { typical: '152-168"', topEnd: '182"', trait: "South Absaroka near Meeteetse; volcanic terrain.", description: "Region X — South Absaroka near Meeteetse. Rugged volcanic terrain and open ridges. Remote basins hold quality mature bucks with strong Absaroka genetics.", coords: { lat: 44.8933, lng: -108.2510 }, drawInfo: WY_DEER_DRAW["X"] },
    "124": { typical: '155-170"', topEnd: '183"', trait: "Wind River Range north near Dubois; high alpine.", description: "Region X — Wind River Range north near Dubois. High alpine and timbered drainages. Wind River genetics with consistent 160\"+ mature buck production.", coords: { lat: 44.4654, lng: -108.3124 }, drawInfo: WY_DEER_DRAW["X"] },
    "125": { typical: '155-170"', topEnd: '183"', trait: "Wind River Range central; remote alpine basins.", description: "Region X — Wind River Range central near Dubois. Remote alpine basins and sage benches. GOHUNT lists Unit 125 as worth mid-tier points for trophy hunters.", coords: { lat: 44.1288, lng: -108.3381 }, drawInfo: WY_DEER_DRAW["X"] },
    "127": { typical: '152-168"', topEnd: '180"', trait: "Wind River Range SE near Lander; timbered slopes.", description: "Region X — Wind River Range southeast near Lander. Timbered slopes and open sage parks. Good public land access via Shoshone NF.", coords: { lat: 43.8205, lng: -108.3115 }, drawInfo: WY_DEER_DRAW["X"] },
    "165": { typical: '153-168"', topEnd: '182"', trait: "Wyoming Range south near Kemmerer; sage and timber.", description: "Region X — Wyoming Range south near Kemmerer. Sage and timbered ridge terrain. Adjacent to Region K; western WY genetics with solid trophy ceiling.", coords: { lat: 42.8427, lng: -109.9142 }, drawInfo: WY_DEER_DRAW["X"] },

    // ── REGION Y (Areas 24-25, 27-28, 30, 32-33, 163, 169) — Bighorn Basin ──
    // Bighorn Basin outfitters report 150-165" typical; top-end 180"+
    "24":  { typical: '150-165"', topEnd: '180"', trait: "Bighorn Basin near Worland; migration corridor.", description: "Region Y — Bighorn Basin near Worland. Open sage flats and Bighorn River breaks. Migration corridor adds trophy opportunity; outfitters in C/Y report 150-165\" typical.", coords: { lat: 44.7986, lng: -107.1640 }, drawInfo: WY_DEER_DRAW["Y"] },
    "25":  { typical: '150-165"', topEnd: '178"', trait: "Bighorn Basin north near Lovell; sage and river bottom.", description: "Region Y — Bighorn Basin north near Lovell. Sage and river bottom terrain. Consistent general tag opportunity with good mature buck presence.", coords: { lat: 44.7215, lng: -107.4416 }, drawInfo: WY_DEER_DRAW["Y"] },
    "27":  { typical: '148-163"', topEnd: '175"', trait: "Bighorn Basin south; desert sage and dry canyons.", description: "Region Y — Bighorn Basin south near Worland. Desert sage and dry canyon terrain. Mid-tier trophy production on accessible BLM ground.", coords: { lat: 44.3682, lng: -106.8034 }, drawInfo: WY_DEER_DRAW["Y"] },
    "28":  { typical: '148-163"', topEnd: '175"', trait: "South Bighorn Basin; sage foothills and river breaks.", description: "Region Y — South Bighorn Basin near Ten Sleep. Sage foothills and river breaks. Consistent mature buck harvest on general region tag.", coords: { lat: 44.2766, lng: -106.9904 }, drawInfo: WY_DEER_DRAW["Y"] },
    "30":  { typical: '148-163"', topEnd: '175"', trait: "Bighorn Basin east side near Buffalo; open sage.", description: "Region Y — Bighorn Basin east side near Buffalo. Open sage and mixed terrain. Good general tag opportunity with accessible public land.", coords: { lat: 44.0141, lng: -106.8321 }, drawInfo: WY_DEER_DRAW["Y"] },
    "32":  { typical: '148-163"', topEnd: '175"', trait: "Bighorn Basin south; sage hills and dry washes.", description: "Region Y — Bighorn Basin south near Worland. Sage hills and dry washes. Consistent mid-range trophy production.", coords: { lat: 43.7567, lng: -107.0416 }, drawInfo: WY_DEER_DRAW["Y"] },
    "33":  { typical: '148-163"', topEnd: '175"', trait: "East Bighorn Basin near Hyattville; rolling sage.", description: "Region Y — East Bighorn Basin near Hyattville. Rolling sage and canyon terrain. Outfitters operating in Region Y report consistent 150-165\" mature bucks.", coords: { lat: 43.6673, lng: -106.7737 }, drawInfo: WY_DEER_DRAW["Y"] },
    "163": { typical: '153-168"', topEnd: '180"', trait: "Wyoming Range south near Afton; timbered ridges.", description: "Region Y — Wyoming Range south near Afton. Timbered ridges and open sage terrain. Western WY genetics lift the trophy ceiling above typical Bighorn Basin units.", coords: { lat: 42.6020, lng: -110.5284 }, drawInfo: WY_DEER_DRAW["Y"] },
    "169": { typical: '153-168"', topEnd: '180"', trait: "Upper Green River near Pinedale; sage and mountain.", description: "Region Y — Upper Green River near Pinedale. Sage parks and timbered mountain terrain. Solid general tag opportunity in quality western WY habitat.", coords: { lat: 43.6163, lng: -109.8052 }, drawInfo: WY_DEER_DRAW["Y"] },
  },

  // ============================================================
  // WYOMING — ANTELOPE
  // ============================================================
  WYOMING_ANTELOPE: {
    "57": { typical: '74-78"', topEnd: '84"+', trait: "Red Desert giants; long prongs.", description: "Southwest of Rawlins (South Wamsutter). Classic Red Desert sagebrush flats.", coords: { lat: 41.6521, lng: -108.2145 } },
    "60": { typical: '72-76"', topEnd: '82"',  trait: "High density; consistent horn length.", description: "Table Mountain area North of Rock Springs. Rolling sage hills.", coords: { lat: 41.9214, lng: -109.0521 } },
    "73": { typical: '72-77"', topEnd: '81"',  trait: "Massive public access (BLM).", description: "North of Casper. Expansive sagebrush flats and rolling prairie.", coords: { lat: 43.1524, lng: -106.3521 } },
    "1":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 1",   coords: { lat: 44.7573, lng: -104.5369 } },
    "2":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 2",   coords: { lat: 44.3316, lng: -104.1729 } },
    "3":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 3",   coords: { lat: 44.3218, lng: -104.5029 } },
    "4":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 4",   coords: { lat: 44.0083, lng: -104.2778 } },
    "5":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 5",   coords: { lat: 44.0205, lng: -104.6465 } },
    "6":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 6",   coords: { lat: 43.7634, lng: -104.5772 } },
    "7":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 7",   coords: { lat: 43.6393, lng: -104.9754 } },
    "8":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 8",   coords: { lat: 43.3444, lng: -104.8967 } },
    "9":   { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 9",   coords: { lat: 43.4143, lng: -104.4486 } },
    "10":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 10",  coords: { lat: 42.9234, lng: -104.5501 } },
    "11":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 11",  coords: { lat: 42.7093, lng: -104.9928 } },
    "15":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 15",  coords: { lat: 44.5746, lng: -105.1585 } },
    "16":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 16",  coords: { lat: 44.0766, lng: -105.3217 } },
    "17":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 17",  coords: { lat: 44.2001, lng: -105.7483 } },
    "18":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 18",  coords: { lat: 44.2709, lng: -106.1824 } },
    "19":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 19",  coords: { lat: 44.6046, lng: -106.1843 } },
    "20":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 20",  coords: { lat: 44.3547, lng: -106.7214 } },
    "21":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 21",  coords: { lat: 43.9168, lng: -106.7584 } },
    "22":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 22",  coords: { lat: 43.8888, lng: -106.4092 } },
    "23":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 23",  coords: { lat: 44.8328, lng: -106.5541 } },
    "24":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 24",  coords: { lat: 44.7986, lng: -107.164  } },
    "25":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 25",  coords: { lat: 44.7215, lng: -107.4416 } },
    "26":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 26",  coords: { lat: 44.4662, lng: -106.4124 } },
    "27":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 27",  coords: { lat: 43.4355, lng: -106.4253 } },
    "29":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 29",  coords: { lat: 43.9525, lng: -106.421  } },
    "30":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 30",  coords: { lat: 43.917,  lng: -105.8395 } },
    "31":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 31",  coords: { lat: 43.4116, lng: -105.9084 } },
    "32":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 32",  coords: { lat: 44.6155, lng: -105.7589 } },
    "34":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 34",  coords: { lat: 42.9234, lng: -104.9924 } },
    "38":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 38",  coords: { lat: 43.2055, lng: -105.7862 } },
    "42":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 42",  coords: { lat: 42.4604, lng: -104.4899 } },
    "43":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 43",  coords: { lat: 41.5399, lng: -105.8669 } },
    "44":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 44",  coords: { lat: 41.4552, lng: -105.3218 } },
    "45":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 45",  coords: { lat: 41.222,  lng: -105.021  } },
    "46":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 46",  coords: { lat: 42.1444, lng: -105.8344 } },
    "47":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 47",  coords: { lat: 42.1391, lng: -106.5534 } },
    "48":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 48",  coords: { lat: 42.259,  lng: -106.1283 } },
    "50":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 50",  coords: { lat: 41.4349, lng: -106.5144 } },
    "51":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 51",  coords: { lat: 41.0544, lng: -106.5312 } },
    "52":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 52",  coords: { lat: 41.3295, lng: -107.4304 } },
    "53":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 53",  coords: { lat: 41.6357, lng: -107.5476 } },
    "55":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 55",  coords: { lat: 41.6111, lng: -106.9012 } },
    "58":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 58",  coords: { lat: 41.2222, lng: -108.6432 } },
    "59":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 59",  coords: { lat: 41.5233, lng: -108.8105 } },
    "61":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 61",  coords: { lat: 41.9595, lng: -107.6732 } },
    "62":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 62",  coords: { lat: 42.0445, lng: -107.1563 } },
    "63":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 63",  coords: { lat: 42.3717, lng: -107.0697 } },
    "64":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 64",  coords: { lat: 42.6622, lng: -107.6212 } },
    "65":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 65",  coords: { lat: 42.8423, lng: -108.5211 } },
    "66":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 66",  coords: { lat: 42.9531, lng: -107.7987 } },
    "67":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 67",  coords: { lat: 43.3194, lng: -107.705  } },
    "68":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 68",  coords: { lat: 43.2233, lng: -108.4769 } },
    "69":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 69",  coords: { lat: 42.9213, lng: -106.7214 } },
    "70":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 70",  coords: { lat: 43.0812, lng: -107.2415 } },
    "71":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 71",  coords: { lat: 43.0233, lng: -107.5612 } },
    "72":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 72",  coords: { lat: 43.3101, lng: -107.2104 } },
    "74":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 74",  coords: { lat: 43.1255, lng: -108.1215 } },
    "75":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 75",  coords: { lat: 44.82,   lng: -108.9785 } },
    "76":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 76",  coords: { lat: 43.7803, lng: -107.3354 } },
    "77":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 77",  coords: { lat: 43.747,  lng: -108.574  } },
    "78":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 78",  coords: { lat: 44.8211, lng: -108.5412 } },
    "79":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 79",  coords: { lat: 44.5211, lng: -108.6142 } },
    "80":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 80",  coords: { lat: 44.3211, lng: -108.2142 } },
    "81":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 81",  coords: { lat: 44.1211, lng: -108.1142 } },
    "82":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 82",  coords: { lat: 43.8211, lng: -108.1142 } },
    "83":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 83",  coords: { lat: 42.6597, lng: -107.0143 } },
    "84":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 84",  coords: { lat: 42.7211, lng: -108.9142 } },
    "85":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 85",  coords: { lat: 42.5123, lng: -109.8357 } },
    "86":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 86",  coords: { lat: 42.2211, lng: -109.8142 } },
    "87":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 87",  coords: { lat: 42.7211, lng: -110.1142 } },
    "88":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 88",  coords: { lat: 42.9211, lng: -110.0142 } },
    "89":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 89",  coords: { lat: 42.6211, lng: -110.3142 } },
    "90":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 90",  coords: { lat: 43.5776, lng: -109.6396 } },
    "91":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 91",  coords: { lat: 43.2211, lng: -110.1142 } },
    "92":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 92",  coords: { lat: 42.4211, lng: -110.7142 } },
    "93":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 93",  coords: { lat: 41.7735, lng: -109.7185 } },
    "94":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 94",  coords: { lat: 41.5496, lng: -110.3341 } },
    "95":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 95",  coords: { lat: 41.7708, lng: -110.6786 } },
    "96":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 96",  coords: { lat: 41.4211, lng: -110.1142 } },
    "99":  { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 99",  coords: { lat: 41.1424, lng: -110.6028 } },
    "100": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 100", coords: { lat: 41.2205, lng: -110.1498 } },
    "101": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 101", coords: { lat: 41.1312, lng: -109.1828 } },
    "102": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 102", coords: { lat: 41.2448, lng: -109.185  } },
    "103": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 103", coords: { lat: 41.3484, lng: -108.7096 } },
    "106": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 106", coords: { lat: 43.5554, lng: -104.7103 } },
    "107": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 107", coords: { lat: 42.0241, lng: -108.0988 } },
    "108": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 108", coords: { lat: 42.2211, lng: -107.5142 } },
    "109": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 109", coords: { lat: 44.5211, lng: -109.4142 } },
    "110": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 110", coords: { lat: 44.2211, lng: -109.6142 } },
    "111": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 111", coords: { lat: 44.7211, lng: -109.8142 } },
    "112": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 112", coords: { lat: 44.3211, lng: -109.8142 } },
    "113": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 113", coords: { lat: 43.4211, lng: -106.1142 } },
    "114": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 114", coords: { lat: 43.7211, lng: -108.8142 } },
    "115": { typical: "Contact WGFD", topEnd: "Contact WGFD", trait: "Wyoming Antelope", description: "Unit 115", coords: { lat: 43.5211, lng: -108.3142 } },
  },

  // ============================================================
  // WYOMING — ELK
  // ============================================================
  WYOMING_ELK: {
    "100": { typical: '310-330"', topEnd: '370"+', trait: "Desert elk; massive travel distances.", description: "Red Desert region North of Rock Springs. Flat sage and sand dunes. No timber.", coords: { lat: 42.1524, lng: -108.4521 } },
    "124": { typical: '320-340"', topEnd: '380"+', trait: "Powder Rim genetics; high mass.",        description: "Southwest WY near Baggs. Deep canyons, sage flats, and juniper ridges.",       coords: { lat: 41.1524, lng: -107.9821 } },
    "7":   { typical: '320-340"', topEnd: '370"+', trait: "Laramie Peak giants; extreme mass.",     description: "Laramie Peak area. Rugged granite peaks mixed with private ranch land.",      coords: { lat: 42.4332, lng: -105.7001 } },
    "31":  { typical: '310-330"', topEnd: '360"',  trait: "Hat Six / Casper Mountain resident herds.", description: "Just South of Casper. Mixed private/public mountain and brush terrain.",   coords: { lat: 42.7521, lng: -106.2821 } },
  },

  // ============================================================
  // WYOMING — MOOSE
  // ============================================================
  WYOMING_MOOSE: {
    "1":  { typical: '35-42" width', topEnd: '50"+', trait: "Shoshone river bottom genetics.", description: "Northwest WY, North of Cody. River bottoms and willow thickets.",                         coords: { lat: 44.7521, lng: -109.5241 } },
    "5":  { typical: '38-46" width', topEnd: '52"',  trait: "Upper Green River giants.",       description: "North of Pinedale. High alpine river drainages and willow basins.",                     coords: { lat: 43.2524, lng: -109.9521 } },
    "38": { typical: '38-45" width', topEnd: '52"',  trait: "Snowy Range alpine moose.",       description: "Medicine Bow Mountains near Laramie. High elevation timber and lakes.",                 coords: { lat: 41.3421, lng: -106.3124 } },
  },

  // ============================================================
  // WYOMING — BIGHORN SHEEP
  // ============================================================
  WYOMING_BIGHORNSHEEP: {
    "4":  { typical: '160-170"', topEnd: '180"+', trait: "Absaroka wilderness rams.", description: "Younts Peak area. Remote wilderness, extremely rugged volcanic rock.",          coords: { lat: 43.9521, lng: -109.8142 } },
    "19": { typical: '175-182"', topEnd: '190"+', trait: "Laramie Peak giants.",      description: "Laramie Peak. Granite outcrops and steep canyons. Fast-growing rams.",         coords: { lat: 42.3241, lng: -105.8124 } },
  },

  // ============================================================
  // WYOMING — MOUNTAIN GOAT
  // ============================================================
  WYOMING_MTNGOAT: {
    "1": { typical: '8-9" horns', topEnd: '10"+',  trait: "Beartooth Plateau genetics.", description: "North of Cody, Beartooth Mountains. High alpine tundra above 10,000ft.",    coords: { lat: 44.9524, lng: -109.4521 } },
    "3": { typical: '9" horns',   topEnd: '10.5"', trait: "North Absaroka herd.",        description: "North of Sunlight Basin. Remote wilderness cliffs and alpine ridges.",       coords: { lat: 44.8214, lng: -109.7521 } },
  },

  // ============================================================
  // IDAHO — MULE DEER
  // ============================================================
  IDAHO_DEER: {
    "67":  { typical: '150-165"', topEnd: '180"+', trait: "Steep terrain; migratory.",                          description: "Palisades area near Swan Valley and the Wyoming border. High elevation timber dropping into the South Fork Snake River. NOT THE BEAVERHEAD/LEMHI ZONE.", coords: { lat: 43.4000, lng: -111.3000 } },
    "36B": { typical: '155-170"', topEnd: '185"+', trait: "Salmon River canyon genetics; almost entirely public land.", description: "Salmon Unit, central Idaho near Salmon. Rugged canyon to alpine terrain. High public land percentage.",                            coords: { lat: 45.1821, lng: -114.0124 } },
    "28":  { typical: '155-168"', topEnd: '180"+', trait: "Big logged country; steep spotting terrain.",        description: "Just west of Salmon, ID. Nearly 100% public land. Big mountain country with logged slopes creating prime mule deer browse.",             coords: { lat: 45.0214, lng: -114.3521 } },
    "45":  { typical: '158-172"', topEnd: '185"',  trait: "Lower hunter pressure; solid 160+ class bucks.",    description: "Smokey-Bennett unit, south-central Idaho. Mix of open sage foothills and timbered drainages. Good public land access.",                  coords: { lat: 43.8521, lng: -115.0214 } },
    "44":  { typical: '160-175"', topEnd: '190"+', trait: "Controlled hunt quality; rugged backcountry.",       description: "South-central Idaho near Fairfield. High alpine to sage desert transition. Extremely hard to draw but top-end genetics.",               coords: { lat: 43.5124, lng: -114.8821 } },
    "52":  { typical: '162-178"', topEnd: '195"+', trait: "Hells Canyon rim genetics; giant frames.",           description: "Western Idaho near Weiser. Hells Canyon breaks and rimrock country. Some of the biggest frames in the state.",                          coords: { lat: 44.7521, lng: -116.9821 } },
    "55":  { typical: '160-178"', topEnd: '190"+', trait: "South Hills early velvet genetics; 4-point dominant.", description: "South Hills near Twin Falls. Early season velvet rifle opportunity. Rolling timber and sage mixed terrain.",                          coords: { lat: 42.3521, lng: -114.5214 } },
    "40":  { typical: '158-172"', topEnd: '185"',  trait: "Central Idaho wilderness transition.",               description: "Central Idaho near Challis. Salmon River Mountains and high desert breaks. Excellent public land access via USFS.",                      coords: { lat: 44.5121, lng: -114.2214 } },
  },

  // ============================================================
  // IDAHO — ELK
  // ============================================================
  IDAHO_ELK: {
    "67": { typical: '270-300"', topEnd: '330"+', trait: "Palisades Zone; steep and thick.",                  description: "Palisades Zone near Swan Valley, Irwin, and the Wyoming border. Bounded by the South Fork Snake River. THIS IS NOT THE BEAVERHEAD OR LEMHI ZONE.", coords: { lat: 43.4000, lng: -111.3000 } },
    "54": { typical: '330-355"', topEnd: '390"+', trait: "Top trophy genetics in Idaho; high desert to timber mix.", description: "South-central Idaho near Twin Falls. Diverse terrain from high desert draws to timbered ridges. Consistently produces 350\"+ bulls.",     coords: { lat: 42.5821, lng: -114.8124 } },
    "40": { typical: '320-345"', topEnd: '375"+', trait: "Remote wilderness bulls; extreme mass.",            description: "Central Idaho Salmon River Mountains near Challis. Deep wilderness drainages and high alpine basins.",                                       coords: { lat: 44.5121, lng: -114.2214 } },
    "42": { typical: '320-345"', topEnd: '370"+', trait: "Trophy controlled hunt; wilderness access required.", description: "Frank Church Wilderness, central Idaho. Extremely remote. Floatplane or horseback access only.",                                          coords: { lat: 44.8921, lng: -114.9521 } },
    "44": { typical: '315-340"', topEnd: '370"',  trait: "High alpine rut bulls; hard draw.",                 description: "South-central Idaho near Fairfield/Soldier Mountains. Steep timbered ridges and open alpine bowls.",                                        coords: { lat: 43.5124, lng: -114.8821 } },
    "45": { typical: '310-335"', topEnd: '365"',  trait: "Smokey-Bennett bulls; lower pressure.",             description: "Smokey-Bennett area south of Boise. Timbered mountains and sage foothills.",                                                               coords: { lat: 43.8521, lng: -115.0214 } },
    "30": { typical: '310-330"', topEnd: '360"',  trait: "Clearwater zone bulls; heavy timber.",              description: "North-central Idaho, Clearwater River drainage. Dense lodgepole and cedar timber.",                                                        coords: { lat: 46.5214, lng: -115.6821 } },
    "76": { typical: '305-325"', topEnd: '355"',  trait: "High harvest OTC; big desert elk.",                 description: "Southeast Idaho near Pocatello. High desert sage and juniper with timbered mountain pockets.",                                              coords: { lat: 42.8521, lng: -112.4514 } },
  },

  // ============================================================
  // IDAHO — ANTELOPE
  // ============================================================
  IDAHO_ANTELOPE: {
    "56": { typical: '68-74"', topEnd: '80"+', trait: "Bennett Hills giants; top Idaho pronghorn.",  description: "Bennett Hills area southwest of Gooding. Classic rolling sage flats. Consistently produces Idaho's best pronghorn bucks.", coords: { lat: 43.0214, lng: -115.2521 } },
    "57": { typical: '66-72"', topEnd: '78"',  trait: "Owyhee Desert long-prong genetics.",          description: "Owyhee County, southwest Idaho. Vast BLM sage desert. Lower hunter pressure due to remote access.",                      coords: { lat: 42.4521, lng: -115.9821 } },
    "69": { typical: '65-71"', topEnd: '76"',  trait: "Magic Valley flats; good density.",           description: "South-central Idaho near Twin Falls. Open sagebrush and lava rock flats. Good antelope numbers and consistent horn quality.", coords: { lat: 42.5821, lng: -114.1214 } },
    "67": { typical: '66-72"', topEnd: '77"',  trait: "Snake River Plain access.",                   description: "Eastern Snake River Plain near American Falls. Agricultural edges and sage flats.",                                       coords: { lat: 42.7821, lng: -113.0521 } },
  },

  // ============================================================
  // IDAHO — MOOSE
  // ============================================================
  IDAHO_MOOSE: {
    "29":  { typical: '38-46" width', topEnd: '52"+', trait: "Salmon River Shiras giants.",      description: "Salmon River drainage, central Idaho. Classic Shiras moose habitat — willow-choked river bottoms.", coords: { lat: 45.1521, lng: -114.2821 } },
    "51":  { typical: '38-45" width', topEnd: '50"',  trait: "Lemhi zone; remote wilderness bulls.", description: "Lemhi Mountains, central Idaho near Leadore. Salmon-Challis National Forest.",                  coords: { lat: 44.6821, lng: -113.3521 } },
    "73":  { typical: '36-44" width', topEnd: '50"',  trait: "Southeast Idaho; accessible draw unit.", description: "Southeast Idaho near Pocatello. Willow riparian corridors and timbered mountain drainages.",    coords: { lat: 42.8714, lng: -112.5024 } },
    "37A": { typical: '40-48" width', topEnd: '54"+', trait: "Top trophy Shiras unit.",           description: "Pioneer Mountains and Big Lost River drainage, central Idaho. Remote high-country basins and willow flats.", coords: { lat: 43.9214, lng: -114.0821 } },
  },

  // ============================================================
  // IDAHO — BIGHORN SHEEP
  // ============================================================
  IDAHO_BIGHORNSHEEP: {
    "36B": { typical: '155-168"', topEnd: '180"+', trait: "Salmon River canyon Rocky Mountain rams.", description: "Salmon unit, central Idaho. Steep granite canyon walls and alpine ridges above the Salmon River.", coords: { lat: 45.1821, lng: -114.0124 } },
    "28":  { typical: '155-165"', topEnd: '175"',  trait: "Remote wilderness rams; low pressure.",   description: "West of Salmon, ID. Near-total wilderness access. Logged slopes and rimrock cliffs.",             coords: { lat: 45.0214, lng: -114.3521 } },
    "29":  { typical: '158-170"', topEnd: '182"+', trait: "Salmon drainage top-end rams.",            description: "Salmon River Mountains. Remote canyon country. Among Idaho's top Rocky Mountain bighorn units.",  coords: { lat: 45.1521, lng: -114.2821 } },
    "37A": { typical: '150-162"', topEnd: '172"',  trait: "Pioneer Mountains California bighorn.",    description: "Central Idaho Pioneer Mountains. Mixed Rocky Mountain and California bighorn range.",             coords: { lat: 43.9214, lng: -114.0821 } },
  },

  // ============================================================
  // IDAHO — MOUNTAIN GOAT
  // ============================================================
  IDAHO_MTNGOAT: {
    "10":  { typical: '8-9" horns',   topEnd: '10"',   trait: "Clearwater high country goats.",      description: "North-central Idaho, Clearwater Mountains. Rugged granite cliffs and high alpine tundra.",          coords: { lat: 46.4821, lng: -115.1521 } },
    "20":  { typical: '8.5-9.5" horns', topEnd: '10.5"+', trait: "Salmon River Mountain goats.",    description: "Central Idaho, Salmon River Mountains near Challis. Extreme vertical terrain. Top trophy goat unit.", coords: { lat: 44.8521, lng: -114.4021 } },
    "29":  { typical: '8-9" horns',   topEnd: '10"',   trait: "Remote wilderness goats; best odds.", description: "Salmon drainage wilderness, central Idaho. Extremely rugged country. Better draw odds than most Idaho units.", coords: { lat: 45.1521, lng: -114.2821 } },
    "36B": { typical: '8.5-9.5" horns', topEnd: '10.5"', trait: "Salmon unit alpine cliffs; quality billies.", description: "Salmon unit, central Idaho. Steep granite and quartzite cliffs above the Salmon River.", coords: { lat: 45.1821, lng: -114.0124 } },
  },

  // ============================================================
  // UTAH — MULE DEER (Limited Entry + General Season)
  // ============================================================
  // Draw system: HYBRID BONUS POINT for LE; PREFERENCE POINT for general
  // Non-residents: 10% of tags; 5-year waiting period after drawing LE deer
  // Premium LE (Henry Mtns, Paunsaugunt): managed 40-55 bucks per 100 does
  // Standard LE: managed 23-35 bucks per 100 does
  // ============================================================
  UTAH_DEER: {
    "Henry Mountains": {
      typical: '170-190"', topEnd: '210"+',
      trait: "World-class desert giants; free-roaming bison herd; extreme terrain.",
      description: "Henry Mountains, south-central Utah. Isolated range rising from canyon country. Home to a free-roaming bison herd. Steep, rocky terrain demands high fitness. Minimal pressure produces mature age-class bucks. One of the most coveted tags in the West.",
      coords: { lat: 37.9833, lng: -110.7833 },
      utahDrawInfo: { drawType: 'premium-limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: null, randomOddsNR: "~0.5% or less", waitingPeriod: "5 years", notes: "Roughly 3 NR rifle tags per year. Near-impossible NR draw. Random pool is the only realistic path. Conservation/CWMU tags available from outfitters ($20k-$40k)." }
    },
    "Paunsaugunt": {
      typical: '170-190"', topEnd: '205"+',
      trait: "Migration hunt; thick P-J terrain; rutting bucks vulnerable late season.",
      description: "Paunsaugunt Plateau, southwest Utah adjacent to Bryce Canyon. Pinion-juniper and ponderosa terrain. Migration-dependent hunt — weather-critical. Bucks can be giants or migrate out early. Archery/muzzleloader recommended. Huge unit with good vehicle access.",
      coords: { lat: 37.6500, lng: -112.2000 },
      utahDrawInfo: { drawType: 'premium-limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: null, randomOddsNR: "~0.5% or less", waitingPeriod: "5 years", notes: "Management and cactus buck hunts also available. Migration timing critical — go guided. Archery/ML recommended over rifle. CWMU tags available." }
    },
    "Book Cliffs": {
      typical: '150-170"', topEnd: '185"',
      trait: "High deer density; large roadless area; 22-25 inch 4-points everywhere.",
      description: "Book Cliffs, northeast Utah. Large, rugged unit with extensive roadless backcountry. High deer density with many mature 4-point bucks. Fun hunt with lots of action but 180\"+ bucks are the exception. ATVs useful in accessible areas.",
      coords: { lat: 39.6500, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 8, bonusPointsToGuarantee: 12, randomOddsNR: "~1-2%", waitingPeriod: "5 years", notes: "HAMSS hunt also available Nov. Best for action hunters without needing a true giant. No guide needed — truck/ATV sufficient." }
    },
    "Fillmore Oak Creek": {
      typical: '165-185"', topEnd: '200"+',
      trait: "Top-tier genetics; high Fishlake Plateau; one of the best standard LE units.",
      description: "Oak Creek/Fillmore area, central Utah. High Fishlake Plateau with oak brush and aspen. Consistently produces 180\"+ bucks. One of the most sought-after standard LE tags in the state.",
      coords: { lat: 38.9500, lng: -112.1000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: 18, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "Top 3 standard LE unit in Utah for trophy potential. Expect 15-20+ points to guarantee. Monster Muleys forum top pick." }
    },
    "San Juan": {
      typical: '160-180"', topEnd: '195"+',
      trait: "Canyon country; deep draws; Canyonlands genetics; steep and remote.",
      description: "San Juan/southeast Utah. Canyon and mesa country bordering Colorado. Remote drainages hold mature bucks. 180\"+ bucks taken regularly. Terrain varies from desert to timbered mesas.",
      coords: { lat: 37.5000, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 15, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "Consistent 180\"+ producer. Physical hunt. Dolores Triangle subunit also worth considering." }
    },
    "La Sal Dolores Triangle": {
      typical: '160-178"', topEnd: '192"',
      trait: "La Sal Mountains; 13,000ft peaks; Colorado border genetics.",
      description: "La Sal Mountains, southeast Utah near Moab. Dramatic terrain from canyon desert to alpine peaks. Strong genetics from isolated mountain range. Good public land via Manti-La Sal NF.",
      coords: { lat: 38.4500, lng: -109.2500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 12, randomOddsNR: "~1-2%", waitingPeriod: "5 years", notes: "La Sal Castle Valley and La Sal/Moab Valley added as November any-weapon hunts. Good DIY potential." }
    },
    "Diamond Mountain": {
      typical: '155-172"', topEnd: '185"',
      trait: "Northeast Utah; accessible; better draw odds than top units.",
      description: "Diamond Mountain/South Slope, northeast Utah. Timbered ridges and sage parks. Good public land access. Better draw odds than top-tier units while still producing quality bucks. No guide required.",
      coords: { lat: 40.7000, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 8, bonusPointsToGuarantee: 10, randomOddsNR: "~2-3%", waitingPeriod: "5 years", notes: "Recommended for hunters wanting to burn points sooner on a quality hunt. 180\"+ possible with effort. Private land issues in some areas." }
    },
    "Vernon": {
      typical: '155-172"', topEnd: '185"',
      trait: "West Desert freaks; 90% public BLM; tall forkies and toad 4-points.",
      description: "Vernon/West Desert, west-central Utah. 90% public BLM land. Known for producing surprise freaks and tall forkies. 180\"+ bucks documented. DIY-friendly terrain.",
      coords: { lat: 40.0900, lng: -112.4200 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 6, bonusPointsToGuarantee: 10, randomOddsNR: "~2-3%", waitingPeriod: "5 years", notes: "Monster Muleys recommendation for hunters wanting public land without burning max points. Multi-season tag recommended if available." }
    },
    "Thousand Lake": {
      typical: '158-175"', topEnd: '190"',
      trait: "Newly moved to LE 2025; improving trophy quality; high plateau.",
      description: "Thousand Lake Mountain, south-central Utah. Moved from general to limited-entry in 2025. High plateau terrain with aspen and conifer. Trophy quality expected to improve significantly under LE management. Restricted weapon hunts in 2025.",
      coords: { lat: 38.3500, lng: -111.5500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: null, randomOddsNR: "Unknown — new LE unit 2025", waitingPeriod: "5 years", notes: "New LE unit as of 2025. Restricted muzzleloader/rifle only. Early-adopter opportunity for point holders as age structure builds." }
    },
    "Boulder Kaiparowits": {
      typical: '155-172"', topEnd: '183"',
      trait: "Grand Staircase canyon country; remote; restricted weapon 2025.",
      description: "Boulder/Kaiparowits area, south-central Utah. Grand Staircase-Escalante country. Physically demanding. Restricted muzzleloader/rifle in 2025. HAMSS November hunt also available.",
      coords: { lat: 37.7500, lng: -111.4000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 10, randomOddsNR: "~1-2%", waitingPeriod: "5 years", notes: "Restricted weapon 2025. Quality expected to improve. HAMSS hunt in November for rutting buck opportunity." }
    },
    "Monroe": {
      typical: '145-162"', topEnd: '175"',
      trait: "General season preference draw; roadless and steep.",
      description: "Monroe Mountain, central Utah. Roadless, steep Fishlake NF terrain. General season preference point draw. Improving age structure and trophy quality under consistent management.",
      coords: { lat: 38.6200, lng: -112.1500 },
      utahDrawInfo: { drawType: 'general-season', pointSystem: 'preference', nrAllocation: "10% of total tags", nrTagsApprox: 10, bonusPointsToGuarantee: 5, randomOddsNR: "~5-8% at 0 points", waitingPeriod: "Points reset to 0 upon drawing", notes: "Preference point draw. Highest points draw first. Steep and roadless — services within 40 miles." }
    },
    "LaSal General": {
      typical: '140-160"', topEnd: '172"',
      trait: "General season; desert to alpine terrain; good variety.",
      description: "La Sal Mountains general season unit, southeast Utah. Desert canyon to alpine peaks. Good deer variety and terrain. Preference point draw for general season. Reported drawn with 2 points in 2024.",
      coords: { lat: 38.4500, lng: -109.2500 },
      utahDrawInfo: { drawType: 'general-season', pointSystem: 'preference', nrAllocation: "10% of total tags", nrTagsApprox: 12, bonusPointsToGuarantee: 3, randomOddsNR: "~8-12% at 0 points", waitingPeriod: "Points reset to 0 upon drawing", notes: "General season preference draw. Good DIY terrain for moderate-fitness hunters." }
    },
  },

  // ============================================================
  // UTAH — ELK (Limited Entry)
  // ============================================================
  // 10% NR allocation; 5-year waiting period; 50/50 hybrid bonus point draw
  // Top-7: San Juan, Fillmore/Pahvant, Boulder, Monroe, Beaver, SW Desert, Panguitch Lake
  // Next tier: Manti, Mt. Dutton, Wasatch, Book Cliffs
  // ============================================================
  UTAH_ELK: {
    "San Juan": {
      typical: '340-370"', topEnd: '400"+',
      trait: "Utah most coveted elk tag; world-class bulls; near-impossible NR draw.",
      description: "San Juan unit, southeast Utah. Canyon and mesa terrain producing some of the largest bulls in the West annually. Very few NR tags. If you draw this tag, hire a guide.",
      coords: { lat: 37.5000, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 2, bonusPointsToGuarantee: null, randomOddsNR: "< 0.1%", waitingPeriod: "5 years", notes: "Effectively lottery-only for NR. Estimated 65+ years to guarantee for residents. Apply every year for a random draw shot. World-class 400\"+ bulls documented annually." }
    },
    "Fillmore Pahvant": {
      typical: '340-370"', topEnd: '400"+',
      trait: "Pahvant Range; highest elk density of any LE unit; rutting bulls everywhere.",
      description: "Pahvant Range, central Utah near Fillmore. Highest elk density among trophy units. Rutting bulls extremely active. Open parks and oak-covered ridges. Outfitters report bulls everywhere during peak rut.",
      coords: { lat: 38.9000, lng: -112.3000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 2, bonusPointsToGuarantee: null, randomOddsNR: "< 0.1%", waitingPeriod: "5 years", notes: "Estimated 46+ years to guarantee for residents. NR essentially lottery-only. World-class 400\"+ bulls. If you draw, hire a guide." }
    },
    "Monroe Elk": {
      typical: '340-365"', topEnd: '395"+',
      trait: "Fishlake high country; roadless timber; rutting bulls vulnerable.",
      description: "Monroe Mountain, central Utah. High Fishlake Plateau. Roadless and steep. Rut-hunting in thick timber produces exceptional bulls. Top-7 Utah elk unit.",
      coords: { lat: 38.6200, lng: -112.1500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: null, randomOddsNR: "< 0.2%", waitingPeriod: "5 years", notes: "Effectively lottery-only for NR. Top 3 elk unit in Utah. Steep and roadless — outfitter or pack-in required for best success." }
    },
    "Boulder Elk": {
      typical: '340-368"', topEnd: '395"+',
      trait: "Boulder Mountain high plateau; dense timber; giant bulls hide in thick country.",
      description: "Boulder Mountain, south-central Utah. High plateau with dense timber and open parks. Trophy bulls use thick timber effectively. Top-7 Utah elk unit. Experience in dense timber required.",
      coords: { lat: 37.9000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: null, randomOddsNR: "< 0.2%", waitingPeriod: "5 years", notes: "Near-impossible NR draw. 21+ points to get into max point pool for residents. Top-7. Guide with local timber knowledge strongly recommended." }
    },
    "Beaver Elk": {
      typical: '340-368"', topEnd: '395"+',
      trait: "Open parks and timbered ridges; great rut hunting; top-7 unit.",
      description: "Beaver unit, southwest Utah. Mix of open parks and timbered ridges. Excellent rut hunting. Top-7 Utah elk unit. Beaver East has only 1 tag — pure random draw.",
      coords: { lat: 38.2700, lng: -112.6500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 2, bonusPointsToGuarantee: null, randomOddsNR: "< 0.2%", waitingPeriod: "5 years", notes: "Beaver East has 1 tag — pure lottery for everyone regardless of points. Beaver West slightly better odds. Top-7 unit." }
    },
    "Southwest Desert Elk": {
      typical: '335-365"', topEnd: '390"+',
      trait: "Open desert elk; spot and stalk; long shots; unique hunt in the West.",
      description: "Southwest Desert unit, Utah. Open desert and sage terrain unlike any other Utah elk hunt. Elk highly visible but spooky. Exceptional spot-and-stalk for long-range shooters. Top-7 unit.",
      coords: { lat: 38.4000, lng: -113.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 3, bonusPointsToGuarantee: 9, randomOddsNR: "~0.5%", waitingPeriod: "5 years", notes: "Slightly better NR odds than most top-tier units. Open terrain demands long-range ability. 370\"+ bulls taken annually. Consider for hunters with 8-12 points." }
    },
    "Panguitch Lake Elk": {
      typical: '335-362"', topEnd: '390"+',
      trait: "Southern Utah; accessible terrain; top-7; better draw odds vs peers.",
      description: "Panguitch Lake area, southwest Utah. Accessible terrain with mix of forest and open country. Among Utah top-7 elk units. Better draw odds than San Juan or Pahvant while still producing world-class bulls.",
      coords: { lat: 37.7200, lng: -112.6500 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 4, bonusPointsToGuarantee: 12, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "Best relative value among top-7 units. Early rifle any-weapon tag added in 2025. One of the more accessible top-tier elk hunts." }
    },
    "Manti Elk": {
      typical: '320-355"', topEnd: '380"+',
      trait: "Manti-La Sal NF; accessible; second-tier but 370\"+ bulls documented.",
      description: "Manti Mountains, central Utah. Manti-La Sal National Forest. Second-tier quality capable of 370\"+ bulls. Accessible terrain with improving point requirements as hunters recognize the quality.",
      coords: { lat: 39.5000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 15, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "20+ points for guaranteed early rifle as of 2024. Multi-season tag available. Good value for 12-18 point holders." }
    },
    "Mt Dutton Elk": {
      typical: '320-352"', topEnd: '378"+',
      trait: "Southern Utah plateau; second-tier; good DIY potential.",
      description: "Mt. Dutton, south-central Utah. High plateau south of Escalante. Second-tier unit with consistent 340-360\" production. DIY-friendly with good public land access.",
      coords: { lat: 37.7500, lng: -112.0000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 14, randomOddsNR: "~1%", waitingPeriod: "5 years", notes: "Good value unit for hunters with 10-15 points. Multi-season tag available. DIY-accessible terrain." }
    },
    "Wasatch Elk": {
      typical: '315-350"', topEnd: '375"+',
      trait: "Wasatch Mountains; second-tier; accessible from SLC; increasing competition.",
      description: "Wasatch Mountains, north-central Utah. Accessible from Salt Lake City. Second-tier quality capable of big bulls. Point requirements increasing due to proximity to population centers.",
      coords: { lat: 40.5000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 17, randomOddsNR: "~0.5-1%", waitingPeriod: "5 years", notes: "17+ points for guaranteed early rifle as of 2024. Good road access but rising competition." }
    },
    "Book Cliffs Elk": {
      typical: '310-345"', topEnd: '370"+',
      trait: "Large roadless elk unit; backcountry effort required for top bulls.",
      description: "Book Cliffs, northeast Utah. Large roadless backcountry elk unit. Accessible areas produce average bulls; backcountry produces quality. Both archery and rifle opportunities. Multi-season tag available.",
      coords: { lat: 39.6500, lng: -109.5000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 6, bonusPointsToGuarantee: 10, randomOddsNR: "~2%", waitingPeriod: "5 years", notes: "Better-than-average NR draw odds for LE unit. Multi-season tag available. Book Cliffs Bitter Creek/South subunit has best odds. Backcountry effort required for quality." }
    },
  },

  // ============================================================
  // UTAH — ANTELOPE (Limited Entry)
  // ============================================================
  // 10% NR allocation; 2-year waiting period after drawing
  // Not a trophy destination but 80\"+ bucks taken annually on good years
  // ============================================================
  UTAH_ANTELOPE: {
    "West Desert": {
      typical: '70-78"', topEnd: '83"',
      trait: "Large open BLM desert; best public land antelope in Utah.",
      description: "West Desert unit, west-central Utah. Large BLM-dominated desert basin. Best public land antelope hunting in the state with reasonable draw odds. Open terrain ideal for spot and stalk.",
      coords: { lat: 40.2000, lng: -113.0000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 8, bonusPointsToGuarantee: 6, randomOddsNR: "~3-5%", waitingPeriod: "2 years", notes: "Best NR draw odds among Utah antelope units. 80\"+ bucks possible. Good DIY hunt." }
    },
    "Plateau": {
      typical: '70-77"', topEnd: '82"',
      trait: "High plateau antelope; unique terrain; decent trophy quality.",
      description: "Plateau/Fishlake area, central Utah. Higher elevation antelope hunting on open plateaus. Good trophy quality relative to other Utah units.",
      coords: { lat: 38.9000, lng: -111.8000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 7, randomOddsNR: "~2-4%", waitingPeriod: "2 years", notes: "Decent NR draw odds. High plateau terrain makes for a scenic hunt." }
    },
    "Panguitch Antelope": {
      typical: '68-76"', topEnd: '80"',
      trait: "Southern Utah antelope; good numbers; accessible.",
      description: "Panguitch area, southwest Utah. Good antelope numbers with accessible terrain. Consistent mid-tier quality. Good for hunters wanting to use points sooner.",
      coords: { lat: 37.8000, lng: -112.4000 },
      utahDrawInfo: { drawType: 'limited-entry', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 5, bonusPointsToGuarantee: 5, randomOddsNR: "~3-5%", waitingPeriod: "2 years", notes: "Good option for burning points sooner. Accessible terrain. Mid-range trophy quality." }
    },
  },

  // ============================================================
  // UTAH — MOOSE (Once-in-a-Lifetime)
  // ============================================================
  // OIL permit — draw once, can never apply for moose again
  // Shiras moose; hardest OIL species to draw in Utah
  // Separate bonus points from other species
  // ============================================================
  UTAH_MOOSE: {
    "North Slope Uintas": {
      typical: '40-48\" spread', topEnd: '50\"+',
      trait: "Best Shiras moose density in Utah; north slope Uinta Mountains.",
      description: "North Slope of the Uinta Mountains, northeast Utah. Highest Shiras moose density in the state. Willow-choked drainages and alpine lakes. Backcountry required for best bulls. Once-in-a-lifetime permit.",
      coords: { lat: 40.9000, lng: -110.5000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "Hardest OIL species to draw in Utah. Apply every year — cheap ticket for world-class experience. Moose points are species-specific." }
    },
    "Cache Moose": {
      typical: '38-45\" spread', topEnd: '48\"+',
      trait: "Northern Utah Cache Valley; accessible Shiras moose hunt.",
      description: "Cache Valley and adjacent mountains, northern Utah near Logan. More accessible than Uintas moose country. Good Shiras moose population with quality bulls available.",
      coords: { lat: 41.7000, lng: -111.7000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Apply annually. More accessible terrain than Uintas. Good trophy quality for Shiras subspecies." }
    },
    "Uintas East Moose": {
      typical: '40-47\" spread', topEnd: '50\"+',
      trait: "East Uinta drainage; remote Shiras moose country.",
      description: "East Uinta Mountains and drainages, northeast Utah. Remote country with good Shiras moose populations. Backcountry access required. Once-in-a-lifetime permit.",
      coords: { lat: 40.7000, lng: -109.8000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Remote unit. NR archery tag not available in 2025 — check current guidebook. Apply annually for random draw." }
    },
  },

  // ============================================================
  // UTAH — DESERT BIGHORN SHEEP (Once-in-a-Lifetime)
  // ============================================================
  // OIL permit; separate bonus points from Rocky Mountain bighorn
  // Best units: Kaiparowits (East/West/Escalante), San Rafael
  // ============================================================
  UTAH_BIGHORNSHEEP: {
    "Kaiparowits East": {
      typical: '160-175"', topEnd: '185"+',
      trait: "Best desert bighorn unit in Utah; world-class rams; Grand Staircase terrain.",
      description: "Kaiparowits Plateau East, south-central Utah. Grand Staircase-Escalante canyon country. Best desert bighorn unit in the state. Remote and rugged. World-class rams documented. Guides strongly recommended.",
      coords: { lat: 37.4000, lng: -111.5000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. NR had at least 1 permit in 2024. Apply every year. Remote canyon — outfitter strongly recommended. Top desert bighorn trophy potential in Utah." }
    },
    "Kaiparowits West": {
      typical: '158-172"', topEnd: '183"',
      trait: "Excellent ram quality; slightly more accessible than East unit.",
      description: "Kaiparowits Plateau West, south-central Utah. Grand Staircase-Escalante terrain. Excellent ram quality slightly more accessible than East unit. NR permit available annually.",
      coords: { lat: 37.3500, lng: -112.0000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Apply annually. Good alternative to East unit with slightly better access." }
    },
    "Kaiparowits Escalante": {
      typical: '155-170"', topEnd: '180"',
      trait: "Escalante canyon desert bighorn; recovering population; returning NR permits.",
      description: "Escalante River canyon country, south-central Utah. Population increased — NR permit returned in 2024. Rugged canyon terrain. Growing herd with improving trophy quality.",
      coords: { lat: 37.7000, lng: -111.6000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Population recovering — NR permit returned in 2024. Apply annually. Trophy quality improving as herd matures." }
    },
    "San Rafael Dirty Devil": {
      typical: '150-165"', topEnd: '175"',
      trait: "San Rafael Swell canyon country; stable population; consistent NR permits.",
      description: "San Rafael Swell/Dirty Devil River, central Utah. Stable desert bighorn population. Good trophy quality below Kaiparowits peak. NR permit available annually.",
      coords: { lat: 38.5000, lng: -110.5000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. Stable population. NR had permits in 2024. Worth the $16 application fee annually." }
    },
    "San Rafael South": {
      typical: '148-163"', topEnd: '172"',
      trait: "Southern San Rafael Swell; accessible canyon terrain.",
      description: "San Rafael Swell south, central Utah. Accessible canyon terrain with consistent desert bighorn. Moderate trophy quality relative to Kaiparowits units.",
      coords: { lat: 38.2000, lng: -110.7000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "< 0.5%", waitingPeriod: "Once in a lifetime", notes: "OIL permit. More accessible than Kaiparowits. Lower trophy ceiling but still world-class experience." }
    },
    "Box Elder Newfoundland RMBS": {
      typical: '155-170"', topEnd: '180"',
      trait: "Best NR draw odds for Rocky Mountain bighorn in Utah.",
      description: "Box Elder/Newfoundland Mountains, northwest Utah. Rocky Mountain bighorn sheep with best NR draw odds of any Utah RMBS unit. Archery hunt offers best chances. Rugged terrain.",
      coords: { lat: 41.5000, lng: -113.0000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "~1-2%", waitingPeriod: "Once in a lifetime", notes: "RMBS — separate bonus points from desert bighorn. Best NR random odds in Utah for RMBS. Apply annually." }
    },
    "Fillmore Oak Creek RMBS": {
      typical: '158-172"', topEnd: '183"',
      trait: "Pahvant Range Rocky Mountain bighorn; strong genetics; second-best NR odds.",
      description: "Fillmore/Oak Creek Pahvant Range, central Utah. Rocky Mountain bighorn sheep with strong genetics. Second-best NR draw odds among Utah RMBS units.",
      coords: { lat: 38.9000, lng: -112.3000 },
      utahDrawInfo: { drawType: 'once-in-a-lifetime', pointSystem: 'bonus', nrAllocation: "10% of total tags", nrTagsApprox: 1, bonusPointsToGuarantee: null, randomOddsNR: "~0.5-1%", waitingPeriod: "Once in a lifetime", notes: "RMBS OIL permit. Good trophy quality. Apply annually. Worth the application fee for NR." }
    },
  },
};