// Builds lib/huntdata/herd/ut.json from the Utah Division of Wildlife
// Resources' Big Game Annual Report.
//
// Source: wildlife.utah.gov/hunting/reports → the newest big game annual
// report PDF. Utah publishes two measures by unit, and each species gets the
// one DWR reports for every unit:
//   deer       postseason bucks per 100 does (general public, general private,
//              limited-entry and premium tables), 3-year average
//   elk        average age of harvested bulls on limited-entry units, 3-year average
//   pronghorn  average age of harvested bucks on limited-entry units, 3-year average
// Units are matched to hunts by DWR's unit name ("Beaver, East"), the same
// name the draw results use. A cell DWR marks "*" or "--" (insufficient data)
// is left out.
//
// Run: node scripts/draw/buildUTHerd.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'herd', 'ut.json');
const CACHE = path.join(os.tmpdir(), 'herd', 'ut');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

const REPORTS = 'https://wildlife.utah.gov/hunting/reports';
const PDF = 'https://wildlife.utah.gov/pdf/annual-reports/big-game/24_bg_report.pdf';
const YEAR = 2024;

const file = path.join(CACHE, '24_bg_report.pdf');
if (!existsSync(file) || statSync(file).size === 0) {
  const r = await fetch(PDF, { headers: UA });
  if (!r.ok || !/pdf/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${PDF} → ${r.status}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
const txt = file.replace(/\.pdf$/, '.raw.txt');
if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, txt], { stdio: 'ignore' });
const lines = readFileSync(txt, 'utf8').split(/\r?\n/).map((l) => l.replace(/[–—�]/g, '-').trim());

// Which table we're in, from its title. Any other title ends the table.
const TABLES = [
  { re: /^Number of postseason buck deer per 100 does for/, sp: 'DEER', measure: 'ratio', years: 3 },
  { re: /^Average age of harvested bull elk on limited-entry units/, sp: 'ELK', measure: 'age', years: 10 },
  { re: /^Average age of harvested buck pronghorn on limited-entry units/, sp: 'ANTELOPE', measure: 'age', years: 3 },
];
const TITLE = /^(Number of|Average age of|.* by management unit, Utah)/;

const species = {};
const report = [];
let table = null;
for (const l of lines) {
  if (TITLE.test(l)) { table = TABLES.find((t) => t.re.test(l)) ?? null; continue; }
  if (!table) continue;
  // "22B Beaver, East 6.5-7.0 6.9 7.7 … 9.1": unit code, name, objective, a
  // value per year, then the 3-year average.
  // An empty cell prints as a dash (an em dash, made "-" above) or "*".
  const cells = `(?: (?:[\\d.]+|\\*|-+)){${table.years}}`;
  const m = l.match(new RegExp(`^(\\S+) (.+?) ([\\d.]+-[\\d.]+)(${cells}) ([\\d.]+|\\*|-+)$`));
  if (!m) continue;
  const [, code, raw, objective, , avg] = m;
  // "San Juan Bull Elk" is the San Juan unit in the draw results.
  const name = raw.replace(/ Bull Elk$/, '');
  if (!/^[\d.]+$/.test(avg)) continue;
  const sp = (species[table.sp] ??= { year: YEAR, measure: table.measure, units: {} });
  const value = +avg;
  sp.units[name] = table.measure === 'ratio'
    ? { malesPer100: value, objective, herd: `DWR unit ${code}` }
    : { avgAge: value, objective, herd: `DWR unit ${code}` };
}
const WHEN = `${YEAR - 2}-${YEAR} average`;
for (const [sp, s] of Object.entries(species)) {
  s.when = s.measure === 'ratio' ? `after the season (${WHEN})` : `(${WHEN})`;
  report.push(`${sp}: ${Object.keys(s.units).length} units (${s.measure})`);
}

const out = {
  state: 'UT', year: YEAR,
  source: { name: `Utah Division of Wildlife Resources — ${YEAR} Big Game Annual Report`, url: REPORTS },
  notes: `DWR ${YEAR} Big Game Annual Report (${PDF}), 3-year averages ${YEAR - 2}-${YEAR}. DEER: postseason bucks per 100 does by unit (malesPer100). ELK and ANTELOPE: average age in years of harvested bulls / bucks on limited-entry units (avgAge). objective = DWR's goal for that unit. Keyed by DWR's unit name.`,
  species,
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}`);
for (const r of report) console.log(`  ${r}`);
