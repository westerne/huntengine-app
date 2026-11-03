// Server-built SCOUT shortlist for states on the shared builders. The model
// reliably returned only ~3 picks from a 100+ hunt dataset, so the server
// chooses which hunts to show (spread across odds levels) and the model only
// explains them. Facts on each card still come from scoutFacts.ts.

type Entry = Record<string, unknown>;

export type ShortlistOptions = {
  size?: number;                 // default 8
  // 'trophy' = antlered/bull/ram only; 'opportunity' = also antlerless/any.
  goal?: 'trophy' | 'opportunity' | 'balanced';
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
// A hunter-success figure from a handful of hunters doesn't rank anything.
const pct = (v: unknown) => (typeof v === 'string' ? (/too few to judge/.test(v) ? null : parseFloat(v)) : num(v));

// Restricted hunts most hunters can't apply for; never shortlisted.
export const RESTRICTED = /\b(youth|juniors?|apprentice|master hunters?|disabilit(?:y|ies)|ham|champ|challenged|disabled|military|tribal|hopi|navajo)\b/i;
// Private-land-only hunts need landowner permission before you apply, so they
// draw easily but aren't open to most hunters. CPW marks them with a "P"
// season in the hunt code (E-F-007-P5-R); other states say "private".
export function isPrivateOnly(e: { huntCode?: unknown; label?: unknown }): boolean {
  const code = String(e.huntCode ?? '').replace(/-/g, '').toUpperCase();
  return /^[A-Z]{2}\d{3}P\d[A-Z]$/.test(code) || /\bprivate\b/i.test(String(e.label ?? ''));
}
export const ANTLERLESS = /\b(antlerless|cow|doe|ewe)\b/i;
// Antlerless by label, or by CPW's sex letter (second letter F = female, as in
// D-F-056-L1-R) for Colorado hunts that carry no label.
export function isAntlerless(e: { huntCode?: unknown; label?: unknown }): boolean {
  if (ANTLERLESS.test(String(e.label ?? ''))) return true;
  return /^[A-Z]F\d{3}[A-Z]\d[A-Z]$/.test(String(e.huntCode ?? '').replace(/-/g, '').toUpperCase());
}

export function oddsOf(e: Entry): number | null {
  const published = num(e.drawSuccessAtYourPoints) ?? num(e.drawSuccess);
  if (published != null) return published;
  // Licenses ÷ applicants when that's all the agency publishes.
  const tags = num(e.tags), apps = num(e.applicants);
  return tags != null && apps ? Math.min(100, (100 * tags) / apps) : null;
}

// Map the planner's "trophy vs opportunity" answer to a goal.
export function goalFrom(sacrificeTrophy: string | undefined): ShortlistOptions['goal'] {
  if (sacrificeTrophy === 'no') return 'trophy';
  if (sacrificeTrophy === 'yes') return 'opportunity';
  return 'balanced';
}

export function buildShortlist<T extends Entry>(dataset: T[], opts: ShortlistOptions = {}): T[] {
  const size = opts.size ?? 8;
  const goal = opts.goal ?? 'balanced';

  const eligible = dataset.filter((e) => {
    const label = String(e.label ?? '');
    if (RESTRICTED.test(label)) return false;
    if (isPrivateOnly(e)) return false;
    // Rankable if the agency publishes odds, or it is over the counter, or it
    // publishes the fewest points that drew. Wyoming's non-resident pools
    // publish only the last of those, and dropping them here left the whole
    // state unshortlistable.
    if (oddsOf(e) == null && !e.otc && num(e.fewestPointsToDraw) == null) return false;
    if (goal !== 'opportunity' && isAntlerless(e)) return false;
    return true;
  });

  // Can the hunter draw it at all? A hunt that needs more points than they
  // hold reads 0% at their level, and no amount of trophy quality makes up
  // for a chance of nothing. Nevada elk at six points was eight hunts needing
  // seven to twenty-three, ranked on hunter success, while a hunt they could
  // draw at 7.7% missed the list.
  const drawable = (e: T) => ((num(e.drawSuccessAtYourPoints) ?? oddsOf(e)) ?? 0) > 0;

  // Then prefer higher hunter success, then better odds.
  const rank = (a: T, b: T) =>
    Number(drawable(b)) - Number(drawable(a))
    || (pct(b.hunterSuccess) ?? -1) - (pct(a.hunterSuccess) ?? -1)
    || (oddsOf(b) ?? 0) - (oddsOf(a) ?? 0);

  // A hunt with no odds can't be banded by them: without this it lands in the
  // long-shot band and is presented as under 15%, which nobody published.
  const banded = (e: T) => oddsOf(e) != null;
  const likely = eligible.filter((e) => e.otc || (banded(e) && oddsOf(e)! >= 50)).sort(rank);
  const fair = eligible.filter((e) => !e.otc && banded(e) && oddsOf(e)! >= 15 && oddsOf(e)! < 50).sort(rank);
  const long = eligible.filter((e) => !e.otc && banded(e) && oddsOf(e)! < 15).sort(rank);
  // Points-only hunts: best hunter success first, then the ones needing fewest
  // points. They fill once banded hunts run out, so a state publishing both
  // still leads with real odds.
  const byPoints = eligible.filter((e) => !e.otc && !banded(e)).sort(
    (a, b) => (pct(b.hunterSuccess) ?? -1) - (pct(a.hunterSuccess) ?? -1)
      || (num(a.fewestPointsToDraw) ?? 99) - (num(b.fewestPointsToDraw) ?? 99),
  );

  // Trophy hunters get more long shots; opportunity hunters more likely draws.
  const quota = goal === 'trophy' ? [2, 3, 3] : goal === 'opportunity' ? [4, 3, 1] : [3, 3, 2];
  const picked: T[] = [];
  const take = (band: T[], n: number) => {
    for (const e of band) {
      if (n <= 0) break;
      if (!picked.includes(e)) { picked.push(e); n--; }
    }
  };
  take(likely, quota[0]);
  take(fair, quota[1]);
  take(long, quota[2]);
  // Top up from any band if one was short.
  for (const band of [fair, likely, long, byPoints]) take(band, size - picked.length);
  return picked.slice(0, size);
}
