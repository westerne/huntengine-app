// Compare 2–4 hunts side by side (docs/SPEC_HUNT_CALENDAR.md §3). Pure —
// tested without a database. Every number is last year's published result;
// what isn't published says so (trophy, cost) instead of being guessed.

import type { Hunt, Residency } from './huntdata/schema';
import { successText } from './huntdata/generic';
import { cutoffIsADate } from './huntdata/drawSystem';
import { HOW_IT_DRAWS } from './huntdata/weightedDraw';
import { drawOutlook, type Outlook } from './calendar';
import { SPECIES_NAME } from './species';

export const MAX_COMPARE = 4;

export type CompareColumn = {
  key: string;                 // "ST~SPECIESKEY~CODE"
  state: string;
  species: string;
  unit: string;
  huntCode: string;
  label: string | null;
  weapon: string | null;
  residency: Residency;
  openToYou: boolean;
  oddsNow: string;             // this season, at your points
  reliability: string;         // how much to trust that number
  outlook: Outlook;
  // First year he's more likely than not to have drawn. Only a real date: in a
  // bonus or random state the points cutoff is NOT one (see cutoffIsADate).
  likelyBy: number | null;
  // First year he'd clear the fewest-points-that-drew bar. In a lottery state
  // that is a door opening, not a tag.
  clearsBarIn: number | null;
  chanceBy5: number | null;    // cumulative chance by the last calendar year
  throughYear: number | null;  // the last calendar year that chance covers
  hunterSuccess: string;
  hunterSuccessPct: number | null;   // null when unpublished or too few to judge
  season: string | null;
  publicLand: string | null;   // filled by the page (needs the boundary service)
  trophy: string;
  cost: string;
};

export function compareKey(state: string, speciesKey: string, code: string): string {
  return `${state}~${speciesKey}~${code}`;
}
export function parseCompareKey(k: string): { state: string; speciesKey: string; code: string } | null {
  const [state, speciesKey, ...rest] = k.split('~');
  const code = rest.join('~');
  return state && speciesKey && code ? { state: state.toUpperCase(), speciesKey: speciesKey.toUpperCase(), code } : null;
}

// A chance as words. A real but tiny chance (a Nevada lottery ticket) must
// never round to "0%", which reads as "can't draw".
export function roughPct(n: number): string {
  return n > 0 && n < 1 ? 'under 1%' : `about ${Math.round(n)}%`;
}

// How much to trust the odds number, in plain words, per state's data.
function reliabilityFor(hunt: Hunt, o: Outlook): string {
  if (hunt.otc) return 'No draw — buy the tag.';
  if (o.kind !== 'draw') return 'No published odds.';
  if (o.basis === 'points' && HOW_IT_DRAWS[hunt.state]) return `Good: worked out from the agency’s point table, since ${HOW_IT_DRAWS[hunt.state]}.`;
  if (o.basis === 'points') return 'Good: from the agency’s results at each point level.';
  if (o.perYear.every((r) => r.pct == null)) return 'Partial: only the fewest points that drew is published.';
  switch (hunt.state) {
    case 'OK': return 'Rough: applicant counts include backup choices, so real odds are better than shown.';
    case 'CA': case 'WA': return 'Rough: overall odds across all point levels; high point holders draw more often.';
    case 'AK': return 'Fair: random draw, but residents and non-residents are combined.';
    default: return hunt.dataQuality === 'estimated' ? 'Rough: estimated, not official results.' : 'Fair: first-choice draw rate across all applicants.';
  }
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });


export function compareColumn(
  hunt: Hunt,
  residency: Residency,
  years: number[],
  pointsByYear: Record<number, number> | null,
): CompareColumn {
  const o = drawOutlook(hunt, residency, years, pointsByYear);
  const openToYou = !hunt.openTo || hunt.openTo === residency;
  const first = o.kind === 'draw' ? o.perYear[0] : null;
  const last = o.kind === 'draw' ? o.perYear[o.perYear.length - 1] : null;
  // Where tags go in point order the cutoff is the answer, earlier or later
  // than the odds would suggest: you don't draw before you clear the bar, and
  // once you clear it you do. Everywhere else only compounding odds can date it.
  const byOdds = o.kind === 'draw' ? o.perYear.find((r) => (r.cumulative ?? 0) >= 50)?.year ?? null : null;
  const likely = o.kind === 'draw'
    ? (cutoffIsADate(hunt.state) && o.firstYearAtMin != null ? o.firstYearAtMin : byOdds)
    : o.kind === 'otc' ? years[0] : null;

  let oddsNow: string;
  if (!openToYou) oddsNow = o.text;
  else if (o.kind === 'otc') oddsNow = 'Over the counter';
  else if (first?.pct != null) oddsNow = `${first.pct > 0 && first.pct < 0.1 ? 'Under 0.1' : first.pct}%${first.points != null ? ` at ${first.points === 1 ? '1 point' : `${first.points} points`}` : ''} (${hunt.drawYear ?? 'last'} draw)`;
  else if (o.kind === 'draw' && o.minPoints != null) oddsNow = `Took ${o.minPoints} points in ${hunt.drawYear ?? 'the last draw'}${first?.points != null ? `; you have ${first.points}` : ''}`;
  else oddsNow = 'Not published';

  const h = hunt.harvest;
  const hsText = h ? `${successText(h, hunt.tags)} (${h.year}${h.scope === 'unit' ? ', unit-wide' : ''})` : 'Not published';
  const tiny = h && ((h.hunters != null && h.hunters < 10) || (h.hunters == null && hunt.tags != null && hunt.tags < 10));

  return {
    key: compareKey(hunt.state, hunt.species, hunt.huntCode),
    state: hunt.state,
    species: SPECIES_NAME[hunt.species] ?? hunt.species,
    unit: hunt.unit,
    huntCode: hunt.huntCode,
    label: hunt.label ?? null,
    weapon: hunt.weapon ?? null,
    residency,
    openToYou,
    oddsNow,
    reliability: openToYou ? reliabilityFor(hunt, o) : '—',
    outlook: o,
    likelyBy: openToYou ? likely : null,
    clearsBarIn: openToYou && o.kind === 'draw' ? o.firstYearAtMin : null,
    chanceBy5: openToYou ? (o.kind === 'otc' ? 100 : last?.cumulative ?? null) : null,
    throughYear: years.length ? years[years.length - 1] : null,
    hunterSuccess: hsText,
    hunterSuccessPct: h && !tiny ? h.successPct : null,
    season: hunt.season ? `${fmtDate(hunt.season.open)} – ${fmtDate(hunt.season.close)}` : null,
    publicLand: null,
    trophy: 'No trophy data published',
    cost: 'Not researched yet — check the agency',
  };
}

// The recommendation: the best mix of drawing within the calendar window and
// hunter success. Closed hunts never win; missing figures are called out.
export function pickBest(cols: CompareColumn[]): { key: string; why: string; tradeoff: string | null } | null {
  const open = cols.filter((c) => c.openToYou && (c.chanceBy5 != null || c.likelyBy != null || c.clearsBarIn != null));
  if (!open.length) return null;
  // Ranking only (never shown): a hunt he's likely to have drawn counts as
  // better-than-even, one where he merely clears the points bar as a coin toss
  // in a lottery, and unpublished hunter success as average.
  const chance = (c: CompareColumn) => c.chanceBy5 ?? (c.likelyBy != null ? 60 : c.clearsBarIn != null ? 40 : 0);
  const score = (c: CompareColumn) => chance(c) / 100 * (c.hunterSuccessPct ?? 35);
  const ranked = [...open].sort((a, b) => score(b) - score(a));
  const best = ranked[0];
  const name = (c: CompareColumn) => `${c.state} ${c.huntCode}`;
  const by = (c: CompareColumn) => (c.throughYear ? `by ${c.throughYear}` : 'within the next few years');
  // What we can honestly say about drawing it, in descending order of how much
  // the data actually supports.
  const drawText = (c: CompareColumn) =>
    c.outlook.kind === 'otc' ? 'no draw needed'
      : c.likelyBy != null ? `likely to draw by ${c.likelyBy}`
      : c.chanceBy5 != null ? `${c.chanceBy5 > 0 && c.chanceBy5 < 1 ? 'under a 1%' : `about a ${Math.round(c.chanceBy5)}%`} chance to draw ${by(c)}`
      : c.clearsBarIn != null ? `you'd clear the points bar in ${c.clearsBarIn}, then it's a lottery`
      : 'no published odds to go on';
  const why = `${name(best)}: ${drawText(best)}, hunter success ${best.hunterSuccessPct != null ? `${best.hunterSuccessPct}%` : 'not published (we assumed average)'}.`;

  // Tradeoff: the strongest alternative on hunter success, if it beats the pick there.
  const better = open.filter((c) => c !== best && (c.hunterSuccessPct ?? 0) > (best.hunterSuccessPct ?? 0) + 4)
    .sort((a, b) => (b.hunterSuccessPct ?? 0) - (a.hunterSuccessPct ?? 0))[0];
  let tradeoff: string | null = null;
  if (better) {
    // Say the reason it lost, not a stock one. It ranked below the pick on
    // chance × success, so the cost is a worse chance or a longer wait — and
    // naming the wrong one read as "but you'd wait until 2027" against a pick
    // of 2028, which is sooner.
    const worseChance = better.chanceBy5 != null && best.chanceBy5 != null && better.chanceBy5 < best.chanceBy5 - 1;
    const worseWait = better.likelyBy != null && best.likelyBy != null && better.likelyBy > best.likelyBy;
    const cost = worseChance
      ? `your chance of drawing it ${by(better)} is lower — ${roughPct(better.chanceBy5!)} against ${roughPct(best.chanceBy5!)}`
      : worseWait
      ? `you'd likely wait until ${better.likelyBy}`
      : `it's ${drawText(better)}`;
    tradeoff = `${name(better)} has higher hunter success (${better.hunterSuccessPct}%), but ${cost}.`;
  } else if (ranked[1]) {
    tradeoff = `${name(ranked[1])} is the runner-up.`;
  }
  return { key: best.key, why, tradeoff };
}
