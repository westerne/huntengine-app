// Builds lib/huntdata/harvest/nv.json (HarvestFile, see lib/huntdata/harvest/format.ts)
// from the Nevada Department of Wildlife (NDOW) "<year> Nevada Big Game Hunt Data"
// workbook (www.ndow.org/wp-content/uploads/..., found through NDOW's WordPress
// media API). The newest year published is used.
//
// Workbook layout (sheet "<year> Hunt Summary", one row per hunt + residency +
// unit group + season): year, Hunt (class), Residency (R / NR), Species, Weapon
// (ALW / AR / M / WR / SWR / SWR-Prmtve), Unit Group, Season, Demand, Unique Apps,
// Quota, Tags Issued, Hunters Afield, Successful Hunters, Draw Rate, Survey Rate,
// Hunter Success (= Successful Hunters ÷ Hunters Afield, from NDOW's mandatory
// post-season questionnaire), ...
//
// huntCode: rows are joined to lib/huntdata/draw/nv.json (run
// scripts/draw/buildNVDraw.mjs first) by NDOW hunt number (read from the draw
// row's label), unit set, season and sub-area words, so the same unit group gets
// the same huntCode in both files. Resident and nonresident harvest rows of one
// draw row share its huntCode and carry `residency`; the resident row is listed
// first.
//
// Run: node scripts/harvest/buildNVHarvest.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import zlib from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'harvest', 'nv.json');
const DRAW = path.join(ROOT, 'lib', 'huntdata', 'draw', 'nv.json');
const SITE = 'https://www.ndow.org';
const CACHE = path.join(os.tmpdir(), 'nvharvest');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- download
async function download(url) {
  const file = path.join(CACHE, decodeURIComponent(url.split('/').pop()));
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    if (/text\/html/i.test(r.headers.get('content-type') ?? '')) {
      throw new Error(`${url} returned HTML, not a document (blocked or moved?)`);
    }
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}

async function mediaSearch(q) {
  const urls = [];
  for (let page = 1; page < 20; page++) {
    const u = `${SITE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=100&page=${page}&_fields=source_url,date`;
    const r = await fetch(u, { headers: UA });
    if (r.status === 400) break;
    if (!r.ok) throw new Error(`${u} → ${r.status}`);
    const items = await r.json();
    if (!Array.isArray(items) || !items.length) break;
    urls.push(...items.map((i) => ({ url: i.source_url, date: i.date })));
    if (items.length < 100) break;
  }
  return urls;
}

// ---------------------------------------------------------------- xlsx
function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip file');
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip central directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const data = buf.subarray(start, start + csize);
    out[name] = method === 8 ? zlib.inflateRawSync(data) : method === 0 ? data : null;
    p += 46 + nl + xl + cl;
  }
  return out;
}

const xmlDecode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');

function xlsxRows(file) {
  const z = unzip(readFileSync(file));
  const shared = [...(z['xl/sharedStrings.xml']?.toString('utf8') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => xmlDecode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const xml = z['xl/worksheets/sheet1.xml'].toString('utf8');
  const rows = [];
  for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = [...c[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const type = (c[2].match(/\bt="(\w+)"/) || [])[1];
      const inner = c[3] ?? '';
      let v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (type === 's') v = shared[+v];
      else if (type === 'inlineStr') v = xmlDecode((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] ?? '');
      else if (v != null) v = xmlDecode(v);
      row[col] = v;
    }
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------- mapping
// Same hunt classes / NDOW hunt numbers as scripts/draw/buildNVDraw.mjs
// (CR 25-13 "2025 Big Game Quotas", CR 25-10 NR guided mule deer).
const CLASSES = {
  'Mule Deer Antlered': { species: 'DEER', label: 'Antlered mule deer', nums: { R: { ALW: '1331', AR: '1341', M: '1371', WR: '1331' }, NR: { ALW: '1332', AR: '1342', M: '1372', WR: '1332' } } },
  'Mule Deer Guided Antlered': { species: 'DEER', label: 'Antlered mule deer, nonresident guided', nums: { NR: { ALW: '1235', WR: '1235' } } },
  'Mule Deer Junior': { species: 'DEER', label: 'Junior antlered mule deer', nums: { R: { ALW: '1106', SWR: '1107', 'SWR-Prmtve': '1105' } } },
  'Antelope Horns Longer Than Ears': { species: 'ANTELOPE', label: 'Antelope, horns longer than ears', nums: { R: { ALW: '2151', AR: '2161', M: '2171' }, NR: { ALW: '2251', AR: '2261', M: '2271' } } },
  'Antelope Horns Shorter Than Ears': { species: 'ANTELOPE', label: 'Antelope, horns shorter than ears', nums: { R: { ALW: '2181' } } },
  'Junior Antelope Horns Shorter Than Ears': { species: 'ANTELOPE', label: 'Junior antelope, horns shorter than ears', nums: { R: { ALW: '2191' } } },
  'Elk Antlered': { species: 'ELK', label: 'Antlered elk', nums: { R: { ALW: '4151', AR: '4161', M: '4156' }, NR: { ALW: '4251', AR: '4261', M: '4256' } } },
  'Elk Antlerless': { species: 'ELK', label: 'Antlerless elk', nums: { R: { ALW: '4181', AR: '4111', M: '4176' }, NR: { ALW: '4281', AR: '4211', M: '4276' } } },
  'Elk Spike': { species: 'ELK', label: 'Spike elk', nums: { R: { ALW: '4651' } } },
  'Desert Bighorn Sheep Any Ram': { species: 'BIGHORNSHEEP', label: 'Desert (Nelson) bighorn, any ram', nums: { R: { ALW: '3151', AR: '3161' }, NR: { ALW: '3251' } } },
  'Desert Bighorn Sheep Any Ewe': { species: 'BIGHORNSHEEP', label: 'Desert (Nelson) bighorn, any ewe', nums: { R: { ALW: '3181' }, NR: { ALW: '3281' } } },
  'California Bighorn Sheep Any Ram': { species: 'BIGHORNSHEEP', label: 'California bighorn, any ram', nums: { R: { ALW: '8151' }, NR: { ALW: '8251' } } },
  'Rocky Mountain Bighorn Sheep Any Ram': { species: 'BIGHORNSHEEP', label: 'Rocky Mountain bighorn, any ram', nums: { R: { ALW: '9151' } } },
  'Mountain Goat Either Sex': { species: 'MTNGOAT', label: 'Mountain goat, either sex', nums: { R: { ALW: '7151' }, NR: { ALW: '7251' } } },
};
const WEAPON = { ALW: 'rifle', AR: 'archery', M: 'muzzleloader' };
const WEAPON_LABEL = {
  ALW: 'Any Legal Weapon', AR: 'Archery', M: 'Muzzleloader', WR: 'Weapon-restricted',
  SWR: 'Junior Classic', 'SWR-Prmtve': 'Junior Primitive',
};
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const num = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error(`not a number: ${v}`);
  return n;
};

function parseUnits(s) {
  const clean = s.replace(/\(.*?\)/g, ' ').replace(/[–—�]/g, '-');
  const out = [];
  for (const m of clean.matchAll(/\b(\d{3})[A-Z]?\b(?:\s*-\s*(\d{3})\b)?/g)) {
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let u = a; u <= b; u++) out.push(String(u).padStart(3, '0'));
  }
  return [...new Set(out)];
}
function areaOf(s) {
  return s.replace(/\(.*?\)/g, ' ').replace(/\(see.*$/i, ' ').replace(/\b\d{3}[A-Z]?\b/g, ' ')
    .replace(/\b(portion|of|in|unit|restrictions|additional|requirement|applies|within|mile|co)\b\.?/gi, ' ')
    .replace(/[^A-Za-z]+/g, ' ').trim();
}
function seasonKeyXlsx(s) {
  const all = [...String(s ?? '').matchAll(/([A-Z][a-z]{2,3})\s+(\d{1,2})\s*-\s*([A-Z][a-z]{2,3})\s+(\d{1,2})/g)];
  if (!all.length) return '';
  const a = all[0], z = all[all.length - 1];
  return `${pad(MONTHS[a[1]])}-${pad(a[2])}|${pad(MONTHS[z[3]])}-${pad(z[4])}`;
}

// ---------------------------------------------------------------- draw index
if (!existsSync(DRAW)) throw new Error('lib/huntdata/draw/nv.json missing — run scripts/draw/buildNVDraw.mjs first');
const draw = JSON.parse(readFileSync(DRAW, 'utf8'));
const drawIndex = []; // { species, nums:Set, unitKey, seasonKey, area, huntCode, unit }
for (const [sp, rows] of Object.entries(draw.species)) {
  for (const r of rows) {
    const nums = new Set([...(r.label ?? '').matchAll(/hunt (\d{4,5})/g)].map((m) => m[1]));
    const unitsText = ((r.label ?? '').match(/Units (.+) \(NDOW/) || [])[1] ?? '';
    drawIndex.push({
      species: sp, nums, huntCode: r.huntCode, unit: r.unit,
      unitKey: [...(r.units ?? [r.unit])].sort().join(','),
      seasonKey: r.season ? `${r.season.open.slice(5)}|${r.season.close.slice(5)}` : '',
      area: areaOf(unitsText),
    });
  }
}
function findDraw(species, no, unitKey, seasonKey, area) {
  let c = drawIndex.filter((d) => d.species === species && d.nums.has(no) && d.unitKey === unitKey);
  if (c.length > 1) {
    const bySeason = c.filter((d) => d.seasonKey === seasonKey || !d.seasonKey);
    if (bySeason.length) c = bySeason;
  }
  if (c.length > 1) {
    const byArea = c.filter((d) => d.area === area);
    if (byArea.length) c = byArea;
  }
  return c.length === 1 ? c[0] : null;
}

// ---------------------------------------------------------------- main
const hits = (await mediaSearch('Nevada Big Game Hunt Data'))
  .filter((h) => /\/(\d{4})-Nevada-Big-Game-Hunt-Data[^/]*\.xlsx$/i.test(h.url))
  .map((h) => ({ ...h, year: +h.url.match(/\/(\d{4})-Nevada-Big-Game-Hunt-Data/i)[1] }))
  .sort((a, b) => b.year - a.year || b.date.localeCompare(a.date));
if (!hits.length) throw new Error('no "<year>-Nevada-Big-Game-Hunt-Data.xlsx" in the NDOW media library');
const { url: DATA_URL, year: YEAR } = hits[0];

const rows = xlsxRows(await download(DATA_URL));
const hdr = rows[0].map((h) => String(h ?? '').replace(/\s+/g, ' ').trim());
const col = (name) => { const i = hdr.indexOf(name); if (i < 0) throw new Error(`no "${name}" column`); return i; };
const C = {
  year: col('year'), hunt: col('Hunt'), res: col('Residency'), weapon: col('Weapon'), units: col('Unit Group'),
  season: col('Season'), afield: col('Hunters Afield'), success: col('Successful Hunters'), pct: col('Hunter Success'),
};

const out = { state: 'NV', year: YEAR, source: null, notes: null, species: {} };
let matched = 0, unmatched = [], skipped = 0, mismatch = [];
for (const r of rows.slice(1)) {
  if (String(r[C.year]) !== String(YEAR)) continue;
  const cls = CLASSES[r[C.hunt]];
  if (!cls) continue;
  const res = r[C.res] === 'R' ? 'R' : r[C.res] === 'NR' ? 'NR' : null;
  const wc = r[C.weapon];
  const no = res && cls.nums[res]?.[wc];
  if (!no) continue;
  const hunters = num(r[C.afield]);
  const harvest = num(r[C.success]);
  const agencyPct = num(r[C.pct]);
  if (hunters == null || hunters === 0 || agencyPct == null) { skipped++; continue; }
  const successPct = Math.round(agencyPct * 1000) / 10;
  if (harvest != null && Math.round((harvest / hunters) * 1000) / 10 !== successPct) {
    mismatch.push(`${r[C.hunt]} ${res} ${r[C.units]}: ${harvest}/${hunters} vs ${successPct}%`);
  }
  const unitsText = String(r[C.units]);
  const units = parseUnits(unitsText);
  const d = findDraw(cls.species, no, [...units].sort().join(','), seasonKeyXlsx(r[C.season]), areaOf(unitsText));
  if (d) matched++; else unmatched.push(`${no} ${unitsText} ${r[C.season]}`);
  const row = {
    unit: d?.unit ?? units[0],
    huntCode: d?.huntCode ?? `${no}-${units[0]}`,
    weapon: WEAPON[wc],
    residency: res === 'R' ? 'resident' : 'nonresident',
    label: `${cls.label} — ${WEAPON_LABEL[wc]}, Units ${unitsText}, ${r[C.season]} (NDOW ${res === 'R' ? 'resident' : 'nonresident'} hunt ${no})`,
    hunters,
    harvest,
    successPct,
  };
  if (!row.weapon) delete row.weapon;
  (out.species[cls.species] ??= []).push(row);
}
for (const list of Object.values(out.species)) {
  list.sort((a, b) => a.huntCode.localeCompare(b.huntCode, 'en', { numeric: true })
    || (a.residency === b.residency ? 0 : a.residency === 'resident' ? -1 : 1));
}

out.source = {
  name: `Nevada Department of Wildlife — ${YEAR} Nevada Big Game Hunt Data (hunt summary workbook)`,
  url: DATA_URL,
};
out.notes = [
  `NDOW ${YEAR} season results per hunt, residency, unit group and season from ${DATA_URL} (sheet "${YEAR} Hunt Summary"; NDOW's post-season mandatory harvest questionnaire).`,
  `hunters = "Hunters Afield" (tag holders who reported hunting); harvest = "Successful Hunters"; successPct = NDOW's "Hunter Success" (successful ÷ hunters afield) × 100, rounded to 0.1.`,
  `Rows with no hunters afield are left out. daysPerHarvest is not published (NDOW reports average hunt days, not days per harvest).`,
  `huntCode matches lib/huntdata/draw/nv.json ("<NDOW hunt number>-<first unit>[-suffix]", joined by hunt number, units, season and sub-area); resident and nonresident rows of the same unit group share the draw row's huntCode and are told apart by residency (resident first). The NDOW hunt number of each row is in its label.`,
  `Classes: antlered / guided / junior mule deer, antelope horns longer / shorter / junior, antlered / antlerless / spike elk, desert / California / Rocky Mountain bighorn, mountain goat. Tag programs outside the main draw (Silver State, PIW, Dream, Heritage, landowner, depredation, incentive, private lands, management rams) are not included.`,
].join(' ');

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

console.log(`wrote ${path.relative(ROOT, OUT)} — NV ${YEAR}`);
for (const [sp, list] of Object.entries(out.species)) console.log(`  ${sp}: ${list.length} rows`);
console.log(`joined to draw rows: ${matched}, unmatched: ${unmatched.length}, skipped (no hunters afield): ${skipped}`);
for (const u of unmatched) console.log('  unmatched ' + u);
if (mismatch.length) { console.log(`success % ≠ harvest/hunters (${mismatch.length}):`); for (const m of mismatch) console.log('  ' + m); }
