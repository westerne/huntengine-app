// Ingests Colorado big-game HARVEST statistics (hunters, harvest, hunter
// success, recreation days) per hunt code from CPW's statewide harvest PDFs
// into lib/huntdata/harvest/co.json (shape: lib/huntdata/harvest/format.ts).
//
// Source: the "<year> Harvest Report" links on each CPW species statistics
// page (official CPW only). Those links are Widen Collective share pages
// (cpw.widencollective.com/assets/share/asset/<id>) — a JS app with no PDF link
// in the HTML. The app reads the asset from CPW's Widen "albert" API, which
// answers anonymous visitors when sent the same context headers the share page
// sends; the response carries a signed PDF URL (document_previews.uri).
//
// Deer / elk / pronghorn: survey-based ESTIMATES (Big Game Harvest Survey),
// one row per hunt code: sex columns, Total Harvest, Total Hunters, Percent
// Success, Total Rec. Days. Moose / goat / sheep: from mandatory harvest
// reports, one row per hunt code: sex columns, Total Harvest, Average Rec. Days
// (per hunter), Total Hunters, Percent Success.
//
// Requires `pdftotext` on PATH (-raw keeps each table row on one line).
// Run: node scripts/harvest/buildCOHarvest.mjs
import { writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const WIDEN = 'https://cpw.widencollective.com';
const WIDEN_HEADERS = {
  ...UA,
  'x-widen-albert-client': 'einstein',
  'x-widen-context-actor': 'widen:users:visitor:CPWZZ:anonymous',
  'x-widen-context-tracking': 'doNotTrack=false; anonymous=true',
  'x-widen-context-app-name': 'baton',
};

const STATS = 'https://cpw.state.co.us/activities/hunting/big-game';
// app speciesKey → CPW statistics page. Every "<year> Harvest Report" link of
// the newest year is used (bighorn sheep has Rocky Mountain + desert reports).
const SPECIES = {
  ELK: `${STATS}/hunting-elk/elk-statistics`,
  DEER: `${STATS}/hunting-deer/deer-statistics`,
  ANTELOPE: `${STATS}/hunting-pronghorn/pronghorn-statistics`,
  MOOSE: `${STATS}/hunting-moose/moose-statistics`,
  MTNGOAT: `${STATS}/hunting-mountain-goat/mountain-goat-statistics`,
  BIGHORNSHEEP: `${STATS}/hunting-bighorn-sheep/bighorn-sheep-statistics`,
};

async function text(url, headers = UA) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// Stats page → newest-year harvest report share links.
async function harvestLinks(statsUrl) {
  const page = await text(statsUrl);
  const links = [...page.matchAll(/href="(https:\/\/cpw\.widencollective\.com\/assets\/share\/asset\/([a-z0-9]+))"[^>]*>([^<]*)</gi)]
    .map((m) => ({ share: m[1], id: m[2], title: m[3].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() }))
    .map((l) => ({ ...l, year: +((l.title.match(/^(\d{4}) Harvest Report$/i) || [])[1] || 0) }))
    .filter((l) => l.year);
  if (!links.length) throw new Error('no "<year> Harvest Report" links on stats page');
  const year = Math.max(...links.map((l) => l.year));
  return links.filter((l) => l.year === year);
}

// Share id → { filename, pdf } via the Widen viewer API; PDF cached in tmpdir.
async function fetchReport(id) {
  const meta = JSON.parse(await text(`${WIDEN}/albert/viewer/anonymous/asset/widen:assets:asset:CPWZZ:${id}`, WIDEN_HEADERS));
  const uri = meta.document_previews?.uri;
  if (!uri) throw new Error(`asset ${id}: no PDF preview uri`);
  const pdf = path.join(os.tmpdir(), `co_harvest_${id}.pdf`);
  if (!(existsSync(pdf) && statSync(pdf).size > 10_000)) {
    const r = await fetch(uri, { headers: UA });
    if (!r.ok) throw new Error(`asset ${id}: PDF → ${r.status}`);
    writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
  }
  const txt = pdf.replace(/\.pdf$/, '.txt');
  execSync(`pdftotext -q -raw "${pdf}" "${txt}"`, { stdio: 'ignore', maxBuffer: 1 << 28 });
  return { filename: meta.filename, text: readFileSync(txt, 'utf8') };
}

const num = (s) => +s.replace(/,/g, '');
const ord = (n) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const SEX = {
  ELK: { M: 'Bull', F: 'Cow', E: 'Either-sex' },
  DEER: { M: 'Buck', F: 'Doe', E: 'Either-sex' },
  ANTELOPE: { M: 'Buck', F: 'Doe', E: 'Either-sex' },
  MOOSE: { M: 'Bull', F: 'Cow', E: 'Either-sex' },
  MTNGOAT: { M: 'Billy', F: 'Nanny', E: 'Either-sex' },
  BIGHORNSHEEP: { M: 'Ram', F: 'Ewe', E: 'Either-sex' },
};

// Hunt code: species(1) sex(1) unit(3) hunt type(1) season(1) method(1),
// e.g. EE001E1R, DM044O2R, SMS01O1R (sheep unit S-1), GEG03O2R (goat G-3).
const CODE = /^([A-Z])([EMF])([A-Z0-9]{3})([A-Z])(\d)([ARMX])(\*?)$/;

function unitOf(u) {
  if (/^\d{3}$/.test(u)) return +u === 0 ? 'statewide' : String(+u);
  return u.replace(/^([A-Z])0*(?=\d)/, '$1'); // S01 → S1, G03 → G3
}

function seasonMethod(season, method) {
  const n = +season;
  if (method === 'A') return { weapon: 'archery', label: n === 1 ? 'Archery' : `Archery (season ${n})` };
  if (method === 'M') return { weapon: 'muzzleloader', label: n === 1 ? 'Muzzleloader' : `Muzzleloader (season ${n})` };
  if (method === 'R') return { weapon: 'rifle', label: n <= 4 ? `${ord(n)} rifle` : `Rifle (season ${n})` };
  return { weapon: 'any', label: n === 1 ? 'All manners of take' : `All manners of take (season ${n})` };
}

const round1 = (x) => Math.round(x * 10) / 10;
const warnings = [];

function parseReport(species, txt) {
  const year = +((txt.match(/^(\d{4}) /) || [])[1] || 0);
  // Survey reports (deer/elk/pronghorn): 3 sex columns, harvest, hunters, %, total days.
  const SURVEY = /^(\S+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d.]+)% ([\d,]+)$/;
  // Mandatory-report reports (moose/goat/sheep): 2 sex columns, harvest, avg days, hunters, %.
  const MANDATORY = /^(\S+) ([\d,]+) ([\d,]+) ([\d,]+) ([\d.]+) ([\d,]+) ([\d.]+)%$/;
  const rows = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    const code = line.split(' ')[0];
    const cm = code.match(CODE);
    if (!cm) continue;
    let sexSum, harvest, hunters, pct, daysPerHarvest;
    let m;
    if ((m = line.match(SURVEY))) {
      sexSum = num(m[2]) + num(m[3]) + num(m[4]);
      harvest = num(m[5]);
      hunters = num(m[6]);
      pct = +m[7];
      const days = num(m[8]);
      daysPerHarvest = harvest > 0 ? round1(days / harvest) : null;
    } else if ((m = line.match(MANDATORY))) {
      sexSum = num(m[2]) + num(m[3]);
      harvest = num(m[4]);
      hunters = num(m[6]);
      pct = +m[7];
      daysPerHarvest = null; // CPW publishes average days per HUNTER here, not per harvest
    } else {
      warnings.push(`${species}: unparsed row "${line}"`);
      continue;
    }
    // Survey estimates are rounded per column, so ±1 is normal; more means a misparse.
    if (Math.abs(sexSum - harvest) > 1) warnings.push(`${species} ${code}: sex columns sum ${sexSum} ≠ total harvest ${harvest}`);
    const [, , sex, unitRaw, , season, method, few] = cm;
    const huntCode = code.replace('*', '');
    const sm = seasonMethod(season, method);
    const unit = unitOf(unitRaw);
    const label = [
      `${SEX[species][sex]} ${sm.label}`,
      unit === 'statewide' ? 'statewide (unit 000)' : null,
      few ? 'few hunters responded' : null,
    ].filter(Boolean).join(' — ');
    rows.push({ unit, huntCode, weapon: sm.weapon, label, hunters, harvest, successPct: pct, daysPerHarvest });
  }
  return { year, rows };
}

const out = {};
const sources = [];
const years = new Set();
for (const [species, statsUrl] of Object.entries(SPECIES)) {
  try {
    const links = await harvestLinks(statsUrl);
    out[species] = [];
    for (const l of links) {
      const { filename, text: txt } = await fetchReport(l.id);
      const { year, rows } = parseReport(species, txt);
      if (year) years.add(year);
      out[species].push(...rows);
      sources.push(`${species}: "${filename}" (${l.share})`);
      console.log(`${species}: ${filename} → ${rows.length} hunt codes`);
    }
    out[species].sort((a, b) => a.unit.localeCompare(b.unit, 'en', { numeric: true }) || a.huntCode.localeCompare(b.huntCode));
  } catch (e) {
    console.error(`${species} failed:`, e.message);
  }
}

const year = Math.max(...years);
if (years.size > 1) warnings.push(`mixed report years: ${[...years].join(', ')}`);

const file = {
  state: 'CO',
  year,
  source: {
    name: `Colorado Parks and Wildlife — ${year} statewide harvest reports (per hunt code), linked from the CPW species statistics pages`,
    url: SPECIES.ELK,
  },
  notes:
    `Deer, elk and pronghorn figures are CPW Big Game Harvest Survey ESTIMATES (voluntary sample survey extrapolated to licenses sold); ` +
    `moose, mountain goat and bighorn sheep come from mandatory harvest reports. One row per CPW hunt code (limited, private-land-only, OTC/unlimited and leftover hunts all included; ` +
    `CPW reports deer/elk/pronghorn only for Commission-approved hunts with enough survey responses). successPct is CPW's published Percent Success. ` +
    `daysPerHarvest = total recreation days / harvest for deer/elk/pronghorn; null for moose/goat/sheep (CPW publishes average days per hunter). ` +
    `No per-GMU all-methods totals are published (CPW's totals are per DAU), so every row is per hunt code. ` +
    `Unit "statewide" = statewide hunt codes (GMU 000, e.g. OTC). Sheep/goat units use CPW's S#/G# unit names. ` +
    `"few hunters responded" in a label = CPW's asterisk (low response; less reliable). Bighorn sheep includes Rocky Mountain and desert reports. ` +
    `Reports: ${sources.join('; ')}.`,
  species: out,
};

writeFileSync(new URL('../../lib/huntdata/harvest/co.json', import.meta.url), JSON.stringify(file, null, 1) + '\n');
for (const w of warnings) console.warn('WARN', w);
const total = Object.values(out).reduce((n, a) => n + a.length, 0);
console.log(`Wrote ${total} CO harvest rows (${year}) → lib/huntdata/harvest/co.json`);
