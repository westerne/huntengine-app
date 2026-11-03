// Keeps the hunt plan honest about numbers.
//
// buildPlanPrompt gives the model exactly four facts: hunter success, public
// land percent, named access, and the hunter's own dates. Tag quotas, season
// dates and trophy scores are never supplied — so any of those in the output
// was invented, whatever the prompt told the model not to do. The prompt does
// forbid all of this; testers still saw invented tag counts and season dates,
// which is why this runs afterwards instead of being another STRICT RULE.
//
// Same shape as stripPhoneNumbers: replace the claim with an honest marker
// rather than dropping the sentence, so the prose still reads.
//
// The patterns are built by joining regex literals rather than writing escapes
// inside template strings, which is easy to get subtly wrong.

import type { GeneratedPlan, PlanContext, PlanInputs } from './plans';

export type Ungrounded = { kind: 'tags' | 'date' | 'figure' | 'trophy'; text: string };

const src = (...parts: RegExp[]) => parts.map((p) => p.source).join('');
const alt = (...parts: string[]) => parts.join('|');

const MONTH = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?/;

// "250 tags", "75 permits", "a quota of 40", "1,200 licenses are issued".
// The gap before the noun excludes digits so an unrelated number earlier in
// the sentence ("opens October 3 with 150 tags") can't be dragged in.
const TAGS = new RegExp(alt(
  /\b\d{1,3}(?:,\d{3})*\s+(?:[a-z-]+\s+){0,2}?(?:tags?|permits?|licen[sc]es?|quotas?)\b/.source,
  /\bquotas?\s+of\s+\d{1,3}(?:,\d{3})*\b/.source,
), 'gi');

// Day-level dates only. Bare month names and "early September" are fine — the
// prompt asks for early/late season guidance and that invents nothing.
const DATES = new RegExp(alt(
  src(/\b/, MONTH, /\s+\d{1,2}(?:st|nd|rd|th)?\b/),
  src(/\b\d{1,2}(?:st|nd|rd|th)?\s+/, MONTH, /\b/),
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.source,
  /\b\d{4}-\d{2}-\d{2}\b/.source,
), 'gi');

const TROPHY = /\b\d{2,3}\s*(?:-|–)?\s*(?:inch|inches|")|\bB&C\s*\d{2,3}\b|\bboone\s+and\s+crockett\s+\d{2,3}\b/gi;

const PERCENT = /\b(\d{1,3}(?:\.\d+)?)\s*%/g;
// A percentage only counts as a claim when it is talking about one of these.
const CLAIMY = /success|harvest|public\s*land|private\s*land|draw|odds|drawn|hunters?\s+who/i;

const digits = (s: string) => s.replace(/[^\d.]/g, '');

// A written date reduced to one comparable key, so "September 15", "Sept. 15th"
// and "Sep 15" all collapse to "sep|15". Returns null when there is no day.
function dateKey(text: string): string | null {
  const t = text.toLowerCase().trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${Number(iso[2])}|${Number(iso[3])}`;
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/);
  if (slash) return `${Number(slash[1])}|${Number(slash[2])}`;
  const mon = t.match(/[a-z]{3,}/)?.[0]?.slice(0, 3);
  const day = t.match(/\d{1,2}/)?.[0];
  if (!mon || !day) return null;
  const i = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(mon);
  return i < 0 ? null : `${i + 1}|${Number(day)}`;
}

// Every date the hunter themselves gave, as comparable keys.
function allowedDates(inputs: PlanInputs): Set<string> {
  const out = new Set<string>();
  for (const iso of [inputs.hunt_start, inputs.hunt_end]) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    const key = dateKey(iso);
    if (key) out.add(key);
  }
  return out;
}

// Percentages the model was actually handed, e.g. "59% hunter success (2025)".
function allowedFigures(ctx: PlanContext): Set<string> {
  const out = new Set<string>();
  for (const source of [ctx.harvest, ctx.publicLand]) {
    for (const m of String(source ?? '').matchAll(PERCENT)) out.add(digits(m[1]));
  }
  return out;
}

// What a piece of generated text is allowed to assert, because it was given.
export type Allowed = { dates: Set<string>; figures: Set<string> };

// Everything numeric in the facts the model was handed. BRIEF assembles its
// DATA blocks into one string, so "may only repeat numbers it was given" is
// exactly expressible: any figure not in here was not supplied.
export function allowedFromFacts(facts: string): Allowed {
  const figures = new Set<string>();
  for (const m of facts.matchAll(/\d+(?:\.\d+)?/g)) figures.add(digits(m[0]));
  const dates = new Set<string>();
  for (const m of facts.matchAll(DATES)) {
    const key = dateKey(m[0]);
    if (key) dates.add(key);
  }
  return { dates, figures };
}

export function scrubUngrounded(
  text: string,
  ctx: PlanContext,
  inputs: PlanInputs,
): { text: string; found: Ungrounded[] } {
  return scrubText(text, { dates: allowedDates(inputs), figures: allowedFigures(ctx) });
}

// Just the trophy pass. The SCOUT shortlist's prose legitimately carries draw
// odds, quotas and point levels straight from the dataset, so running the full
// scrub over it would strip figures we did supply. Antler scores are the one
// thing SCOUT must not invent, and for most Wyoming areas we now supply none.
export function scrubTrophyText(text: string, figures: Set<string>): { text: string; found: Ungrounded[] } {
  const found: Ungrounded[] = [];
  const out = text.replace(TROPHY, (m) => {
    const n = m.match(/\d[\d,]*(?:\.\d+)?/)?.[0];
    if (n != null && figures.has(digits(n.replace(/,/g, '')))) return m;
    found.push({ kind: 'trophy', text: m });
    return '[antler size not sourced for this area]';
  });
  return { text: out, found };
}

export function scrubText(text: string, allowed: Allowed): { text: string; found: Ungrounded[] } {
  const found: Ungrounded[] = [];
  const dateOk = allowed.dates;
  const figureOk = allowed.figures;
  let out = text;

  // A figure the model was handed may be repeated; anything else was invented.
  const supplied = (m: string) => {
    const n = m.match(/\d[\d,]*(?:\.\d+)?/)?.[0];
    return n != null && figureOk.has(digits(n.replace(/,/g, '')));
  };

  out = out.replace(TAGS, (m) => {
    if (supplied(m)) return m;
    found.push({ kind: 'tags', text: m });
    return '[tag numbers not supplied — check the regulations]';
  });

  out = out.replace(DATES, (m) => {
    const key = dateKey(m);
    if (key && dateOk.has(key)) return m;
    found.push({ kind: 'date', text: m });
    return '[dates not supplied — check the regulations]';
  });

  out = out.replace(TROPHY, (m) => {
    if (supplied(m)) return m;
    found.push({ kind: 'trophy', text: m });
    return '[trophy figures not supplied]';
  });

  // Checked against the pre-replacement text so earlier markers can't shift
  // what counts as nearby context.
  const base = out;
  out = out.replace(PERCENT, (m, n: string, offset: number) => {
    if (figureOk.has(digits(n))) return m;
    const around = base.slice(Math.max(0, offset - 60), offset + 60);
    if (!CLAIMY.test(around)) return m;
    found.push({ kind: 'figure', text: m });
    return '[figure not supplied]';
  });

  return { text: out, found };
}

// Run over every section and the gear list. Returns the cleaned plan plus what
// was caught, so the route can log it and we can watch which class leaks most.
export function groundPlan(
  plan: GeneratedPlan,
  ctx: PlanContext,
  inputs: PlanInputs,
): { plan: GeneratedPlan; found: Ungrounded[] } {
  const found: Ungrounded[] = [];
  const sections = {} as GeneratedPlan['sections'];
  for (const [key, value] of Object.entries(plan.sections)) {
    const r = scrubUngrounded(value, ctx, inputs);
    sections[key as keyof GeneratedPlan['sections']] = r.text;
    found.push(...r.found);
  }
  const gear = plan.gear.map((g) => {
    const item = scrubUngrounded(g.item, ctx, inputs);
    const why = g.why ? scrubUngrounded(g.why, ctx, inputs) : null;
    found.push(...item.found, ...(why?.found ?? []));
    return { item: item.text, ...(why ? { why: why.text } : {}) };
  });
  return { plan: { sections, gear }, found };
}

// BRIEF's sections, against the DATA blocks it was given. Same rule as the
// hunt plan, applied to the other door: the brief has no hunter dates at all,
// so any day-level date in it is invented unless the agency figures carried
// one.
export function groundBrief(
  brief: Record<string, unknown>,
  facts: string,
): { brief: Record<string, unknown>; found: Ungrounded[] } {
  const allowed = allowedFromFacts(facts);
  const found: Ungrounded[] = [];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(brief)) {
    if (typeof value !== 'string') { out[key] = value; continue; }
    const r = scrubText(value, allowed);
    out[key] = r.text;
    found.push(...r.found);
  }
  return { brief: out, found };
}
