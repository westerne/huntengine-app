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

export type Unsupported = { text: string; kind: 'number' | 'date' };

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
  return out;
}
