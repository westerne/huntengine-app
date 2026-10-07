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
import neDraw from './draw/ne.json';
import ndDraw from './draw/nd.json';
import ksDraw from './draw/ks.json';
import nvDraw from './draw/nv.json';
import okDraw from './draw/ok.json';
import caDraw from './draw/ca.json';
import waDraw from './draw/wa.json';
import orDraw from './draw/or.json';
import sdDraw from './draw/sd.json';
import akDraw from './draw/ak.json';
import akGeneral from './draw/ak-general.json';

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
    code: 'NE', name: 'NEBRASKA', status: 'live', batch: 'A',
    // nm-ne-research.md: general bull elk and bighorn sheep are resident-only.
    residentOnly: {
      ELK: 'Nebraska’s elk draw is for residents only (non-residents can get elk only through landowner permits).',
      BIGHORNSHEEP: 'Nebraska’s bighorn sheep lottery is for residents only.',
    },
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
    code: 'KS', name: 'KANSAS', status: 'live', batch: 'B',
    agency: { name: 'Kansas Department of Wildlife and Parks', url: 'https://ksoutdoors.com' },
    // Verified 2026-10-07 against KDWP deer, antelope and elk pages
    // (lib/huntdata/draw/ks-research.md).
    drawSystem: 'preference', rulesVerified: true,
    drawSystemNote: "Non-resident deer permits are drawn by preference points: the highest point holders draw first; you earn a point each year you miss (or buy one), and points expire after five years without applying. Non-residents must already hold a Kansas non-resident hunting license when applying in April, and choose one unit plus one adjacent unit and one season. A separate mule deer stamp is a random draw for archery or muzzleloader permits in Units 1, 2, 17 and 18. Most resident deer permits are over the counter; resident firearm either-species deer, antelope rifle and muzzleloader permits, and Fort Riley elk (residents only, bonus points) are drawn from applications in May–June.",
  },
  ND: {
    code: 'ND', name: 'NORTH DAKOTA', status: 'live', batch: 'B',
    // nd-research.md: "Nonresidents can apply for only a bighorn sheep license".
    residentOnly: {
      ELK: 'North Dakota elk licenses are for residents only.',
      MOOSE: 'North Dakota moose licenses are for residents only.',
      ANTELOPE: 'North Dakota pronghorn licenses are for residents only.',
    },
    agency: { name: 'North Dakota Game and Fish Department', url: 'https://gf.nd.gov' },
    // Verified 2026-10-07 against gf.nd.gov lottery pages and the 2026
    // elk/moose/sheep proclamation. See lib/huntdata/draw/nd-research.md.
    drawSystem: 'bonus', rulesVerified: true,
    drawSystemNote: "Deer gun, muzzleloader deer and pronghorn are weighted bonus-point lotteries: with 1–3 points you get twice your points in extra chances, and from 4 points up your points are cubed. Points are lost when you draw your first choice and kept only if you apply at least every other year. Elk, moose and bighorn sheep are once-in-a-lifetime lotteries without bonus points. Elk, moose and pronghorn are residents-only; non-residents draw deer gun licenses from a separate pool of about 1% of licenses, and at most one bighorn license may go to a non-resident.",
  },
  NV: {
    code: 'NV', name: 'NEVADA', status: 'live', batch: 'B',
    agency: { name: 'Nevada Department of Wildlife', url: 'https://www.ndow.org' },
    // Verified 2026-10-07 against NDOW's 2026 Big Game Application FAQ and
    // CR 26-01 (lib/huntdata/draw/nv-research.md).
    drawSystem: 'bonus-squared', rulesVerified: true,
    drawSystemNote: "Random draw with squared bonus points: each applicant gets (bonus points squared + 1) random numbers and the lowest number counts, so points improve odds but never guarantee a tag. You need an active Nevada hunting or combination license to earn a point; an unsuccessful application becomes a point, and points are lost after skipping a hunt category two years in a row. Quotas are about 90% resident and 10% non-resident. After drawing there are waiting periods: bighorn ram and mountain goat 10 years, elk 7, antelope 3, bighorn ewe 2, mule deer none. Main-draw applications are due in May.",
  },

  // ── Batch C: by April ────────────────────────────────────────────────────
  OR: {
    code: 'OR', name: 'OREGON', status: 'live', batch: 'C',
    agency: { name: 'Oregon Department of Fish and Wildlife', url: 'https://myodfw.com' },
    // Verified 2026-10-07 against ODFW's 2026 regulations and draw reports
    // (lib/huntdata/draw/or-research.md).
    drawSystem: 'hybrid', rulesVerified: true,
    drawSystemNote: "Controlled deer, elk and pronghorn hunts: 75% of each hunt's tags go to the highest preference-point holders and 25% are drawn at random among the remaining first-choice applicants. Drawing your first choice resets your points to zero; points don't expire. Non-residents get at most 5% of deer and elk tags and 3% of pronghorn tags in each hunt (one tag allowed when a hunt has fewer than 35). Bighorn sheep, mountain goat and premium hunts use no points; bighorn ram and goat tags are once in a lifetime. Applications are due May 15, with results by June 12. Sheep, goat and premium tag numbers are 2026 proposals from ODFW, not final regulations.",
  },
  WA: {
    code: 'WA', name: 'WASHINGTON', status: 'live', batch: 'C',
    agency: { name: 'Washington Department of Fish and Wildlife', url: 'https://wdfw.wa.gov' },
    // Verified 2026-10-07 against the 2026 WDFW Big Game pamphlet
    // (lib/huntdata/draw/wa-research.md).
    drawSystem: 'bonus-squared', rulesVerified: true,
    drawSystemNote: "General seasons need no draw: buy a deer or elk license and hunt the open GMUs for your weapon. Special permits are a weighted-point random draw: each application earns a point, more points mean better odds, and points reset to zero when you're drawn (WDFW has described the weighting as squared points). Residents and non-residents are in the same draw. You buy one application per category, with up to four hunt choices (two for quality deer and elk). Goat, bull moose and any-ram sheep are in effect once in a lifetime. Applications are due in May, with results by the end of June. WDFW doesn't publish odds by point level or by residency, so the odds shown are permits divided by all applicants.",
  },
  CA: {
    code: 'CA', name: 'CALIFORNIA', status: 'live', batch: 'C',
    agency: { name: 'California Department of Fish and Wildlife', url: 'https://wildlife.ca.gov' },
    // Verified 2026-10-07 against the 2026 CDFW Big Game Digest
    // (lib/huntdata/draw/ca-research.md).
    drawSystem: 'hybrid', rulesVerified: true,
    drawSystemNote: "Modified preference points for every species. Deer: 90% of a hunt's tags go to the highest point holders and 10% are drawn at random. Elk, pronghorn and bighorn sheep: when a hunt has four or more tags, 75% go by points and the rest at random; a hunt with fewer tags is random only. Party applications average their points. Non-residents can apply, but only one non-resident is drawn for elk and one for pronghorn statewide each year, and they get at most 10% of bighorn tags; a bighorn tag is once in a lifetime. CDFW doesn't split results by residency and doesn't publish odds at each point level, so the odds shown are tags divided by first-choice applicants across everyone — high point holders draw far more often than that. Applications run April 15 to June 2.",
  },
  SD: {
    code: 'SD', name: 'SOUTH DAKOTA', status: 'live', batch: 'C',
    // sd-research.md: elk and bighorn sheep are resident-only.
    residentOnly: {
      ELK: 'South Dakota elk licenses are for residents only.',
      BIGHORNSHEEP: 'South Dakota bighorn sheep licenses are for residents only.',
    },
    agency: { name: 'South Dakota Game, Fish and Parks', url: 'https://gfp.sd.gov' },
    // Verified 2026-10-07 against GFP application rules and draw statistics
    // (lib/huntdata/draw/sd-research.md).
    drawSystem: 'preference', rulesVerified: true,
    drawSystemNote: "A random draw in point pools; preference points are cubed before the draw, so more points help but never guarantee a license. Deer and antelope: half of a unit's licenses go first to qualifying landowners, then the 2+ point pool, then 1+, then 0+ (no one in the 0+ pool draws until everyone in 1+ has). Elk: landowners 50%, then 10+ points 30%, 2+ points 15%, 0+ points 5%; Custer State Park elk uses 15+/10+/0+ pools. Elk and bighorn sheep are residents only; sheep is once in a lifetime, and drawing elk with points means a nine-year wait. Non-residents can't apply for East River, muzzleloader or Custer State Park deer. Applications: special buck in March–April, elk and sheep April–May, deer May–June, antelope June–July. GFP has no public hunt-unit map, so units show without an outline.",
  },
  OK: {
    code: 'OK', name: 'OKLAHOMA', status: 'live', batch: 'C',
    agency: { name: 'Oklahoma Department of Wildlife Conservation', url: 'https://www.wildlifedepartment.com' },
    // Verified 2026-10-07 against ODWC controlled-hunt pages
    // (lib/huntdata/draw/ok-research.md).
    drawSystem: 'preference', rulesVerified: true,
    drawSystemNote: "Controlled hunts are a weighted lottery: each preference point is one extra entry, so applicants with no points can still draw. Residents and non-residents apply in one pool and both need a current Oklahoma hunting license. Applications run April 1 to May 20, with results after June 10. Elk and pronghorn are once in a lifetime, and half of their permits go first to applicants with 20 or more points. Elk is drawn first, then pronghorn, then deer, and you can win only one hunt a year. Points expire after five years without applying. ODWC's applicant counts include people who listed the hunt as any of their five choices, so permits divided by applicants is not anyone's odds of drawing.",
  },

  // ── Batch D: by October 2027 ─────────────────────────────────────────────
  AK: {
    code: 'AK', name: 'ALASKA', status: 'live', batch: 'D',
    agency: { name: 'Alaska Department of Fish and Game', url: 'https://www.adfg.alaska.gov' },
    // Verified 2026-10-07 against the 2026-27 ADF&G Drawing Supplement and
    // hunting regulations (lib/huntdata/draw/ak-research.md, ak-general-research.md).
    drawSystem: 'random', rulesVerified: true,
    drawSystemNote: "Most Alaska moose, caribou, Dall sheep and deer hunting needs no draw: buy a license and a harvest ticket for a general season, or sign up for a registration permit. Drawing permits are a pure random draw with no points: apply online November 1 to December 15, results in mid-February, $5 per hunt ($10 bison and muskox), up to six hunts per species, and you can't win the same hunt two years in a row. Many hunts and general seasons are residents only or non-residents only. NON-RESIDENTS hunting Dall sheep, mountain goat or brown bear must be accompanied by an Alaska-licensed guide or a resident relative (19 or older, second-degree kindred); non-US citizens need a guide for all big game. Non-residents may take one full-curl ram every four years and face antler limits on moose in most units; every non-resident moose hunter must complete ADF&G's orientation. Odds shown for hunts open to both residencies are overall rates; ADF&G doesn't split applicants by residency.",
  },
};

// States added through generated draw files (scripts/draw/build<ST>Draw.mjs).
// Adding a state: import its draw file here, set its STATE_INFO status to
// 'live', and add its boundary source and planner species list.
// Alaska keeps drawing hunts and over-the-counter (general season /
// registration) hunts in separate researched files; offer them together.
function mergeDrawFiles(draw: DrawFile, extra: DrawFile): DrawFile {
  const keys = new Set([...Object.keys(draw.species), ...Object.keys(extra.species)]) as Set<keyof DrawFile['species']>;
  const species: DrawFile['species'] = {};
  for (const k of keys) species[k] = [...(draw.species[k] ?? []), ...(extra.species[k] ?? [])];
  return { ...draw, notes: `${draw.notes ?? ''} ${extra.notes ?? ''}`.trim(), species };
}

const DRAW_FILES: Partial<Record<StateCode, DrawFile>> = {
  AZ: azDraw as DrawFile,
  NM: nmDraw as DrawFile,
  NE: neDraw as DrawFile,
  ND: ndDraw as DrawFile,
  KS: ksDraw as DrawFile,
  NV: nvDraw as DrawFile,
  OK: okDraw as DrawFile,
  CA: caDraw as DrawFile,
  WA: waDraw as DrawFile,
  OR: orDraw as DrawFile,
  SD: sdDraw as DrawFile,
  AK: mergeDrawFiles(akDraw as DrawFile, akGeneral as DrawFile),
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
