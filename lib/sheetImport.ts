// Spreadsheet import for My Hunt Calendar. Hunters paste from Google Sheets /
// Excel (tab-separated) or upload a CSV. Columns are matched by header name;
// every row the parser can't read is listed for the hunter to fix — nothing
// is guessed silently.

import { canonicalSpecies } from './species';
import type { PlanKind } from './calendar';

export const FIELDS = ['state', 'species', 'points', 'unit', 'hunt_code', 'year', 'kind', 'notes'] as const;
export type Field = (typeof FIELDS)[number];
export const FIELD_LABEL: Record<Field, string> = {
  state: 'State', species: 'Species', points: 'Points', unit: 'Unit / area', hunt_code: 'Hunt code',
  year: 'Year you plan to hunt', kind: 'Type (target / bucket list / OTC)', notes: 'Notes',
};

const SYNONYMS: Record<Field, RegExp> = {
  state: /^(state|st)$/i,
  species: /^(species|animal|critter)$/i,
  points: /^((preference |bonus |pref |current )?points?|pts|pref|bonus)$/i,
  unit: /^(unit|units|gmu|hunt ?unit|area|hunt ?area|zone|district|wmu|dau)$/i,
  hunt_code: /^(hunt ?(code|#|no\.?|number)?|code|tag|license|permit|hunt ?id)$/i,
  year: /^((planned |target |hunt )?year|when|season)$/i,
  kind: /^(type|category|kind|list|status|plan)$/i,
  notes: /^(notes?|comments?|details?|thoughts)$/i,
};

const STATES: Record<string, string> = {
  WYOMING: 'WY', IDAHO: 'ID', COLORADO: 'CO', MONTANA: 'MT', UTAH: 'UT', ARIZONA: 'AZ', NEBRASKA: 'NE',
  'NEW MEXICO': 'NM', KANSAS: 'KS', 'NORTH DAKOTA': 'ND', NEVADA: 'NV', OREGON: 'OR', WASHINGTON: 'WA',
  CALIFORNIA: 'CA', 'SOUTH DAKOTA': 'SD', OKLAHOMA: 'OK', ALASKA: 'AK',
};
const CODES = new Set(Object.values(STATES));

export function stateCodeOf(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/\./g, '');
  if (CODES.has(t)) return t;
  return STATES[t] ?? null;
}

// Split pasted text or CSV into rows. Tabs win when present (Sheets/Excel paste).
export function splitRows(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  if (lines.some((l) => l.includes('\t'))) return lines.map((l) => l.split('\t').map((c) => c.trim()));
  return lines.map(parseCsvLine);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export type Mapping = Partial<Record<Field, number>>;

export function guessMapping(header: string[]): Mapping {
  const m: Mapping = {};
  header.forEach((h, i) => {
    const f = FIELDS.find((f) => m[f] == null && SYNONYMS[f].test(h.trim()));
    if (f) m[f] = i;
  });
  return m;
}

export type ImportedPoints = { state: string; species: string; points: number };
export type ImportedItem = {
  kind: PlanKind; state: string; species: string; unit: string | null; hunt_code: string | null;
  target_year: number | null; notes: string | null;
};
export type ImportResult = { points: ImportedPoints[]; items: ImportedItem[]; issues: Array<{ row: number; text: string }> };

function kindOf(raw: string, hasYear: boolean): PlanKind {
  const t = raw.toLowerCase();
  if (/bucket|dream|someday|wish/.test(t)) return 'bucket';
  if (/\botc\b|over.the.counter|general|fill|backup|fallback/.test(t)) return 'otc';
  if (/target|draw|plan|apply/.test(t)) return 'target';
  return hasYear ? 'target' : 'bucket';
}

// rows[0] is the header row.
export function parseImport(rows: string[][], mapping: Mapping): ImportResult {
  const res: ImportResult = { points: [], items: [], issues: [] };
  const get = (r: string[], f: Field) => (mapping[f] != null ? (r[mapping[f]!] ?? '').trim() : '');
  if (mapping.state == null || mapping.species == null) {
    res.issues.push({ row: 1, text: 'Match a State column and a Species column to import.' });
    return res;
  }
  const seenPoints = new Map<string, number>();
  rows.slice(1).forEach((r, i) => {
    const row = i + 2;
    if (r.every((c) => !c.trim())) return;
    const stRaw = get(r, 'state'), spRaw = get(r, 'species');
    const state = stateCodeOf(stRaw);
    if (!state) { res.issues.push({ row, text: stRaw ? `"${stRaw}" isn't one of the 17 states we cover.` : 'No state.' }); return; }
    const species = canonicalSpecies(spRaw, state);
    if (!species) { res.issues.push({ row, text: spRaw ? `Don't recognize the species "${spRaw}".` : 'No species.' }); return; }

    const ptsRaw = get(r, 'points');
    if (ptsRaw) {
      const n = Number(ptsRaw.replace(/[^\d.]/g, ''));
      if (!Number.isFinite(n) || n < 0 || n > 40 || !/\d/.test(ptsRaw)) res.issues.push({ row, text: `Points "${ptsRaw}" isn't a number.` });
      else {
        const k = `${state}|${species}`;
        if (seenPoints.has(k) && seenPoints.get(k) !== n) res.issues.push({ row, text: `${state} ${species} points listed twice (${seenPoints.get(k)} and ${n}); kept the first.` });
        else if (!seenPoints.has(k)) { seenPoints.set(k, n); res.points.push({ state, species, points: n }); }
      }
    }

    const unit = get(r, 'unit') || null;
    const hunt_code = get(r, 'hunt_code') || null;
    const yRaw = get(r, 'year');
    const ym = yRaw.match(/\b(20\d{2})\b/);
    if (yRaw && !ym) res.issues.push({ row, text: `Year "${yRaw}" isn't a year like 2028; added without a year.` });
    const target_year = ym ? Number(ym[1]) : null;
    const kindRaw = get(r, 'kind');
    if (unit || hunt_code || target_year || kindRaw) {
      res.items.push({ kind: kindOf(kindRaw, target_year != null), state, species, unit, hunt_code, target_year, notes: get(r, 'notes') || null });
    }
  });
  return res;
}
