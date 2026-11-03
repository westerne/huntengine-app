// Which Wyoming trophy figures are real, and what to do with the rest.
//
// The hand-built Wyoming files carry a `typical` and `topEnd` on every entry —
// '175-190"' / '200"+' — and the file header says where they come from:
//
//   "Trophy typical / topEnd for FULL entries: sourced per field notes in V1.
//    Trophy data for NEEDS_TROPHY_DATA entries: aggregated table data where
//    available, conservative geographic estimates otherwise."
//
// and, in the antelope file, "Trophy/seasons placeholders — not yet sourced.
// Do not present as field truth."
//
// So only FULL is measured. NEEDS_TROPHY_DATA is an estimate (100 of Wyoming's
// 162 deer entries, 118 of 121 antelope) and NEEDS_FIELD_DATA is aggregated
// table data (the 17 whitetail sub-tags and 12 limited-quota areas) — which the
// brief was presenting as "PRIMARY TRUTH DATA".
//
// The old approach handed the model the precise numbers and asked it, in the
// prompt, to soften the estimated ones. That is the pattern this codebase keeps
// having to undo: a prompt rule is a request, not a guarantee, and the figures
// were also being parsed back out to score and exclude hunts. An estimate that
// decides which units a hunter is shown is worse than no estimate at all.
//
// So an unsourced figure never leaves this module. It isn't softened, it is
// withheld, which also means the guard in planGuard.ts scrubs any trophy number
// the model prints for such an area: allowedFromFacts() only whitelists figures
// that appear in the facts we sent, and these no longer do.

export type Completeness = 'FULL' | 'NEEDS_TROPHY_DATA' | 'NEEDS_FIELD_DATA';

export type TrophyInput = {
  typical?: string | null;
  topEnd?: string | null;
  dataCompleteness?: string | null;
};

export type TrophyFacts = {
  // The measured range, or null when we have no sourced figure for this area.
  typical: string | null;
  topEnd: string | null;
  sourced: boolean;
  // What to say instead of a number. Null when there is a real figure.
  note: string | null;
};

export const TROPHY_UNSOURCED_NOTE =
  'Antler size is not sourced for this area yet — we have no measured figure to give.';

// Only field-sourced entries carry a trophy figure we can stand behind.
export const trophySourced = (c: string | null | undefined): boolean => c === 'FULL';

// A placeholder that slipped through as text rather than a flag.
const isBlank = (v: string | null | undefined): boolean =>
  !v || /^n\/?a$/i.test(v.trim()) || /tbd|placeholder|unknown|not sourced/i.test(v);

export function trophyFacts(u: TrophyInput): TrophyFacts {
  if (!trophySourced(u.dataCompleteness) || isBlank(u.typical) || isBlank(u.topEnd)) {
    return { typical: null, topEnd: null, sourced: false, note: TROPHY_UNSOURCED_NOTE };
  }
  return { typical: u.typical ?? null, topEnd: u.topEnd ?? null, sourced: true, note: null };
}

// Top end in inches, for the one place a number legitimately drives a decision:
// the OTC baseline a limited-quota tag has to beat. Unsourced entries return
// null so they can't set or clear that bar.
export function sourcedTopEndInches(u: TrophyInput): number | null {
  const f = trophyFacts(u);
  if (!f.topEnd) return null;
  const m = /\d+/.exec(f.topEnd);
  return m ? Number(m[0]) : null;
}

// ─── Guarding the SCOUT shortlist ────────────────────────────────────────────
//
// The brief and the hunt plan are scrubbed after generation (planGuard); the
// shortlist never was. It asks the model for a typicalScore and topEnd on every
// pick, and until now the only thing stopping an invented one was a sentence in
// the prompt. Now that most units carry no figure, that sentence is the only
// thing standing between a hunter and a made-up number — so this enforces it.

import { scrubTrophyText } from './planGuard';

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const digitsIn = (v: unknown) => [...String(v ?? '').matchAll(/\d+/g)].map((m) => m[0]);

// Antler figures each unit is allowed to quote, by unit key. A unit with no
// sourced figure maps to an empty set, so anything the model prints for it is
// replaced rather than trusted.
export function allowedTrophyByUnit(
  dataset: Array<{ unit?: unknown; typical?: unknown; topEnd?: unknown }>,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const e of dataset) {
    const key = norm(e.unit);
    if (!key) continue;
    const set = out.get(key) ?? new Set<string>();
    for (const d of [...digitsIn(e.typical), ...digitsIn(e.topEnd)]) set.add(d);
    out.set(key, set);
  }
  return out;
}

// Fields that may legitimately hold a trophy figure; the rest of a pick is
// odds, seasons and terrain and is left alone.
const PROSE = ['whyItFits', 'tradeoffs', 'terrain', 'note', 'wildernessNote'];

export function groundScoutTrophy<T extends Record<string, unknown>>(
  result: T,
  dataset: Array<{ unit?: unknown; typical?: unknown; topEnd?: unknown }>,
): { result: T; stripped: string[] } {
  const allowed = allowedTrophyByUnit(dataset);
  const stripped: string[] = [];

  const fix = (pick: Record<string, unknown>) => {
    const key = norm(pick.unit);
    const figures = allowed.get(key) ?? new Set<string>();

    for (const field of ['typicalScore', 'topEnd'] as const) {
      const v = pick[field];
      if (typeof v !== 'string' || !v.trim()) continue;
      // Every number in the string has to be one we handed over for THIS unit.
      const ok = digitsIn(v).length > 0 && digitsIn(v).every((d) => figures.has(d));
      if (!ok) {
        stripped.push(`${key || '?'}.${field}: ${v}`);
        pick[field] = null;
      }
    }
    for (const field of PROSE) {
      const v = pick[field];
      if (typeof v !== 'string') continue;
      const r = scrubTrophyText(v, figures);
      if (r.found.length) {
        stripped.push(...r.found.map((f) => `${key || '?'}.${field}: ${f.text}`));
        pick[field] = r.text;
      }
    }
  };

  for (const list of ['drawableUnits', 'recommendations']) {
    const arr = (result as Record<string, unknown>)[list];
    if (Array.isArray(arr)) {
      for (const pick of arr) if (pick && typeof pick === 'object') fix(pick as Record<string, unknown>);
    }
  }
  return { result, stripped };
}
