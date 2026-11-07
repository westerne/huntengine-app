// Rank hunts by what the hunter wants first, then say what each takes to draw
// (docs/SPEC_RANKING.md). Fit and draw stay separate numbers: blending them is
// what put cow tags and crowded general hunts at the top of Find, because they
// draw.
//
// Every criterion is scored against the other hunts for the same state and
// species (a percentile), from the agency's own figures. A criterion with no
// data for a hunt is left out of that hunt's score, never counted as zero, and
// said plainly in its reasons.

import type { Hunt, Residency, Weapon } from './schema';
import { isAntlerless, isPrivateOnly, RESTRICTED } from './shortlist';
import { cohortOf, matchWant } from './wants';
import { ladderFor, ladderRows, chanceText } from './ladder';
import { herdFor } from './herd';

export type Weight = 0 | 1 | 2;                      // doesn't matter / nice / matters most
export type Timing = 'rut' | 'early' | 'late' | null;
export type HuntPrefs = {
  weapon: Weapon;
  antlerless: boolean;                               // include cow and doe tags
  timing: Timing;
  weights: { success: Weight; demand: Weight; quiet: Weight; timing: Weight };
  horizon: number;                                   // years they'll build points
};
export const DEFAULT_PREFS: HuntPrefs = {
  weapon: 'any', antlerless: false, timing: null,
  weights: { success: 2, demand: 2, quiet: 1, timing: 0 },
  horizon: 5,
};

const W = [0, 1, 2] as const;
const isWeight = (v: unknown): v is Weight => W.includes(v as Weight);
export function cleanPrefs(raw: unknown): HuntPrefs {
  const r = (raw ?? {}) as Record<string, unknown>;
  const w = (r.weights ?? {}) as Record<string, unknown>;
  const pick = <T,>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
  const timing = pick(r.timing, ['rut', 'early', 'late', null] as const, null);
  return {
    weapon: pick(r.weapon, ['any', 'rifle', 'archery', 'muzzleloader'] as const, 'any'),
    antlerless: r.antlerless === true,
    timing,
    weights: {
      success: isWeight(w.success) ? w.success : DEFAULT_PREFS.weights.success,
      demand: isWeight(w.demand) ? w.demand : DEFAULT_PREFS.weights.demand,
      quiet: isWeight(w.quiet) ? w.quiet : DEFAULT_PREFS.weights.quiet,
      // Timing only counts once they've said which timing.
      timing: timing && isWeight(w.timing) ? w.timing : timing ? 2 : 0,
    },
    horizon: Math.min(15, Math.max(1, Math.round(Number(r.horizon) || DEFAULT_PREFS.horizon))),
  };
}

export type RankedHunt = {
  huntCode: string; unit: string; label: string | null; weapon: string | null;
  season: { open: string; close: string } | null;
  fit: number;                         // 0–100, against the other hunts here
  reasons: string[];                   // why, in plain words, best first
  unknown: string[];                   // what we couldn't score
  hunterSuccess: number | null;        // null: not published, or too few hunters to judge
  herd: string | null;                 // the agency's herd figure, short ("26 bulls / 100 cows")
  general: boolean;
  draw: {
    now: number;                       // chance this year, 0–100
    byHorizon: number;                 // drawn at least once by the horizon
    likelyBy: number | null;           // first year more likely than not
    yours: boolean;                    // false: only the hunt's overall rate is published
    none: boolean;                     // no draw figures at all
  };
};
export type Ranking = {
  drawNow: RankedHunt[];
  building: RankedHunt[];
  longShots: RankedHunt[];
  // Hunts where only the hunt's overall rate is published and points matter
  // (Colorado): ranked by fit alone, since "likely by" would compound a rate
  // that isn't theirs.
  unpriced: RankedHunt[];
  considered: number;
  hidden: { antlerless: number; weapon: number; restricted: number };
  horizonYear: number;
};

// Share of values below v (ties count half), 0–100.
const percentile = (values: number[], v: number) => {
  if (!values.length) return null;
  const below = values.filter((x) => x < v).length;
  const same = values.filter((x) => x === v).length;
  return Math.round((100 * (below + same / 2)) / values.length);
};

const GENERAL = /\bgeneral\b|\bover[- ]the[- ]counter\b|\botc\b/i;
const weaponOk = (h: Hunt, w: Weapon) => w === 'any' || !h.weapon || h.weapon === w || (w === 'rifle' && h.weapon === 'any');

export const DRAW_NOW = 20;          // a 1-in-5 chance this year
export const GOOD_FIT = 50;          // better than the middle of the pack
export const GREAT_FIT = 75;

export function rankHunts(
  hunts: Hunt[],
  opts: { residency: Residency; points: number; usesPoints: boolean; seasonYear: number; prefs: HuntPrefs; stateName: string; species: string },
): Ranking {
  const { prefs, residency } = opts;
  const sp = opts.species.toLowerCase();
  const open = hunts.filter((h) => !h.openTo || h.openTo === residency);
  const hidden = { antlerless: 0, weapon: 0, restricted: 0 };
  const eligible = open.filter((h) => {
    if (isPrivateOnly(h) || RESTRICTED.test(String(h.label ?? ''))) { hidden.restricted++; return false; }
    if (!prefs.antlerless && isAntlerless(h)) { hidden.antlerless++; return false; }
    if (!weaponOk(h, prefs.weapon)) { hidden.weapon++; return false; }
    return true;
  });

  const stat = (h: Hunt) => (residency === 'resident' ? h.draw.resident : h.draw.nonresident);
  const general = (h: Hunt) => !!h.otc || GENERAL.test(`${h.label ?? ''} ${h.huntCode}`);
  // Too few hunters to judge (the same line the screens draw) isn't a success rate.
  const success = (h: Hunt) => (h.harvest && !(h.harvest.hunters != null && h.harvest.hunters < 10) ? h.harvest.successPct : null);
  const demand = (h: Hunt) => {
    const s = stat(h);
    return !general(h) && s?.tags && s.applicants ? s.applicants / s.tags : null;
  };
  const tags = (h: Hunt) => stat(h)?.tags ?? h.tags ?? null;

  const succVals = eligible.map(success).filter((n): n is number => n != null);
  const demVals = eligible.map(demand).filter((n): n is number => n != null);
  const tagVals = eligible.map(tags).filter((n): n is number => n != null);
  const entry = (h: Hunt) => ({ label: h.label, huntCode: h.huntCode, weapon: h.weapon ?? null, season: h.season ?? null, tags: tags(h) });
  const cohort = cohortOf(eligible.map(entry));
  const horizonYear = opts.seasonYear + prefs.horizon - 1;

  const ranked: RankedHunt[] = eligible.map((h) => {
    const parts: Array<{ w: number; score: number; reason: string; strong: boolean }> = [];
    const unknown: string[] = [];
    const add = (w: Weight, score: number | null, reason: string, missing: string) => {
      if (!w) return;
      if (score == null) { unknown.push(missing); return; }
      parts.push({ w, score, reason, strong: score >= 67 });
    };

    const s = success(h);
    const sp100 = s == null ? null : percentile(succVals, s);
    add(prefs.weights.success, sp100, s == null ? '' : `${s}% hunter success${sp100! >= 67 ? ` (top third for ${opts.stateName} ${sp})` : ''}`, 'hunter success not published');

    if (general(h)) {
      // Unlimited or general tags: anyone can hunt it, which is the opposite of
      // what "other hunters want this one" measures.
      add(prefs.weights.demand, 0, 'General or over-the-counter: no limit on hunters', '');
    } else {
      const d = demand(h);
      add(prefs.weights.demand, d == null ? null : percentile(demVals, d), d == null ? '' : `${Math.round(d)} applicants per tag`, 'demand not published');
    }

    const t = tags(h);
    const quiet = t == null || general(h) ? null : 100 - percentile(tagVals, t)!;
    add(prefs.weights.quiet, quiet, t == null ? '' : `${t} ${t === 1 ? 'tag' : 'tags'}`, general(h) ? 'crowding unknown for a general hunt' : 'tag count not published');

    if (prefs.timing) {
      const v = matchWant(prefs.timing, entry(h), { species: opts.species, cohort });
      const word = prefs.timing === 'rut' ? 'during the rut' : `${prefs.timing} season`;
      add(prefs.weights.timing, v == null ? null : v ? 100 : 0, v ? `Season is ${word}` : `Not ${word}`, 'season dates not published');
    }

    const totalW = parts.reduce((a, p) => a + p.w, 0);
    // Nothing known to score on means no fit, not a bad one.
    const fit = totalW ? Math.round(parts.reduce((a, p) => a + p.w * p.score, 0) / totalW) : 0;

    const ladder = ladderFor(h, residency);
    const rows = ladderRows(ladder, opts.usesPoints ? opts.points : 0, opts.seasonYear, prefs.horizon);
    const likely = rows.find((r) => r.cumulative >= 50)?.year ?? null;
    return {
      huntCode: h.huntCode, unit: h.unit, label: h.label ?? null, weapon: h.weapon ?? null, season: h.season ?? null, hunterSuccess: success(h),
      herd: herdFor(h.state, h.species, h.unit)?.short ?? null,
      fit, general: general(h),
      reasons: [...parts].sort((a, b) => b.w * b.score - a.w * a.score).map((p) => p.reason).filter(Boolean),
      unknown: unknown.filter(Boolean),
      draw: {
        now: rows[0]?.chance ?? 0,
        byHorizon: rows[rows.length - 1]?.cumulative ?? 0,
        likelyBy: likely,
        yours: ladder.basis === 'modeled' || ladder.basis === 'by-points' || (ladder.basis === 'overall' && !opts.usesPoints),
        // Nobody in their pool drew it last year and there's no model to say
        // what the odds are: nothing to go on, not a long shot.
        none: ladder.basis === 'none' || rows.every((r) => r.chance <= 0),
      },
    };
  });

  const byFit = (a: RankedHunt, b: RankedHunt) => b.fit - a.fit || b.draw.now - a.draw.now;
  const good = ranked.filter((r) => r.fit >= GOOD_FIT && !r.draw.none).sort(byFit);
  const priced = good.filter((r) => r.draw.yours);
  const drawNow = priced.filter((r) => r.draw.now >= DRAW_NOW);
  const building = priced.filter((r) => r.draw.now < DRAW_NOW && r.draw.likelyBy != null);
  const longShots = priced.filter((r) => r.draw.now < DRAW_NOW && r.draw.likelyBy == null && r.fit >= GREAT_FIT);
  return {
    drawNow: drawNow.slice(0, 6),
    building: building.slice(0, 6),
    longShots: longShots.slice(0, 5),
    unpriced: good.filter((r) => !r.draw.yours).slice(0, 10),
    considered: eligible.length,
    hidden,
    horizonYear,
  };
}

// One line on what it takes, for a row.
export function drawLine(r: RankedHunt, horizonYear: number): string {
  if (r.draw.none) return 'No draw odds published';
  if (!r.draw.yours) return `Drew ${chanceText(r.draw.now)} of applicants overall (not your odds)`;
  const now = `${chanceText(r.draw.now)} this year`;
  const later = r.draw.likelyBy != null ? `likely by ${r.draw.likelyBy}` : `${chanceText(r.draw.byHorizon)} by ${horizonYear}`;
  return `${now} · ${later}${r.draw.yours ? '' : ' (hunt’s overall rate, not yours)'}`;
}
