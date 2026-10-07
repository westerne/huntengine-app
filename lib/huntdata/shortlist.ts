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
const pct = (v: unknown) => (typeof v === 'string' ? parseFloat(v) : num(v));

// Restricted hunts most hunters can't apply for; never shortlisted.
const RESTRICTED = /\b(youth|juniors?|ham|champ|challenged|disabled|military|tribal|hopi|navajo)\b/i;
const ANTLERLESS = /\b(antlerless|cow|doe|ewe)\b/i;

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
    if (oddsOf(e) == null && !e.otc) return false;
    if (goal !== 'opportunity' && ANTLERLESS.test(label)) return false;
    return true;
  });

  // Within a band, prefer higher hunter success, then better odds.
  const rank = (a: T, b: T) =>
    (pct(b.hunterSuccess) ?? -1) - (pct(a.hunterSuccess) ?? -1) || (oddsOf(b) ?? 0) - (oddsOf(a) ?? 0);

  const likely = eligible.filter((e) => e.otc || (oddsOf(e) ?? 0) >= 50).sort(rank);
  const fair = eligible.filter((e) => !e.otc && (oddsOf(e) ?? 0) >= 15 && (oddsOf(e) ?? 0) < 50).sort(rank);
  const long = eligible.filter((e) => !e.otc && (oddsOf(e) ?? 0) < 15).sort(rank);

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
  for (const band of [fair, likely, long]) take(band, size - picked.length);
  return picked.slice(0, size);
}
