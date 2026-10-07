// Build lib/huntdata/harvest/nd.json from North Dakota Game and Fish Department
// (NDGF) harvest releases on gf.nd.gov. NDGF does not post a unit-by-unit
// harvest table for deer or pronghorn; what it publishes is:
//   ELK / MOOSE / BIGHORN SHEEP — "2025 Big 3 Harvest Statistics" news release
//     (per-unit hunters, bulls, cows/calves, success rate; sheep statewide)
//     https://gf.nd.gov/news/9092
//   DEER — "2025 Deer Season Summarized" news release (post-season survey;
//     statewide gun success overall and by license type, gratis, muzzleloader,
//     archery)  https://gf.nd.gov/news/9150
//   PRONGHORN — "2026 Hunting Season Outlook" (North Dakota OUTDOORS, Aug–Sept
//     2026), which states last season's statewide pronghorn harvest
//     https://gf.nd.gov/magazine/2026/aug-sept/2026-hunting-season-outlook
// Figures are pulled from the release text with exact regexes; the script
// throws if any sentence/table is not found (wording changed → re-check by hand).
//
//   node scripts/harvest/buildNDHarvest.mjs [--refresh]
//
// Downloads are cached in os.tmpdir()/huntengine-nd. Node 18+, no npm deps.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'lib', 'huntdata', 'harvest', 'nd.json');
const DRAW = join(ROOT, 'lib', 'huntdata', 'draw', 'nd.json');
const CACHE = join(tmpdir(), 'huntengine-nd');
const REFRESH = process.argv.includes('--refresh');

const SRC = {
  big3: 'https://gf.nd.gov/news/9092',
  deer: 'https://gf.nd.gov/news/9150',
  pronghorn: 'https://gf.nd.gov/magazine/2026/aug-sept/2026-hunting-season-outlook',
};

async function get(url) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_') + '.html');
  if (!REFRESH && existsSync(file)) return readFileSync(file, 'utf8');
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (huntengine data build)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  writeFileSync(file, html);
  return html;
}

// Main-content text, tags stripped, whitespace collapsed.
function text(html) {
  const main = (/<main[\s\S]*?<\/main>/i.exec(html) || [html])[0];
  return main.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
}
const n = (s) => Number(String(s).replace(/,/g, ''));
function must(re, s, what) {
  const m = re.exec(s);
  if (!m) throw new Error(`not found in source: ${what} (${re})`);
  return m;
}
const yearFrom = (s, what) => n(must(/\b(20\d\d)\b/, s, what)[1]);

// ---------- elk / moose / sheep ----------
function big3(t) {
  const title = must(/(20\d\d) Big 3 Harvest Statistics/i, t, 'Big 3 title');
  const year = n(title[1]);
  // "Unit Hunters Bulls Cow/Calf Success Rate M5 7 2 1 42.86 M6 ..." — one block per species.
  const block = (prefix, next) => {
    const start = t.search(new RegExp(`Success Rate\\s+${prefix}\\d`));
    if (start < 0) throw new Error(`${prefix} table not found`);
    const end = next ? t.indexOf(next, start) : t.length;
    return t.slice(start, end < 0 ? t.length : end);
  };
  const rows = (blk, prefix) =>
    [...blk.matchAll(new RegExp(`\\b(${prefix}\\d+[A-Z]?)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d.]+)`, 'g'))].map((m) => {
      const hunters = n(m[2]), bulls = n(m[3]), cows = n(m[4]), pct = Number(m[5]);
      // Reconcile NDGF's printed rate with its own counts (2-dp rounding).
      if (Math.abs((100 * (bulls + cows)) / hunters - pct) > 0.01) throw new Error(`${m[1]}: ${bulls}+${cows}/${hunters} ≠ ${pct}%`);
      return {
        unit: m[1],
        label: `All ${prefix === 'E' ? 'elk' : 'moose'} hunters in unit (any + antlerless, lottery + landowner): ${bulls} bulls, ${cows} cows/calves`,
        weapon: 'any',
        hunters,
        harvest: bulls + cows,
        successPct: pct,
      };
    });
  const moose = rows(block('M', 'Elk '), 'M');
  const elk = rows(block('E', null), 'E');
  // Totals sentence checks.
  const mt = must(/issued ([\d,]+) moose licenses last year\. Of that total, ([\d,]+) hunters harvested ([\d,]+) animals/, t, 'moose totals');
  const et = must(/issued ([\d,]+) elk licenses last year\. Of that total, ([\d,]+) hunters harvested ([\d,]+) elk/, t, 'elk totals');
  const chk = (rs, m, sp) => {
    const h = rs.reduce((a, r) => a + r.hunters, 0), k = rs.reduce((a, r) => a + r.harvest, 0);
    if (h !== n(m[2]) || k !== n(m[3])) throw new Error(`${sp} unit rows sum ${h}/${k} ≠ release ${m[2]}/${m[3]}`);
  };
  chk(moose, mt, 'moose');
  chk(elk, et, 'elk');
  const sh = must(/All (\d+|ten) hunters were successful/i, t, 'sheep success');
  const sheepHunters = /^\d+$/.test(sh[1]) ? n(sh[1]) : 10;
  const sheep = [{
    unit: 'STATEWIDE',
    label: 'All bighorn sheep hunters (NDGF lottery + auction licenses, plus licenses issued by Three Affiliated Tribes Fish and Wildlife)',
    weapon: 'any',
    hunters: sheepHunters,
    harvest: sheepHunters,
    successPct: 100,
  }];
  return { year, moose, elk, sheep };
}

// ---------- deer ----------
function deer(t) {
  const year = yearFrom(must(/(20\d\d) Deer Season Summarized/i, t, 'deer title')[0], 'deer year');
  const o = must(/total of ([\d,]+) North Dakota deer hunters took approximately ([\d,]+) deer during the (20\d\d) deer gun hunting season.*?Overall hunter success was (\d+)%/, t, 'deer overall');
  const wt = must(/success for white-tailed deer was (\d+)% for antlered and (\d+)% for antlerless whitetails/, t, 'whitetail');
  const md = must(/Mule deer license holder success was (\d+)% for antlered and (\d+)% for antlerless mule deer/, t, 'mule deer');
  const any = must(/Any antlered hunters had a success rate of (\d+)%, while any antlerless hunters had a success rate of (\d+)%/, t, 'any');
  const gr = must(/issued ([\d,]+) gratis licenses in (20\d\d), and ([\d,]+) hunters harvested ([\d,]+) deer for a success rate of (\d+)%/, t, 'gratis');
  const mz = must(/([\d,]+) muzzleloader licenses were issued, and ([\d,]+) hunters harvested ([\d,]+) white-tailed deer \((\d+) antlered, (\d+) antlerless\)\. Hunter success was (\d+)%/, t, 'muzzleloader');
  const ar = must(/In total, ([\d,]+) bowhunters harvested ([\d,]+) deer .*? for a success rate of (\d+)%/, t, 'archery');
  const S = 'STATEWIDE';
  const gun = (label, pct) => ({ unit: S, label: `Deer gun — ${label} (statewide)`, weapon: 'rifle', hunters: null, harvest: null, successPct: n(pct) });
  return {
    year,
    rows: [
      { unit: S, label: 'Deer gun — all regular-season license types (statewide)', weapon: 'rifle', hunters: n(o[1]), harvest: n(o[2]), successPct: n(o[4]) },
      gun('Any Antlered Deer', any[1]),
      gun('Any Antlerless Deer', any[2]),
      gun('Antlered Whitetail Deer', wt[1]),
      gun('Antlerless Whitetail Deer', wt[2]),
      gun('Antlered Mule Deer', md[1]),
      gun('Antlerless Mule Deer', md[2]),
      { unit: S, label: 'Deer gun — gratis (landowner) licenses (statewide)', weapon: 'rifle', hunters: n(gr[3]), harvest: n(gr[4]), successPct: n(gr[5]) },
      // MUZ is the draw file's unit for the statewide muzzleloader season (both license types).
      { unit: 'MUZ', label: `Muzzleloader season, antlered + antlerless whitetail (${mz[4]} antlered, ${mz[5]} antlerless taken)`, weapon: 'muzzleloader', hunters: n(mz[2]), harvest: n(mz[3]), successPct: n(mz[6]) },
      { unit: S, label: 'Archery season, all deer licenses (resident + nonresident; not a lottery for residents)', weapon: 'archery', hunters: n(ar[1]), harvest: n(ar[2]), successPct: n(ar[3]) },
    ],
  };
}

// ---------- pronghorn ----------
function pronghorn(t) {
  const m = must(/Last year’s season was successful with ([\d,]+) hunters harvesting ([\d,]+) pronghorn for a success rate of (\d+)%\. Hunters with a lottery license had a hunter success rate of (\d+)%/, t, 'pronghorn');
  const outlookYear = yearFrom(must(/(20\d\d) Hunting Season Outlook/i, t, 'outlook title')[0], 'outlook year');
  return {
    year: outlookYear - 1,
    rows: [
      { unit: 'STATEWIDE', label: 'All pronghorn hunters (lottery + gratis licenses), statewide', weapon: 'any', hunters: n(m[1]), harvest: n(m[2]), successPct: n(m[3]) },
      { unit: 'STATEWIDE', label: 'Pronghorn lottery-license hunters, statewide', weapon: 'any', hunters: null, harvest: null, successPct: n(m[4]) },
    ],
  };
}

// ---------- main ----------
const b3 = big3(text(await get(SRC.big3)));
const d = deer(text(await get(SRC.deer)));
const p = pronghorn(text(await get(SRC.pronghorn)));

const speciesYear = { DEER: d.year, ANTELOPE: p.year, ELK: b3.year, MOOSE: b3.year, BIGHORNSHEEP: b3.year };
const out = {
  state: 'ND',
  year: Math.max(...Object.values(speciesYear)),
  speciesYear,
  source: { name: 'North Dakota Game and Fish Department — harvest news releases', url: 'https://gf.nd.gov/news-releases' },
  notes: [
    `Sources: ELK/MOOSE/BIGHORNSHEEP ${SRC.big3} ("${b3.year} Big 3 Harvest Statistics"); DEER ${SRC.deer} ("${d.year} Deer Season Summarized", post-season survey); ANTELOPE ${SRC.pronghorn} (statewide figures for the ${p.year} season).`,
    'ELK/MOOSE: per-unit rows as printed by NDGF (hunters, bulls, cows/calves, success rate). harvest = bulls + cows/calves (computed); successPct = NDGF figure (checked against the counts). Rows cover every hunter in the unit — any-elk/any-moose and antlerless licenses together, lottery and landowner-preference — so no huntCode; attach by unit only, as unit-level context. Unit sums reconcile to the release totals.',
    'DEER/ANTELOPE: NDGF does not publish unit-level harvest. Rows with unit "STATEWIDE" are statewide figures by license type (hunters/harvest null where the release gives only a percentage). Deer unit "MUZ" = statewide muzzleloader season and matches the draw file\'s MUZ rows (both license types together). Archery is included for context; resident deer bow licenses are not a lottery.',
    'BIGHORNSHEEP: one statewide row; the 10 hunters include NDGF lottery and auction licenses and 2 licenses issued by Three Affiliated Tribes Fish and Wildlife.',
  ].join(' '),
  species: { DEER: d.rows, ANTELOPE: p.rows, ELK: b3.elk, MOOSE: b3.moose, BIGHORNSHEEP: b3.sheep },
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

// ---------- self-check + join rate vs draw file ----------
let problems = 0;
for (const [sp, rows] of Object.entries(out.species)) {
  for (const r of rows) {
    if (!(r.successPct >= 0 && r.successPct <= 100)) { problems++; console.error('pct', sp, r.unit, r.successPct); }
    if (r.hunters != null && r.harvest != null && r.harvest > r.hunters) { problems++; console.error('harvest>hunters', sp, r.unit); }
  }
}
if (existsSync(DRAW)) {
  const draw = JSON.parse(readFileSync(DRAW, 'utf8'));
  let all = 0, hit = 0;
  for (const [sp, rows] of Object.entries(draw.species)) {
    const units = new Set((out.species[sp] ?? []).map((r) => r.unit));
    const j = rows.filter((r) => units.has(r.unit)).length;
    all += rows.length; hit += j;
    console.log(`${sp.padEnd(13)} harvest rows ${String(out.species[sp]?.length ?? 0).padStart(2)} (${speciesYear[sp]})  draw rows joined by unit ${j}/${rows.length}`);
  }
  console.log(`join rate draw→harvest (unit): ${hit}/${all} = ${((100 * hit) / all).toFixed(1)}%`);
}
console.log(problems ? `${problems} problems` : 'self-check OK', '→', OUT);
if (problems) process.exit(1);
