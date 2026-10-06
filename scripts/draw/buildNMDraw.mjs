// Builds lib/huntdata/draw/nm.json (DrawFile, see lib/huntdata/draw/format.ts)
// from the New Mexico Department of Game and Fish "Big Game Drawing Odds
// Complete Report" (official NMDGF download, an .xlsx).
//
// Sources (all wildlife.dgf.nm.gov, NMDGF's WordPress download manager):
//   - The report link is listed on
//     /hunting/applications-and-draw-information/how-new-mexico-draw-works/ as
//     "<year> [big game] drawing odds complete report". The newest year is used.
//   - The Hunting Rules & Information booklet for the same license year
//     ("<year>-<year+1> new mexico hunting rules and info", linked from /hunting/)
//     is used only to (a) name the bighorn subspecies of each BHS hunt code and
//     (b) cross-check that the hunt-code middle digit is the sporting arm.
//
// Report layout (one sheet, one header pair per species, then one row per hunt):
//   A hunt code, B unit/description, C licenses,
//   D-G  total applicants 1st/2nd/3rd/total,
//   H-K  resident applicants, L-O nonresident applicants, P-S outfitter applicants,
//   U hunt code (again), V bag, W licenses, X/Y/Z licenses drawn by
//   resident / nonresident / outfitter, AA total drawn,
//   AB-AF resident drawn by 1st/2nd/3rd/4th choice + total,
//   AG-AK nonresident drawn by choice, AL-AP outfitter drawn by choice,
//   AQ-AT distribution % (R / NR / O / total).
//
// New Mexico is a pure random draw (no points). Quotas (rules booklet): at least
// 84% of draw licenses to residents, 10% to applicants (resident or not) using a
// NM-registered outfitter, 6% to nonresidents without an outfitter.
//
// .xlsx is read without dependencies: the zip central directory is walked by
// hand and entries are inflated with node:zlib.
//
// Run: node scripts/draw/buildNMDraw.mjs
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'draw', 'nm.json');
const SITE = 'https://wildlife.dgf.nm.gov';
const ODDS_PAGE = `${SITE}/hunting/applications-and-draw-information/how-new-mexico-draw-works/`;
const HUNT_PAGE = `${SITE}/hunting/`;
const CACHE = path.join(os.tmpdir(), 'nmdraw');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- download
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

async function download(url, name) {
  const file = path.join(CACHE, name);
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (/text\/html/i.test(r.headers.get('content-type') ?? '')) {
      throw new Error(`${url} returned HTML, not a document (blocked or moved?)`);
    }
    writeFileSync(file, buf);
  }
  return file;
}

// newest "<year>[-big-game]-draw[ing]-odds-complete-report" download on the page
function findOddsReport(html) {
  const hits = [...html.matchAll(
    /\/download\/((\d{4})-(?:big-game-)?draw(?:ing)?-odds-complete-report)\/\?wpdmdl=(\d+)/g,
  )].map((m) => ({ slug: m[1], year: +m[2], id: m[3] }));
  if (!hits.length) throw new Error('no drawing-odds complete report linked on ' + ODDS_PAGE);
  hits.sort((a, b) => b.year - a.year);
  const h = hits[0];
  return { ...h, url: `${SITE}/download/${h.slug}/?wpdmdl=${h.id}` };
}

function findRulesBooklet(html, year) {
  const m = html.match(new RegExp(
    `/download/(${year}-${year + 1}-new-mexico-hunting-rules-and-info)/\\?wpdmdl=(\\d+)`,
  ));
  return m ? { url: `${SITE}/download/${m[1]}/?wpdmdl=${m[2]}`, slug: m[1] } : null;
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

// first worksheet → array of rows, each a sparse array of cell strings
function xlsxRows(file) {
  const z = unzip(readFileSync(file));
  const shared = [...(z['xl/sharedStrings.xml']?.toString('utf8') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => xmlDecode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const sheet = Object.keys(z).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  const xml = z[sheet].toString('utf8');
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

function pdfText(file, mode = 'raw') {
  const out = file.replace(/\.pdf$/i, `.${mode}.u.txt`);
  if (!existsSync(out)) execFileSync('pdftotext', [`-${mode}`, '-enc', 'UTF-8', file, out]);
  return readFileSync(out, 'utf8');
}

// ---------------------------------------------------------------- mapping
const SPECIES = { ELK: 'ELK', ANT: 'ANTELOPE', DER: 'DEER', BHS: 'BIGHORNSHEEP' };
// Hunt-code middle digit = sporting arm (checked against the rules booklet below).
const WEAPON = { 1: 'rifle', 2: 'archery', 3: 'muzzleloader' };
const WEAPON_LABEL = { rifle: 'Rifle', archery: 'Archery', muzzleloader: 'Muzzleloader' };

// Bag-limit codes, worded from the rules booklet glossary.
const BAG = {
  ELK: {
    MB: 'Mature bull', 'MB/A': 'Mature bull or antlerless', A: 'Antlerless', ES: 'Either sex',
    'APRE/6': 'Bull, 6+ points on one antler', 'APRE/6/A': 'Bull (6+ points) or antlerless',
  },
  ANTELOPE: { MB: 'Buck', 'F-IM': 'Doe or immature buck', ES: 'Either sex' },
  DEER: {
    FAD: 'Fork-antlered deer', FAMD: 'Fork-antlered mule deer',
    FAWTD: 'Fork-antlered whitetail', ESWTD: 'Either-sex whitetail', A: 'Antlerless deer', ES: 'Either sex',
  },
  BIGHORNSHEEP: { RAM: 'Ram', EWE: 'Ewe' },
};

const num = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error(`not a number: ${v}`);
  return n;
};
const pct = (drawn, apps) => (apps ? Math.round((drawn / apps) * 1000) / 10 : null);

// "Units 2, 7, 9, 10: youth only" → { units: [2,7,9,10], qualifier: 'youth only' }
// Parentheticals are dropped before reading units; "54/55" and "16B/22" list two units.
function parseUnits(desc) {
  const d = desc.trim().replace(/\.\s*$/, '');
  if (/^statewide$/i.test(d)) return { units: [], qualifier: 'statewide' };
  const m = d.match(/^(?:GMU|Units?):?\s*/i);
  if (!m) return { units: [], qualifier: d };
  let rest = d.slice(m[0].length).replace(/\s*\([^)]*\)/g, '');
  const units = [];
  for (;;) {
    const u = rest.match(/^(\d{1,2}[A-Z]?)\b/);
    if (!u) break;
    units.push(u[1]);
    rest = rest.slice(u[0].length);
    const sep = rest.match(/^\s*(?:,|\/|and)\s*(?=\d)/);
    if (!sep) break;
    rest = rest.slice(sep[0].length);
  }
  const paren = (d.match(/\(([^)]*)\)/) || [])[1];
  let qualifier = rest.replace(/^[\s:,\-–]+/, '').trim();
  if (!qualifier && paren && !/TBD/i.test(paren)) qualifier = paren;
  else if (paren && !/TBD/i.test(paren)) qualifier = `${paren}; ${qualifier}`;
  if (paren && /TBD/i.test(paren)) qualifier = qualifier ? `${qualifier}; hunt area chosen after draw` : 'hunt area chosen after draw';
  return { units, qualifier };
}

// ---------------------------------------------------------------- main
const oddsHtml = await getText(ODDS_PAGE);
const report = findOddsReport(oddsHtml);
const xlsx = await download(report.url, `${report.slug}.xlsx`);
const rows = xlsxRows(xlsx);

const huntHtml = await getText(HUNT_PAGE);
const booklet = findRulesBooklet(huntHtml, report.year);
let bhsKind = {};          // BHS hunt code → "Rocky Mountain" | "Desert"
let bookletWeapon = {};    // hunt code → weapon word from the booklet tables
if (booklet) {
  const txt = pdfText(await download(booklet.url, `${booklet.slug}.pdf`));
  for (const m of txt.matchAll(/(Rocky Mountain|Desert) Bighorn (?:Ram|Ewe): Hunt Code (BHS-\d-\d{3})/g)) bhsKind[m[2]] = m[1];
  for (const m of txt.matchAll(/^(Any Legal|Bow|Muzzle)\b[^\n]*?\b((?:ANT|DER|ELK|BHS)-[123]-\d{3})\b/gm)) {
    bookletWeapon[m[2]] = { 'Any Legal': 'rifle', Bow: 'archery', Muzzle: 'muzzleloader' }[m[1]];
  }
} else {
  console.warn(`! no ${report.year}-${report.year + 1} rules booklet link found; BHS subspecies left out of labels`);
}

const species = {};
const skipped = [];
const weaponMismatch = [];
for (const r of rows) {
  const code = (r[0] ?? '').trim();
  const m = code.match(/^([A-Z]{3})-(\d)-(\d{3})$/);
  if (!m || !SPECIES[m[1]]) continue;
  if ((r[20] ?? '').trim() !== code) throw new Error(`row halves disagree: ${code} vs ${r[20]}`);
  const sp = SPECIES[m[1]];
  const desc = (r[1] ?? '').trim();
  const { units, qualifier } = parseUnits(desc);
  if (!units.length) { skipped.push(`${code} (${desc})`); continue; }

  const bag = (r[21] ?? '').trim();
  const weapon = WEAPON[m[2]];
  if (!weapon) throw new Error(`unknown weapon digit in ${code}`);
  if (bookletWeapon[code] && bookletWeapon[code] !== weapon) weaponMismatch.push(`${code}: booklet ${bookletWeapon[code]}`);

  let bagLabel = BAG[sp][bag];
  if (!bagLabel) throw new Error(`unknown bag code ${bag} for ${code}`);
  if (sp === 'BIGHORNSHEEP' && bhsKind[code]) bagLabel = `${bhsKind[code]} bighorn ${bagLabel.toLowerCase()}`;
  let label = `${bagLabel} — ${WEAPON_LABEL[weapon]}`;
  if (qualifier) label += ` (${qualifier})`;

  const N = (i) => num(r[i]);
  const licenses = N(2);
  const app1 = { R: N(7), NR: N(11), O: N(15) };
  const drawnPool = { R: N(23), NR: N(24), O: N(25) };
  const drawn1 = { R: N(27), NR: N(32), O: N(37) };
  const stat = (k) => ({ tags: drawnPool[k], applicants: app1[k], successPct: pct(drawn1[k], app1[k]) });

  const row = {
    huntCode: code,
    unit: units[0],
    ...(units.length > 1 ? { units } : {}),
    label,
    weapon,
    tags: licenses,
    draw: {
      resident: stat('R'),
      nonresident: { ...stat('NR'), pools: [{ name: 'outfitter', ...stat('O') }] },
    },
  };
  (species[sp] ??= []).push(row);

  // self-checks against the report's own totals
  const sum = (a, b, c) => N(a) + N(b) + N(c);
  if (sum(7, 11, 15) !== N(3)) throw new Error(`${code}: 1st-choice applicants don't add up`);
  if (sum(23, 24, 25) !== N(26)) throw new Error(`${code}: drawn by pool doesn't add up`);
  for (const k of ['R', 'NR', 'O']) {
    if (drawn1[k] > app1[k]) throw new Error(`${code} ${k}: 1st-choice drawn > applicants`);
  }
}

const out = {
  state: 'NM',
  year: report.year,
  source: {
    name: `New Mexico Department of Game and Fish — ${report.year} Big Game Drawing Odds Complete Report`,
    url: report.url,
  },
  notes: [
    `NMDGF ${report.year} big-game draw (pure random draw, no points). Source: ${report.url} (xlsx, linked from ${ODDS_PAGE}).`,
    'applicants = FIRST-CHOICE applicants in that pool. successPct = licenses drawn by first-choice applicants in that pool ÷ first-choice applicants × 100 (computed here; NMDGF does not publish a per-pool percentage). Licenses later given to 2nd/3rd/4th choices are not counted.',
    'Pools: NMDGF reports three applicant pools — Resident, Non-Resident, Outfitter. State quota (rules booklet): ≥84% resident, 10% to applicants (resident OR nonresident) applying with a NM-registered outfitter, 6% to nonresidents without an outfitter; antlerless elk and WMA-only hunts are 100% resident; population-management hunts are not under quota. draw.resident = Resident pool; draw.nonresident = Non-Resident pool only; the Outfitter pool is kept separately in draw.nonresident.pools[name="outfitter"] and is never added into the nonresident figures (the report does not say how many outfitter applicants are residents).',
    'DrawStat.tags = licenses actually issued to that pool in the draw (all choices, report columns "Resident / Non-Resident / Outfitter" licenses drawn), not a fixed allotment; DrawRow.tags = licenses authorized for the hunt code. Under-subscribed hunts (e.g. private-land-only) issued fewer licenses than authorized.',
    'weapon from the hunt-code middle digit: 1 = any legal sporting arm (stored as "rifle"), 2 = bow ("archery"), 3 = muzzleloader; checked against the rules booklet hunt tables. label = bag limit (booklet glossary, shortened; FAD = fork-antlered mule deer or whitetail, pronghorn \"Buck\" = horns longer than ears) + weapon, with the report\'s area qualifier (youth only, mobility impaired, WMA, private land, etc.) in parentheses. "Whitetail" is NMDGF\'s wording; the report does not name subspecies (SW units 21–27 whitetail hunts are Coues range, NE units 41–59 are not). Bighorn subspecies (Rocky Mountain vs Desert) per hunt code come from the rules booklet. Bighorn ram hunts BHS-1-201/204 span several GMUs with the area chosen after the draw; units[] lists all of them.',
    'unit = GMU as NMDGF writes it; "54/55", "16B/22" etc. are both units. Area qualifiers like "north of US 380" map to the whole GMU. No season dates: the draw report does not include them.',
    skipped.length ? `Skipped (no GMU, statewide): ${skipped.join(', ')}.` : '',
    booklet ? `Rules booklet: ${booklet.url}` : '',
  ].filter(Boolean).join(' '),
  species,
};

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');

// ---------------------------------------------------------------- report
console.log(`wrote ${path.relative(ROOT, OUT)} — NM ${report.year}`);
for (const [sp, list] of Object.entries(species)) {
  const w = list.reduce((a, h) => ((a[h.weapon] = (a[h.weapon] ?? 0) + 1), a), {});
  console.log(`  ${sp.padEnd(13)} ${String(list.length).padStart(4)} hunts`, JSON.stringify(w));
}
if (skipped.length) console.log('  skipped:', skipped.join('; '));
console.log(`  booklet weapon cross-check: ${Object.keys(bookletWeapon).length} hunt codes read, ${weaponMismatch.length} disagree`);
if (weaponMismatch.length) console.log(`  ! booklet weapon disagrees with code digit (${weaponMismatch.length}):`, weaponMismatch.join('; '));
let bad = 0;
for (const list of Object.values(species)) for (const h of list) {
  for (const s of [h.draw.resident, h.draw.nonresident, h.draw.nonresident.pools[0]]) {
    if (s.successPct != null && (s.successPct < 0 || s.successPct > 100)) { bad++; console.log('  ! pct out of range', h.huntCode); }
  }
}
console.log(bad ? `  ${bad} range problems` : '  all successPct within 0–100; drawn ≤ applicants per pool');
