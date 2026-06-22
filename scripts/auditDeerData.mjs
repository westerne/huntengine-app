// Throwaway audit script for WYOMING_DEER_UNITS.
// Parses the raw TS data file by entry block and reports data gaps + mismatches.
// Run: node scripts/auditDeerData.mjs
import { readFileSync } from 'node:fs';

const DATA = 'app/api/strategy/wyodeerdata.ts';
const WILD = 'app/api/strategy/wyodeerWildernessClassification.ts';

const src = readFileSync(DATA, 'utf8');
const lines = src.split('\n');

// ── Split into top-level entry blocks (keys at 2-space indent) ────────────────
const entries = [];
let cur = null;
for (const line of lines) {
  const m = line.match(/^  "([^"]+)":\s*\{/);
  if (m) {
    if (cur) entries.push(cur);
    cur = { key: m[1], text: line };
  } else if (cur) {
    // stop capturing once we hit the closing of the whole object
    if (/^\};/.test(line)) { entries.push(cur); cur = null; continue; }
    cur.text += '\n' + line;
  }
}
if (cur) entries.push(cur);

const field = (t, name) => {
  const m = t.match(new RegExp(name + ":\\s*('([^']*)'|\"([^\"]*)\"|([0-9]+))"));
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
};
const has = (t, name) => new RegExp(name + ':').test(t);
const drawYears = (t) => (t.match(/year:/g) || []).length;

const rows = entries.map(e => ({
  key: e.key,
  productType: field(e.text, 'productType'),
  completeness: field(e.text, 'dataCompleteness'),
  typical: field(e.text, 'typical'),
  topEnd: field(e.text, 'topEnd'),
  publicPct: field(e.text, 'publicPct'),
  wildernessPct: field(e.text, 'wildernessPct'),
  buckDoe: field(e.text, 'buckPerHundredDoe'),
  hasDevNotes: has(e.text, 'devNotes'),
  drawYears: drawYears(e.text),
}));

// ── Gap analysis ──────────────────────────────────────────────────────────────
const byType = {};
for (const r of rows) byType[r.productType] = (byType[r.productType] || 0) + 1;

const lqNoDraw = rows.filter(r => r.productType?.startsWith('LIMITED_QUOTA') && r.drawYears === 0);
const lqOneYear = rows.filter(r => r.productType?.startsWith('LIMITED_QUOTA') && r.drawYears === 1);
const regionNoDraw = rows.filter(r => r.productType === 'GENERAL_REGION' && r.drawYears === 0);
const missingHabitat = rows.filter(r => !r.publicPct || !r.buckDoe);

// Cloned trophy estimates: group UNIT_IN_REGION by (typical|topEnd|buckDoe)
const clones = {};
for (const r of rows.filter(r => r.productType === 'UNIT_IN_REGION')) {
  const sig = `${r.typical} | ${r.topEnd} | bd=${r.buckDoe}`;
  (clones[sig] ||= []).push(r.key);
}
const clonedGroups = Object.entries(clones).filter(([, ks]) => ks.length > 1);

console.log(`TOTAL ENTRIES: ${rows.length}`);
console.log('BY TYPE:', byType);
console.log('\nDATA GAPS:');
console.log(`  LIMITED_QUOTA with NO draw history: ${lqNoDraw.length} -> ${lqNoDraw.map(r=>r.key).join(', ')}`);
console.log(`  LIMITED_QUOTA with only 1 year (no trend): ${lqOneYear.length} -> ${lqOneYear.map(r=>r.key).join(', ')}`);
console.log(`  GENERAL_REGION with NO draw history: ${regionNoDraw.length} -> ${regionNoDraw.map(r=>r.key).join(', ')}`);
console.log(`  Entries missing publicPct or buckPerHundredDoe: ${missingHabitat.length}`);
console.log(`\nCLONED TROPHY ESTIMATES (same typical/topEnd/buck:doe across multiple units):`);
for (const [sig, ks] of clonedGroups.sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`  [${ks.length}] ${sig}\n        ${ks.join(', ')}`);
}

// ── Mismatch check vs wilderness classification ───────────────────────────────
const wsrc = readFileSync(WILD, 'utf8');
const classKeys = [...wsrc.matchAll(/^\s*"([^"]+)":\s*\{\s*status:/gm)].map(m => m[1]);
const dataKeys = new Set(rows.map(r => r.key));
const phantom = classKeys.filter(k => !dataKeys.has(k));
const lqKeys = rows.filter(r => r.productType === 'LIMITED_QUOTA').map(r => r.key);
const unclassifiedLQ = lqKeys.filter(k => !classKeys.includes(k));

console.log(`\nWILDERNESS CLASSIFICATION MISMATCHES:`);
console.log(`  Classified keys: ${classKeys.length}`);
console.log(`  PHANTOM (in classification, NOT in data): ${phantom.length} -> ${phantom.join(', ')}`);
console.log(`  LIMITED_QUOTA units with NO classification (default NONE): ${unclassifiedLQ.length} -> ${unclassifiedLQ.join(', ')}`);
