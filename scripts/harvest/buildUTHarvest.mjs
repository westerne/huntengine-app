// Ingests Utah big-game HARVEST statistics from Utah DWR's published harvest
// reports into lib/huntdata/harvest/ut.json (shape: lib/huntdata/harvest/format.ts).
//
// Source page: https://wildlife.utah.gov/biggame/reports  ("Big game harvest reports")
//   - <year>_le_oial_all.pdf      Limited-entry / OIAL / premium / CWMU hunts, all species
//   - <year>_gs_buck_deer_hr.pdf  General-season buck deer
// The newest year that has a FINAL limited-entry/OIAL report is used, and the
// general-season deer report of that same year (preliminary reports are skipped)
// so the whole file describes a single season.
//
// Per hunt (DWR hunt number) we take: hunters afield, harvest, percent success
// (DWR's own figure). DWR publishes "average days" hunted per hunter, NOT days
// per harvest, so daysPerHarvest is left null. CWMU (private-land) hunts are
// skipped. Rows whose success is "--" (no data) are skipped.
//
// Requires pdftotext (poppler/xpdf) on PATH. Run: node scripts/harvest/buildUTHarvest.mjs
import { writeFileSync, readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const BASE = 'https://wildlife.utah.gov';
const REPORTS_PAGE = `${BASE}/biggame/reports`;
const CACHE = path.join(os.tmpdir(), 'huntengine-ut-harvest');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../lib/huntdata/harvest/ut.json');

// DWR hunt-number prefix → app species key
const PREFIX_SPECIES = {
  DB: 'DEER',          // buck deer
  EB: 'ELK',           // bull elk
  PB: 'ANTELOPE',      // buck pronghorn
  MB: 'MOOSE',         // bull moose
  RS: 'BIGHORNSHEEP',  // Rocky Mountain bighorn
  DS: 'BIGHORNSHEEP',  // desert bighorn
};

// DWR hunt name → app unit key (app's hand-entered Utah data). Keyed by
// species, then the DWR "Hunt name" exactly as printed in the report.
// Unmapped DWR names are emitted under their own DWR name.
const UNIT_MAP = {
  DEER: {
    'Henry Mtns': 'Henry Mountains',
    'Paunsaugunt': 'Paunsaugunt',
    'Book Cliffs': 'Book Cliffs',
    'Book Cliffs, North': 'Book Cliffs',
    'Book Cliffs, South': 'Book Cliffs',
    'Book Cliffs, Floy Canyon': 'Book Cliffs',
    'Fillmore, Oak Creek LE': 'Fillmore Oak Creek',
    'San Juan, Elk Ridge': 'San Juan',
    'La Sal, Dolores Triangle': 'La Sal Dolores Triangle',
    'Diamond Mtn': 'Diamond Mountain',
    'West Desert, Vernon': 'Vernon',
    'Thousand Lakes': 'Thousand Lake',
    'Boulder/Kaiparowits': 'Boulder Kaiparowits',
    'Monroe': 'Monroe',
    'La Sal, La Sal Mtns': 'LaSal General',
  },
  ELK: {
    'San Juan Bull Elk': 'San Juan',
    'Fillmore, Pahvant': 'Fillmore Pahvant',
    'Monroe': 'Monroe Elk',
    'Boulder': 'Boulder Elk',
    'Beaver, East': 'Beaver Elk',
    'Southwest Desert, North': 'Southwest Desert Elk',
    'Southwest Desert, South': 'Southwest Desert Elk',
    'Panguitch Lake': 'Panguitch Lake Elk',
    'Manti': 'Manti Elk',
    'Mt Dutton': 'Mt Dutton Elk',
    'Wasatch Mtns': 'Wasatch Elk',
    'Book Cliffs, Bitter Creek/East': 'Book Cliffs Elk',
    'Book Cliffs, Bitter Creek/South': 'Book Cliffs Elk',
    'Book Cliffs, Little Creek Roadless': 'Book Cliffs Elk',
  },
  ANTELOPE: {
    'West Desert, Riverbed': 'West Desert',
    'West Desert, Rush Valley': 'West Desert',
    'West Desert, Snake Valley': 'West Desert',
    // 'Plateau': not confirmed to be DWR's Parker Mtn hunt — left unmapped until checked.
    'Panguitch Lake/Zion, North': 'Panguitch Antelope',
  },
  MOOSE: {
    'North Slope, Summit': 'North Slope Uintas',
    'North Slope, Three Corners/West Daggett': 'North Slope Uintas',
    'Cache': 'Cache Moose',
    // 'Uintas East Moose': no DWR hunt by that name — left unmapped on purpose.
  },
  BIGHORNSHEEP: {
    'Kaiparowits, East': 'Kaiparowits East',
    'Kaiparowits, West': 'Kaiparowits West',
    'Kaiparowits, Escalante': 'Kaiparowits Escalante',
    'San Rafael, Dirty Devil': 'San Rafael Dirty Devil',
    'San Rafael, South': 'San Rafael South',
    'Box Elder, Newfoundland Mtn': 'Box Elder Newfoundland RMBS',
    'Fillmore, Oak Creek': 'Fillmore Oak Creek RMBS',
  },
};

// Longest first so e.g. "Late Any Legal Weapon" wins over "Any Legal Weapon".
const WEAPONS = [
  ['Early Any Legal Weapon', 'any'], ['Mid Any Legal Weapon', 'any'], ['Late Any Legal Weapon', 'any'],
  ['September Archery', 'archery'], ['Late Archery', 'archery'], ['Extended Archery', 'archery'],
  ['Any Legal Weapon', 'any'], ['Archery', 'archery'], ['Muzzleloader', 'muzzleloader'],
  ['Multiseason', undefined], ['HAMSS', undefined], ['Dedicated Hunter', undefined],
];
const HUNT_TYPES = [
  'Limited Entry on General Season', 'Premium Limited Entry', 'Limited Entry Other', 'Limited Entry',
  'Management Buck', 'Cactus Buck', 'CWMU Management', 'CWMU Cactus', 'CWMU', 'OIAL', 'General Season',
];

async function cached(url) {
  mkdirSync(CACHE, { recursive: true });
  const f = path.join(CACHE, path.basename(new URL(url).pathname));
  if (existsSync(f) && statSync(f).size > 1000 && Date.now() - statSync(f).mtimeMs < 7 * 864e5) return f;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  return f;
}

function pdfText(pdf) {
  const txt = pdf.replace(/\.pdf$/i, '.txt');
  execFileSync('pdftotext', ['-table', pdf, txt]);
  return readFileSync(txt, 'utf8');
}

// Pick newest year with a final LE/OIAL report, and the same year's GS deer report.
async function resolveReports() {
  const r = await fetch(REPORTS_PAGE, { headers: UA });
  if (!r.ok) throw new Error(`${REPORTS_PAGE} → ${r.status}`);
  const hrefs = [...(await r.text()).matchAll(/href="([^"]+\.pdf)"/gi)].map((m) => m[1]);
  const le = hrefs
    .map((h) => ({ h, m: h.match(/\/pdf\/bg\/(\d{4})\/\1_le_oial_all\.pdf$/i) }))
    .filter((x) => x.m)
    .map((x) => ({ year: +x.m[1], url: new URL(x.h, BASE).href }))
    .sort((a, b) => b.year - a.year);
  if (!le.length) throw new Error('no LE/OIAL harvest report link found on ' + REPORTS_PAGE);
  const year = le[0].year;
  const gsHref = hrefs.find((h) => new RegExp(`/pdf/bg/${year}/${year}_gs_buck_deer_hr\\.pdf$`, 'i').test(h));
  const prelim = hrefs.filter((h) => /preliminary/i.test(h) && new RegExp(`/pdf/bg/${year + 1}/`).test(h));
  return { year, leUrl: le[0].url, gsUrl: gsHref ? new URL(gsHref, BASE).href : null, prelim };
}

const NUM = String.raw`(--|\d+(?:\.\d+)?)`;
const ROW = new RegExp(String.raw`^([A-Z]{2}\d{4})\s+(.+?)\s+${NUM}\s+${NUM}\s+${NUM}\s+${NUM}\s+${NUM}\s+${NUM}\s*$`);

function parse(txt) {
  const rows = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(ROW);
    if (!m) continue;
    const [, code, mid, permits, hunters, harvest, , pct] = m;
    const species = PREFIX_SPECIES[code.slice(0, 2)];
    if (!species) continue;
    let rest = mid.replace(/\s+/g, ' ').trim();
    const w = WEAPONS.find(([name]) => rest.endsWith(name));
    if (!w) { console.warn('  ? weapon:', line.trim()); continue; }
    rest = rest.slice(0, -w[0].length).trim();
    const t = HUNT_TYPES.find((ht) => rest.endsWith(ht));
    if (!t) { console.warn('  ? hunt type:', line.trim()); continue; }
    const name = rest.slice(0, -t.length).trim();
    rows.push({ code, species, name, huntType: t, weaponName: w[0], weapon: w[1], permits, hunters, harvest, pct });
  }
  return rows;
}

const num = (v) => (v === '--' ? null : Number(v));

function toHarvestRow(r) {
  const unit = UNIT_MAP[r.species]?.[r.name] ?? r.name;
  const row = { unit, huntCode: r.code };
  if (r.weapon) row.weapon = r.weapon;
  // label keeps the DWR hunt name (sub-unit) when it differs from the app key
  row.label = `${r.huntType} ${r.weaponName}${unit !== r.name ? ` (${r.name})` : ''}`;
  row.hunters = num(r.hunters);
  row.harvest = num(r.harvest);
  row.successPct = Number(r.pct);
  row.daysPerHarvest = null; // DWR publishes avg days hunted per hunter, not days per harvest
  return row;
}

const { year, leUrl, gsUrl, prelim } = await resolveReports();
console.log(`Season ${year}\n  LE/OIAL: ${leUrl}\n  GS deer: ${gsUrl ?? '(none)'}`);
if (prelim.length) console.log(`  (ignoring preliminary ${year + 1} reports: ${prelim.join(', ')})`);

const parsed = parse(pdfText(await cached(leUrl)));
if (gsUrl) parsed.push(...parse(pdfText(await cached(gsUrl))));

const species = {};
let skippedCwmu = 0, skippedNoData = 0;
const seen = new Set();
for (const r of parsed) {
  if (r.huntType.startsWith('CWMU')) { skippedCwmu++; continue; }
  if (r.pct === '--') { skippedNoData++; continue; }
  if (seen.has(r.code)) continue;
  seen.add(r.code);
  (species[r.species] ||= []).push(toHarvestRow(r));
}
for (const k of Object.keys(species)) species[k].sort((a, b) => a.unit.localeCompare(b.unit) || a.huntCode.localeCompare(b.huntCode));

const file = {
  state: 'UT',
  year,
  source: { name: `Utah DWR ${year} big game harvest reports (limited-entry/OIAL + general-season buck deer)`, url: REPORTS_PAGE },
  notes:
    `Per DWR hunt number from ${leUrl}` + (gsUrl ? ` and ${gsUrl}` : '') +
    '. successPct is DWR\'s published percent success (for general-season deer DWR computes it from raw survey responses, while hunters/harvest are projected estimates, so harvest/hunters may not equal successPct exactly). ' +
    'daysPerHarvest is null: DWR publishes average days hunted per hunter, not days per harvest. CWMU hunts and hunts with no reported data are excluded. ' +
    'Bighorn sheep includes both desert (DS) and Rocky Mountain (RS) hunts. Labels name the DWR hunt type, weapon, and DWR sub-unit when mapped to a broader app unit.',
  species,
};
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n');
console.log(`Wrote ${OUT}`);
for (const [k, v] of Object.entries(species)) console.log(`  ${k}: ${v.length} rows`);
console.log(`  skipped: ${skippedCwmu} CWMU, ${skippedNoData} no-data`);

// Self-check: which app keys got rows
const appKeys = Object.fromEntries(Object.entries(UNIT_MAP).map(([s, m]) => [s, [...new Set(Object.values(m))]]));
for (const [s, keys] of Object.entries(appKeys)) {
  const units = new Set((species[s] || []).map((r) => r.unit));
  const miss = keys.filter((k) => !units.has(k));
  console.log(`  ${s} app keys matched ${keys.length - miss.length}/${keys.length}` + (miss.length ? ` — missing: ${miss.join(', ')}` : ''));
}
