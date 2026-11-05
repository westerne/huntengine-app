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

export type Source = { label: string; url?: string | null };
export type ToolResult<T> = { ok: true; data: T; sources: Source[] } | { ok: false; reason: string };

// What the tools need to know about the hunter. Loaded once per turn.
export type Situation = {
  home: string | null;                                              // home state code
  balances: Array<{ state: string; species: string; points: number }>;
  years: number[];                                                  // plan years, this season first
  seasonYear: number;
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

    // The fee most hunters pay: not a landowner, youth or add-on option.
    const usual = (f: FeeLine) => !/landowner|youth|junior|senior|disab|outfitter|guide|extra/i.test(f.label);
    const point = fees.filter((f) => f.item === 'point fee' && usual(f)).sort((a, b) => a.amount! - b.amount!)[0];
    const app = fees.filter((f) => f.item === 'application fee' && usual(f)).sort((a, b) => a.amount! - b.amount!)[0];
    // A free point (Colorado deer/elk) still means paying to apply.
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
      lines, ifDrawn, mayAlsoApply, missing, notes,
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
export type HuntData = Omit<CompareColumn, 'publicLand' | 'trophy' | 'cost'> & { yourPoints: number | null; howTheDrawWorks: string | null };
// The state's draw rules in plain words, so "burn points or keep building" is
// answered for the state's actual system, not a preference draw by default.
const drawRules = (state: string) => STATE_INFO[state as keyof typeof STATE_INFO]?.drawSystemNote ?? null;
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
  return { ok: true, data: { ...strip(c.col), yourPoints: c.pts, howTheDrawWorks: drawRules(r.state) }, sources };
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
type Picked = Pick<ReachableHunt, 'unit' | 'huntCode' | 'label' | 'odds' | 'publishedRate' | 'hunterSuccess' | 'pointsNeeded' | 'season'>;
export type SearchData = {
  howTheDrawWorks: string | null;
  state: string; species: string; residency: Residency; yourPoints: number; weapon: Weapon;
  basis: DrawReality['basis']; oddsAreYours: boolean; oddsNote: string; dataYear: number | null;
  headline: string; caveat: string;
  reachable: Picked[]; antlerless: Picked[];
  longShots: Picked[];   // lottery states: drawable, under 1% a year
  soon: Array<Picked & { year: number; yearsAway: number; oddsAtThatLevel: number | null; cutoffIsADate: boolean }>;
  moreReachable: number;
};
const WEAPONS: Weapon[] = ['rifle', 'archery', 'muzzleloader'];
const pick = (h: ReachableHunt): Picked => ({
  unit: h.unit, huntCode: h.huntCode, label: h.label, odds: h.odds, publishedRate: h.publishedRate,
  hunterSuccess: h.hunterSuccess, pointsNeeded: h.pointsNeeded, season: h.season ?? null,
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
    },
    sources,
  };
}
