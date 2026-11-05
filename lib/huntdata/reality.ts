// What a hunter's points actually buy in one state and species, worked out
// from the draw data alone — no model call, so nothing here can be invented.
//
// This is the first thing the new Find a Hunt flow shows, before it asks
// anything. Nevada elk at six non-resident points is three hunts worth
// applying for and a long wait for the rest; the old flow asked four screens
// of questions before saying so, and then said it badly.
//
// Every number comes from the agency's last published draw. Point creep is
// not modelled: most states give us a single year, so a timeline here is
// "what last year's result implies", which is said plainly rather than
// dressed up as a forecast.

import { isAntlerless, isPrivateOnly, oddsOf, RESTRICTED } from './shortlist';

type Entry = Record<string, unknown>;

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pct = (v: unknown) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v ?? '');
  return !t || /too few/i.test(t) ? null : (Number.isFinite(parseFloat(t)) ? parseFloat(t) : null);
};

// Beyond this a point-a-year plan stops being a plan and starts being a wish.
export const FAR_OFF_YEARS = 10;

// The smallest yearly chance worth calling "within reach".
export const MIN_REACH = 1;

export type ReachableHunt = {
  unit: string;
  huntCode: string | null;
  label: string | null;
  odds: number | null;            // at the hunter's own point level, or null
  publishedRate: number | null;   // the hunt's overall rate, which is not theirs
  hunterSuccess: number | null;
  pointsNeeded: number | null;
  // Season dates, where the agency publishes them with the draw (NV, OK, part
  // of WA), so "does it fit my week off" is answered from the calendar.
  season?: { open: string; close: string } | null;
};

export type FutureHunt = ReachableHunt & {
  pointsNeeded: number;
  yearsAway: number;
  year: number;
  farOff: boolean;
  // What applicants who already held those points actually drew at. In a
  // lottery state this is the number that matters: the cutoff is a door, and
  // this says how many people got through it.
  oddsAtThatLevel: number | null;
  // True only where tags go out in point order, so reaching the cutoff really
  // is the tag rather than an entry in a draw.
  cutoffIsADate: boolean;
};

export type DrawReality = {
  points: number;
  considered: number;
  // 'your-points'     the state publishes odds by point level
  // 'points-to-draw'  only the fewest points that drew, so reach is a yes/no
  // 'published-rate'  only an overall rate per hunt, which says nothing about
  //                   this hunter — Colorado is the big one
  // 'none'            nothing to go on
  basis: 'your-points' | 'points-to-draw' | 'published-rate' | 'none';
  // Hunts dropped as private-land-only or restricted, so the page can account
  // for the difference between what the state publishes and what we show.
  setAside: number;
  // Do the lists below carry THIS hunter's chance, or only the hunt's overall
  // rate? Colorado publishes 781 deer hunts with a rate each and nothing by
  // point level: we can show every one of them, we just can't say what any of
  // them means for him. Treating that as "nothing to show" left the state
  // looking empty, which is worse than saying what we don't know.
  priced: boolean;
  reachable: ReachableHunt[];        // antlered only — the tag most hunters mean
  antlerless: ReachableHunt[];       // cow and doe tags, drawable far more easily
  best: ReachableHunt | null;
  bestAntlerless: ReachableHunt | null;
  soon: FutureHunt[];             // within reach if they keep applying
  lottery: boolean;
  longShots: ReachableHunt[];
  dataYear: number | null;
  headline: string;
  caveat: string;
};

// Only the figure computed for this hunter's own point level counts as "your
// odds". Falling back to the overall published rate reads as a personal
// number and isn't one: it said Nevada's best was 100% when the hunter's own
// best was 11%, because some hunt drew everyone who applied for it.
const look = (e: Entry): ReachableHunt & { antlerless: boolean; oddsAtPointsNeeded: number | null } => ({
  antlerless: isAntlerless(e as never),
  unit: String(e.unit ?? ''),
  huntCode: e.huntCode == null ? null : String(e.huntCode),
  label: e.label == null ? null : String(e.label),
  odds: num(e.drawSuccessAtYourPoints),
  publishedRate: oddsOf(e as never),
  hunterSuccess: pct(e.hunterSuccess),
  pointsNeeded: num(e.fewestPointsToDraw),
  oddsAtPointsNeeded: num(e.drawSuccessAtPointsNeeded),
  season: (e.season as { open: string; close: string } | null | undefined) ?? null,
});

// What the state's data lets us say about this hunter specifically.
function basisOf(hunts: ReachableHunt[]): DrawReality['basis'] {
  if (hunts.some((h) => h.odds != null)) return 'your-points';
  if (hunts.some((h) => h.pointsNeeded != null)) return 'points-to-draw';
  if (hunts.some((h) => h.publishedRate != null)) return 'published-rate';
  return 'none';
}

const pctText = (n: number) => (n >= 10 ? `${Math.round(n)}%` : n > 0 && n < 0.1 ? 'under 0.1%' : `${n.toFixed(1)}%`);
const ptsText = (n: number) => (n === 1 ? '1 point' : `${n} points`);

function headlineFor(r: Omit<DrawReality, 'headline' | 'caveat'>, hunts: ReachableHunt[], species: string, state: string): string {
  const sp = species.toLowerCase();
  const held = r.points === 1 ? '1 point' : `${r.points} points`;

  if (!r.considered) return `We don't have ${sp} hunts loaded for ${state}.`;

  // Some states publish how a hunt drew overall but nothing by point level,
  // so we can describe the hunts without pretending to know this hunter's
  // chance. Saying so is better than quoting a rate that isn't theirs.
  if (r.basis === 'published-rate') {
    const easy = hunts.filter((h) => (h.publishedRate ?? 0) >= 50).length;
    const lead = `${state} publishes how each ${sp} hunt drew overall, not by point level, so we can't put a number on your own chance with ${held}.`;
    // "0 drew more than half" is true but tells him nothing to act on, so when
    // nothing is easy we give the best rate there is instead.
    const spread = easy > 0
      ? `Of ${r.considered} hunts, ${easy} drew more than half the people who applied — they're first below.`
      : r.best?.publishedRate != null
      ? `None of the ${r.considered} hunts drew even half the people who applied; the best was ${pctText(r.best.publishedRate)}, and it's first below.`
      : `We have ${r.considered} hunts for you to look through below.`;
    return `${lead} ${spread}`;
  }
  if (r.basis === 'none') {
    return `We have ${r.considered} ${sp} hunts for ${state} but no draw figures behind them, so there is nothing honest to say about your chance.`;
  }

  const cow = r.bestAntlerless && r.bestAntlerless.odds != null && r.bestAntlerless.odds > 0
    ? ` You can draw an antlerless tag this year — ${r.antlerless.length} of them, the best at about ${pctText(r.bestAntlerless.odds)} — if meat in the freezer counts.`
    : '';

  if (r.basis === 'points-to-draw' && r.reachable.length) {
    return `${held} covers what ${r.reachable.length} antlered ${sp} ${r.reachable.length === 1 ? 'hunt' : 'hunts'} in ${state} took last year. ${state} publishes the fewest points that drew rather than odds, so that is a bar you clear, not a chance.${cow}`;
  }
  if (r.best && r.best.odds != null && r.best.odds >= 50) {
    return `With ${held} you can draw ${sp} in ${state} this year — ${r.reachable.length} ${r.reachable.length === 1 ? 'hunt is' : 'hunts are'} within reach, the best at about ${pctText(r.best.odds)}.`;
  }
  if (r.best && r.best.odds != null && r.best.odds > 0) {
    const slim = r.best.odds < 10;
    return `With ${held}, ${r.reachable.length} ${sp} ${r.reachable.length === 1 ? 'hunt is' : 'hunts are'} within reach in ${state}, but ${slim ? 'only just' : 'none of them are a safe bet'} — the best is about ${pctText(r.best.odds)}.`;
  }
  // A pure lottery has no points level that "brings a hunt within reach":
  // every application is a ticket. Name the best ticket instead.
  if (r.lottery) {
    const ls = r.longShots[0];
    return ls?.odds != null
      ? `${state} draws by lottery: every application has a chance${r.points > 0 ? ', and more points mean more chances' : ''}. With ${held} you can still draw any antlered ${sp} hunt, but each is a long shot: the best is about ${pctText(ls.odds)} a year.${cow}`
      : `${state} draws by lottery, and with ${held} no antlered ${sp} hunt drew anyone at your level's odds last year.${cow}`;
  }
  const next = r.soon[0];
  if (next) {
    if (next.farOff) {
      return `${held} doesn't draw an antlered ${sp} in ${state}. The nearest took ${ptsText(next.pointsNeeded)}, which is ${next.yearsAway} years away at a point a year — far enough out that it isn't really a plan.${cow}`;
    }
    // Reaching the cutoff is only a date where tags go out in point order.
    // In a lottery state, say what the people who already had those points
    // actually drew at, or a hunter builds five years toward a 0.4% chance.
    const lottery = !next.cutoffIsADate
      ? next.oddsAtThatLevel != null
        ? ` ${state} draws by lottery, though — at that point level only ${pctText(next.oddsAtThatLevel)} of applicants drew, so the points get you in the hat, not the tag.`
        : ` ${state} draws by lottery, though, so those points get you into the draw rather than the tag.`
      : '';
    return `${held} doesn't draw an antlered ${sp} in ${state} yet. The nearest took ${ptsText(next.pointsNeeded)}, which you'd have in ${next.year} if you apply or buy a point every year.${lottery}${cow}`;
  }
  return `${held} doesn't draw an antlered ${sp} in ${state}, and we have no point figures to say what would.${cow}`;
}

export function drawReality(
  hunts: Entry[],
  opts: {
    points: number;
    state: string;
    species: string;
    thisYear: number;
    // True only in a preference state, where reaching the cutoff is the tag.
    // Elsewhere the cutoff is a door into a lottery and is said that way.
    cutoffIsADate?: boolean;
    // Squared-bonus or random: no points level brings a hunt "within reach",
    // so there's no list of hunts to build toward.
    lottery?: boolean;
  },
): DrawReality {
  const points = Math.max(0, Math.floor(opts.points) || 0);

  // Private-land-only hunts draw freely because you need landowner permission
  // before you can even apply, and restricted hunts (youth, military,
  // disability) aren't open to most hunters. Both float straight to the top of
  // a list ordered by draw rate: two of Colorado's eight easiest deer hunts
  // were private-land tags at 100%, which is the most misleading thing we could
  // have led with. The shortlist has always dropped them; this didn't.
  const open = hunts.filter((e) => !isPrivateOnly(e as never) && !RESTRICTED.test(String(e.label ?? '')));
  const setAside = hunts.length - open.length;
  const considered = open.length;

  const looked = open.map(look);
  const basis = basisOf(looked);

  // With odds at their level, showing a hunt means a real chance. With only a
  // points-to-draw figure it means their points clear the bar. With only a
  // published rate we show it anyway and say plainly that the figure is the
  // hunt's, not theirs — the alternative was an empty page for Colorado.
  // Under 1% a year is a lottery ticket, not "within reach": Nevada's modeled
  // odds give nearly every hunt some chance, down to 0.04%.
  const within = basis === 'your-points'
    ? (h: typeof looked[number]) => (h.odds ?? 0) >= MIN_REACH
    : basis === 'points-to-draw'
    ? (h: typeof looked[number]) => h.pointsNeeded != null && h.pointsNeeded <= points
    : basis === 'published-rate'
    ? (h: typeof looked[number]) => h.publishedRate != null
    : () => false;
  // Rank on whichever figure we actually have, so an unpriced list still leads
  // with the hunts that drew most freely.
  const rate = (h: ReachableHunt) => h.odds ?? h.publishedRate ?? -1;
  const byOdds = (a: ReachableHunt, b: ReachableHunt) =>
    rate(b) - rate(a) || (b.hunterSuccess ?? -1) - (a.hunterSuccess ?? -1);

  // Cow and doe tags draw far more easily and are a different hunt. Mixing
  // them in made Nevada read as "100% at six points" when every one of those
  // was antlerless and no bull hunt was within reach at all.
  const got = looked.filter(within);
  const reachable = got.filter((h) => !h.antlerless).sort(byOdds);
  const antlerless = got.filter((h) => h.antlerless).sort(byOdds);

  const soon: FutureHunt[] = opts.lottery ? [] : looked
    .filter((h) => !h.antlerless)
    .filter((h): h is typeof looked[number] & { pointsNeeded: number } => h.pointsNeeded != null && h.pointsNeeded > points)
    .map((h) => {
      const yearsAway = h.pointsNeeded - points;
      return {
        ...h,
        yearsAway,
        year: opts.thisYear + yearsAway,
        farOff: yearsAway > FAR_OFF_YEARS,
        oddsAtThatLevel: h.oddsAtPointsNeeded,
        cutoffIsADate: !!opts.cutoffIsADate,
      };
    })
    // Soonest first, then the better hunt where the wait is the same.
    .sort((a, b) => a.yearsAway - b.yearsAway || (b.hunterSuccess ?? -1) - (a.hunterSuccess ?? -1));

  const years = hunts.map((e) => num(e.dataYear)).filter((y): y is number => y != null);

  const base = {
    points,
    considered,
    basis,
    setAside,
    priced: basis === 'your-points' || basis === 'points-to-draw',
    reachable,
    antlerless,
    best: reachable[0] ?? null,
    bestAntlerless: antlerless[0] ?? null,
    soon,
    lottery: !!opts.lottery,
    // The best antlered chances under the "within reach" line: in a lottery
    // these are still drawable, just long shots.
    longShots: looked.filter((h) => !h.antlerless && (h.odds ?? 0) > 0 && (h.odds ?? 0) < MIN_REACH).sort(byOdds).slice(0, 5),
    dataYear: years.length ? Math.max(...years) : null,
  };

  return {
    ...base,
    headline: headlineFor(base, looked, opts.species, opts.state),
    caveat: [
      base.dataYear
        ? `Based on the ${base.dataYear} draw. Point creep and demand move these every year, so treat a date as what last year's result implies, not a promise.`
        : 'Point creep and demand move these every year, so treat a date as what the last published draw implies, not a promise.',
      setAside
        ? `${setAside} ${setAside === 1 ? 'hunt is' : 'hunts are'} left out: private-land tags you'd need permission for, and hunts limited to youth, military or disabled hunters.`
        : '',
    ].filter(Boolean).join(' '),
  };
}
