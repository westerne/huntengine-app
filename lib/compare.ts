// Compare 2–4 hunts side by side (docs/SPEC_HUNT_CALENDAR.md §3). Pure —
// tested without a database. Every number is last year's published result;
// what isn't published says so (trophy, cost) instead of being guessed.

import type { Hunt, Residency } from './huntdata/schema';
import { successText } from './huntdata/generic';
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
  likelyBy: number | null;     // first year with ≥50% cumulative chance (or the points cutoff)
  chanceBy5: number | null;    // cumulative chance by the last calendar year
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

// How much to trust the odds number, in plain words, per state's data.
function reliabilityFor(hunt: Hunt, o: Outlook): string {
  if (hunt.otc) return 'No draw — buy the tag.';
  if (o.kind !== 'draw') return 'No published odds.';
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
  const likely = o.kind === 'draw'
    ? (o.perYear.find((r) => (r.cumulative ?? 0) >= 50)?.year ?? o.firstYearAtMin ?? null)
    : o.kind === 'otc' ? years[0] : null;

  let oddsNow: string;
  if (!openToYou) oddsNow = o.text;
  else if (o.kind === 'otc') oddsNow = 'Over the counter';
  else if (first?.pct != null) oddsNow = `${first.pct}%${first.points != null ? ` at ${first.points === 1 ? '1 point' : `${first.points} points`}` : ''} (${hunt.drawYear ?? 'last'} draw)`;
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
    chanceBy5: openToYou ? (o.kind === 'otc' ? 100 : last?.cumulative ?? null) : null,
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
  const open = cols.filter((c) => c.openToYou && (c.chanceBy5 != null || c.likelyBy != null));
  if (!open.length) return null;
  // Ranking only (never shown): a points-cutoff hunt likely within the window
  // counts as better-than-even; unpublished hunter success as average.
  const chance = (c: CompareColumn) => c.chanceBy5 ?? (c.likelyBy != null ? 60 : 0);
  const score = (c: CompareColumn) => chance(c) / 100 * (c.hunterSuccessPct ?? 35);
  const ranked = [...open].sort((a, b) => score(b) - score(a));
  const best = ranked[0];
  const name = (c: CompareColumn) => `${c.state} ${c.huntCode}`;
  const draw = best.outlook.kind === 'otc' ? 'no draw needed' : best.likelyBy ? `likely to draw by ${best.likelyBy}` : `about a ${Math.round(best.chanceBy5 ?? 0)}% chance to draw within five years`;
  const why = `${name(best)}: ${draw}, hunter success ${best.hunterSuccessPct != null ? `${best.hunterSuccessPct}%` : 'not published (we assumed average)'}.`;

  // Tradeoff: the strongest alternative on hunter success, if it beats the pick there.
  const better = open.filter((c) => c !== best && (c.hunterSuccessPct ?? 0) > (best.hunterSuccessPct ?? 0) + 4)
    .sort((a, b) => (b.hunterSuccessPct ?? 0) - (a.hunterSuccessPct ?? 0))[0];
  let tradeoff: string | null = null;
  if (better) {
    tradeoff = `${name(better)} has higher hunter success (${better.hunterSuccessPct}%), but ${better.likelyBy ? `you'd likely wait until ${better.likelyBy}` : `only about a ${Math.round(better.chanceBy5 ?? 0)}% chance to draw within five years`}.`;
  } else if (ranked[1]) {
    tradeoff = `${name(ranked[1])} is the runner-up.`;
  }
  return { key: best.key, why, tradeoff };
}
