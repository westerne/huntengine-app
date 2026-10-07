// Builds lib/huntdata/draw/nv.json (DrawFile, see lib/huntdata/draw/format.ts)
// from Nevada Department of Wildlife (NDOW) main big-game draw publications.
//
// Sources (all www.ndow.org, found through NDOW's own WordPress media API,
// /wp-json/wp/v2/media?search=...):
//   - "<Species>-<Class>-Bonus-Point-and-Application-Trend[-Resident|-NonResident]-<year>.pdf"
//     One block per hunt (residency + unit group + season + weapon): quota, and
//     for each bonus-point level the successful applicants and total applicants
//     by choice (1st-5th). The newest year with these reports is used.
//   - "<year>-Nevada-Big-Game-Hunt-Data.xlsx" — used only for hunts in the
//     classes below that have no bonus-point block (quota only, draw stats null).
//   - Commission Regulation "<year> Big Game Quotas" (CR 25-13 for 2025) and the
//     Restricted Nonresident Guided Mule Deer CR — used only to confirm that each
//     NDOW hunt number in HUNT_NUMBERS below is printed in the regulation.
//
// NDOW numbers hunts per class/residency/weapon (e.g. 1331 = resident antlered
// mule deer, any legal weapon) and the applicant picks a unit group inside that
// hunt. One DrawRow here = one unit group + season + weapon of one class, with the
// resident hunt and the nonresident hunt merged into draw.resident / draw.nonresident.
// huntCode = "<resident hunt number, or nonresident if no resident hunt>-<first unit>",
// e.g. "1331-011"; when that collides (same group split into Early/Mid/Late
// seasons, or two groups starting with the same unit) a season suffix is added.
// Both NDOW hunt numbers are kept in the label.
//
// PDFs are read with pdftotext -table (xpdf/poppler); .xlsx is read without
// dependencies (zip central directory walked by hand, node:zlib inflate).
//
// Run: node scripts/draw/buildNVDraw.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'draw', 'nv.json');
const SITE = 'https://www.ndow.org';
const CACHE = path.join(os.tmpdir(), 'nvdraw');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- download
async function getJson(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  const t = await r.text();
  try { return JSON.parse(t); } catch { throw new Error(`${url} did not return JSON (blocked?)`); }
}

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

// every media-library URL matching a search (NDOW WordPress REST API)
async function mediaSearch(q) {
  const urls = [];
  for (let page = 1; page < 20; page++) {
    const u = `${SITE}/wp-json/wp/v2/media?search=${encodeURIComponent(q)}&per_page=100&page=${page}&_fields=source_url,date`;
    const r = await fetch(u, { headers: UA });
    if (r.status === 400) break; // past the last page
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

function pdfText(file, mode) {
  const out = file.replace(/\.pdf$/i, `.${mode}.txt`);
  if (!existsSync(out)) execFileSync('pdftotext', [`-${mode}`, '-enc', 'UTF-8', file, out], { stdio: 'ignore' });
  return readFileSync(out, 'utf8');
}

// ---------------------------------------------------------------- classes
// Hunt classes in scope. pdf = bonus-point report filename prefix; xlsx = "Hunt"
// column of the Hunt Data workbook; title = block title after "Res"/"NR".
// HUNT_NUMBERS: NDOW hunt number per residency and weapon code, as printed in
// CR 25-13 (2025 Big Game Quotas) and CR 25-10 (NR guided mule deer).
const CLASSES = [
  { id: 'deer', species: 'DEER', pdf: 'Mule-Deer-Antlered-', xlsx: 'Mule Deer Antlered', title: /^Mule Deer Antlered$/, label: 'Antlered mule deer',
    nums: { R: { ALW: '1331', AR: '1341', M: '1371', WR: '1331' }, NR: { ALW: '1332', AR: '1342', M: '1372', WR: '1332' } } },
  { id: 'deer-guided', species: 'DEER', pdf: 'Mule-Deer-NonResident-Guided-', xlsx: 'Mule Deer Guided Antlered', title: /^Restricted Antlered Mule Deer/, label: 'Antlered mule deer, nonresident guided',
    nums: { NR: { ALW: '1235', WR: '1235' } } },
  { id: 'deer-junior', species: 'DEER', pdf: 'Mule-Deer-Junior-', xlsx: 'Mule Deer Junior', title: /^Mule Deer Junior Antlered$/, label: 'Junior antlered mule deer',
    // unit 203's classic hunt is printed "Shotgun or Bow Only" in the report but "SWR" (hunt 1107) in the workbook / CR 25-13
    weaponAlias: { WR: 'SWR' },
    nums: { R: { ALW: '1106', SWR: '1107', 'SWR-Prmtve': '1105' } } },
  { id: 'ant-longer', species: 'ANTELOPE', pdf: 'Antelope-Horns-Longer-', xlsx: 'Antelope Horns Longer Than Ears', title: /^Antelope Horns Longer Than Ears$/, label: 'Antelope, horns longer than ears',
    nums: { R: { ALW: '2151', AR: '2161', M: '2171' }, NR: { ALW: '2251', AR: '2261', M: '2271' } } },
  { id: 'ant-shorter', species: 'ANTELOPE', pdf: 'Antelope-Horns-Shorter-', xlsx: 'Antelope Horns Shorter Than Ears', title: /^Antelope Horns Shorter Than Ears$/, label: 'Antelope, horns shorter than ears',
    nums: { R: { ALW: '2181' } } },
  { id: 'ant-junior', species: 'ANTELOPE', pdf: 'Antelope-Junior-Horns-Shorter-', xlsx: 'Junior Antelope Horns Shorter Than Ears', title: /^Junior Antelope - Horns Shorter Than Ears$/, label: 'Junior antelope, horns shorter than ears',
    nums: { R: { ALW: '2191' } } },
  { id: 'elk-antlered', species: 'ELK', pdf: 'Elk-Antlered-', xlsx: 'Elk Antlered', title: /^Elk Antlered$/, label: 'Antlered elk',
    nums: { R: { ALW: '4151', AR: '4161', M: '4156' }, NR: { ALW: '4251', AR: '4261', M: '4256' } } },
  { id: 'elk-antlerless', species: 'ELK', pdf: 'Elk-Antlerless-', xlsx: 'Elk Antlerless', title: /^Elk Antlerless$/, label: 'Antlerless elk',
    nums: { R: { ALW: '4181', AR: '4111', M: '4176' }, NR: { ALW: '4281', AR: '4211', M: '4276' } } },
  { id: 'elk-spike', species: 'ELK', pdf: 'Elk-Spike-', xlsx: 'Elk Spike', title: /^Elk Spike$/, label: 'Spike elk',
    nums: { R: { ALW: '4651' } } },
  { id: 'dbhs-ram', species: 'BIGHORNSHEEP', pdf: 'Desert-Bighorn-Any-Ram-', xlsx: 'Desert Bighorn Sheep Any Ram', title: /^Nelson \(Desert\) Bighorn Sheep Any Ram$/, label: 'Desert (Nelson) bighorn, any ram',
    nums: { R: { ALW: '3151', AR: '3161' }, NR: { ALW: '3251' } } },
  { id: 'dbhs-ewe', species: 'BIGHORNSHEEP', pdf: 'Desert-Bighorn-Any-Ewe-', xlsx: 'Desert Bighorn Sheep Any Ewe', title: /^Nelson \(Desert\) Bighorn Sheep Any Ewe$/, label: 'Desert (Nelson) bighorn, any ewe',
    nums: { R: { ALW: '3181' }, NR: { ALW: '3281' } } },
  { id: 'cbhs-ram', species: 'BIGHORNSHEEP', pdf: 'California-Bighorn-Any-Ram-', xlsx: 'California Bighorn Sheep Any Ram', title: /^California Bighorn Sheep Any Ram$/, label: 'California bighorn, any ram',
    nums: { R: { ALW: '8151' }, NR: { ALW: '8251' } } },
  { id: 'rmbhs-ram', species: 'BIGHORNSHEEP', pdf: 'Rocky-Mountain-Bighorn-Any-Ram-', xlsx: 'Rocky Mountain Bighorn Sheep Any Ram', title: /^Rocky Mountain Bighorn Sheep Any Ram$/, label: 'Rocky Mountain bighorn, any ram',
    nums: { R: { ALW: '9151' } } },
  { id: 'goat', species: 'MTNGOAT', pdf: 'Mountain-Goat-Any-Goat-', xlsx: 'Mountain Goat Either Sex', title: /^Mountain Goat Either Sex$/, label: 'Mountain goat, either sex',
    nums: { R: { ALW: '7151' }, NR: { ALW: '7251' } } },
];

// weapon code (xlsx) ← weapon line (bonus-point report)
const WEAPON_CODE = {
  'Any Legal Weapon': 'ALW', Archery: 'AR', Muzzleloader: 'M',
  'Shotgun or Bow Only': 'WR', Classic: 'SWR', Primitive: 'SWR-Prmtve',
};
const WEAPON = { ALW: 'rifle', AR: 'archery', M: 'muzzleloader' }; // others: no single weapon
const WEAPON_LABEL = {
  ALW: 'Any Legal Weapon', AR: 'Archery', M: 'Muzzleloader', WR: 'Shotgun or Bow Only (weapon restriction)',
  SWR: 'Classic (archery, muzzleloader or any legal weapon by season)', 'SWR-Prmtve': 'Primitive (archery or muzzleloader by season)',
};

// ---------------------------------------------------------------- helpers
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
const num = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error(`not a number: ${v}`);
  return n;
};
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

// "061, 062, 064, 066 - 068, 101-103, Portion of 144 in Eureka Co." → ['061',...,'144']
function parseUnits(s) {
  const clean = s.replace(/\(.*?\)/g, ' ').replace(/[–—�]/g, '-');
  const out = [];
  for (const m of clean.matchAll(/\b(\d{3})[A-Z]?\b(?:\s*-\s*(\d{3})\b)?/g)) {
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (b < a || b - a > 20) throw new Error(`odd unit range in "${s}"`);
    for (let u = a; u <= b; u++) out.push(String(u).padStart(3, '0'));
  }
  return [...new Set(out)];
}

// sub-area words of a unit-group text: "035 - Bloody Runs (see CR 25-07)" → "Bloody Runs"
function areaOf(s) {
  return s.replace(/\(.*?\)/g, ' ').replace(/\(see.*$/i, ' ').replace(/\b\d{3}[A-Z]?\b/g, ' ')
    .replace(/\b(portion|of|in|unit|restrictions|additional|requirement|applies|within|mile|co)\b\.?/gi, ' ')
    .replace(/[^A-Za-z]+/g, ' ').trim();
}

// "Oct 05, 2025 - Nov 05, 2025" → { open, close } ISO; "Oct 05 - Nov 05" (xlsx) → month-day key only
function parseSeason(s) {
  const m = s.match(/([A-Z][a-z]{2,3})\s+(\d{1,2}),\s*(\d{4})\s*-\s*([A-Z][a-z]{2,3})\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  return {
    open: `${m[3]}-${pad(MONTHS[m[1]])}-${pad(m[2])}`,
    close: `${m[6]}-${pad(MONTHS[m[4]])}-${pad(m[5])}`,
  };
}
const seasonKeyIso = (s) => (s ? `${s.open.slice(5)}|${s.close.slice(5)}` : '');
// split seasons ("Aug 10 - Oct 04; Dec 11 - Jan 01") → first open | last close, as the PDFs print them
function seasonKeyXlsx(s) {
  const all = [...String(s ?? '').matchAll(/([A-Z][a-z]{2,3})\s+(\d{1,2})\s*-\s*([A-Z][a-z]{2,3})\s+(\d{1,2})/g)];
  if (!all.length) return '';
  const a = all[0], z = all[all.length - 1];
  return `${pad(MONTHS[a[1]])}-${pad(a[2])}|${pad(MONTHS[z[3]])}-${pad(z[4])}`;
}

// ---------------------------------------------------------------- bonus-point report parser
// pdftotext -table keeps one table row per line. A hunt block:
//   "<Res|NR> <title>" / "Units: ..." / "Season: ..." / "Weapon ..." / "Quota: n"
//   header "Bonus Points 1st 2nd 3rd 4th 5th 1st 2nd 3rd 4th 5th Applicants"
//   rows "<points> [successful by choice, blank cells omitted] <5 applicant counts>"
//   "Total <5 successful> <5 applicants> <total applicants>"
// Successful cells are sparse, so each is assigned to the 1st-5th column whose
// header position is nearest; the Total row then checks every column sum.
function parseReport(text, file) {
  const blocks = [];
  let b = null;
  let cols = null; // char offsets of successful 1st..5th headers
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\f/g, '');
    const t = line.trim().replace(/\s+/g, ' ');
    if (!t) continue;
    let m;
    if ((m = t.match(/^(Res|NR) (.+)$/))) {
      b = { file, residency: m[1] === 'Res' ? 'R' : 'NR', title: m[2], rows: [], total: null };
      blocks.push(b);
      cols = null;
      continue;
    }
    if (!b) continue;
    if ((m = t.match(/^Units:\s*(.+)$/))) { b.unitsText = m[1]; continue; }
    if ((m = t.match(/^Season:\s*(.+)$/))) { b.seasonText = m[1]; continue; }
    if ((m = t.match(/^Weapon\s+(.+)$/))) { b.weaponText = m[1]; continue; }
    if ((m = t.match(/^Quota:\s*([\d,]+)$/))) { b.quota = num(m[1]); continue; }
    if (/^Bonus Points\b/.test(t)) {
      const pos = [...line.matchAll(/\b(1st|2nd|3rd|4th|5th)\b/g)].map((x) => x.index + x[0].length / 2);
      cols = pos.slice(0, 5);
      continue;
    }
    const toks = [...line.matchAll(/[\d,]+/g)].map((x) => ({ v: num(x[0]), at: x.index + x[0].length / 2 }));
    if (/^Total\b/.test(t) && cols && !/Applicants/.test(t.replace(/^Total/, ''))) {
      if (toks.length !== 11) throw new Error(`${file}: Total row has ${toks.length} numbers: "${t}"`);
      b.total = { drawn: toks.slice(0, 5).map((x) => x.v), apps: toks.slice(5, 10).map((x) => x.v), all: toks[10].v };
      // the Total row prints all five successful cells (zeros included): their
      // positions are the column anchors; the header positions are a fallback
      b.anchors = toks.slice(0, 5).map((x) => x.at);
      continue;
    }
    if (/^\d+\s/.test(t) && cols && !b.total && !/Page|\//.test(t)) {
      if (toks.length < 6) continue;
      const pts = toks[0].v;
      const apps = toks.slice(-5).map((x) => x.v);
      b.cols = cols;
      b.rows.push({ points: pts, apps, cells: toks.slice(1, -5) });
    }
  }
  for (const blk of blocks) {
    blk.ok = false;
    if (!blk.total) { blk.problem = 'no Total row'; continue; }
    const place = (anchors) => {
      for (const r of blk.rows) {
        r.succ = [0, 0, 0, 0, 0];
        for (const x of r.cells) {
          let best = 0;
          for (let k = 1; k < 5; k++) if (Math.abs(anchors[k] - x.at) < Math.abs(anchors[best] - x.at)) best = k;
          r.succ[best] += x.v;
        }
      }
      return [0, 1, 2, 3, 4].every((k) => blk.rows.reduce((a, r) => a + r.succ[k], 0) === blk.total.drawn[k]);
    };
    if (!place(blk.anchors) && blk.cols) place(blk.cols);
    const sumCol = (key, k) => blk.rows.reduce((a, r) => a + r[key][k], 0);
    const appsOk = [0, 1, 2, 3, 4].every((k) => sumCol('apps', k) === blk.total.apps[k]);
    const succOk = [0, 1, 2, 3, 4].every((k) => sumCol('succ', k) === blk.total.drawn[k]);
    const allOk = blk.total.apps.reduce((a, v) => a + v, 0) === blk.total.all;
    blk.ok = appsOk && succOk && allOk;
    if (!blk.ok) blk.problem = `column sums differ from Total row (apps ${appsOk}, successful ${succOk}, total ${allOk})`;
  }
  return blocks;
}

// ---------------------------------------------------------------- main
const trendHits = (await mediaSearch('Bonus Point and Application Trend'))
  .filter((h) => /Bonus-Point-and-Application-Trend.*-(\d{4})(-\d+)?\.pdf$/i.test(h.url));
const years = trendHits.map((h) => +h.url.match(/-(\d{4})(?:-\d+)?\.pdf$/i)[1]);
const YEAR = Math.max(...years);
// newest upload per report name (NDOW sometimes re-uploads as "...-2025-1.pdf")
const reports = new Map();
for (const h of trendHits.sort((a, b) => a.date.localeCompare(b.date))) {
  const name = h.url.split('/').pop().replace(/(-\d{4})(-\d+)?\.pdf$/i, '$1.pdf');
  if (name.endsWith(`-${YEAR}.pdf`)) reports.set(name, h.url);
}

const dataHits = (await mediaSearch('Nevada Big Game Hunt Data'))
  .filter((h) => new RegExp(`/${YEAR}-Nevada-Big-Game-Hunt-Data[^/]*\\.xlsx$`, 'i').test(h.url));
if (!dataHits.length) throw new Error(`no ${YEAR}-Nevada-Big-Game-Hunt-Data.xlsx in the NDOW media library`);
const DATA_URL = dataHits.sort((a, b) => b.date.localeCompare(a.date))[0].url;

const quotaHits = (await mediaSearch('Big Game Quotas'))
  .filter((h) => new RegExp(`${YEAR}-Big-Game-Quotas.*(Approved|FINAL)[^/]*\\.pdf$`, 'i').test(h.url));
const guidedHits = (await mediaSearch('Restricted Nonresident Guided'))
  .filter((h) => new RegExp(`${YEAR}-${YEAR + 1}-Restricted-Nonresident-Guided[^/]*\\.pdf$`, 'i').test(h.url));
const QUOTA_URL = quotaHits.sort((a, b) => b.date.localeCompare(a.date))[0]?.url;
const GUIDED_URL = guidedHits.sort((a, b) => b.date.localeCompare(a.date))[0]?.url;

// hunt numbers must appear in the regulation text
const regText = [];
for (const u of [QUOTA_URL, GUIDED_URL].filter(Boolean)) regText.push(pdfText(await download(u), 'table'));
const reg = regText.join('\n').replace(/\s+/g, ' ');
for (const c of CLASSES) for (const res of Object.keys(c.nums)) for (const n of new Set(Object.values(c.nums[res]))) {
  if (!new RegExp(`(Hunt (Resident )?|Muzzleloader )${n}\\b`).test(reg)) {
    console.warn(`warning: hunt number ${n} (${c.id} ${res}) not found in ${YEAR} quota regulations`);
  }
}

// bonus-point blocks
const blocks = [];
const usedReports = [];
for (const [name, url] of [...reports.entries()].sort()) {
  const cls = CLASSES.find((c) => name.startsWith(c.pdf));
  if (!cls) continue; // bear, moose
  usedReports.push(url);
  const text = pdfText(await download(url), 'table');
  for (const blk of parseReport(text, name)) {
    if (!cls.title.test(blk.title.replace(/\s+/g, ' '))) {
      throw new Error(`${name}: unexpected block title "${blk.title}"`);
    }
    blk.cls = cls;
    blocks.push(blk);
  }
}

// workbook rows (fallback quota for hunts missing from the bonus-point reports)
const xrows = xlsxRows(await download(DATA_URL));
const hdr = xrows[0].map((h) => String(h ?? '').replace(/\s+/g, ' ').trim());
const col = (name) => { const i = hdr.indexOf(name); if (i < 0) throw new Error(`no "${name}" column`); return i; };
const C = { year: col('year'), hunt: col('Hunt'), res: col('Residency'), weapon: col('Weapon'), units: col('Unit Group'),
  season: col('Season'), quota: col(`${YEAR} Quota`) };
const xlsx = xrows.slice(1).filter((r) => String(r[C.year]) === String(YEAR)).map((r) => ({
  hunt: r[C.hunt], res: r[C.res], weapon: r[C.weapon], unitsText: r[C.units], season: r[C.season], quota: num(r[C.quota]),
}));

// one record per (class, residency, weapon, units, season)
const recs = [];
const problems = [];
for (const blk of blocks) {
  let wc = WEAPON_CODE[blk.weaponText?.replace(/\s+/g, ' ')];
  if (!wc) throw new Error(`${blk.file}: unknown weapon "${blk.weaponText}"`);
  wc = blk.cls.weaponAlias?.[wc] ?? wc;
  if (!blk.cls.nums[blk.residency]?.[wc]) throw new Error(`${blk.file}: no NDOW hunt number for ${blk.residency} ${wc}`);
  const season = parseSeason(blk.seasonText ?? '');
  const units = parseUnits(blk.unitsText ?? '');
  if (!units.length) throw new Error(`${blk.file}: no units in "${blk.unitsText}"`);
  if (!blk.ok) problems.push(`${blk.file} ${blk.residency} ${blk.unitsText}: ${blk.problem}`);
  recs.push({ cls: blk.cls, res: blk.residency, wc, units, unitsText: blk.unitsText.replace(/\s+/g, ' '), area: areaOf(blk.unitsText), season,
    seasonKey: seasonKeyIso(season), quota: blk.quota ?? null, blk });
}
const unitKey = (r) => [...r.units].sort().join(',');
const recKey = (r) => `${r.cls.id}|${r.res}|${r.wc}|${unitKey(r)}|${r.seasonKey}`;
const have = new Set(recs.map(recKey)); // workbook rows have no sub-area text, so area is ignored here
let fromXlsxOnly = 0;
for (const x of xlsx) {
  const cls = CLASSES.find((c) => c.xlsx === x.hunt);
  if (!cls) continue;
  const res = x.res === 'R' ? 'R' : x.res === 'NR' ? 'NR' : null;
  if (!res || !cls.nums[res]?.[x.weapon]) continue;
  const units = parseUnits(String(x.unitsText));
  const r = { cls, res, wc: x.weapon, units, unitsText: String(x.unitsText), area: '', season: null, seasonKey: seasonKeyXlsx(x.season), quota: x.quota, blk: null };
  if (have.has(recKey(r))) continue;
  have.add(recKey(r));
  recs.push(r);
  fromXlsxOnly++;
}

// merge resident + nonresident of the same class / weapon / units / season
const groups = new Map();
for (const r of recs) {
  const k = `${r.cls.id}|${r.wc}|${unitKey(r)}|${r.area}|${r.seasonKey}`;
  if (!groups.has(k)) groups.set(k, { cls: r.cls, wc: r.wc, units: r.units, area: r.area, seasonKey: r.seasonKey, R: null, NR: null });
  const g = groups.get(k);
  if (g[r.res]) throw new Error(`duplicate ${r.res} hunt for ${k}`);
  g[r.res] = r;
}

function drawStat(r) {
  if (!r) return null;
  const blk = r.blk;
  if (!blk?.total) return { tags: r.quota, applicants: null, successPct: null };
  const apps = blk.total.apps[0];
  const drawn = blk.total.drawn[0];
  const stat = { tags: r.quota, applicants: apps, successPct: pct(drawn, apps) };
  if (blk.ok) {
    const firstDraw = blk.rows.filter((x) => x.succ[0] > 0).map((x) => x.points);
    stat.minPoints = firstDraw.length ? Math.min(...firstDraw) : null;
  }
  return stat;
}
function pointLines(r) {
  if (!r?.blk?.ok) return null;
  return r.blk.rows
    .filter((x) => x.apps[0] > 0 || x.succ[0] > 0)
    .map((x) => ({ points: x.points, applicants: x.apps[0], drawn: x.succ[0] }));
}

const out = { state: 'NV', year: YEAR, source: null, notes: null, species: {} };
const bySpecies = {};
for (const g of groups.values()) {
  const resNo = g.R ? g.cls.nums.R[g.wc] : null;
  const nrNo = g.NR ? g.cls.nums.NR[g.wc] : null;
  const any = g.R ?? g.NR;
  const season = g.R?.season ?? g.NR?.season ?? null;
  const nums = [resNo && `resident hunt ${resNo}`, nrNo && `nonresident hunt ${nrNo}`].filter(Boolean).join(', ');
  const row = {
    huntCode: `${resNo ?? nrNo}-${g.units[0]}`,
    unit: g.units[0],
    units: g.units.length > 1 ? g.units : undefined,
    label: `${g.cls.label} — ${WEAPON_LABEL[g.wc]}, Units ${any.unitsText} (NDOW ${nums})`,
    weapon: WEAPON[g.wc],
    season: season ?? undefined,
    draw: { resident: drawStat(g.R), nonresident: drawStat(g.NR) },
  };
  const pl = {};
  const pr = pointLines(g.R), pn = pointLines(g.NR);
  if (pr?.length) pl.resident = pr;
  if (pn?.length) pl.nonresident = pn;
  if (Object.keys(pl).length) row.pointLines = pl;
  row._sort = g.seasonKey;
  row._area = g.area;
  (bySpecies[g.cls.species] ??= []).push(row);
}

// unique huntCode per species: suffix Early/Mid/Late (by season open) or a counter
for (const [sp, rows] of Object.entries(bySpecies)) {
  const byCode = new Map();
  for (const r of rows) (byCode.get(r.huntCode) ?? byCode.set(r.huntCode, []).get(r.huntCode)).push(r);
  for (const [code, list] of byCode) {
    if (list.length < 2) continue;
    list.sort((a, b) => (a.season?.open ?? a._sort).localeCompare(b.season?.open ?? b._sort));
    const sameUnits = new Set(list.map((r) => [...(r.units ?? [r.unit])].sort().join(','))).size === 1;
    const seasonsDiffer = new Set(list.map((r) => r._sort)).size === list.length;
    const areas = list.map((r) => r._area.split(' ').filter(Boolean).slice(0, 3).join(''));
    const areasDiffer = new Set(areas).size === list.length && areas.every(Boolean);
    const words = sameUnits && seasonsDiffer && list.length === 2 ? ['Early', 'Late']
      : sameUnits && seasonsDiffer && list.length === 3 ? ['Early', 'Mid', 'Late']
      : areasDiffer ? areas : null;
    list.forEach((r, i) => { r.huntCode = `${code}-${words ? words[i] : i + 1}`; });
  }
  rows.sort((a, b) => a.huntCode.localeCompare(b.huntCode, 'en', { numeric: true }));
  for (const r of rows) { delete r._sort; delete r._area; }
  if (new Set(rows.map((r) => r.huntCode)).size !== rows.length) throw new Error(`${sp}: duplicate huntCode`);
  out.species[sp] = rows;
}

out.source = {
  name: `Nevada Department of Wildlife — ${YEAR} Big Game Main Draw, Bonus Point and Application Choice Trends reports`,
  url: `${SITE}/apply-buy/apply-buy-hunting/`,
};
out.notes = [
  `NDOW ${YEAR} main big-game draw (random draw with bonus points: each applicant gets points² + 1 draw numbers, lowest number wins).`,
  `Draw numbers come from NDOW's per-hunt "Bonus Point and Application Choice Trends" reports (www.ndow.org/wp-content/uploads, one PDF per species class and weapon, some split by residency): ${usedReports.join(' ; ')}.`,
  `One row = one unit group + season + weapon of one hunt class; NDOW's resident hunt and nonresident hunt for that unit group are merged into draw.resident / draw.nonresident. huntCode = "<NDOW hunt number>-<first unit>" (resident number when a resident hunt exists, else the nonresident number); a suffix (-Early/-Mid/-Late by season, or -1/-2) is added when a hunt number and first unit repeat. Both NDOW hunt numbers are in the label. Hunt numbers per class/weapon are from Commission Regulation ${YEAR} Big Game Quotas (${QUOTA_URL ?? 'not found'}) and the Restricted Nonresident Guided Mule Deer regulation (${GUIDED_URL ?? 'not found'}).`,
  `DrawStat.tags = the quota printed for that residency's hunt. applicants = FIRST-CHOICE applicants (all bonus-point levels). successPct = first-choice successful ÷ first-choice applicants × 100, computed here. Tags filled from 2nd-5th choices are not counted. minPoints = lowest bonus-point level where a first-choice applicant drew — Nevada's draw is random, so this is not a cutoff.`,
  `pointLines: per bonus-point level, applicants = first-choice applicants at that level, drawn = first-choice successful at that level (levels with no first-choice applicants dropped). Successful cells are blank when zero in the PDF and are placed by column position; a block's pointLines are kept only when every column sums to the report's Total row.`,
  `Weapon: Any Legal Weapon → rifle, Archery → archery, Muzzleloader → muzzleloader; Shotgun-or-Bow-only, junior Classic and junior Primitive hunts have no single weapon. Units: unit groups as NDOW prints them; ranges like "066 - 068" are expanded; "Portion of 144…" and "113N" map to the whole unit.`,
  `${fromXlsxOnly} hunt/residency entries are in the ${YEAR} Nevada Big Game Hunt Data workbook (${DATA_URL}) but have no bonus-point block; they carry the quota only (applicants/successPct null).`,
  `Not included: Silver State, Partnership in Wildlife, Dream, Heritage, landowner/depredation/incentive/private-lands hunts, management/one-horn desert bighorn rams (no bonus points), black bear and moose.`,
].join(' ');

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

// ---------------------------------------------------------------- report
console.log(`wrote ${path.relative(ROOT, OUT)} — NV ${YEAR}`);
console.log(`bonus-point reports: ${usedReports.length}, blocks: ${blocks.length} (${blocks.filter((b) => b.ok).length} with checked pointLines), workbook-only entries: ${fromXlsxOnly}`);
for (const [sp, rows] of Object.entries(out.species)) {
  const withR = rows.filter((r) => r.draw.resident?.applicants != null).length;
  const withNR = rows.filter((r) => r.draw.nonresident?.applicants != null).length;
  const withPL = rows.filter((r) => r.pointLines).length;
  console.log(`  ${sp}: ${rows.length} rows; resident stats ${withR}, nonresident stats ${withNR}, pointLines ${withPL}`);
}
if (problems.length) {
  console.log(`blocks without pointLines (${problems.length}):`);
  for (const p of problems) console.log('  ' + p);
}
