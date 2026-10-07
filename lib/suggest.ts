// Starting-calendar suggestions from the guided setup. Pure (uses the state
// draw data, no database). Every suggestion comes from last year's published
// results and says so; the hunter accepts or drops each one.

import type { Residency, Weapon } from './huntdata/schema';
import { getStateModule } from './huntdata/registry';
import { buildGenericScoutDataset } from './huntdata/generic';
import { buildShortlist, isAntlerless, isPrivateOnly, oddsOf, RESTRICTED } from './huntdata/shortlist';
import { usesPoints, type PlanKind } from './calendar';
import { speciesKeyOf, canonicalSpecies } from './species';

export type Wait = 'now' | 'few' | 'long';
export type SetupAnswers = {
  homeState: string | null;
  weapon: Weapon | 'any';
  wait: Wait;                     // now = this season; few = within ~3 years; long = up to 5 years or more
  newUnits: 'new' | 'known' | 'either';
  interests: Array<{ state: string; species: string }>;
  points: Array<{ state: string; species: string; points: number }>;
  knownUnits: Array<{ state: string; species: string; unit: string }>;
  bucket: Array<{ state: string; species: string; unit?: string | null }>;
};

export type Suggestion = {
  kind: PlanKind; state: string; species: string; unit: string | null; hunt_code: string | null;
  label: string | null; target_year: number | null; why: string;
  // Pre-ticked on the review screen. One this-season draw per species is
  // recommended; the rest are alternatives.
  recommended: boolean;
};

const pl = (n: number | null | undefined) => (n === 1 ? '1 point' : `${n} points`);
// Published hunter success as a number; tiny samples ('too few to judge') don't count.
const hsOf = (e: Record<string, unknown>) => { const t = String(e.hunterSuccess ?? ''); return !t || /too few/.test(t) ? null : parseFloat(t) || null; };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const norm = (u: unknown) => String(u ?? '').trim().toLowerCase().replace(/^(unit|gmu)\s+/, '').replace(/^0+(?=\d)/, '');

export function suggestCalendar(a: SetupAnswers, years: number[]): { suggestions: Suggestion[]; notes: string[] } {
  const out: Suggestion[] = [];
  const notes: string[] = [];
  const thisYear = years[0];
  const seen = new Set<string>();
  // Draw-now vs keep-building pairs in one state/species: drawing the first
  // resets the points the second needs, so the hunter picks one.
  const tradeoffs: Array<[Suggestion, Suggestion]> = [];

  for (const pair of a.interests) {
    const mod = getStateModule(pair.state);
    const key = speciesKeyOf(pair.species, pair.state);
    const species = canonicalSpecies(pair.species, pair.state);
    if (!mod || !key || !species || !mod.species.includes(key)) {
      notes.push(`We don't have ${pair.state} ${pair.species.toLowerCase()} draw data, so nothing was suggested there.`);
      continue;
    }
    const residency: Residency = a.homeState === mod.code ? 'resident' : 'nonresident';
    if (residency === 'nonresident' && mod.residentOnly?.[key]) {
      notes.push(mod.residentOnly[key]!);
      continue;
    }
    const uses = usesPoints(mod, species);
    const pts = uses ? a.points.find((p) => p.state === mod.code && speciesKeyOf(p.species, p.state) === key)?.points ?? 0 : undefined;
    const known = new Set(a.knownUnits.filter((k) => k.state === mod.code && speciesKeyOf(k.species, k.state) === key).map((k) => norm(k.unit)));

    let data = buildGenericScoutDataset(mod, key, residency, a.weapon, pts);
    if (a.newUnits === 'new' && known.size) data = data.filter((e) => !known.has(norm(e.unit)));
    // Shortlist, plus hunts that publish only the fewest points that drew
    // (e.g. Wyoming non-resident pools) — the shortlist needs an odds figure.
    const short = buildShortlist(data, { size: 12 });
    const byPoints = data.filter((e) => num(e.fewestPointsToDraw) != null && !e.otc && !short.includes(e)
      && !RESTRICTED.test(String(e.label ?? '')) && !isAntlerless(e) && !isPrivateOnly(e));
    let list = [...short, ...byPoints.sort((x, y) => (parseFloat(String(y.hunterSuccess)) || 0) - (parseFloat(String(x.hunterSuccess)) || 0)).slice(0, 12)];
    if (a.newUnits === 'known' && known.size) list = [...list].sort((x, y) => Number(known.has(norm(y.unit))) - Number(known.has(norm(x.unit))));
    const before = out.length;
    let nowSug: Suggestion | null = null;

    const base = { state: mod.code, species };
    const tag = (e: Record<string, unknown>) => ({ unit: String(e.unit), hunt_code: String(e.huntCode), label: (e.label as string) ?? null });
    const success = (e: Record<string, unknown>) => (e.hunterSuccess ? ` Hunter success ${e.hunterSuccess} (${e.hunterSuccessYear}).` : '');
    const yr = (e: Record<string, unknown>) => e.dataYear ?? 'last year';

    // 1. Something you can likely draw this season.
    const atCut = (e: Record<string, unknown>) => pts != null && num(e.fewestPointsToDraw) != null && num(e.fewestPointsToDraw)! <= pts;
    const now = list.find((e) => !e.otc && ((oddsOf(e) ?? 0) >= 40 || (oddsOf(e) == null && atCut(e))));
    if (now) {
      const o = oddsOf(now);
      out.push({ ...base, ...tag(now), kind: 'target', target_year: thisYear, recommended: true,
        why: o != null
          ? `${Math.round(o)}% of applicants${pts != null ? ` at ${pl(pts)}` : ''} drew it in ${yr(now)}.${success(now)}`
          : `In ${yr(now)} tags went to applicants with as few as ${pl(num(now.fewestPointsToDraw))}; you have ${pl(pts)}. Not a guarantee.${success(now)}` });
      seen.add(`${mod.code}|${now.huntCode}`);
      nowSug = out[out.length - 1];
    }

    // 2. A better hunt within reach of your points (preference/bonus states).
    if (a.wait !== 'now' && pts != null) {
      const span = a.wait === 'few' ? 3 : years.length - 1;
      const reach = list
        .filter((e) => !e.otc && !seen.has(`${mod.code}|${e.huntCode}`))
        .map((e) => ({ e, need: num(e.fewestPointsToDraw) }))
        .filter((x) => x.need != null && x.need > pts && x.need - pts <= span)
        // Waiting has to buy something: with a draw-now option, only suggest
        // a hunt with clearly better published hunter success (5+ points higher).
        .filter((x) => !now || (hsOf(x.e) != null && hsOf(now) != null && hsOf(x.e)! >= hsOf(now)! + 5))
        .sort((x, y) => (hsOf(y.e) ?? 0) - (hsOf(x.e) ?? 0))[0];
      if (reach) {
        out.push({ ...base, ...tag(reach.e), kind: 'target', target_year: thisYear + (reach.need! - pts), recommended: true,
          why: `In ${yr(reach.e)} it took ${pl(reach.need)}; you'd have that in ${thisYear + (reach.need! - pts)} if you apply or buy a point each year.${success(reach.e)}` });
        seen.add(`${mod.code}|${reach.e.huntCode}`);
        const reachSug = out[out.length - 1];
        if (nowSug) {
          nowSug.why += ` Drawing it uses your ${mod.code} ${species.toLowerCase()} points.`;
          reachSug.why += ` Only if you don't draw hunt ${nowSug.hunt_code} first — that resets your points.`;
          tradeoffs.push([nowSug, reachSug]);
        }
      }
    }

    // 3. An over-the-counter option for open years.
    const otc = list.find((e) => e.otc);
    if (otc) {
      out.push({ ...base, ...tag(otc), kind: 'otc', target_year: null, recommended: true,
        why: `No draw needed.${success(otc)}` });
    }

    if (out.length === before) {
      notes.push(`No ${mod.code} ${species.toLowerCase()} hunt looks within reach ${a.wait === 'now' ? 'this season' : 'in the next few years'} at your points. Add it to your bucket list, or keep building points there.`);
    }
  }

  // Bucket list: placed as someday hunts; the calendar shows their outlook.
  for (const b of a.bucket) {
    const mod = getStateModule(b.state);
    const species = canonicalSpecies(b.species, b.state);
    if (!species) continue;
    const pts = mod && usesPoints(mod, species) ? a.points.find((p) => p.state === b.state && speciesKeyOf(p.species, p.state) === speciesKeyOf(species, b.state))?.points : undefined;
    out.push({
      kind: 'bucket', state: b.state, species, unit: b.unit ?? null, hunt_code: null, label: null, target_year: null, recommended: true,
      why: !mod ? 'On your list. We don’t have this state’s draw data yet.'
        : mod.drawSystem === 'random' ? 'Random draw, no points: apply every year you can.'
        : pts ? `You have ${pl(pts)}; keep building every year.`
        : 'Start buying points now — every year counts.',
    });
  }

  // One this-season draw per species is the recommendation (best hunter
  // success); the others stay as unticked alternatives.
  const pct = (w: string) => parseFloat((w.match(/Hunter success ([\d.]+)%/) ?? [])[1] ?? '') || 0;
  for (const sp of new Set(out.map((s) => s.species))) {
    const nowOnes = out.filter((s) => s.kind === 'target' && s.target_year === thisYear && s.species === sp);
    const best = [...nowOnes].sort((x, y) => pct(y.why) - pct(x.why))[0];
    for (const s of nowOnes) s.recommended = s === best;
  }
  // Use points now or keep building: follow how long they said they'd wait.
  for (const [n, r] of tradeoffs) {
    const build = a.wait !== 'now';
    n.recommended = n.recommended && !build;
    r.recommended = build;
    notes.push(`${n.state} ${n.species.toLowerCase()}: draw hunt ${n.hunt_code} now, or keep building for hunt ${r.hunt_code} in ${r.target_year} — not both. We ticked ${build ? 'the one worth waiting for' : 'the draw now'}, since you ${build ? "said you'll build points" : 'want to hunt this season'}.`);
  }
  if (a.interests.length) notes.push('Private-land-only hunts are left out — they need landowner permission before you apply.');

  // Place OTC options in the first open years.
  const taken = new Set(out.filter((s) => s.target_year).map((s) => s.target_year));
  for (const s of out.filter((x) => x.kind === 'otc')) {
    const open = years.find((y) => !taken.has(y));
    if (open) { s.target_year = open; taken.add(open); }
  }
  return { suggestions: out, notes };
}

// Validate setup answers from the browser. Unknown states/species are dropped.
export function cleanSetupAnswers(b: Record<string, unknown>, stateOf: (s: string) => string | null): SetupAnswers {
  const arr = (v: unknown) => (Array.isArray(v) ? v.slice(0, 60) as Array<Record<string, unknown>> : []);
  const pair = (r: Record<string, unknown>) => {
    const state = typeof r.state === 'string' ? stateOf(r.state) : null;
    const species = state && typeof r.species === 'string' ? canonicalSpecies(r.species, state) : null;
    return state && species ? { state, species } : null;
  };
  const weapons = ['any', 'rifle', 'archery', 'muzzleloader'];
  return {
    homeState: typeof b.homeState === 'string' ? stateOf(b.homeState) ?? (/^[A-Z]{2}$/i.test(b.homeState) ? b.homeState.toUpperCase() : null) : null,
    weapon: weapons.includes(b.weapon as string) ? (b.weapon as SetupAnswers['weapon']) : 'any',
    wait: (['now', 'few', 'long'] as const).includes(b.wait as Wait) ? (b.wait as Wait) : 'few',
    newUnits: (['new', 'known', 'either'] as const).includes(b.newUnits as 'new') ? (b.newUnits as SetupAnswers['newUnits']) : 'either',
    interests: arr(b.interests).map(pair).filter((x): x is { state: string; species: string } => !!x),
    points: arr(b.points).map((r) => {
      const p = pair(r);
      const n = Number(r.points);
      return p && Number.isFinite(n) && n >= 0 && n <= 40 ? { ...p, points: n } : null;
    }).filter((x): x is { state: string; species: string; points: number } => !!x),
    knownUnits: arr(b.knownUnits).map((r) => {
      const p = pair(r);
      const unit = typeof r.unit === 'string' ? r.unit.trim().slice(0, 60) : '';
      return p && unit ? { ...p, unit } : null;
    }).filter((x): x is { state: string; species: string; unit: string } => !!x),
    bucket: arr(b.bucket).map((r) => {
      const p = pair(r);
      return p ? { ...p, unit: typeof r.unit === 'string' && r.unit.trim() ? r.unit.trim().slice(0, 60) : null } : null;
    }).filter((x): x is { state: string; species: string; unit: string | null } => !!x),
  };
}
