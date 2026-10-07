// Build lib/huntdata/draw/nd.json from North Dakota Game and Fish Department
// (NDGF) lottery statistics pages on gf.nd.gov:
//   deer (resident)    https://gf.nd.gov/licensing/lotteries/summary/deer
//   deer (nonresident) https://gf.nd.gov/licensing/lotteries/summary/deer-nonresident
//   pronghorn          https://gf.nd.gov/licensing/lotteries/summary/pronghorn
//   elk                https://gf.nd.gov/licensing/lotteries/summary/elk
//   moose              https://gf.nd.gov/licensing/lotteries/summary/moose
//   bighorn sheep      https://gf.nd.gov/licensing/lotteries/summary/bighorn-sheep
// Each page shows the newest lottery year as an HTML table (older years are on
// .../archive). Deer and pronghorn tables give, per unit + license type, the
// first-choice result at every bonus-point level ("successful/total"); elk and
// moose give only licenses available + applicants; bighorn sheep only a
// statewide licenses + applicants line per year.
//
//   node scripts/draw/buildNDDraw.mjs            # fetch (cached) + build
//   node scripts/draw/buildNDDraw.mjs --refresh  # ignore the cache
//
// Downloads are cached in os.tmpdir()/huntengine-nd. Node 18+, no npm deps.
// The script throws instead of guessing when a row does not reconcile.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'lib', 'huntdata', 'draw', 'nd.json');
const CACHE = join(tmpdir(), 'huntengine-nd');
const REFRESH = process.argv.includes('--refresh');
const BASE = 'https://gf.nd.gov/licensing/lotteries/summary/';
const PAGES = {
  deer: BASE + 'deer',
  deerNR: BASE + 'deer-nonresident',
  pronghorn: BASE + 'pronghorn',
  elk: BASE + 'elk',
  moose: BASE + 'moose',
  sheep: BASE + 'bighorn-sheep',
};

async function get(url) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_') + '.html');
  if (!REFRESH && existsSync(file)) return readFileSync(file, 'utf8');
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (huntengine data build)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const html = await res.text();
  if (/captcha|challenge-platform|cf-chl/i.test(html) && !/<table/i.test(html)) {
    throw new Error(`Bot challenge at ${url} — not bypassing; download stopped.`);
  }
  writeFileSync(file, html);
  return html;
}

// ---------- HTML table parsing ----------
const decode = (s) =>
  s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#x2013;|&ndash;/g, '-').replace(/\s+/g, ' ').trim();

// First <table> whose <caption> matches captionRe. Returns { caption, header:[], rows:[[]] }.
// Header = the row of <th> cells that contains "Unit" (or "Year").
function table(html, captionRe) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  const t = tables.find((x) => captionRe.test(decode((/<caption>([\s\S]*?)<\/caption>/i.exec(x) || [])[1] || '')));
  if (!t) throw new Error(`table not found: ${captionRe}`);
  const caption = decode(/<caption>([\s\S]*?)<\/caption>/i.exec(t)[1]);
  const trs = [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  let header = null;
  const rows = [];
  for (const tr of trs) {
    const ths = [...tr.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => decode(m[1]));
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decode(m[1]));
    if (ths.length && ths.some((h) => /^(Unit|Year)$/i.test(h))) { header = ths; continue; }
    if (header && tds.length >= header.length && tds[0]) rows.push(tds.slice(0, header.length));
  }
  if (!header) throw new Error(`no header row in table ${caption}`);
  return { caption, header, rows };
}

const num = (s) => {
  const t = (s ?? '').replace(/[,*]/g, '').trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) throw new Error(`not a number: "${s}"`);
  return Number(t);
};
const col = (header, re) => {
  const i = header.findIndex((h) => re.test(h));
  if (i < 0) throw new Error(`column ${re} not in [${header.join(' | ')}]`);
  return i;
};
const yearOf = (caption) => Number(/\b(20\d\d)\b/.exec(caption)[1]);
const pct = (drawn, apps) => (apps > 0 ? Math.round((1000 * drawn) / apps) / 10 : null);

// Bonus-point columns "0".."19","20+" → PointLine[] (20 stands for 20 or more).
function pointLines(header, cells) {
  const lines = [];
  header.forEach((h, i) => {
    const m = /^(\d+)\+?$/.exec(h);
    if (!m) return;
    const c = /^\s*([\d,]+)\s*\/\s*([\d,]+)\s*$/.exec(cells[i]);
    if (!c) throw new Error(`bad point cell "${cells[i]}"`);
    const drawn = num(c[1]);
    const applicants = num(c[2]);
    if (drawn > applicants) throw new Error(`drawn > applicants in cell "${cells[i]}"`);
    lines.push({ points: Number(m[1]), applicants, drawn });
  });
  if (lines.length !== 21) throw new Error(`expected 21 point columns, got ${lines.length}`);
  return lines;
}
const sum = (lines, k) => lines.reduce((a, l) => a + l[k], 0);

// ---------- deer ----------
// License types as printed → code + label.
const DEER_TYPES = {
  'Any Antlered Deer': 'ANY-ANTLERED',
  'Any Antlerless Deer': 'ANY-ANTLERLESS',
  'Antlered Whitetail Deer': 'ANTLERED-WT',
  'Antlerless Whitetail Deer': 'ANTLERLESS-WT',
  'Antlered Mule Deer': 'ANTLERED-MD',
  'Antlerless Mule Deer': 'ANTLERLESS-MD',
};
const deerCode = (unit, type) => {
  const t = DEER_TYPES[type];
  if (!t) throw new Error(`unknown deer license type "${type}"`);
  return `DEER-${unit}-${t}`;
};

function parseDeerResident(html) {
  const t = table(html, /Deer Licenses Available and Applicants/i);
  const h = t.header;
  const iU = col(h, /^Unit$/i), iT = col(h, /License Type/i), iTot = col(h, /Total Availability/i);
  const iIss = col(h, /Issued in Resident Drawing/i), iApp = col(h, /Total Applicants/i);
  const iGr = col(h, /Gratis/i), iNR = col(h, /Nonresident Deduction/i);
  const out = new Map();
  for (const r of t.rows) {
    const lines = pointLines(h, r);
    const apps = num(r[iApp]);
    if (sum(lines, 'applicants') !== apps) throw new Error(`deer ${r[iU]} ${r[iT]}: point applicants ${sum(lines, 'applicants')} ≠ total ${apps}`);
    out.set(deerCode(r[iU], r[iT]), {
      unit: r[iU], type: r[iT], total: num(r[iTot]), gratis: num(r[iGr]), nrDeduction: num(r[iNR]),
      issued: num(r[iIss]), applicants: apps, drawn: sum(lines, 'drawn'), lines,
    });
  }
  return { year: yearOf(t.caption), rows: out };
}

function parseDeerNonresident(html) {
  const t = table(html, /Nonresident Deer Lottery Statistics/i);
  const h = t.header;
  const iU = col(h, /^Unit$/i), iT = col(h, /License Type/i), iTot = col(h, /Total Availability/i);
  const iLot = col(h, /Available in Lottery/i), iApp = col(h, /Total Applicants/i), iGr = col(h, /Gratis/i);
  const out = new Map();
  for (const r of t.rows) {
    const lines = pointLines(h, r);
    const apps = num(r[iApp]);
    if (sum(lines, 'applicants') !== apps) throw new Error(`NR deer ${r[iU]} ${r[iT]}: point applicants ≠ total`);
    out.set(deerCode(r[iU], r[iT]), {
      unit: r[iU], type: r[iT], total: num(r[iTot]), gratis: num(r[iGr]), lottery: num(r[iLot]),
      applicants: apps, drawn: sum(lines, 'drawn'), lines,
    });
  }
  return { year: yearOf(t.caption), rows: out };
}

function deerRows(res, nr) {
  const codes = [...new Set([...res.rows.keys(), ...nr.rows.keys()])];
  return codes.map((code) => {
    const r = res.rows.get(code);
    const n = nr.rows.get(code);
    const { unit, type } = r ?? n;
    const muz = unit === 'MUZ';
    const row = {
      huntCode: code,
      unit,
      label: `${type} — ${muz ? 'Muzzleloader (statewide)' : 'Deer gun'}`,
      weapon: muz ? 'muzzleloader' : 'rifle',
      tags: r?.total ?? null,
      draw: {
        resident: r ? { tags: r.issued, applicants: r.applicants, successPct: pct(r.drawn, r.applicants) } : null,
        nonresident: n ? { tags: n.lottery, applicants: n.applicants, successPct: pct(n.drawn, n.applicants) } : null,
      },
      pointLines: {},
    };
    const rl = r ? r.lines.filter((l) => l.applicants > 0) : [];
    const nl = n ? n.lines.filter((l) => l.applicants > 0) : [];
    if (rl.length) row.pointLines.resident = rl;
    if (nl.length) row.pointLines.nonresident = nl;
    if (!rl.length && !nl.length) delete row.pointLines;
    return row;
  });
}

// ---------- pronghorn ----------
// Lottery prints "01A"; NDGF's ArcGIS Pronghorn Units layer uses "1-A".
const pronghornUnit = (u) => {
  const m = /^0?(\d+)([A-Z])$/.exec(u);
  if (!m) throw new Error(`unexpected pronghorn unit "${u}"`);
  return `${Number(m[1])}-${m[2]}`;
};

function parsePronghorn(html) {
  const t = table(html, /Pronghorn Licenses Available and Applicants/i);
  const h = t.header;
  const iU = col(h, /^Unit$/i), iT = col(h, /^Type$/i), iTot = col(h, /Total Availability/i);
  const iGr = col(h, /Gratis/i), iApp = col(h, /Total Applicants/i);
  const rows = t.rows.map((r) => {
    const lines = pointLines(h, r);
    const apps = num(r[iApp]);
    if (sum(lines, 'applicants') !== apps) throw new Error(`pronghorn ${r[iU]}: point applicants ≠ total`);
    const total = num(r[iTot]);
    const gratis = num(r[iGr]) ?? 0;
    const drawn = sum(lines, 'drawn');
    if (drawn > total - gratis) throw new Error(`pronghorn ${r[iU]}: drawn ${drawn} > lottery licenses ${total - gratis}`);
    if (r[iT] !== 'Any Pronghorn') throw new Error(`unknown pronghorn type "${r[iT]}"`);
    return {
      huntCode: `ANTELOPE-${r[iU]}-ANY`,
      unit: pronghornUnit(r[iU]),
      label: `Any Pronghorn — unit ${r[iU]} (bow season, then gun/bow season)`,
      weapon: 'any',
      tags: total,
      draw: {
        resident: { tags: total - gratis, applicants: apps, successPct: pct(drawn, apps) },
        nonresident: null,
      },
      pointLines: { resident: lines.filter((l) => l.applicants > 0) },
    };
  });
  return { year: yearOf(t.caption), rows };
}

// ---------- elk / moose (no point tables, no drawn counts) ----------
function parseUnitTypeTable(html, species, prefix) {
  const t = table(html, /Licenses Available and Applicants/i);
  const h = t.header;
  const iU = col(h, /^Unit$/i), iT = col(h, /License Type/i), iA = col(h, /Available/i), iApp = col(h, /Applicants/i);
  const rows = t.rows.map((r) => {
    const type = r[iT];
    const tcode = /^Any /i.test(type) ? 'ANY' : /^Antlerless /i.test(type) ? 'ANTLERLESS' : null;
    if (!tcode) throw new Error(`unknown ${species} type "${type}"`);
    const tags = num(r[iA]);
    return {
      huntCode: `${prefix}-${r[iU]}-${tcode}`,
      unit: r[iU],
      label: `${type} — once-in-a-lifetime lottery (bow or firearm)`,
      weapon: 'any',
      tags,
      draw: { resident: { tags, applicants: num(r[iApp]), successPct: null }, nonresident: null },
    };
  });
  return { year: yearOf(t.caption), rows };
}

// ---------- bighorn sheep (statewide line per year) ----------
function parseSheep(html) {
  const t = table(html, /Annual Bighorn Sheep Lottery Statistics/i);
  const h = t.header;
  const iY = col(h, /^Year$/i), iA = col(h, /Licenses Available/i), iApp = col(h, /Applicants/i);
  const top = t.rows.map((r) => ({ year: num(r[iY]), tags: num(r[iA]), applicants: num(r[iApp]) })).sort((a, b) => b.year - a.year)[0];
  return {
    year: top.year,
    rows: [{
      huntCode: 'BIGHORNSHEEP-STATEWIDE',
      unit: 'STATEWIDE',
      units: ['B1', 'B2', 'B3', 'B4', 'B5'],
      label: 'Bighorn sheep (ram) — once-in-a-lifetime lottery; applicants apply statewide and pick a unit after drawing',
      weapon: 'any',
      tags: top.tags,
      // NDGF prints one combined applicant count (residents + nonresidents).
      draw: { resident: null, nonresident: null },
      applicantsCombined: top.applicants,
    }],
  };
}

// ---------- main ----------
const html = {};
for (const [k, u] of Object.entries(PAGES)) html[k] = await get(u);

const deerRes = parseDeerResident(html.deer);
const deerNR = parseDeerNonresident(html.deerNR);
if (deerRes.year !== deerNR.year) throw new Error(`deer resident ${deerRes.year} vs nonresident ${deerNR.year}`);
const pron = parsePronghorn(html.pronghorn);
const elk = parseUnitTypeTable(html.elk, 'elk', 'ELK');
const moose = parseUnitTypeTable(html.moose, 'moose', 'MOOSE');
const sheep = parseSheep(html.sheep);

const years = { DEER: deerRes.year, ANTELOPE: pron.year, ELK: elk.year, MOOSE: moose.year, BIGHORNSHEEP: sheep.year };
const year = Math.max(...Object.values(years));

// Sheep: one combined applicant count (residents + nonresidents) goes in
// DrawRow.applicants — never split into a residency we don't have.
const sheepRow = sheep.rows[0];
const sheepApps = sheepRow.applicantsCombined;
delete sheepRow.applicantsCombined;
sheepRow.applicants = sheepApps;
sheepRow.label += ` (${sheep.year}: ${sheepRow.tags} licenses, ${sheepApps.toLocaleString('en-US')} resident + nonresident applicants combined)`;

const out = {
  state: 'ND',
  year,
  source: { name: `North Dakota Game and Fish Department — ${year} Lottery Statistics`, url: 'https://gf.nd.gov/hunting/lotteries' },
  notes: [
    `Years: ${Object.entries(years).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    `Pages: ${Object.values(PAGES).join(' ; ')}.`,
    'DEER/ANTELOPE: NDGF tables give FIRST-CHOICE results in the first (weighted bonus-point) lottery at each bonus-point level as successful/total applicants. pointLines = those cells (only levels with ≥1 applicant kept; points 20 means "20+"). applicants = "Total Applicants" (equals the sum of the point columns; checked). successPct = sum of first-choice successes across point levels ÷ Total Applicants × 100, computed here; NDGF does not print a per-license percentage.',
    'DEER resident: DrawRow.tags = "Total Availability" (all licenses for the unit/type); draw.resident.tags = "*Total Issued in Resident Drawing" as printed (after gratis/landowner and 1% nonresident deductions; it can exceed first-choice successes because 2nd-choice and later drawings also issue licenses). Deer nonresident: draw.nonresident.tags = "Available in Lottery" from the nonresident page (nonresident gun licenses = about 1% of the allocation, minus nonresident gratis); nonresidents compete only against nonresidents. NDGF footnote: minor inconsistencies are possible from voided/revoked/refunded licenses and bonus-point-only purchases. Unit "MUZ" = statewide muzzleloader season (weapon muzzleloader); all other deer rows are the regular deer gun season (any legal firearm, stored as weapon "rifle").',
    'ANTELOPE: residents only (NDGF). unit = NDGF ArcGIS "Pronghorn Units" spelling ("1-A"); the lottery prints "01A", kept in huntCode and label. DrawRow.tags = "Total Availability"; draw.resident.tags = Total Availability − Gratis Deduction (lottery licenses, computed). Licenses are valid in the bow-only portion and the later gun/bow portion, so weapon "any".',
    'ELK/MOOSE: residents only; once-in-a-lifetime. NDGF publishes only "Available Licenses" and "Total Applicants" per unit/type — no drawn counts and no bonus-point table — so successPct and pointLines are null/absent. Some antlerless elk rows print applicants equal to licenses (e.g. E1W antlerless 125/125); kept as printed. Landowner-preference licenses are issued outside the lottery.',
    'BIGHORNSHEEP: once-in-a-lifetime; residents and nonresidents may apply (no more than one license may go to a nonresident by law). Applicants apply statewide, not by unit; the lottery is held ~Sept 1 after surveys and winners then choose a unit (B1–B5). NDGF prints one statewide line per year (licenses available, applicants) without a residency split, so draw.resident/nonresident are null and the numbers are in the row label and tags.',
  ].join(' '),
  species: {
    DEER: deerRows(deerRes, deerNR),
    ANTELOPE: pron.rows,
    ELK: elk.rows,
    MOOSE: moose.rows,
    BIGHORNSHEEP: sheep.rows,
  },
};

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

// ---------- self-check ----------
let problems = 0;
for (const [sp, rows] of Object.entries(out.species)) {
  const codes = new Set();
  for (const r of rows) {
    if (codes.has(r.huntCode)) { problems++; console.error('dup', r.huntCode); }
    codes.add(r.huntCode);
    for (const pool of ['resident', 'nonresident']) {
      const s = r.draw[pool];
      if (!s) continue;
      if (s.successPct != null && (s.successPct < 0 || s.successPct > 100)) { problems++; console.error('pct', r.huntCode, pool, s.successPct); }
      const pl = r.pointLines?.[pool];
      if (pl) {
        const apps = sum(pl, 'applicants'), drawn = sum(pl, 'drawn');
        if (apps !== s.applicants) { problems++; console.error('pointLines apps', r.huntCode, pool, apps, s.applicants); }
        if (drawn > apps) { problems++; console.error('drawn>apps', r.huntCode, pool); }
      }
    }
  }
  console.log(`${sp.padEnd(13)} ${String(rows.length).padStart(3)} rows (${years[sp]})  with points: ${rows.filter((r) => r.pointLines && Object.keys(r.pointLines).length).length}  with NR stats: ${rows.filter((r) => r.draw.nonresident).length}`);
}
console.log(problems ? `${problems} problems` : 'self-check OK', '→', OUT);
if (problems) process.exit(1);
