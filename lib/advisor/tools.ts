// The advisor's tools (docs/SPEC_ADVISOR.md §5). Each is a thin wrapper over a
// function the screens already use, so the advisor and the screens can never
// disagree. Pure: they take the hunter's situation as an argument, so they're
// tested without a database. The model only ever sees what these return.
//
// Every result carries its sources. The "Based on" line under an answer is
// built from these, never written by the model.

import { getStateModule, STATE_INFO, toStateCode } from '../huntdata/registry';
import { deadlineFor, feesFor, prerequisitesFor, shortDate, applyFile, type FeeLine } from '../huntdata/apply';
import { harvestReportingFor } from '../huntdata/harvestReporting';
import { findHunt, projectPoints, usesPoints } from '../calendar';
import { compareColumn, pickBest, type CompareColumn } from '../compare';
import { canonicalSpecies, speciesKeyOf } from '../species';
import { titleCaseState } from '../scoutData';
import { buildGenericScoutDataset } from '../huntdata/generic';
import { drawReality, type DrawReality, type ReachableHunt } from '../huntdata/reality';
import { cutoffIsADate, pointsBarMatters } from '../huntdata/drawSystem';
import type { Residency, Weapon } from '../huntdata/schema';
import { DEFAULT_PREFS, rankHunts, type HuntPrefs, type RankedHunt } from '../huntdata/fit';
import { pointsSoldTo } from '../huntdata/apply';

export type Source = { label: string; url?: string | null };
export type ToolResult<T> = { ok: true; data: T; sources: Source[] } | { ok: false; reason: string };

// What the tools need to know about the hunter. Loaded once per turn.
export type Situation = {
  home: string | null;                                              // home state code
  balances: Array<{ state: string; species: string; points: number }>;
  years: number[];                                                  // plan years, this season first
  seasonYear: number;
  prefs?: HuntPrefs;                                                // what they said matters on Find
};

const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });
const residencyIn = (sit: Situation, state: string): Residency => (sit.home === state ? 'resident' : 'nonresident');
const stateName = (code: string) => titleCaseState(STATE_INFO[code as keyof typeof STATE_INFO]?.name ?? code);

// State + species as the data knows them, or a plain reason why not.
function resolve(stateRaw: string, speciesRaw: string) {
  const state = toStateCode(stateRaw);
  if (!state) return fail(`We cover 17 western and plains states; "${stateRaw}" isn't one of them.`);
  const species = canonicalSpecies(speciesRaw, state);
  const key = speciesKeyOf(speciesRaw, state);
  if (!species || !key) return fail(`We don't have ${speciesRaw} in ${stateName(state)}.`);
  return { ok: true as const, state, species, key, name: stateName(state) };
}

export function pointsFor(sit: Situation, state: string, speciesKey: string): number | null {
  const b = sit.balances.find((x) => x.state === state && speciesKeyOf(x.species, x.state) === speciesKey);
  return b ? Number(b.points) : null;
}

// ── deadlines ───────────────────────────────────────────────────────────────
export type DeadlineData = {
  state: string; species: string; residency: Residency;
  status: 'posted' | 'expected' | 'last_year' | 'none';
  date: string | null; dateText: string | null; time: string | null; timezone: string | null;
  draw: string | null; forYear: number | null; applyUrl: string | null;
};
export function deadlines(args: { state: string; species: string; seasonYear?: number }, sit: Situation): ToolResult<DeadlineData> {
  const r = resolve(args.state, args.species);
  if (!r.ok) return r;
  const residency = residencyIn(sit, r.state);
  const year = args.seasonYear ?? sit.seasonYear;
  const d = deadlineFor(r.state, r.key, residency, year);
  const file = applyFile(r.state);
  const data: DeadlineData = {
    state: r.state, species: r.species, residency,
    status: !d ? 'none' : d.kind === 'published' ? 'posted' : d.kind,
    date: d?.date ?? null, dateText: d ? shortDate(d.date) : null, time: d?.time ?? null, timezone: d?.timezone ?? null,
    draw: d?.name ?? null, forYear: d?.year ?? null, applyUrl: file?.applyUrl ?? null,
  };
  const sources: Source[] = d
    ? [{ label: `${STATE_INFO[r.state].agency?.name ?? r.name} ${d.kind === 'published' ? `${year} deadlines` : d.kind === 'expected' ? 'deadline rule' : `${d.year} deadlines (last year's)`}`, url: d.source }]
    : [];
  return { ok: true, data, sources };
}

// ── fees and rules ──────────────────────────────────────────────────────────
export type FeesRulesData = {
  state: string; species: string; residency: Residency; checkedOn: string | null; applyUrl: string | null;
  fees: Array<{ kind: FeeLine['item']; label: string; amount: number | null; year: number | null; refundable: boolean | null }>;
  beforeYouApply: string[];
};
export function feesAndRules(args: { state: string; species: string }, sit: Situation): ToolResult<FeesRulesData> {
  const r = resolve(args.state, args.species);
  if (!r.ok) return r;
  const file = applyFile(r.state);
  if (!file) return fail(`We don't have ${r.name}'s fees and application rules on file yet. Check the agency's site.`);
  const residency = residencyIn(sit, r.state);
  const fees = feesFor(r.state, r.key, residency);
  const pre = prerequisitesFor(r.state, r.key, residency);
  const urls = [...new Set([...fees, ...pre].map((x) => x.source))];
  return {
    ok: true,
    data: {
      state: r.state, species: r.species, residency, checkedOn: file.checkedOn, applyUrl: file.applyUrl,
      fees: fees.map((f) => ({ kind: f.item, label: f.label, amount: f.amount, year: f.year, refundable: f.refundable ?? null })),
      beforeYouApply: pre.map((p) => p.text),
    },
    sources: urls.map((url, i) => ({ label: i === 0 ? `${r.name} posted fees and rules (checked ${file.checkedOn})` : `${r.name} agency page`, url })),
  };
}

// ── yearly cost ─────────────────────────────────────────────────────────────
// What it costs each year to stay in the game: the license a state requires
// to apply (once per state), plus a point or application fee per species, plus
// small per-application fees. Tags are listed separately — you only pay those
// if you draw. Only posted fees; anything missing is listed, never guessed.
export type CostLine = { state: string; species: string | null; label: string; amount: number; kind: FeeLine['item'] };
export type YearlyCostData = {
  total: number;
  byState: Array<{ state: string; subtotal: number }>;
  lines: CostLine[];
  ifDrawn: Array<{ state: string; species: string; min: number; max: number }>;
  mayAlsoApply: CostLine[];   // optional or situational fees, not in the total
  noPoints: string[];         // "Wyoming sells elk points only to non-residents" — nothing to buy
  missing: string[];          // "WY antelope: no point or application fee on file"
  notes: string[];            // choices we made, said plainly
};
// Small fees that ride on every application ("processing fee", "habitat stamp")
// count; anything conditional ("certain hunt areas", "special permit") doesn't.
const EVERY_APP = /processing|application fee|habitat|conservation stamp|stamp/i;
const CONDITIONAL = /certain|special|optional|if |only|per tag|landowner|outfitter|guide/i;
const OFF_LICENSE = /youth|junior|senior|lifetime|disab|veteran|military|apprentice|short.?term|\d-day|daily/i;
export function yearlyCost(
  args: { items: Array<{ state: string; species: string; mode?: 'apply' | 'points' }> },
  sit: Situation,
): ToolResult<YearlyCostData> {
  const lines: CostLine[] = [];
  const ifDrawn: YearlyCostData['ifDrawn'] = [];
  const missing: string[] = [];
  const mayAlsoApply: CostLine[] = [];
  const noPoints: string[] = [];
  const notes: string[] = [];
  const sources = new Map<string, Source>();
  const licensed = new Set<string>();
  const perAppDone = new Set<string>();

  for (const it of args.items) {
    const r = resolve(it.state, it.species);
    if (!r.ok) { missing.push(`${it.state} ${it.species}: ${r.reason}`); continue; }
    const file = applyFile(r.state);
    if (!file) { missing.push(`${r.name} ${r.species.toLowerCase()}: no fees on file`); continue; }
    const res = residencyIn(sit, r.state);
    const fees = feesFor(r.state, r.key, res).filter((f) => f.amount != null);
    const add = (f: FeeLine, species: string | null) => {
      lines.push({ state: r.state, species, label: f.label, amount: f.amount!, kind: f.item });
      sources.set(f.source, { label: `${r.name} posted fees (checked ${file.checkedOn})`, url: f.source });
    };

    // The fee most hunters pay: not a landowner, youth or add-on option.
    const usual = (f: FeeLine) => !/landowner|youth|junior|senior|disab|outfitter|guide|extra/i.test(f.label);
    const point = fees.filter((f) => f.item === 'point fee' && usual(f)).sort((a, b) => a.amount! - b.amount!)[0];
    const app = fees.filter((f) => f.item === 'application fee' && usual(f)).sort((a, b) => a.amount! - b.amount!)[0];
    const sp = r.species.toLowerCase();

    if (it.mode === 'points') {
      // How the state sells a point on its own, for this species and residency.
      const windows = (file.pointOnly ?? []).filter((w) => w.species.includes(r.key));
      const mine = windows.filter((w) => w.residency === res || w.residency === 'both');
      if (!point && !mine.length) {
        // No point fee and no point-only rule: there's no point to buy. Never
        // price the application as though it were one (it called Wyoming's
        // resident application fee and conservation stamp "elk points").
        const others = windows.length ? (res === 'resident' ? 'non-residents' : 'residents') : null;
        noPoints.push(!usesPoints(getStateModule(r.state), r.species)
          ? `${r.name} doesn't use points for ${sp}: every application has the same chance, so there's nothing to buy.`
          : others
          ? `${r.name} sells ${sp} points only to ${others}, so there's no point to buy as a ${res === 'resident' ? 'resident' : 'non-resident'}.`
          : `${r.name} ${sp}: we have no way on file to buy just a point as a ${res === 'resident' ? 'resident' : 'non-resident'}. Check with the agency.`);
        for (const w of windows) sources.set(w.source, { label: `${r.name} point-only rules`, url: w.source });
        continue;
      }
      // Wyoming non-resident: "There is no application fee to purchase a
      // preference point only" — the point fee is the whole cost.
      if (point && mine.some((w) => /no application fee/i.test(w.quote))) {
        add(point, r.species);
        notes.push(`${r.name}: buying just one ${sp} point is the point fee alone, with no application fee or license.`);
        continue;
      }
      if (point && !(point.amount! > 0)) {
        notes.push(`${r.name}'s ${sp} point is free, but you earn it by applying, so this counts the application.`);
      } else if (!point) {
        notes.push(`${r.name} has no separate ${sp} point fee on file: you earn the point by applying, so this counts the application. Check the exact cost with the agency.`);
      }
    }

    if (!licensed.has(r.state)) {
      licensed.add(r.state);
      const lic = fees.filter((f) => f.item === 'qualifying license');
      const adult = lic.filter((f) => !OFF_LICENSE.test(f.label));
      const pick = [...(adult.length ? adult : lic)].sort((a, b) => a.amount! - b.amount!)[0];
      if (pick) {
        add(pick, null);
        if ((adult.length || lic.length) > 1) notes.push(`${r.name}: used the cheapest adult license that lets you apply (${pick.label}); others cost more.`);
      }
    }

    // A free point (Colorado deer/elk), or none on file, means paying to apply.
    const main = it.mode === 'points' ? (point && point.amount! > 0 ? point : app ?? point) : app ?? point;
    if (main) add(main, r.species);
    else missing.push(`${r.name} ${r.species.toLowerCase()}: no point or application fee on file`);

    // Small fees charged on every application, counted once per state.
    if (!perAppDone.has(r.state)) {
      perAppDone.add(r.state);
      for (const f of fees.filter((x) => x.item === 'other')) {
        if (EVERY_APP.test(f.label) && !CONDITIONAL.test(f.label)) add(f, null);
        else mayAlsoApply.push({ state: r.state, species: null, label: f.label, amount: f.amount!, kind: f.item });
      }
    }

    const tags = fees.filter((f) => f.item === 'tag fee').map((f) => f.amount!);
    if (tags.length) ifDrawn.push({ state: r.state, species: r.species, min: Math.min(...tags), max: Math.max(...tags) });
  }

  const byStateMap = new Map<string, number>();
  for (const l of lines) byStateMap.set(l.state, (byStateMap.get(l.state) ?? 0) + l.amount);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    ok: true,
    data: {
      total: round(lines.reduce((s, l) => s + l.amount, 0)),
      byState: [...byStateMap].map(([state, subtotal]) => ({ state, subtotal: round(subtotal) })),
      lines, ifDrawn, mayAlsoApply, noPoints, missing, notes,
    },
    sources: [...sources.values()],
  };
}

// ── harvest reporting ───────────────────────────────────────────────────────
export function harvestReporting(args: { state: string; species: string }): ToolResult<ReturnType<typeof harvestReportingFor>> {
  const r = resolve(args.state, args.species);
  if (!r.ok) return r;
  const info = harvestReportingFor(r.state, r.species);
  return {
    ok: true, data: info,
    sources: [...new Set(info.rules.map((x) => x.source))].map((url) => ({ label: `${r.name} harvest reporting rules`, url })),
  };
}

// ── one hunt, and several side by side ─────────────────────────────────────
export type HuntData = Omit<CompareColumn, 'publicLand' | 'trophy' | 'cost'> & { yourPoints: number | null; howTheDrawWorks: string | null; applyOrBuild?: string };
// The state's draw rules in plain words, so "burn points or keep building" is
// answered for the state's actual system, not a preference draw by default.
const drawRules = (state: string) => STATE_INFO[state as keyof typeof STATE_INFO]?.drawSystemNote ?? null;
// "Burn my points on it or keep building?" is a false choice in a lottery where
// an application that doesn't draw earns the point. Said as data, because the
// prompt rule alone didn't stop "try now or keep building".
const APPLYING_EARNS_POINT: Record<string, string> = {
  NV: 'In Nevada, applying for this hunt and not drawing earns a bonus point, the same as buying one. Points are only used up if you draw it. So applying is not "burning" points: it builds points and gives this year’s chance at once. The real choice is which hunt to put in, not whether to apply.',
};
function column(state: string, key: string, species: string, huntCode: string | null, unit: string | null, sit: Situation) {
  const mod = getStateModule(state);
  if (!mod) return null;
  const hunt = findHunt(mod, species, huntCode, unit);
  if (!hunt) return null;
  const res = residencyIn(sit, state);
  const pts = pointsFor(sit, state, key);
  const byYear = usesPoints(mod, species) && pts != null ? projectPoints(pts, sit.years) : null;
  return { col: compareColumn(hunt, res, sit.years, byYear), pts, drawYear: hunt.drawYear };
}
const huntSource = (state: string, year: number | null): Source => ({
  label: `${stateName(state)} draw results${year ? ` ${year}` : ''}`,
  url: STATE_INFO[state as keyof typeof STATE_INFO]?.agency?.url ?? null,
});
const strip = (c: CompareColumn): Omit<CompareColumn, 'publicLand' | 'trophy' | 'cost'> => {
  const rest: Partial<CompareColumn> = { ...c };
  delete rest.publicLand; delete rest.trophy; delete rest.cost;
  return rest as Omit<CompareColumn, 'publicLand' | 'trophy' | 'cost'>;
};

export function getHunt(args: { state: string; species: string; huntCode?: string | null; unit?: string | null }, sit: Situation): ToolResult<HuntData> {
  const r = resolve(args.state, args.species);
  if (!r.ok) return r;
  if (!args.huntCode && !args.unit) return fail('Name a hunt code or unit.');
  const c = column(r.state, r.key, r.species, args.huntCode ?? null, args.unit ?? null, sit);
  if (!c) return fail(`We couldn't find ${r.name} ${r.species.toLowerCase()} ${args.huntCode ?? `unit ${args.unit}`} in the draw data${args.unit && !args.huntCode ? ' (that unit may have several hunts — name the hunt code)' : ''}.`);
  const sources = [huntSource(r.state, c.drawYear)];
  if (c.pts != null) sources.push({ label: `your ${r.state} ${r.species.toLowerCase()} points (${c.pts})` });
  return { ok: true, data: { ...strip(c.col), yourPoints: c.pts, howTheDrawWorks: drawRules(r.state), ...(APPLYING_EARNS_POINT[r.state] ? { applyOrBuild: APPLYING_EARNS_POINT[r.state] } : {}) }, sources };
}

export function compareHunts(args: { hunts: Array<{ state: string; species: string; huntCode: string }> }, sit: Situation): ToolResult<{ hunts: HuntData[]; pick: ReturnType<typeof pickBest>; notFound: string[] }> {
  const cols: CompareColumn[] = [];
  const out: HuntData[] = [];
  const notFound: string[] = [];
  const sources = new Map<string, Source>();
  for (const h of args.hunts.slice(0, 4)) {
    const r = resolve(h.state, h.species);
    const c = r.ok ? column(r.state, r.key, r.species, h.huntCode, null, sit) : null;
    if (!r.ok || !c) { notFound.push(`${h.state} ${h.huntCode}`); continue; }
    cols.push(c.col);
    out.push({ ...strip(c.col), yourPoints: c.pts, howTheDrawWorks: drawRules(r.state) });
    const s = huntSource(r.state, c.drawYear);
    sources.set(s.label, s);
    if (c.pts != null) sources.set(`pts:${r.state}${r.key}`, { label: `your ${r.state} ${r.species.toLowerCase()} points (${c.pts})` });
  }
  if (!out.length) return fail(`We couldn't find any of those hunts: ${notFound.join(', ')}.`);
  return { ok: true, data: { hunts: out, pick: pickBest(cols), notFound }, sources: [...sources.values()] };
}

// ── search: what's within reach ────────────────────────────────────────────
// The same read Find gives: hunts within reach at the hunter's points, and what
// comes within reach if they keep applying. Antlered and antlerless are kept
// apart, because mixing them makes a state look easier than it is.
type Picked = Pick<ReachableHunt, 'unit' | 'huntCode' | 'label' | 'odds' | 'publishedRate' | 'hunterSuccess' | 'pointsNeeded' | 'season'> & { seasonMonths: string[] | null };
export type SearchData = {
  howTheDrawWorks: string | null;
  state: string; species: string; residency: Residency; yourPoints: number; weapon: Weapon;
  basis: DrawReality['basis']; oddsAreYours: boolean; oddsNote: string; dataYear: number | null;
  headline: string; caveat: string;
  reachable: Picked[]; antlerless: Picked[];
  longShots: Picked[];   // lottery states: drawable, under 1% a year
  soon: Array<Picked & { year: number; yearsAway: number; oddsAtThatLevel: number | null; cutoffIsADate: boolean }>;
  moreReachable: number;
  // Ranked by the hunter's own preferences first (docs/SPEC_RANKING.md), then
  // grouped by what each takes to draw. Lead with these, not the easiest draw.
  bestFits: {
    prefsUsed: string;
    drawNow: FitPick[]; building: FitPick[]; longShots: FitPick[];
    rankedByFitOnly: FitPick[];          // odds by points not published here
    leftOut: { antlerless: number; otherWeapon: number };
  };
};
type FitPick = { huntCode: string; unit: string; label: string | null; fit: number; why: string[]; chanceThisYear: number; likelyBy: number | null; chanceByHorizon: number; oddsAreYours: boolean; season: { open: string; close: string } | null; seasonMonths: string[] | null; hunterSuccess: number | 'not published, or too few hunters to judge' };
// "Which hunt fits a week in October?" The model read Oct 22 – Nov 5 as not
// October; the months a season touches are worked out here instead.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function seasonMonths(season: { open: string; close: string } | null | undefined): string[] | null {
  if (!season) return null;
  const a = new Date(`${season.open}T00:00:00Z`), b = new Date(`${season.close}T00:00:00Z`);
  if (Number.isNaN(+a) || Number.isNaN(+b) || b < a) return null;
  const out: string[] = [];
  for (let d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1)); d <= b && out.length < 12; d.setUTCMonth(d.getUTCMonth() + 1)) out.push(MONTH_NAMES[d.getUTCMonth()]);
  return out;
}
const fitPick = (h: RankedHunt): FitPick => ({
  huntCode: h.huntCode, unit: h.unit, label: h.label, fit: h.fit, why: h.reasons, season: h.season, seasonMonths: seasonMonths(h.season),
  // Said outright: left out, the model filled the gap with "high hunter success".
  hunterSuccess: h.hunterSuccess ?? 'not published, or too few hunters to judge',
  chanceThisYear: h.draw.now, likelyBy: h.draw.likelyBy, chanceByHorizon: h.draw.byHorizon, oddsAreYours: h.draw.yours,
});
const WEAPONS: Weapon[] = ['rifle', 'archery', 'muzzleloader'];
const pick = (h: ReachableHunt): Picked => ({
  unit: h.unit, huntCode: h.huntCode, label: h.label, odds: h.odds, publishedRate: h.publishedRate,
  hunterSuccess: h.hunterSuccess, pointsNeeded: h.pointsNeeded, season: h.season ?? null, seasonMonths: seasonMonths(h.season),
});
export function searchHunts(args: { state: string; species: string; weapon?: string | null }, sit: Situation): ToolResult<SearchData> {
  const r = resolve(args.state, args.species);
  if (!r.ok) return r;
  const mod = getStateModule(r.state);
  if (!mod || !mod.species.includes(r.key as never)) return fail(`We don't have ${r.name} ${r.species.toLowerCase()} draw data.`);
  const residency = residencyIn(sit, r.state);
  const weapon: Weapon = WEAPONS.find((w) => w === String(args.weapon ?? '').toLowerCase()) ?? 'any';
  const points = pointsFor(sit, r.state, r.key) ?? 0;
  const hunts = buildGenericScoutDataset(mod, r.key as never, residency, weapon, points);
  const re = drawReality(hunts, { points, state: r.name, species: r.species, thisYear: sit.seasonYear, cutoffIsADate: cutoffIsADate(r.state), lottery: !pointsBarMatters(r.state) });
  const sources: Source[] = [huntSource(r.state, re.dataYear)];
  if (points) sources.push({ label: `your ${r.state} ${r.species.toLowerCase()} points (${points})` });
  return {
    ok: true,
    data: {
      state: r.state, species: r.species, residency, yourPoints: points, weapon, howTheDrawWorks: drawRules(r.state),
      basis: re.basis, oddsAreYours: re.basis === 'your-points', dataYear: re.dataYear,
      oddsNote: re.basis === 'your-points' ? 'odds are at the hunter\'s own points'
        : re.basis === 'points-to-draw' ? 'only the fewest points that drew is published: within reach means their points clear it, not a sure draw'
        : re.basis === 'published-rate' ? `publishedRate is each hunt's overall draw rate, NOT this hunter's odds; ${r.name} doesn't publish odds by points. Say so.`
        : 'no odds published',
      headline: re.headline, caveat: re.caveat,
      reachable: re.reachable.slice(0, 8).map(pick),
      antlerless: re.antlerless.slice(0, 3).map(pick),
      longShots: re.longShots.map(pick),
      soon: re.soon.filter((h) => !h.farOff).slice(0, 5).map((h) => ({
        ...pick(h), year: h.year, yearsAway: h.yearsAway, oddsAtThatLevel: h.oddsAtThatLevel, cutoffIsADate: h.cutoffIsADate,
      })),
      moreReachable: Math.max(0, re.reachable.length - 8),
      bestFits: (() => {
        const prefs = { ...(sit.prefs ?? DEFAULT_PREFS), ...(weapon !== 'any' ? { weapon } : {}) };
        const earns = usesPoints(mod, r.species) && pointsSoldTo(r.state, r.key, residency) !== false;
        const k = rankHunts(mod.hunts(r.key as never), { residency, points: earns ? points : 0, usesPoints: earns, seasonYear: sit.seasonYear, prefs, stateName: r.name, species: r.species });
        const w = prefs.weights;
        const said = (n: 0 | 1 | 2) => (n === 2 ? 'matters most' : n === 1 ? 'nice' : 'doesn\u2019t matter');
        return {
          prefsUsed: `${prefs.weapon === 'any' ? 'any weapon' : prefs.weapon}; hunter success ${said(w.success)}; demand ${said(w.demand)}; fewer hunters ${said(w.quiet)}${prefs.timing ? `; ${prefs.timing}` : ''}; ${prefs.horizon}-year horizon${sit.prefs ? '' : ' (defaults; they haven\u2019t set preferences on Find)'}`,
          drawNow: k.drawNow.slice(0, 3).map(fitPick), building: k.building.slice(0, 3).map(fitPick),
          longShots: k.longShots.slice(0, 3).map(fitPick), rankedByFitOnly: k.unpriced.slice(0, 4).map(fitPick),
          leftOut: { antlerless: k.hidden.antlerless, otherWeapon: k.hidden.weapon },
        };
      })(),
    },
    sources,
  };
}
