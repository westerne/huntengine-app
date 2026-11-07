// Builds lib/huntdata/herd/az.json from the Arizona Game and Fish Department's
// yearly survey summaries for elk, mule deer and pronghorn.
//
// Source: one PDF per species ("2025 Arizona Elk Survey Summary", …), linked
// from azgfd.com's survey pages and served from AZGFD's S3 bucket (azgfd.com
// itself refuses scripted requests). One row per game management unit: the
// animals classified, and males per 100 females. A row can cover several
// units ("03A/03C"); a unit with its own row keeps that one.
//
// Run: node scripts/draw/buildAZHerd.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'herd', 'az.json');
const CACHE = path.join(os.tmpdir(), 'herd', 'az');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

const YEAR = 2025;
const S3 = 'https://azgfd-live-portal-wordpress-pantheon.s3.us-west-2.amazonaws.com/wp-content/uploads';
const PDFS = {
  ELK: `${S3}/2026/01/20154439/2025-AZ-Elk-Survey-Summary.pdf`,
  DEER: `${S3}/2026/01/20154930/2025-AZ-Mule-Deer-Survey-Summary.pdf`,
  ANTELOPE: `${S3}/2026/01/20154929/2025-AZ-Pronghorn-Survey-Summary.pdf`,
};

async function lines(url) {
  const file = path.join(CACHE, path.basename(url));
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok || !/pdf/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${url} → ${r.status}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const txt = file.replace(/\.pdf$/, '.raw.txt');
  if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, txt], { stdio: 'ignore' });
  return readFileSync(txt, 'utf8').split(/\r?\n/).map((l) => l.trim());
}

// "2025 03A/03C 20 9 186 64 0 279 27 16 8 34 11": year, unit(s), male,
// yearling male, female, juvenile, unclassified, total, groups, males/100
// females, juveniles/100 females, male CI, juvenile CI.
const ROW = /^(\d{4}) ([0-9A-Z/]+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+)$/;

const out = { state: 'AZ', year: YEAR, source: { name: `Arizona Game and Fish Department — ${YEAR} survey summaries`, url: PDFS.ELK }, notes: null, species: {} };
const report = [];
for (const [sp, url] of Object.entries(PDFS)) {
  const single = {};
  const shared = {};
  for (const l of await lines(url)) {
    const m = l.match(ROW);
    if (!m || +m[1] !== YEAR) continue;
    const units = m[2].split('/').filter(Boolean).map((u) => u.replace(/^0+(?=\d)/, ''));
    const row = { malesPer100: +m[10], counted: +m[8] };
    for (const u of units) {
      if (units.length === 1) single[u] = row;
      else shared[u] ??= { ...row, herd: `surveyed together: units ${units.join(', ')}` };
    }
  }
  const units = { ...shared, ...single };
  out.species[sp] = { year: YEAR, when: `in AZGFD's ${YEAR} survey`, units };
  report.push(`${sp}: ${Object.keys(units).length} units (${Object.keys(single).length} surveyed on their own)`);
}
out.notes = `AZGFD ${YEAR} survey summaries by game management unit: ${Object.values(PDFS).join(' ; ')}. Per unit: malesPer100 (males per 100 females, from the survey's classification) and counted (animals classified). A row covering several units applies to each unless the unit has its own row.`;

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}`);
for (const r of report) console.log(`  ${r}`);
