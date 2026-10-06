import type { StateCode, StateInfo, StateModule } from './schema';
import { wyomingModule } from './states/wyoming';
import { idahoModule } from './states/idaho';
import { coloradoModule } from './states/colorado';
import { montanaModule } from './states/montana';
import { utahModule } from './states/utah';
import { drawFileModule } from './states/fromDrawFile';
import type { DrawFile } from './draw/format';
import azDraw from './draw/az.json';
import nmDraw from './draw/nm.json';

// Every state on the roadmap. Live states have data wired in; planned states
// are listed so the planner, landing page and deadline calendar can show what's
// coming. Planned-state draw notes are a starting point for whoever builds
// that state — rulesVerified stays false until checked against the agency.
export const STATE_INFO: Record<StateCode, StateInfo> = {
  WY: {
    code: 'WY', name: 'WYOMING', status: 'live', batch: 'live',
    agency: { name: 'Wyoming Game and Fish Department', url: 'https://wgfd.wyo.gov' },
    drawSystem: 'hybrid', rulesVerified: true,
    drawSystemNote: 'Non-residents: deer, elk and antelope tags split into regular and special preference-point pools plus random pools. Residents: pure random draw for deer, elk and antelope.',
  },
  ID: {
    code: 'ID', name: 'IDAHO', status: 'live', batch: 'live',
    agency: { name: 'Idaho Department of Fish and Game', url: 'https://idfg.idaho.gov' },
    drawSystem: 'random', rulesVerified: true,
    drawSystemNote: 'Controlled hunts are a pure random draw with no preference or bonus points. General deer and elk seasons need no draw.',
  },
  CO: {
    code: 'CO', name: 'COLORADO', status: 'live', batch: 'live',
    agency: { name: 'Colorado Parks and Wildlife', url: 'https://cpw.state.co.us' },
    drawSystem: 'preference', rulesVerified: true,
    drawSystemNote: 'Preference-point draw: first-choice applicants with the most points draw first. Some archery and rifle elk licenses are over the counter.',
  },
  MT: {
    code: 'MT', name: 'MONTANA', status: 'live', batch: 'live',
    agency: { name: 'Montana Fish, Wildlife & Parks', url: 'https://fwp.mt.gov' },
    drawSystem: 'bonus-squared', rulesVerified: true,
    drawSystemNote: 'Limited permits use bonus points, squared in the draw. Points improve odds but never guarantee a permit. Resident general deer and elk licenses need no draw.',
  },
  UT: {
    code: 'UT', name: 'UTAH', status: 'live', batch: 'live',
    agency: { name: 'Utah Division of Wildlife Resources', url: 'https://wildlife.utah.gov' },
    drawSystem: 'bonus', rulesVerified: true,
    drawSystemNote: 'Limited-entry and once-in-a-lifetime hunts use bonus points: half the tags go to the highest point holders, the rest by random draw weighted by points.',
  },

  // ── Batch A: before launch ───────────────────────────────────────────────
  AZ: {
    code: 'AZ', name: 'ARIZONA', status: 'live', batch: 'A',
    agency: { name: 'Arizona Game and Fish Department', url: 'https://www.azgfd.com' },
    // Verified 2026-10-05 against AZGFD draw-process and bonus-point pages and
    // the 2026-27 regulations (R12-4-104, -107, -114). See lib/huntdata/draw/az-research.md.
    drawSystem: 'bonus', rulesVerified: true,
    drawSystemNote: "Bonus points: each point adds an extra random number and only the lowest number counts. Up to 20% of each hunt's tags go first to the highest-point applicants on their 1st or 2nd choice (statewide for bighorn sheep). Non-residents get at most 10% of a hunt's tags, and at most half of that in the bonus pass. Hunters also earn a permanent hunter-education point and a loyalty point after 5 straight years of applying. Elk and pronghorn are in the winter draw; deer and bighorn sheep are in the fall draw. Some archery deer and some elk tags are over the counter. Bighorn sheep is once in a lifetime. An Arizona hunting license is required to apply.",
  },
  NE: {
    code: 'NE', name: 'NEBRASKA', status: 'planned', batch: 'A',
    agency: { name: 'Nebraska Game and Parks Commission', url: 'https://outdoornebraska.gov' },
    // From 166 NAC 1/3/14 and Neb. Rev. Stat. 37-447..455 (research 2026-10-06). Left
    // unverified: NGPC's site says elk is "moving to bonus points squared", which
    // conflicts with current rule text, and the site blocks scripted access.
    drawSystem: 'hybrid', rulesVerified: false,
    drawSystemNote: "General bull elk is a resident-only draw with bonus points (an extra entry per unsuccessful year); one antlered elk per lifetime. Antelope and draw-unit deer use preference points (most points drawn first; points reset when you draw). Non-residents can draw only certain deer units, statewide archery/muzzleloader deer and archery antelope. Most other deer units are over the counter. Bighorn sheep is a resident-only random lottery.",
  },
  NM: {
    code: 'NM', name: 'NEW MEXICO', status: 'live', batch: 'A',
    agency: { name: 'New Mexico Department of Game and Fish', url: 'https://wildlife.dgf.nm.gov' },
    // Verified 2026-10-06 against the 2026-27 NMDGF rules booklet and 19.31.3 NMAC.
    // See lib/huntdata/draw/nm-ne-research.md.
    drawSystem: 'random', rulesVerified: true,
    drawSystemNote: "Pure random draw with no preference or bonus points, so every applicant has the same odds each year. By law at least 84% of draw licenses go to residents, 10% to applicants using a New Mexico-registered outfitter, and 6% to non-residents without an outfitter. Cow elk and Wildlife Management Area hunts are resident-only. A Game-Hunting license plus habitat validation must be bought before applying; applications are due in March. Bighorn rams are once in a lifetime. Leftover licenses go on sale first-come-first-served in late June, residents only for the first 24 hours.",
  },

  // ── Batch B: by March ────────────────────────────────────────────────────
  KS: {
    code: 'KS', name: 'KANSAS', status: 'planned', batch: 'B',
    agency: { name: 'Kansas Department of Wildlife and Parks', url: 'https://ksoutdoors.com' },
    drawSystem: 'preference', rulesVerified: false,
    drawSystemNote: 'Non-resident deer permits are drawn by preference points per unit. Confirm current rules with KDWP.',
  },
  ND: {
    code: 'ND', name: 'NORTH DAKOTA', status: 'planned', batch: 'B',
    agency: { name: 'North Dakota Game and Fish Department', url: 'https://gf.nd.gov' },
    drawSystem: 'bonus', rulesVerified: false,
    drawSystemNote: 'Weighted bonus points for deer and antelope; elk, moose and bighorn are mostly once-in-a-lifetime and limited for non-residents.',
  },
  NV: {
    code: 'NV', name: 'NEVADA', status: 'planned', batch: 'B',
    agency: { name: 'Nevada Department of Wildlife', url: 'https://www.ndow.org' },
    drawSystem: 'bonus-squared', rulesVerified: false,
    drawSystemNote: 'Bonus points, squared (plus the current year) in a random draw. Points improve odds but never guarantee a tag.',
  },

  // ── Batch C: by April ────────────────────────────────────────────────────
  OR: {
    code: 'OR', name: 'OREGON', status: 'planned', batch: 'C',
    agency: { name: 'Oregon Department of Fish and Wildlife', url: 'https://myodfw.com' },
    drawSystem: 'hybrid', rulesVerified: false,
    drawSystemNote: 'Controlled hunts: most tags go to the highest preference-point holders, the rest by random draw. Sheep, goat and moose are random.',
  },
  WA: {
    code: 'WA', name: 'WASHINGTON', status: 'planned', batch: 'C',
    agency: { name: 'Washington Department of Fish and Wildlife', url: 'https://wdfw.wa.gov' },
    drawSystem: 'bonus-squared', rulesVerified: false,
    drawSystemNote: 'Special permits use squared points in a random draw. General seasons need no draw.',
  },
  CA: {
    code: 'CA', name: 'CALIFORNIA', status: 'planned', batch: 'C',
    agency: { name: 'California Department of Fish and Wildlife', url: 'https://wildlife.ca.gov' },
    drawSystem: 'hybrid', rulesVerified: false,
    drawSystemNote: 'Most premium tags go to the highest preference-point holders, the rest by random draw. Bighorn uses a modified bonus system.',
  },
  SD: {
    code: 'SD', name: 'SOUTH DAKOTA', status: 'planned', batch: 'C',
    agency: { name: 'South Dakota Game, Fish and Parks', url: 'https://gfp.sd.gov' },
    drawSystem: 'preference', rulesVerified: false,
    drawSystemNote: 'Preference points across several draws for deer, antelope and elk. Confirm current rules with GFP.',
  },
  OK: {
    code: 'OK', name: 'OKLAHOMA', status: 'planned', batch: 'C',
    agency: { name: 'Oklahoma Department of Wildlife Conservation', url: 'https://www.wildlifedepartment.com' },
    drawSystem: 'preference', rulesVerified: false,
    drawSystemNote: 'Controlled hunts drawn with preference points. Confirm current rules with ODWC.',
  },

  // ── Batch D: by October 2027 ─────────────────────────────────────────────
  AK: {
    code: 'AK', name: 'ALASKA', status: 'planned', batch: 'D',
    agency: { name: 'Alaska Department of Fish and Game', url: 'https://www.adfg.alaska.gov' },
    drawSystem: 'random', rulesVerified: false,
    drawSystemNote: 'Drawing permits are a random draw with no points. Non-residents need a guide for sheep, goat and brown bear.',
  },
};

// States added through generated draw files (scripts/draw/build<ST>Draw.mjs).
// Adding a state: import its draw file here, set its STATE_INFO status to
// 'live', and add its boundary source and planner species list.
const DRAW_FILES: Partial<Record<StateCode, DrawFile>> = {
  AZ: azDraw as DrawFile,
  NM: nmDraw as DrawFile,
};

const MODULES: Partial<Record<StateCode, StateModule>> = {
  WY: wyomingModule(STATE_INFO.WY),
  ID: idahoModule(STATE_INFO.ID),
  CO: coloradoModule(STATE_INFO.CO),
  MT: montanaModule(STATE_INFO.MT),
  UT: utahModule(STATE_INFO.UT),
  ...Object.fromEntries(
    (Object.entries(DRAW_FILES) as Array<[StateCode, DrawFile]>).map(([c, f]) => [c, drawFileModule(STATE_INFO[c], f)]),
  ),
};

export const ALL_STATES = Object.keys(STATE_INFO) as StateCode[];
export const LIVE_STATES = ALL_STATES.filter((c) => MODULES[c]);

// Accepts "WY", "wy" or "WYOMING".
export function toStateCode(raw: string): StateCode | null {
  const s = (raw || '').trim().toUpperCase();
  if (s in STATE_INFO) return s as StateCode;
  const hit = ALL_STATES.find((c) => STATE_INFO[c].name === s);
  return hit ?? null;
}

export function getStateModule(raw: string): StateModule | null {
  const code = toStateCode(raw);
  return code ? MODULES[code] ?? null : null;
}
