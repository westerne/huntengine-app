// Generate wyoantelopedata.ts from the 5 WGFD 2025 antelope demand reports.
// Reuses the deer parsing methodology (validated against deer 141-1).
//
// What is REAL: the area roster + 2025 draw history (all 5 pools).
// What is PLACEHOLDER (flagged NEEDS_TROPHY_DATA, devNotes): trophy typical/
//   topEnd, coords, seasons — these are not in the demand reports and are not
//   fabricated per-area. Areas 57/60/73 carry their existing real estimates.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = import.meta.dirname;
const txt = (n) => readFileSync(join('/tmp/pdftools', n + '.txt'), 'utf8').split('\n');
// Fallback: if /tmp path differs, try the MSYS temp beside the dumps.
function load(n) {
  try { return readFileSync(join('/tmp/pdftools', n + '.txt'), 'utf8').split('\n'); }
  catch { return readFileSync(join(process.env.TEMP || '/tmp', 'pdftools', n + '.txt'), 'utf8').split('\n'); }
}

const norm = (area, type) => `${parseInt(area, 10)}-${type}`;

function parseSimple(lines) {
  const out = {};
  for (const l of lines) {
    const m = l.match(/^(\d{3})\s+(\d)\s+.+?\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (!m) continue;
    out[norm(m[1], m[2])] = { quota: +m[3], firstChoiceApplicants: +m[4] };
  }
  return out;
}
// The final "shut out" tier omits the "issued" column, so make it optional.
// Groups: 1=quota/remaining, 2=issued(optional), 3=ptLabel, 4=applicants, 5=odds.
const tierRe = /(\d+)\s+(?:(\d+)\s+)?(<=?\s*\d+|\d+)\s+(\d+)\s+(\d+\.\d+)%\s*$/;
const startRe = /^(\d{3})\s+(\d)\s+/;
const ptInt = (l) => parseInt(l.replace(/[^0-9]/g, ''), 10);
function parsePref(lines) {
  const blocks = {}; let cur = null;
  for (const l of lines) {
    const s = l.match(startRe);
    if (s) cur = norm(s[1], s[2]);
    if (!cur) continue;
    const t = l.match(tierRe);
    if (!t) continue;
    (blocks[cur] ||= { quota: null, tiers: [] });
    if (blocks[cur].quota === null && s) blocks[cur].quota = +t[1];
    blocks[cur].tiers.push({ ptInt: ptInt(t[3]), applicants: +t[4], odds: parseFloat(t[5]) });
  }
  const out = {};
  for (const [k, b] of Object.entries(blocks)) {
    const pos = b.tiers.filter(t => t.odds > 0);
    const marg = pos[pos.length - 1] ?? null;
    const fz = b.tiers.find(t => t.odds === 0) ?? null;
    out[k] = {
      quota: b.quota, minPoints: marg ? marg.ptInt : null,
      oddsAtMin: marg ? marg.odds.toFixed(2) + '%' : null,
      notes: b.quota === 0 ? 'No NR pool tags allocated in 2025'
           : marg === null ? 'All NR applicants shut out in 2025'
           : fz ? `${fz.applicants} applicants shut out below ${fz.ptInt} pts` : undefined,
    };
  }
  return out;
}
const pct = (q, f) => q <= 0 ? '0%' : (f <= 0 || q >= f) ? '~100%' : (q / f * 100).toFixed(2) + '%';

const resident = parseSimple(load('an_resident'));
const nrRandom = parseSimple(load('an_nr_random'));
const nrSpecialRandom = parseSimple(load('an_nr_special_random'));
const nrRegular = parsePref(load('an_nr_regular'));
const nrSpecial = parsePref(load('an_nr_special'));

// Hunt-type description (also captures the weapon for Type 0) from any report row.
function huntDesc(area, type) {
  for (const lines of [load('an_resident'), load('an_nr_regular')]) {
    const a = String(area).padStart(3, '0');
    const row = lines.find(l => new RegExp(`^${a}\\s+${type}\\s`).test(l));
    if (row) { const m = row.match(/^\d{3}\s+\d\s+([A-Z, ]+?)\s{2,}/); if (m) return m[1].trim(); }
  }
  return 'ANY ANTELOPE';
}
const huntTypeLabel = (type, desc) => {
  const d = desc.toUpperCase();
  const weapon = d.includes('MUZZLE') ? ' (Muzzleloader)' : d.includes('HANDGU') ? ' (Handgun)'
    : d.includes('ARCHER') || type === '9' ? ' (Archery)' : '';
  return `Type ${type} — Any Antelope${weapon}`;
};

// Real data for the 3 pre-existing units (carried over).
const KNOWN = {
  '57-1': { typical: '74-78"', topEnd: '84"+', trait: 'Red Desert giants; long prongs.', description: 'Southwest of Rawlins (South Wamsutter). Classic Red Desert sagebrush flats.', coords: { lat: 41.6521, lng: -108.2145 } },
  '60-1': { typical: '72-76"', topEnd: '82"', trait: 'High density; consistent horn length.', description: 'Table Mountain area North of Rock Springs. Rolling sage hills.', coords: { lat: 41.9214, lng: -109.0521 } },
  '73-1': { typical: '72-77"', topEnd: '81"', trait: 'Massive public access (BLM).', description: 'North of Casper. Expansive sagebrush flats and rolling prairie.', coords: { lat: 43.1524, lng: -106.3521 } },
};
const WY_CENTROID = { lat: 42.99, lng: -107.55 };

// Per-area centroid + real WGFD name from the AntelopeHuntAreas KML.
let GEO = {};
try { GEO = JSON.parse(readFileSync(join(DIR, 'antelopeGeo.json'), 'utf8')); } catch {}

// Collect every (area-type) key across all pools, antlered weapon types only.
const ANTLERED = new Set(['0', '1', '2', '9']);
const keys = new Set();
for (const pool of [resident, nrRandom, nrSpecialRandom, nrRegular, nrSpecial])
  for (const k of Object.keys(pool)) { const type = k.split('-')[1]; if (ANTLERED.has(type)) keys.add(k); }

function drawHistory(k) {
  const r = resident[k], rand = nrRandom[k], srand = nrSpecialRandom[k], reg = nrRegular[k], spec = nrSpecial[k];
  const pref = (p) => p ? { quota: p.quota, minPoints: p.minPoints, oddsAtMin: p.oddsAtMin, notes: p.notes }
                       : { quota: 0, minPoints: null, oddsAtMin: null };
  const ran = (p) => p ? { quota: p.quota, firstChoiceApplicants: p.firstChoiceApplicants, approxOdds: pct(p.quota, p.firstChoiceApplicants) }
                       : { quota: 0, firstChoiceApplicants: 0, approxOdds: '0%' };
  return { year: 2025, nr_regular: pref(reg), nr_special: pref(spec), nr_random: ran(rand), nr_special_random: ran(srand), resident: ran(r) };
}

const sorted = [...keys].sort((a, b) => {
  const [aa, at] = a.split('-').map(Number), [ba, bt] = b.split('-').map(Number);
  return aa - ba || at - bt;
});

const q = (s) => JSON.stringify(s);
const prefStr = (p) => `{ quota: ${p.quota}, minPoints: ${p.minPoints === null ? 'null' : p.minPoints}, oddsAtMin: ${p.oddsAtMin === null ? 'null' : q(p.oddsAtMin)}${p.notes ? `, notes: ${q(p.notes)}` : ''} }`;
const ranStr = (p) => `{ quota: ${p.quota}, firstChoiceApplicants: ${p.firstChoiceApplicants}, approxOdds: ${q(p.approxOdds)} }`;

let body = '';
for (const k of sorted) {
  const [area, type] = k.split('-');
  const known = KNOWN[k];
  const desc = huntDesc(area, type);
  const dh = drawHistory(k);
  const geo = GEO[String(parseInt(area, 10))];
  const geoName = geo?.name || '';
  const typical = known ? known.typical : '70-75"';
  const topEnd = known ? known.topEnd : '80"';
  // Coords: prefer the authoritative KML centroid; fall back to known/centroid.
  const coords = geo ? { lat: geo.lat, lng: geo.lng } : (known ? known.coords : WY_CENTROID);
  const trait = known ? known.trait
    : geoName ? `${geoName}; sagebrush/desert antelope range.`
    : 'Sagebrush/desert antelope range.';
  const description = known ? known.description
    : geoName ? `${geoName} — Wyoming antelope Area ${area}. Sage/desert country; terrain detail not yet sourced.`
    : `Wyoming antelope Area ${area}. Per-area description not yet sourced.`;
  const completeness = known ? 'NEEDS_FIELD_DATA' : 'NEEDS_TROPHY_DATA';
  const devNotes = known ? 'Trophy from V1 field estimate; coords from WGFD KML; habitat metrics pending.'
    : `Roster + draw data from 2025 WGFD demand reports; name + coords from WGFD AntelopeHuntAreas KML. Trophy/seasons placeholders — not yet sourced.`;
  body += `  ${q(k)}: {
    productType: "LIMITED_QUOTA", areaNumbers: [${parseInt(area, 10)}], dataCompleteness: ${q(completeness)},
    typical: ${q(typical)}, topEnd: ${q(topEnd)},
    trait: ${q(trait)},
    description: ${q(description)},
    coords: { lat: ${coords.lat}, lng: ${coords.lng} }, huntType: ${q(huntTypeLabel(type, desc))},
    devNotes: ${q(devNotes)},
    seasons: {},
    drawHistory: [
      { year: ${dh.year},
        nr_regular:        ${prefStr(dh.nr_regular)},
        nr_special:        ${prefStr(dh.nr_special)},
        nr_random:         ${ranStr(dh.nr_random)},
        nr_special_random: ${ranStr(dh.nr_special_random)},
        resident:          ${ranStr(dh.resident)} },
    ],
  },
`;
}

const out = `// ─────────────────────────────────────────────────────────────────────────────
// WYOMING ANTELOPE DATA — V2 (parallels wyodeerdata.ts)
//
// Each record = one antlered antelope hunt product (area + weapon type).
// Key format: "<area>-<type>"  (type 1 rifle, 2 alt rifle, 9 archery, 0 muzzle/handgun).
//
// Data provenance:
//   - Roster + draw history: WGFD 2025 Antelope Demand Reports (all 5 pools).
//     Parsing methodology validated against deer 141-1 (see scripts/).
//   - typical/topEnd/coords for areas 57/60/73: carried from V1 field estimates.
//   - All other typical/topEnd/coords/seasons: PLACEHOLDERS, not yet sourced
//     (dataCompleteness: NEEDS_TROPHY_DATA). Do not present as field truth.
// ─────────────────────────────────────────────────────────────────────────────

import { WyomingDeerUnit } from "./wyodeerdata";

export const WYOMING_ANTELOPE_UNITS: Record<string, WyomingDeerUnit> = {
${body}};
`;

writeFileSync(join(DIR, '..', 'app', 'api', 'strategy', 'wyoantelopedata.ts'), out);
console.log(`Generated wyoantelopedata.ts with ${sorted.length} antelope products.`);
const byType = {};
for (const k of sorted) { const t = k.split('-')[1]; byType[t] = (byType[t] || 0) + 1; }
console.log('By type:', byType);
