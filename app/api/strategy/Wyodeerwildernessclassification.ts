// wyodeerWildernessClassification.ts
// Wilderness status for every Wyoming deer hunt product.
//
// LEGAL BACKGROUND: Wyoming Statute 23-2-401 requires nonresident big game
// hunters in federally designated Wilderness Areas to be accompanied by a
// licensed Wyoming guide/outfitter OR a qualified resident with a free
// non-commercial guide license. Residents are exempt from this requirement.
//
// CLASSIFICATION SCALE:
//   NONE    — no federal wilderness in/adjacent to this unit. NRs and residents
//             hunt DIY freely. No guide language should appear anywhere.
//
//   PARTIAL — unit contains OR borders federal wilderness, but has substantial
//             non-wilderness public land that NRs can hunt DIY. Only the
//             wilderness boundary itself triggers the guide requirement.
//             Example: Region G (143 borders Bridger Wilderness, but 145 is
//             all non-wilderness Salt River Range).
//
//   PRIMARY — the unit is effectively defined by federal wilderness. DIY for
//             NRs is impractical or impossible without a guide because the
//             huntable country IS the wilderness.
//             Example: Unit 115 (Thorofare / Washakie Wilderness), Unit 148
//             (Teton Wilderness), Unit 149 (Jedediah Smith Wilderness).

export type WildernessStatus = "NONE" | "PARTIAL" | "PRIMARY";

export type WildernessInfo = {
  status: WildernessStatus;
  areas: string[];           // names of federal Wilderness Areas this unit overlaps/borders
  guideRuleForNR: string | null;  // pre-written NR-facing explanation, null if status=NONE
};

// ─── Reusable guide rule messages ─────────────────────────────────────────────

function partialRule(waNames: string[]): string {
  const namesList = waNames.length === 1
    ? waNames[0]
    : waNames.length === 2
    ? `${waNames[0]} and ${waNames[1]}`
    : `${waNames.slice(0, -1).join(", ")}, and ${waNames[waNames.length - 1]}`;
  return `Contains or borders the ${namesList}. Under Wyoming Statute 23-2-401, nonresidents hunting inside the wilderness boundary must be accompanied by a licensed Wyoming guide/outfitter or a resident companion with a free non-commercial guide license. The non-wilderness National Forest and BLM portions of this unit are DIY-legal for nonresidents. Check WGFD's Hunt Planner or BLM surface-management maps to plan your access outside the wilderness boundary.`;
}

function primaryRule(waNames: string[], costRange: string = "$5,000–15,000+"): string {
  const namesList = waNames.length === 1
    ? waNames[0]
    : waNames.join(" and ");
  return `Defined by the ${namesList}. For nonresidents, practical DIY is not viable here — the huntable country IS the federally designated wilderness. Under Wyoming Statute 23-2-401, you must be accompanied by a licensed Wyoming guide/outfitter or a resident companion with a free non-commercial guide license. Budget ${costRange} for a guided outfitted hunt.`;
}

// ─── Classification by unit key ───────────────────────────────────────────────
// Keys match wyodeerdata.ts exactly. Any key NOT in this map defaults to NONE.

export const WILDERNESS_CLASSIFICATION: Record<string, WildernessInfo> = {
  // ─── REGION A (Black Hills) — NONE ─────────────────────────────────────────
  "A": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION B (Powder River Basin / Thunder Basin) — NONE ──────────────────
  "B": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION C (Bighorn foothills east) — NONE ──────────────────────────────
  "C": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION D (Medicine Bow / Sierra Madre) — PARTIAL ──────────────────────
  // Contains Savage Run Wilderness, Encampment River Wilderness, Platte River
  // Wilderness — all on Medicine Bow NF. Most of Region D is non-wilderness.
  "D": {
    status: "PARTIAL",
    areas: ["Savage Run Wilderness", "Encampment River Wilderness", "Platte River Wilderness"],
    guideRuleForNR: partialRule(["Savage Run Wilderness", "Encampment River Wilderness", "Platte River Wilderness"]),
  },

  // ─── REGION F (Cody / Absaroka / Thorofare) — PARTIAL at region level ──────
  // The region covers Units 105-120. Units 115 (Thorofare) is PRIMARY; 110-114
  // and others have significant wilderness overlap (Washakie, North Absaroka).
  // As a general tag, huntable non-wilderness portions exist in 105, 106, 109.
  "F": {
    status: "PARTIAL",
    areas: ["Washakie Wilderness", "North Absaroka Wilderness", "Absaroka-Beartooth Wilderness"],
    guideRuleForNR: partialRule(["Washakie Wilderness", "North Absaroka Wilderness", "Absaroka-Beartooth Wilderness"]),
  },

  // ─── REGION G (Wyoming Range west slope) — PARTIAL ─────────────────────────
  // Area 135 = West Green River headwaters (inside/bordering Bridger Wilderness).
  // Areas 143, 144 border Bridger Wilderness on the east slope.
  // Area 145 = Salt River Range — NO federal wilderness.
  // Substantial non-wilderness Bridger-Teton NF available for DIY.
  "G": {
    status: "PARTIAL",
    areas: ["Bridger Wilderness", "Gros Ventre Wilderness"],
    guideRuleForNR: partialRule(["Bridger Wilderness", "Gros Ventre Wilderness"]),
  },

  // ─── REGION H (Jackson / Hoback / Gros Ventre) — PARTIAL ───────────────────
  // Contains Gros Ventre Wilderness, borders Teton Wilderness, Jedediah Smith.
  // Areas 150, 151 (Wilson / Fall Creek) are DIY-legal foothills.
  // Areas 152, 153, 154 have Gros Ventre edges.
  // Areas 155, 156 are deeper wilderness country.
  // Unit 148 (in Region L but often associated) is Teton Wilderness PRIMARY.
  "H": {
    status: "PARTIAL",
    areas: ["Gros Ventre Wilderness", "Teton Wilderness", "Jedediah Smith Wilderness", "Winegar Hole Wilderness"],
    guideRuleForNR: partialRule(["Gros Ventre Wilderness", "Teton Wilderness", "Jedediah Smith Wilderness"]),
  },

  // ─── REGION J (Laramie Range / Laramie Peak) — NONE ────────────────────────
  // Laramie Peak is on Medicine Bow NF but NOT federally designated wilderness.
  "J": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION K (Overthrust Belt / Kemmerer-Evanston) — NONE ─────────────────
  "K": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION L (Wind River / Pinedale) — PARTIAL ────────────────────────────
  // Area 148 = Buffalo Fork / Togwotee — inside Teton Wilderness (PRIMARY at unit level).
  // Area 128 = Wind River Front near Dubois — Fitzpatrick Wilderness edge.
  // Areas 92, 94, 160, 171 are lower elevation — DIY-legal.
  "L": {
    status: "PARTIAL",
    areas: ["Teton Wilderness", "Fitzpatrick Wilderness", "Popo Agie Wilderness", "Bridger Wilderness"],
    guideRuleForNR: partialRule(["Teton Wilderness", "Fitzpatrick Wilderness", "Popo Agie Wilderness"]),
  },

  // ─── REGION M (Bighorn Basin west / Absaroka foothills) — NONE ─────────────
  "M": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION Q (Carbon County) — NONE ───────────────────────────────────────
  "Q": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION R (Bighorns) — PARTIAL ─────────────────────────────────────────
  // ONLY Area 46 has Cloud Peak Wilderness. Areas 41, 47, 50, 51, 52, 53 are
  // all DIY-legal non-wilderness. Per GoHunt: "Unit 46 is the only area to
  // include wilderness area."
  "R": {
    status: "PARTIAL",
    areas: ["Cloud Peak Wilderness"],
    guideRuleForNR: partialRule(["Cloud Peak Wilderness"]),
  },

  // ─── REGION T (Area 15 Southeast Wyoming) — NONE ───────────────────────────
  "T": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION W (Red Desert / Baggs) — NONE ──────────────────────────────────
  "W": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION X (Absaroka foothills / Bighorn Basin) — NONE ──────────────────
  "X": { status: "NONE", areas: [], guideRuleForNR: null },

  // ─── REGION Y (Bighorn Basin / Greybull) — NONE ────────────────────────────
  "Y": { status: "NONE", areas: [], guideRuleForNR: null },

  // ══════════════════════════════════════════════════════════════════════════
  // LIMITED QUOTA ENTRIES
  // ══════════════════════════════════════════════════════════════════════════

  // ─── Dubois / Wind River Front (Region L-adjacent) ─────────────────────────
  "128-1": { status: "NONE", areas: [], guideRuleForNR: null },
    // Late rut hunt — 128 proper is the Wind River Front (winter range). The
    // deer are migrating out of the Fitzpatrick Wilderness to winter range
    // that is mostly BLM / state land. DIY-legal country.

  "130-1": { status: "NONE", areas: [], guideRuleForNR: null },
    // Big Sandy — south end of Wind Rivers. Borders Bridger Wilderness but the
    // 5-tag hunt is on non-wilderness BLM/state winter range.

  // ─── Rock Springs / Aspen Mountain (Region W-adjacent) ─────────────────────
  "100-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "101-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "102-1": { status: "NONE", areas: [], guideRuleForNR: null },
    // All three are Red Desert / Aspen Mountain — BLM desert country.

  // ─── Wyoming Range (Region G-adjacent) ─────────────────────────────────────
  "141-1": {
    status: "PARTIAL",
    areas: ["Bridger Wilderness"],
    guideRuleForNR: partialRule(["Bridger Wilderness"]),
  },
    // Hoback / Wyoming Range east slope. Much of 141 is non-wilderness
    // Bridger-Teton NF; only the eastern edge touches the Bridger Wilderness.

  // ─── Ferris / Rattlesnake / Seminoe (Region Q-adjacent) ────────────────────
  "87-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "89-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "96-1": { status: "NONE", areas: [], guideRuleForNR: null },
    // All Carbon County Q country — Ferris Mts, Rattlesnake, no federal WA.

  // ─── Medicine Bow / Sierra Madre LQ units ──────────────────────────────────
  "78-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "79-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "80-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "81-1": {
    status: "PARTIAL",
    areas: ["Encampment River Wilderness", "Platte River Wilderness"],
    guideRuleForNR: partialRule(["Encampment River Wilderness", "Platte River Wilderness"]),
  },
    // 81 = Blackhall Mountain area near Riverside — borders both wilderness
    // areas. 78, 79, 80 are further west in non-wilderness Medicine Bow / Sierra Madre.

  // ─── Bighorn Basin LQ units ────────────────────────────────────────────────
  "22-1":  { status: "NONE", areas: [], guideRuleForNR: null },
  "34-1":  { status: "NONE", areas: [], guideRuleForNR: null },
  "35-1":  { status: "NONE", areas: [], guideRuleForNR: null },
  "36-1":  { status: "NONE", areas: [], guideRuleForNR: null },
  "116-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "117-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "118-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "119-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "119-2": { status: "NONE", areas: [], guideRuleForNR: null },
  "120-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "124-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "125-1": { status: "NONE", areas: [], guideRuleForNR: null },
  "157-1": { status: "NONE", areas: [], guideRuleForNR: null },
    // All Bighorn Basin off-forest — BLM, state, private checkerboard. No
    // federal wilderness in the hunt geographies.

  // ─── Pole Mountain / Southeast LQ units ────────────────────────────────────
  "10-1":  { status: "NONE", areas: [], guideRuleForNR: null },
  "60-1":  { status: "NONE", areas: [], guideRuleForNR: null },
  "60-2":  { status: "NONE", areas: [], guideRuleForNR: null },
  "64-2":  { status: "NONE", areas: [], guideRuleForNR: null },
  "84-1":  { status: "NONE", areas: [], guideRuleForNR: null },
    // Southeast Wyoming — Laramie Range foothills, Pole Mountain, etc.
    // No federal wilderness.
};

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Get the wilderness classification for a unit key. Any key not in the map
 * defaults to NONE (no wilderness, no guide requirement).
 *
 * This is the single source of truth for the requiresGuide logic. It replaces
 * the earlier wildernessPct heuristic which was wrong in both directions
 * (false positives on PARTIAL units, false negatives on null-metric units).
 */
export function getWildernessInfo(unitKey: string): WildernessInfo {
  return WILDERNESS_CLASSIFICATION[unitKey] ?? {
    status: "NONE",
    areas: [],
    guideRuleForNR: null,
  };
}