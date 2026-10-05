import type { StateCode, StateInfo, StateModule } from './schema';
import { wyomingModule } from './states/wyoming';
import { idahoModule } from './states/idaho';
import { coloradoModule } from './states/colorado';
import { montanaModule } from './states/montana';
import { utahModule } from './states/utah';

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
    code: 'AZ', name: 'ARIZONA', status: 'planned', batch: 'A',
    agency: { name: 'Arizona Game and Fish Department', url: 'https://www.azgfd.com' },
    drawSystem: 'bonus', rulesVerified: false,
    drawSystemNote: 'Bonus points; a share of tags goes to the highest point holders, the rest by random draw. Non-resident tags are capped per hunt.',
  },
  NE: {
    code: 'NE', name: 'NEBRASKA', status: 'planned', batch: 'A',
    agency: { name: 'Nebraska Game and Parks Commission', url: 'https://outdoornebraska.gov' },
    drawSystem: 'preference', rulesVerified: false,
    drawSystemNote: 'Preference points for elk, antelope and bighorn permits. Confirm current rules with Game and Parks.',
  },
  NM: {
    code: 'NM', name: 'NEW MEXICO', status: 'planned', batch: 'A',
    agency: { name: 'New Mexico Department of Game and Fish', url: 'https://wildlife.dgf.nm.gov' },
    drawSystem: 'random', rulesVerified: false,
    drawSystemNote: 'Pure random draw with no points. Licenses are split between residents, outfitted non-residents and non-residents.',
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

const MODULES: Partial<Record<StateCode, StateModule>> = {
  WY: wyomingModule(STATE_INFO.WY),
  ID: idahoModule(STATE_INFO.ID),
  CO: coloradoModule(STATE_INFO.CO),
  MT: montanaModule(STATE_INFO.MT),
  UT: utahModule(STATE_INFO.UT),
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
