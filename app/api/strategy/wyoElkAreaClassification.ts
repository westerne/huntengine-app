// wyoElkAreaClassification.ts
// Source of truth for Wyoming elk hunt area structure per WGFD Chapter 7.
//
// Each Wyoming elk hunt area falls into one of three patterns based on what
// license types Section 2 of Chapter 7 lists for it:
//
//   GENERAL_ONLY   — Area has a "Gen" entry; no Type 1/2/3 antlered LQ.
//                    A resident with the statewide General Elk License can
//                    hunt this area, no draw required for the access itself.
//                    Applying for an LQ here means antlerless / cow-calf only.
//                    Examples: 2, 3, 9, 10, 12, 13, 15, 21, 28, 36, 37, 70, 71,
//                              80, 81, 82, 83, 85, 86, 89, 90, 102, 103, 104,
//                              105, 110, 116, 126, 127, 128, 129, 130
//
//   LQ_ONLY        — Area has NO "Gen" entry. All antlered access requires
//                    drawing a Type 1/2/3 LQ tag.
//                    Examples: 1, 7, 8, 11, 16, 19, 22, 23, 30, 31, 32, 33,
//                              34, 35, 38, 39, 40, 41, 45, 47, 48, 49, 51,
//                              54, 55, 58, 62, 63, 65, 75, 88, 93, 95, 99,
//                              100, 108, 111, 113, 117, 118, 120, 122, 123,
//                              124, 125
//
//   HYBRID         — Both "Gen" entry AND a Type 1/2 antlered LQ entry exist
//                    for the same area, typically with different season dates
//                    or geographic restrictions. The LQ tag is a TRUE UPGRADE
//                    over the general license access — better dates, longer
//                    seasons, or access to private/wilderness portions.
//                    For residents, this is the "upgrade lottery" framing —
//                    you can hunt the general window every year for free, but
//                    the LQ tag unlocks the rut window or extended dates.
//                    Examples: 56, 59, 67, 68, 69, 78, 84, 87, 91, 92 (gen+LQ),
//                              94 (gen+limited types), 96, 97, 98, 106
//
// The classification map below is keyed by area number (string for consistency
// with the rest of the V2 system).

export type ElkAreaPattern = "GENERAL_ONLY" | "LQ_ONLY" | "HYBRID";

export type ElkAreaInfo = {
  pattern: ElkAreaPattern;
  // For HYBRID areas: a brief description of what the LQ tag unlocks vs the
  // general license. Used by the resident prompt to explain the upgrade value.
  hybridUpgradeNote?: string;
};

export const WYO_ELK_AREA_CLASSIFICATION: Record<string, ElkAreaInfo> = {
  // ─── GENERAL_ONLY (resident hunts free with general license) ────────────────
  "2":   { pattern: "GENERAL_ONLY" },
  "3":   { pattern: "GENERAL_ONLY" },
  "9":   { pattern: "GENERAL_ONLY" },
  "10":  { pattern: "GENERAL_ONLY" },
  "12":  { pattern: "GENERAL_ONLY" },
  "13":  { pattern: "GENERAL_ONLY" },
  "15":  { pattern: "GENERAL_ONLY" },
  "21":  { pattern: "GENERAL_ONLY" },
  "28":  { pattern: "GENERAL_ONLY" },
  "36":  { pattern: "GENERAL_ONLY" },
  "37":  { pattern: "GENERAL_ONLY" },
  "70":  { pattern: "GENERAL_ONLY" },
  "71":  { pattern: "GENERAL_ONLY" },
  "73":  { pattern: "GENERAL_ONLY" },
  "77":  { pattern: "GENERAL_ONLY" },  // National Elk Refuge — gen + youth + Type 6
  "80":  { pattern: "GENERAL_ONLY" },
  "81":  { pattern: "GENERAL_ONLY" },
  "82":  { pattern: "GENERAL_ONLY" },
  "83":  { pattern: "GENERAL_ONLY" },
  "85":  { pattern: "GENERAL_ONLY" },
  "86":  { pattern: "GENERAL_ONLY" },
  "89":  { pattern: "GENERAL_ONLY" },
  "90":  { pattern: "GENERAL_ONLY" },
  "94":  { pattern: "GENERAL_ONLY" },  // gen + Type 6/7 only (no antlered LQ)
  "102": { pattern: "GENERAL_ONLY" },
  "103": { pattern: "GENERAL_ONLY" },
  "104": { pattern: "GENERAL_ONLY" },
  "105": { pattern: "GENERAL_ONLY" },
  "110": { pattern: "GENERAL_ONLY" },
  "116": { pattern: "GENERAL_ONLY" },
  "126": { pattern: "GENERAL_ONLY" },
  "127": { pattern: "GENERAL_ONLY" },
  "128": { pattern: "GENERAL_ONLY" },
  "129": { pattern: "GENERAL_ONLY" },
  "130": { pattern: "GENERAL_ONLY" },

  // ─── HYBRID (gen + Type 1/2 antlered LQ both available) ─────────────────────
  "56": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-Oct 21 any elk. Type 1 LQ (10 tags): Nov 5-30 any elk, also valid in Area 55. The LQ unlocks the post-rut Wapiti Ridge wilderness window — late season trophy access in country that's already closed to general license hunters by Nov 5.",
  },
  "59": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-Oct 21 any elk. Type 1 LQ (10 tags): Nov 1-30 any elk. The LQ unlocks November rut activity in Boulder Basin country — a meaningful trophy window upgrade.",
  },
  "67": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license has staged dates: Sep 15-30 any elk, Oct 1-10 antlered, Oct 11-31 antlered with spikes excluded. No Type 1/2 antlered LQ — this is effectively a GENERAL_ONLY area with progressive restrictions, not a hybrid upgrade.",
  },
  "68": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license has staged dates: Sep 15-30 any elk, Oct 1-10 antlered, Oct 11-31 antlered with spikes excluded. No Type 1/2 antlered LQ — effectively GENERAL_ONLY.",
  },
  "69": {
    pattern: "GENERAL_ONLY",  // Reclassifying — no antlered LQ exists per Ch. 7
    hybridUpgradeNote: "General license: Sep 15-30, then Oct 1-31 any elk. No antlered LQ available.",
  },
  "78": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-25 any elk in entire area, plus antlerless on private land Aug 15-Oct 31. Type 1 LQ (75 tags + private addition): Aug 15-Sep 25 off NF, then Sep 26-Jan 31 entire area. The LQ unlocks the entire fall and winter rut window — massive upgrade over the 25-day general window.",
  },
  "84": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-25 any elk, Sep 26-Oct 31 antlered (spikes excluded), Nov 1-15 antlerless. Type 1 LQ (100 tags, restricted geography): Nov 1-Jan 31 any elk on private land west of Hwy 191 and north/east of Snake River. The LQ unlocks late-season private-land rut access.",
  },
  "87": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-30 any elk, Oct 15-31 any elk, Nov 1-20 antlerless. Type 1 LQ (10 tags, very restricted): Dec 1-Jan 31 antlered within Dell Creek Loop Road. The LQ is a tiny late-winter raspberry ridge specialty hunt — extreme upgrade for a few hunters.",
  },
  "91": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-30, Oct 15-31 any elk, Nov 1-15 antlerless. Type 1 LQ (100 tags): Sep 1-Jan 31 with extended antlerless windows through January. The LQ extends the season dramatically — five months of access vs the general's two-month window.",
  },
  "96": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-30, Oct 15-31 any elk, Nov 1-20 antlerless. Type 1 LQ (275 tags): Sep 1-30, Oct 1-Oct 31 any elk, Nov 1-30 antlerless. The LQ unlocks the early-October rut window the general license closes for.",
  },
  "97": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-19, Oct 1-15 any elk, Oct 16-Nov 20 antlerless. Type 1 LQ (250 tags): Sep 1-19, Sep 20-Oct 31 any elk, Nov 1-30 antlerless. The LQ adds the prime late-September archery rut window plus extended October rifle access.",
  },
  "98": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-19, Oct 1-15 any elk, Oct 16-Nov 20 antlerless. Type 1 LQ (350 tags): Sep 1-19, Sep 20-Oct 31 any elk, Nov 1-30 antlerless, plus Dec 1-Jan 31 antlerless between Scab Creek and East Fork River. Big upgrade — extended dates plus winter access.",
  },
  "106": {
    pattern: "HYBRID",
    hybridUpgradeNote: "General license: Sep 1-30, Oct 15-31 any elk, Nov 1-30 antlerless. Type 1 LQ (50 tags, geographic restriction): Sep 1-30, Nov 15-Jan 31 any elk west of Black's Fork or north of Hwy 410. The LQ unlocks late-season geography the general can't reach.",
  },

  // ─── LQ_ONLY (residents must draw to access antlered) ──────────────────────
  "1":   { pattern: "LQ_ONLY" },
  "6":   { pattern: "LQ_ONLY" },
  "7":   { pattern: "LQ_ONLY" },
  "8":   { pattern: "LQ_ONLY" },
  "11":  { pattern: "LQ_ONLY" },
  "16":  { pattern: "LQ_ONLY" },
  "19":  { pattern: "LQ_ONLY" },
  "22":  { pattern: "LQ_ONLY" },
  "23":  { pattern: "LQ_ONLY" },
  "24":  { pattern: "LQ_ONLY" },
  "25":  { pattern: "LQ_ONLY" },
  "27":  { pattern: "LQ_ONLY" },
  "30":  { pattern: "LQ_ONLY" },
  "31":  { pattern: "LQ_ONLY" },
  "32":  { pattern: "LQ_ONLY" },
  "33":  { pattern: "LQ_ONLY" },
  "34":  { pattern: "LQ_ONLY" },
  "35":  { pattern: "LQ_ONLY" },
  "38":  { pattern: "LQ_ONLY" },
  "39":  { pattern: "LQ_ONLY" },
  "40":  { pattern: "LQ_ONLY" },
  "41":  { pattern: "LQ_ONLY" },
  "45":  { pattern: "LQ_ONLY" },
  "47":  { pattern: "LQ_ONLY" },
  "48":  { pattern: "LQ_ONLY" },
  "49":  { pattern: "LQ_ONLY" },
  "51":  { pattern: "LQ_ONLY" },
  "54":  { pattern: "LQ_ONLY" },
  "55":  { pattern: "LQ_ONLY" },
  "58":  { pattern: "LQ_ONLY" },
  "60":  { pattern: "LQ_ONLY" },  // Gen exists but only Sep 1-19 any, Sep 20-Oct 27 antlered — actually this is GENERAL_ONLY
  "61":  { pattern: "LQ_ONLY" },
  "62":  { pattern: "LQ_ONLY" },
  "63":  { pattern: "LQ_ONLY" },
  "64":  { pattern: "LQ_ONLY" },
  "65":  { pattern: "LQ_ONLY" },
  "66":  { pattern: "GENERAL_ONLY" },  // gen-only entry per Ch. 7
  "75":  { pattern: "LQ_ONLY" },
  "88":  { pattern: "LQ_ONLY" },
  "92":  { pattern: "GENERAL_ONLY" },  // gen + Type 6 only (no antlered LQ)
  "93":  { pattern: "LQ_ONLY" },
  "95":  { pattern: "LQ_ONLY" },
  "99":  { pattern: "LQ_ONLY" },
  "100": { pattern: "LQ_ONLY" },
  "107": { pattern: "GENERAL_ONLY" },  // gen-only per Ch. 7
  "108": { pattern: "LQ_ONLY" },
  "111": { pattern: "LQ_ONLY" },
  "113": { pattern: "LQ_ONLY" },
  "117": { pattern: "LQ_ONLY" },
  "118": { pattern: "LQ_ONLY" },
  "120": { pattern: "LQ_ONLY" },
  "122": { pattern: "LQ_ONLY" },
  "123": { pattern: "LQ_ONLY" },
  "124": { pattern: "LQ_ONLY" },
  "125": { pattern: "LQ_ONLY" },
};

// Correct the area 60 entry — Section 2 actually shows "Gen Sep 1-19 any elk,
// Gen Sep 20-Oct 27 antlered" so it's GENERAL_ONLY for residents.
WYO_ELK_AREA_CLASSIFICATION["60"] = { pattern: "GENERAL_ONLY" };

/**
 * Look up the area pattern for a given Wyoming elk hunt area number.
 * Returns LQ_ONLY by default for any area not explicitly classified.
 */
export function getElkAreaInfo(areaNumber: string): ElkAreaInfo {
  return WYO_ELK_AREA_CLASSIFICATION[areaNumber] ?? { pattern: "LQ_ONLY" };
}

/**
 * Return all area numbers matching a given pattern. Useful for the resident
 * prompt to enumerate the "general license access" areas.
 */
export function getAreasByPattern(pattern: ElkAreaPattern): string[] {
  return Object.entries(WYO_ELK_AREA_CLASSIFICATION)
    .filter(([_, info]) => info.pattern === pattern)
    .map(([area]) => area)
    .sort((a, b) => parseInt(a) - parseInt(b));
}