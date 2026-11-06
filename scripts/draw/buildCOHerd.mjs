// Builds lib/huntdata/herd/co.json from Colorado Parks and Wildlife's yearly
// "Population and Sex Ratio Estimates" for elk, deer and pronghorn.
//
// Source: each species' statistics page links the PDF (cpw.widen.net). One row
// per herd (DAU, a group of game management units): the units, the herd's
// estimated size, and males per 100 females (bulls per 100 cows, bucks per
// 100 does). That ratio is the closest public measure of how many older males
// a herd carries. It is not antler size, and the app says so.
//
// A unit CPW lists under two herds (elk 64 and 65 in 2025) is left out rather
// than guessed.
//
// Run: node scripts/draw/buildCOHerd.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'herd', 'co.json');
const CACHE = path.join(os.tmpdir(), 'codraw', 'ratio');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });
mkdirSync(path.dirname(OUT), { recursive: true });

const STATS = {
  ELK: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-elk/elk-statistics',
  DEER: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-deer/deer-statistics',
  ANTELOPE: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-pronghorn/pronghorn-statistics',
};

async function text(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// Stats page → newest "<year>-<species>-population-and-sex-ratio-estimates" PDF, as text.
async function estimatesFor(statsUrl) {
  const page = await text(statsUrl);
  const shares = [...new Set(page.match(/https:\/\/cpw\.widen\.net\/s\/[a-z0-9]+\/\d{4}-[a-z]+-population-and-sex-ratio-estimates/gi) || [])];
  const newest = shares.map((s) => ({ s, year: +s.match(/\/(\d{4})-/)[1] })).sort((a, b) => b.year - a.year)[0];
  if (!newest) throw new Error(`no sex-ratio estimates on ${statsUrl}`);
  const name = newest.s.split('/').pop();
  const file = path.join(CACHE, `${name}.pdf`);
  if (!existsSync(file) || statSync(file).size === 0) {
    const cid = ((await text(newest.s)).match(/\/content\/([a-z0-9]+)\/png\//i) || [])[1];
    if (!cid) throw new Error(`no asset id for ${newest.s}`);
    const r = await fetch(`https://cpw.widen.net/content/${cid}/original/${name}.pdf`, { headers: UA });
    if (!r.ok || !/pdf/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${name} → ${r.status}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const txt = file.replace(/\.pdf$/, '.raw.txt');
  if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, txt], { stdio: 'ignore' });
  return { share: newest.s, year: newest.year, lines: readFileSync(txt, 'utf8').split(/\r?\n/).map((l) => l.trim()) };
}

// "06 11, 12, 13, 23 42,470 19": DAU, units, estimate, males per 100 females.
const ROW = /^(\d{2}) ((?:\d+, ?)*\d+) ([\d,]+) (\d+)$/;

const out = { state: 'CO', year: null, source: null, notes: null, species: {} };
const report = [];
const sources = [];
for (const [sp, statsUrl] of Object.entries(STATS)) {
  const est = await estimatesFor(statsUrl);
  out.year = Math.max(out.year ?? 0, est.year);
  sources.push(est.share);
  const herds = [];
  for (const l of est.lines) {
    const m = l.match(ROW);
    if (m) herds.push({ dau: m[1], units: m[2].split(/, ?/).map((u) => String(+u)), population: +m[3].replace(/,/g, ''), malesPer100: +m[4] });
    else if (/^\d{2} /.test(l) && !/not in a DAU/.test(l)) report.push(`${sp}: skipped "${l}"`);
  }
  const seen = new Map();
  for (const h of herds) for (const u of h.units) seen.set(u, (seen.get(u) ?? 0) + 1);
  const twice = [...seen].filter(([, n]) => n > 1).map(([u]) => u);
  const units = {};
  for (const h of herds) for (const u of h.units) if (!twice.includes(u)) units[u] = { dau: h.dau, population: h.population, malesPer100: h.malesPer100 };
  out.species[sp] = { year: est.year, units };
  report.push(`${sp} ${est.year}: ${herds.length} herds, ${Object.keys(units).length} units${twice.length ? `; left out (in two herds): ${twice.join(', ')}` : ''}`);
}

out.source = { name: `Colorado Parks and Wildlife — ${out.year} Population and Sex Ratio Estimates`, url: STATS.ELK };
out.notes = `CPW's post-hunt herd estimates by DAU (a herd: one or more game management units), from ${sources.join(' ; ')}. Per unit: dau, population (CPW's estimate for the whole herd, not the unit) and malesPer100 (bulls per 100 cows for elk, bucks per 100 does for deer and pronghorn). Pronghorn figures are CPW's pre-hunt estimates. Units CPW lists under two herds are left out.`;

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}`);
for (const r of report) console.log(`  ${r}`);
