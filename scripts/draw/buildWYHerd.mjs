// Builds lib/huntdata/herd/wy.json from Wyoming Game and Fish's Job
// Completion Reports.
//
// Source: wgfd.wyo.gov/hunting-trapping/job-completion-reports, one PDF per
// region for the biological year (2025 = 6/1/2025 to 5/31/2026). Each herd
// starts with the same "JCR Evaluation Form": species, herd code and name, the
// hunt areas in it, then a table whose "Males per 100 Females" row reads
// 5-year average, this year, and sometimes the proposed figure. This year's is
// the one used. A hunt area listed under two herds of one species is left out.
//
// Run: node scripts/draw/buildWYHerd.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'herd', 'wy.json');
const CACHE = path.join(os.tmpdir(), 'herd', 'wy');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

const YEAR = 2025;
const INDEX = 'https://wgfd.wyo.gov/hunting-trapping/job-completion-reports';
// The 2025 regional reports on that page.
const REGIONS = { Casper: 34071, Cody: 34072, 'Green River': 34073, Jackson: 34074, Lander: 34075, Laramie: 34076, Pinedale: 34077, Sheridan: 34078 };
const SPECIES = { Elk: 'ELK', 'Mule Deer': 'DEER', Pronghorn: 'ANTELOPE' };

async function lines(region, id) {
  const file = path.join(CACHE, `${region.replace(/\s/g, '-').toLowerCase()}-${YEAR}.pdf`);
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(`https://wgfd.wyo.gov/media/${id}/download`, { headers: UA });
    if (!r.ok || !/pdf/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${region} → ${r.status} ${r.headers.get('content-type')}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const txt = file.replace(/\.pdf$/, '.raw.txt');
  if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, txt], { stdio: 'ignore' });
  return readFileSync(txt, 'utf8').split(/\r?\n/).map((l) => l.trim());
}

// "78, 81-82" → 78, 81, 82
const areas = (s) => s.split(/,\s*/).flatMap((p) => {
  const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) return Array.from({ length: +m[2] - +m[1] + 1 }, (_, i) => String(+m[1] + i));
  return /^\d+$/.test(p.trim()) ? [String(+p.trim())] : [];
});
const num = (s) => +s.replace(/,/g, '');

const herds = [];
const report = [];
for (const [region, id] of Object.entries(REGIONS)) {
  const ls = await lines(region, id);
  let cur = null;
  let n = 0;
  for (const l of ls) {
    const sp = l.match(/^SPECIES: (.+?) PERIOD:/);
    if (sp) { cur = { species: SPECIES[sp[1].trim()] ?? null, region }; continue; }
    if (!cur) continue;
    const h = l.match(/^HERD: (\S+) - (.+)$/);
    if (h) { cur.code = h[1]; cur.name = h[2].trim(); continue; }
    const a = l.match(/^HUNT AREAS: (.+?)(?: PREPARED BY:.*)?$/);
    if (a) { cur.areas = areas(a[1]); continue; }
    const p = l.match(/^Population: ([\d,]+) ([\d,]+)/);
    if (p) { cur.population = num(p[2]); continue; }
    // "0" is a year with no count, not a herd with no males: left out. The
    // herd code's prefix (EL, MD, PR) has to agree with the species.
    // Without a count this year, the 5-year average stands in, said as such.
    const r = l.match(/^Males per 100 Females:? (\d+)(?: (\d+))?/);
    const prefix = { ELK: 'EL', DEER: 'MD', ANTELOPE: 'PR' }[cur.species];
    const now = r?.[2] ? +r[2] : 0;
    const avg = r ? +r[1] : 0;
    if (r && (now || avg) && prefix && cur.code?.startsWith(prefix) && cur.areas?.length) {
      herds.push({ ...cur, malesPer100: now || avg, ...(now ? {} : { when: `in WGFD's ${YEAR - 5}-${YEAR - 1} average (no ${YEAR} count)` }) });
      n++;
      cur = null;
    }
  }
  report.push(`${region}: ${n} herds with a ratio`);
}

const species = {};
for (const sp of Object.values(SPECIES)) {
  const mine = herds.filter((h) => h.species === sp);
  const seen = new Map();
  for (const h of mine) for (const a of h.areas) seen.set(a, (seen.get(a) ?? 0) + 1);
  const twice = [...seen].filter(([, k]) => k > 1).map(([a]) => a);
  const units = {};
  for (const h of mine) {
    for (const a of h.areas) {
      if (twice.includes(a)) continue;
      units[a] = { malesPer100: h.malesPer100, ...(h.when ? { when: h.when } : {}), herd: `${h.name.replace(/\b(\w)(\w*)/g, (_, f, r) => f + r.toLowerCase())} herd (${h.code})`, ...(h.population ? { population: h.population } : {}) };
    }
  }
  species[sp] = { year: YEAR, when: `in WGFD's ${YEAR} herd count`, units };
  report.push(`${sp}: ${mine.length} herds, ${Object.keys(units).length} hunt areas${twice.length ? `; left out (in two herds): ${twice.join(', ')}` : ''}`);
}

const out = {
  state: 'WY', year: YEAR,
  source: { name: `Wyoming Game and Fish — ${YEAR} Job Completion Reports`, url: INDEX },
  notes: `WGFD ${YEAR} Job Completion Reports (period 6/1/${YEAR}-5/31/${YEAR + 1}), one per region: ${Object.values(REGIONS).map((id) => `https://wgfd.wyo.gov/media/${id}/download`).join(' ; ')}. Per hunt area: malesPer100 = the herd's ${YEAR} males per 100 females from the JCR evaluation form; population = the herd's ${YEAR} estimate; herd = herd name and code. Hunt areas in two herds of one species are left out.`,
  species,
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}`);
for (const r of report) console.log(`  ${r}`);
