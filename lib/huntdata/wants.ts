// What a hunter says he's looking for, turned into something the draw data can
// actually answer.
//
// The model's job is only to read his words and pick from the list below. Every
// yes/no after that is computed here from the agency's own figures, so a chip
// saying "archery season" is a fact about the hunt code, not a guess. Wants we
// have no data for come back as null — "can't tell from the draw data" — and are
// shown that way rather than quietly counted as a match.
//
// Relative wants (early, late, quiet, success) are judged against the other
// hunts for that state and species, not an absolute bar. "Nine tags" means
// nothing on its own; "fewest tags of any elk hunt in Nevada" means something.

import { isAntlerless, oddsOf } from './shortlist';

type Entry = Record<string, unknown>;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pct = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v ?? '');
  return !t || /too few/i.test(t) ? null : (Number.isFinite(parseFloat(t)) ? parseFloat(t) : null);
};

// A season as MMDD, so windows compare without caring which year was published.
const mmdd = (iso: unknown): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? Number(m[2]) * 100 + Number(m[3]) : null;
};
const seasonOf = (e: Entry): { open: number; close: number } | null => {
  const s = e.season as { open?: unknown; close?: unknown } | null | undefined;
  const open = mmdd(s?.open);
  const close = mmdd(s?.close) ?? open;
  return open != null && close != null ? { open, close } : null;
};

// A season as one or two MMDD spans. Late hunts run into January — Nevada's
// "Dec 5 – Jan 1" is open 1205, close 0101 — and comparing those as plain
// numbers makes the season look like it ends before it starts.
const spansOf = (s: { open: number; close: number }): Array<[number, number]> =>
  s.close >= s.open ? [[s.open, s.close]] : [[s.open, 1231], [101, s.close]];
const overlaps = (s: { open: number; close: number }, from: number, to: number) =>
  spansOf(s).some(([a, b]) => a <= to && b >= from);

export type Verdict = true | false | null;   // yes / no / nothing to go on

export type WantKey =
  | 'archery' | 'rifle' | 'muzzleloader'
  | 'rut' | 'early' | 'late'
  | 'antleredOnly' | 'anyAnimal'
  | 'quiet' | 'likely' | 'success' | 'otc';

// `hard` wants exclude rather than rank: a muzzleloader tag is no use to an
// archer. If nothing survives them we say so instead of showing an empty list.
// `pool` wants change which hunts are on the table rather than describing one,
// so they are never scored or shown as a chip against a hunt — "meat in the
// freezer" as a question about a cow tag has no sensible answer.
export const WANTS: Record<WantKey, { label: string; asked: string; hard?: true; pool?: true }> = {
  archery:      { label: 'archery season',      asked: 'a bow season',                  hard: true },
  rifle:        { label: 'rifle season',        asked: 'a rifle season',                hard: true },
  muzzleloader: { label: 'muzzleloader',        asked: 'a muzzleloader season',         hard: true },
  rut:          { label: 'in the rut',          asked: 'to be there for the rut' },
  early:        { label: 'early season',        asked: 'an early season' },
  late:         { label: 'late season',         asked: 'a late season' },
  antleredOnly: { label: 'antlered',            asked: 'a buck or bull tag',            hard: true },
  anyAnimal:    { label: 'meat in the freezer', asked: 'any animal, meat over antlers', pool: true },
  quiet:        { label: 'few other hunters',   asked: 'room to yourself' },
  likely:       { label: 'likely to draw',      asked: 'a tag you will actually draw' },
  success:      { label: 'high success',        asked: 'a hunt where hunters fill' },
  otc:          { label: 'no draw',             asked: 'a tag without a draw' },
};

export const WANT_KEYS = Object.keys(WANTS) as WantKey[];
export const isWantKey = (v: unknown): v is WantKey => WANT_KEYS.includes(v as WantKey);

// Topics hunters raise that the draw data has nothing to say about. Naming them
// back is the honest half of the answer — the model picks from this list too, so
// the wording below is ours and nothing can be invented into it.
export const BLIND_SPOTS = {
  terrain:     'how steep or open the country is',
  access:      'roads, trailheads and how far in you have to walk',
  publicLand:  'how much of the unit is public',
  trophy:      'antler size and trophy quality',
  pressure:    'how crowded it feels on the ground',
  outfitter:   'guides and outfitters',
  weather:     'weather and snow',
  distance:    'how far it is from home',
  camping:     'where you can camp',
  place:       'a particular range, drainage or piece of ground',
  tagCost:     'what the licence costs',
  privateLand: 'landowner permission and private ground',
} as const;
export type BlindSpot = keyof typeof BLIND_SPOTS;
export const BLIND_SPOT_KEYS = Object.keys(BLIND_SPOTS) as BlindSpot[];
export const isBlindSpot = (v: unknown): v is BlindSpot => BLIND_SPOT_KEYS.includes(v as BlindSpot);

// Roughly when each species breeds. Coarse on purpose: the point is whether a
// season lands in the rut at all, and a window to the day would be false
// precision. Species we don't know breed nothing — the want comes back null.
const RUT: Record<string, [number, number]> = {
  elk: [905, 1005],
  deer: [1110, 1205],
  antelope: [901, 1001],
  pronghorn: [901, 1001],
  moose: [920, 1020],
  'bighorn sheep': [1101, 1201],
};
const rutWindow = (species: string) => {
  const s = species.trim().toLowerCase();
  return RUT[s] ?? (s.includes('deer') ? RUT.deer : s.includes('elk') ? RUT.elk : null);
};

// Where the middle of the pack sits for this state and species.
export type Cohort = {
  medianOpen: number | null;
  quietTags: number | null;       // at or below this is the quiet third
  goodSuccess: number | null;     // at or above this is the top third
};

const quantile = (sorted: number[], q: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))] : null;

export function cohortOf(entries: Entry[]): Cohort {
  const opens = entries.map((e) => seasonOf(e)?.open).filter((n): n is number => n != null).sort((a, b) => a - b);
  const tags = entries.map((e) => num(e.tags)).filter((n): n is number => n != null).sort((a, b) => a - b);
  const succ = entries.map((e) => pct(e.hunterSuccess)).filter((n): n is number => n != null).sort((a, b) => a - b);
  return {
    medianOpen: quantile(opens, 0.5),
    quietTags: quantile(tags, 0.33),
    goodSuccess: quantile(succ, 0.67),
  };
}

const says = (e: Entry, re: RegExp) => re.test(`${String(e.label ?? '')} ${String(e.huntCode ?? '')}`);

export function matchWant(key: WantKey, e: Entry, ctx: { species: string; cohort: Cohort }): Verdict {
  const weapon = e.weapon == null ? null : String(e.weapon);
  const season = seasonOf(e);

  switch (key) {
    // An "any legal weapon" season is a rifle season; it is not an archery or
    // muzzleloader one, even though you may carry either in it.
    case 'rifle':
      return weapon == null ? null : weapon === 'rifle' || weapon === 'any';
    case 'archery':
    case 'muzzleloader':
      return weapon == null ? null : weapon === key;

    case 'rut': {
      const w = rutWindow(ctx.species);
      if (!w || !season) return null;
      return overlaps(season, w[0], w[1]);
    }
    // The agency's own word beats our arithmetic; otherwise it is early or late
    // relative to the other hunts for this species in this state.
    case 'early':
      if (says(e, /\bearly\b/i)) return true;
      if (says(e, /\blate\b/i)) return false;
      return season && ctx.cohort.medianOpen != null ? season.open < ctx.cohort.medianOpen : null;
    case 'late':
      if (says(e, /\blate\b/i)) return true;
      if (says(e, /\bearly\b/i)) return false;
      return season && ctx.cohort.medianOpen != null ? season.open > ctx.cohort.medianOpen : null;

    case 'antleredOnly':
      return !isAntlerless(e as never);
    // Not a constraint — it widens the pool to cow and doe tags, which the
    // caller does. Nothing here to be true or false about.
    case 'anyAnimal':
      return null;

    case 'quiet': {
      const tags = num(e.tags);
      return tags != null && ctx.cohort.quietTags != null ? tags <= ctx.cohort.quietTags : null;
    }
    case 'success': {
      const s = pct(e.hunterSuccess);
      return s != null && ctx.cohort.goodSuccess != null ? s >= ctx.cohort.goodSuccess : null;
    }
    case 'likely': {
      if (e.otc) return true;
      const odds = num(e.drawSuccessAtYourPoints) ?? oddsOf(e);
      return odds == null ? null : odds >= 50;
    }
    case 'otc':
      return !!e.otc;
  }
}

export type Scored<T> = {
  entry: T;
  matched: WantKey[];
  missed: WantKey[];
  unknown: WantKey[];
  score: number;
};

export type Narrowed<T> = {
  picks: Scored<T>[];
  // Hard wants we had to drop to show anything at all.
  relaxed: WantKey[];
  // Reachable hunts a hard want ruled out. Worth saying out loud: a list of one
  // looks like thin data when it's really a narrow ask.
  excluded: number;
};

export function rankByWants<T extends Entry>(
  entries: T[],
  keys: WantKey[],
  ctx: { species: string; cohort: Cohort },
  size = 8,
): Narrowed<T> {
  // Pool wants did their work before we got here, by deciding what's in
  // `entries`; scoring them again would hang an unanswerable chip on every row.
  const asked = keys.filter(isWantKey).filter((k) => !WANTS[k].pool);
  const score = (e: T): Scored<T> => {
    const matched: WantKey[] = [], missed: WantKey[] = [], unknown: WantKey[] = [];
    for (const k of asked) {
      const v = matchWant(k, e, ctx);
      (v === true ? matched : v === false ? missed : unknown).push(k);
    }
    return { entry: e, matched, missed, unknown, score: matched.length };
  };

  const hard = asked.filter((k) => WANTS[k].hard);
  const keep = (s: Scored<T>) => !s.missed.some((k) => WANTS[k].hard);

  let scored = entries.map(score);
  let relaxed: WantKey[] = [];
  let excluded = 0;
  const strict = scored.filter(keep);
  if (strict.length) {
    excluded = scored.length - strict.length;
    scored = strict;
  } else if (hard.length) {
    // Nothing he can use is within reach. Better to show the nearest thing and
    // say which of his conditions it breaks than to show him an empty page.
    relaxed = hard;
  }

  const odds = (e: T) => num(e.drawSuccessAtYourPoints) ?? oddsOf(e) ?? -1;
  scored.sort((a, b) =>
    b.score - a.score
    || (a.missed.length - b.missed.length)
    || odds(b.entry) - odds(a.entry)
    || (pct(b.entry.hunterSuccess) ?? -1) - (pct(a.entry.hunterSuccess) ?? -1));

  return { picks: scored.slice(0, size), relaxed, excluded };
}

// "Sept 10 – Oct 5", for a row that has real dates behind it.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
export function seasonText(e: Entry): string | null {
  const s = seasonOf(e);
  if (!s) return null;
  const one = (n: number) => `${MONTHS[Math.floor(n / 100) - 1]} ${n % 100}`;
  return s.open === s.close ? one(s.open) : `${one(s.open)} – ${one(s.close)}`;
}
