// The answer check (docs/SPEC_ADVISOR.md §6): every number and date in the
// advisor's answer must appear in what the tools returned this turn, or in what
// the hunter said. Anything else is a number the model made up, and is caught
// before the hunter sees it.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Small counts read naturally in prose ("two more years", "1 tag") and carry no
// claim; checking them would flag every sentence.
const TRIVIAL = new Set(['0', '1', '2', '3']);

const num = (s: string) => {
  const n = Number(s.replace(/[$,]/g, ''));
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : null;
};

// Every number in the evidence, in the forms an answer might use: 1200 and
// 1,200.00 alike; ISO dates also as "may 13".
function evidenceSet(texts: string[]): { nums: Set<string>; dates: Set<string> } {
  const nums = new Set<string>();
  const dates = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) {
      dates.add(`${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`);
      nums.add(String(Number(m[1])));
    }
    for (const m of t.matchAll(/\$?\d[\d,]*(?:\.\d+)?/g)) {
      const n = num(m[0]);
      if (n) nums.add(n);
    }
    for (const m of t.toLowerCase().matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/g)) {
      dates.add(`${m[1]} ${Number(m[2])}`);
    }
  }
  return { nums, dates };
}

export type Unsupported = { text: string; kind: 'number' | 'date'; hunt?: string };

// A hunt in the lookups: its own figures, and how an answer might name it.
type HuntEvidence = { code: string; unit: string; weapon: string | null; nums: Set<string>; dates: Set<string> };

// Splits each lookup into the hunts it describes (any object with a huntCode)
// and everything else. A percentage said about a hunt has to be that hunt's:
// "63% hunter success" for 4156-072 passed when it was only some other hunt's
// figure in the same search result.
function splitEvidence(evidence: string[]): { general: string[]; hunts: HuntEvidence[] } {
  const general: string[] = [];
  const hunts = new Map<string, { unit: string; weapon: string | null; texts: string[] }>();
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.huntCode === 'string' && o.huntCode) {
        const h = hunts.get(o.huntCode) ?? { unit: String(o.unit ?? ''), weapon: weaponIn(`${o.weapon ?? ''} ${o.label ?? ''}`), texts: [] };
        // A fit score (0–100) isn't a percentage: "hunter success was 76%" passed off a fit of 76.
        h.texts.push(JSON.stringify(o, (k, v) => (k === 'fit' ? undefined : v)));
        hunts.set(o.huntCode, h);
        return null;
      }
      return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, strip(x)]));
    }
    return v;
  };
  for (const t of evidence) {
    let parsed: unknown;
    try { parsed = JSON.parse(t); } catch { general.push(t); continue; }
    general.push(JSON.stringify(strip(parsed)));
  }
  return {
    general,
    hunts: [...hunts].map(([code, h]) => ({ code, unit: h.unit, weapon: h.weapon, ...evidenceSet(h.texts) })),
  };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The weapon a hunt or a sentence names, if any.
function weaponIn(t: string): string | null {
  const s = t.toLowerCase();
  if (/archery|\bbow\b/.test(s)) return 'archery';
  if (/muzzle/.test(s)) return 'muzzleloader';
  if (/rifle|any legal weapon/.test(s)) return 'rifle';
  return null;
}

// Hunts a sentence names: by code if it gives one, else by unit ("Units 072 - 074",
// "Beaver, East"). Bare short numbers aren't units; they'd match everything.
function huntsNamed(sentence: string, hunts: HuntEvidence[]): HuntEvidence[] {
  const byCode = hunts.filter((h) => new RegExp(`(^|[^A-Za-z0-9-])${escape(h.code)}($|[^A-Za-z0-9-])`, 'i').test(sentence));
  if (byCode.length) return byCode;
  const inUnit = hunts.filter((h) => {
    const u = h.unit.trim();
    if (!u) return false;
    if (/^\d+$/.test(u)) return new RegExp(`\\bunits?\\s+0*${Number(u)}\\b`, 'i').test(sentence);
    return u.length >= 4 && new RegExp(`\\b${escape(u)}\\b`, 'i').test(sentence);
  });
  // "the muzzleloader hunt in Units 072 - 074" is one of the unit's hunts, not all of them.
  const w = weaponIn(sentence);
  const armed = w ? inUnit.filter((h) => h.weapon === w) : [];
  return armed.length ? armed : inUnit;
}

const known = (n: string, nums: Set<string>) =>
  nums.has(n) || (!n.includes('.') && [...nums].some((e) => Math.round(Number(e)) === Number(n)));

// Percentages and dates in sentences about a named hunt (or the sentences after
// one, until another hunt or a new paragraph) that aren't that hunt's or general.
// "Units 072 - 074 run October 22 to November 5" passed with another 072 hunt's season.
function misattributed(answer: string, general: { nums: Set<string>; dates: Set<string> }, hunts: HuntEvidence[]): Unsupported[] {
  const out: Unsupported[] = [];
  for (const para of answer.split(/\n+/)) {
    let about: HuntEvidence[] = [];
    for (const sentence of para.split(/(?<=[.!?])\s+/)) {
      const named = huntsNamed(sentence, hunts);
      if (named.length) about = named;
      if (!about.length) continue;
      for (const m of sentence.matchAll(/\d[\d,]*(?:\.\d+)?(?=\s?%)/g)) {
        const n = num(m[0]);
        if (!n || TRIVIAL.has(n) || known(n, general.nums) || about.some((h) => known(n, h.nums))) continue;
        out.push({ text: `${m[0]}%`, kind: 'number', hunt: about.map((h) => h.code).join(', ') });
      }
      for (const m of sentence.toLowerCase().matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/g)) {
        const key = `${m[1]} ${Number(m[2])}`;
        if (general.dates.has(key) || about.some((h) => h.dates.has(key))) continue;
        out.push({ text: sentence.slice(m.index!, m.index! + m[0].length), kind: 'date', hunt: about.map((h) => h.code).join(', ') });
      }
    }
  }
  return out;
}

export function unsupportedClaims(answer: string, evidence: string[]): Unsupported[] {
  const { nums, dates } = evidenceSet(evidence);
  const out: Unsupported[] = [];
  const seen = new Set<string>();
  const lower = answer.toLowerCase();

  // Dates first, so "May 13" isn't also checked as the number 13.
  const dateSpans: Array<[number, number]> = [];
  for (const m of lower.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/g)) {
    dateSpans.push([m.index!, m.index! + m[0].length]);
    const key = `${m[1]} ${Number(m[2])}`;
    if (!dates.has(key) && !seen.has(key)) { seen.add(key); out.push({ text: answer.slice(m.index!, m.index! + m[0].length), kind: 'date' }); }
  }
  const inDate = (i: number) => dateSpans.some(([a, b]) => i >= a && i < b);

  for (const m of answer.matchAll(/\$?\d[\d,]*(?:\.\d+)?%?/g)) {
    if (inDate(m.index!)) continue;
    const raw = m[0].replace(/%$/, '');
    const n = num(raw);
    if (!n || TRIVIAL.has(n) || nums.has(n) || seen.has(n)) continue;
    // "~12%" for 12.3 is fine: a whole-number rounding of a real figure.
    if ([...nums].some((e) => Math.round(Number(e)) === Number(n) && !n.includes('.'))) continue;
    seen.add(n);
    out.push({ text: m[0], kind: 'number' });
  }
  const { general, hunts } = splitEvidence(evidence);
  if (hunts.length) {
    for (const b of misattributed(answer, evidenceSet(general), hunts)) {
      if (!out.some((o) => o.text === b.text)) out.push(b);
    }
  }
  return out;
}
