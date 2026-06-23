// Parse the 5 WGFD 2025 elk demand reports and PREPEND a 2025 drawHistory entry
// to each matching product in wyoelkdata.ts (keeping the existing 2024 entry,
// so trends compute). Updates existing keys only — does not expand the roster.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const PD = join(tmpdir(), 'pdftools');
const DATA = join(import.meta.dirname, '..', 'app', 'api', 'strategy', 'wyoelkdata.ts');
const txt = (n) => readFileSync(join(PD, n + '.txt'), 'utf8').split('\n');

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
           : fz ? `${fz.applicants} applicants shut out below ${fz.ptInt} pts` : null,
    };
  }
  return out;
}
const pct = (q, f) => q <= 0 ? '0%' : (f <= 0 || q >= f) ? '~100%' : (q / f * 100).toFixed(2) + '%';

const resident = parseSimple(txt('elk_resident'));
const nrRandom = parseSimple(txt('elk_nr_random'));
const nrSpecialRandom = parseSimple(txt('elk_nr_special_random'));
const nrRegular = parsePref(txt('elk_nr_regular'));
const nrSpecial = parsePref(txt('elk_nr_special'));

const sq = (s) => `'${s}'`;
const numOrNull = (v) => (v === null || v === undefined ? 'null' : v);
function entry2025(k) {
  const r = resident[k], rand = nrRandom[k], srand = nrSpecialRandom[k], reg = nrRegular[k], spec = nrSpecial[k];
  const ranStr = (p) => p
    ? `{ quota: ${p.quota}, firstChoiceApplicants: ${p.firstChoiceApplicants}, approxOdds: ${sq(pct(p.quota, p.firstChoiceApplicants))} }`
    : `{ quota: 0, firstChoiceApplicants: 0, approxOdds: '0%' }`;
  const regStr = reg
    ? `{ quota: ${reg.quota}, minPoints: ${numOrNull(reg.minPoints)}, oddsAtMin: ${reg.oddsAtMin === null ? 'null' : sq(reg.oddsAtMin)}${reg.notes ? `, notes: ${sq(reg.notes)}` : ''} }`
    : `{ quota: 0, minPoints: null, oddsAtMin: null }`;
  // nr_special has NO notes field in ElkDrawHistory.
  const specStr = spec
    ? `{ quota: ${spec.quota}, minPoints: ${numOrNull(spec.minPoints)}, oddsAtMin: ${spec.oddsAtMin === null ? 'null' : sq(spec.oddsAtMin)} }`
    : `{ quota: 0, minPoints: null, oddsAtMin: null }`;
  return `      {
        year: 2025,
        resident: ${ranStr(r)},
        nr_regular: ${regStr},
        nr_special: ${specStr},
        nr_random: ${ranStr(rand)},
        nr_special_random: ${ranStr(srand)},
      },
`;
}

let src = readFileSync(DATA, 'utf8');
// Existing keys in the dataset.
const keys = [...src.matchAll(/^  '([^']+)':\s*\{/gm)].map(m => m[1]);
let updated = 0, noData = 0, already = 0;
for (const k of keys) {
  const hasData = resident[k] || nrRandom[k] || nrSpecialRandom[k] || nrRegular[k] || nrSpecial[k];
  if (!hasData) { noData++; continue; }
  const start = src.indexOf(`  '${k}':`);
  const dhIdx = src.indexOf('drawHistory: [', start);
  const nextEntry = src.indexOf("\n  '", start + 5);
  if (dhIdx === -1 || (nextEntry !== -1 && dhIdx > nextEntry)) { noData++; continue; }
  // Insert just after the newline that follows the '[' (handles LF or CRLF).
  const afterIdx = src.indexOf('\n', dhIdx) + 1;
  const blockEnd = nextEntry === -1 ? src.length : nextEntry;
  if (src.slice(afterIdx, blockEnd).includes('year: 2025')) { already++; continue; }
  src = src.slice(0, afterIdx) + entry2025(k) + src.slice(afterIdx);
  updated++;
}
writeFileSync(DATA, src);
console.log(`Prepended 2025 to ${updated} elk products. (no 2025 report row: ${noData}, already had 2025: ${already})`);
