// Builds lib/huntdata/draw/az.json (DrawFile, see lib/huntdata/draw/format.ts)
// from Arizona Game and Fish Department's published draw reports.
//
// Sources (all on AZGFD's official document host, the S3 bucket behind
// azgfd.com/wp-content/uploads — azgfd.com itself sits behind a Cloudflare
// challenge, the bucket does not):
//   - "<year> M" = Pronghorn & Elk draw:  Draw Report – Bonus Point Pass,
//     Draw Report – 1-2 Pass, Bonus Point Report.
//   - "<year> F" = Fall draw (deer, bighorn sheep, …): same three reports.
//   - Hunt descriptions (GMUs, legal wildlife, season type) come from the
//     matching regulations booklets, because the draw reports list only the
//     hunt number.
//
// The script lists the bucket, picks the newest year that has all needed files
// for each draw, downloads them (cached in os.tmpdir()/azdraw), runs
// `pdftotext -raw` (the cleanest of -table/-raw/-layout for these reports), and
// parses.
//
// Draw-report row layout (All/Res/NonRes rows):
//   authorized, available, 1st apps, 2nd apps, 1st+2nd apps, 1st drawn,
//   2nd drawn, "second issued first", issued this pass, grand total issued
//   [, unissued — All row only]
// Bonus Point Report row: hunt, points, then T/R/NR triples for 1st-choice
// apps, 2nd-choice apps, 1st+2nd apps, issued in bonus pass, issued bonus+1-2.
//
// Run: node scripts/draw/buildAZDraw.mjs
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'draw', 'az.json');
const BUCKET = 'https://azgfd-portal-wordpress-pantheon.s3.us-west-2.amazonaws.com/';
const CACHE = path.join(os.tmpdir(), 'azdraw');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- download
async function listBucket(prefix) {
  const keys = [];
  let marker = '';
  for (;;) {
    const url = `${BUCKET}?prefix=${encodeURIComponent(prefix)}&marker=${encodeURIComponent(marker)}`;
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    const xml = await r.text();
    const ks = [...xml.matchAll(/<Key>([^<]+)<\/Key><LastModified>([^<]+)<\/LastModified>/g)]
      .map((m) => ({ key: m[1], modified: m[2] }));
    keys.push(...ks);
    if (!/<IsTruncated>true/.test(xml) || !ks.length) break;
    marker = ks.at(-1).key;
  }
  return keys.filter((k) => /\.pdf$/i.test(k.key));
}

async function download(key) {
  const file = path.join(CACHE, path.basename(key));
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(BUCKET + key, { headers: UA });
    if (!r.ok) throw new Error(`${key} → ${r.status}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}

function pdfText(file, mode = 'raw') {
  const out = file.replace(/\.pdf$/i, `.${mode}.u.txt`);
  if (!existsSync(out)) execFileSync('pdftotext', [`-${mode}`, '-enc', 'UTF-8', file, out]);
  return readFileSync(out, 'utf8');
}

// newest key whose basename matches re (ties → latest upload)
function newest(keys, re) {
  return keys
    .map((k) => ({ ...k, m: path.basename(k.key).match(re) }))
    .filter((k) => k.m)
    .sort((a, b) => b.m[1] - a.m[1] || b.modified.localeCompare(a.modified))[0] ?? null;
}

// ---------------------------------------------------------- draw reports
const num = (t) => (t == null ? null : Number(String(t).replace(/,/g, '')));

// Draw reports are read from `pdftotext -table`, which keeps column positions:
// a blank cell (e.g. no second-choice applicants) just drops out of -raw text and
// would shift every later column. Each value is assigned to the nearest column
// start taken from the last fully populated All row (11 values).
const FIELDS = ['authorized', 'available', 'app1', 'app2', 'app12', 'drawn1', 'drawn2', 'secondIssuedFirst', 'issuedPass', 'grandTotal', 'unissued'];

// → Map(hunt → { All, Res, NonRes } with named fields; null where the cell is blank)
function parseDrawReport(txt) {
  const hunts = new Map();
  let cur = null, cols = null, short = 0;
  for (const line of txt.split(/\r?\n/)) {
    let m = line.match(/^(\d{4})\s+\d+\s+\d+\s+\d+\s*$/);
    if (m) { cur = { All: null, Res: null, NonRes: null }; hunts.set(m[1], cur); continue; }
    m = line.match(/^(All|Res|NonRes)\s+[\d.]/);
    if (!m || !cur) continue;
    const toks = [...line.slice(m[1].length).matchAll(/\S+/g)].map((t) => ({ v: num(t[0]), x: t.index + m[1].length }));
    if (m[1] === 'All' && toks.length === 11) cols = toks.map((t) => t.x);
    const row = Object.fromEntries(FIELDS.map((f) => [f, null]));
    const full = toks.length === (m[1] === 'All' ? 11 : 10);
    if (full) toks.forEach((t, i) => (row[FIELDS[i]] = t.v));
    else {
      if (!cols) continue;
      short++;
      for (const t of toks) {
        let best = 0;
        cols.forEach((c, i) => { if (Math.abs(c - t.x) < Math.abs(cols[best] - t.x)) best = i; });
        if (row[FIELDS[best]] != null) throw new Error(`column clash in: ${line}`);
        row[FIELDS[best]] = t.v;
      }
    }
    cur[m[1]] = row;
  }
  hunts.short = short;
  return hunts;
}

// → Map(hunt → [{points, app1:[T,R,N], app2, app12, bp:[T,R,N], bp12:[T,R,N]}])
function parsePointReport(txt) {
  const out = new Map();
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^(\d{4}) (\d{1,2})((?: \d+){15})$/);
    if (!m) continue;
    const t = m[3].trim().split(' ').map(Number);
    const row = {
      points: +m[2],
      app1: t.slice(0, 3), app2: t.slice(3, 6), app12: t.slice(6, 9),
      bp: t.slice(9, 12), bp12: t.slice(12, 15),
    };
    if (!out.has(m[1])) out.set(m[1], []);
    out.get(m[1]).push(row);
  }
  return out;
}

// --------------------------------------------------------- regulations
// Arizona GMUs as AZGFD names them.
const GMUS = new Set(`1 2A 2B 2C 3A 3B 3C 4A 4B 5A 5B 6A 6B 7 7E 7W 8 9 10 11M 12A 12B 13A 13B 15A 15B 15C 15D
16A 16B 17A 17B 18A 18B 19A 19B 20A 20B 20C 21 22 23 24A 24B 25M 26M 27 28 29 30A 30B 31 32 33 34A 34B
35A 35B 36A 36B 36C 37A 37B 38M 39 40A 40B 41 42 43A 43B 44A 44B 45A 45B 45C 46A 46B 47M`.split(/\s+/));

const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const HUNT_START = new RegExp(`^(\\d{4}) (${MONTH} \\d{1,2}\\s*\\S\\s*${MONTH} \\d{1,2}, \\d{4})\\s*(.*)$`);
const HEADER = /^((?:GENERAL|MUZZLELOADER|ARCHERY-ONLY|YOUTH-ONLY|LIMITED OPPORTUNITY|HAM)[A-Z0-9 ()-]*?) (ELK|PRONGHORN|DEER|BIGHORN SHEEP)$/;
const WILDLIFE = /((?:Any|Bull|Antlerless|Antlered|Buck|Doe|One-horned|Spike)[A-Za-z -]*?(?:elk|pronghorn|deer|ram))\s+([\d,]+)$/;

function category(header) {
  // header without the species word, e.g. "GENERAL", "YOUTH-ONLY (GENERAL)",
  // "ARCHERY-ONLY HUNT PERMIT-TAG REQUIRED", "LIMITED OPPORTUNITY (HAM)"
  const h = header.replace(/\s*HUNT PERMIT-TAG REQUIRED/, '');
  if (/NONPERMIT/.test(h)) return null; // OTC tables — not drawn
  const map = [
    [/^GENERAL$/, 'General', 'rifle'],
    [/^MUZZLELOADER$/, 'Muzzleloader', 'muzzleloader'],
    [/^ARCHERY-ONLY$/, 'Archery', 'archery'],
    [/^YOUTH-ONLY \(GENERAL\)$/, 'Youth-only general', undefined],
    [/^YOUTH-ONLY \(MUZZLELOADER\)$/, 'Youth-only muzzleloader', undefined],
    [/^YOUTH-ONLY \(ARCHERY-ONLY\)$/, 'Youth-only archery', undefined],
    [/^LIMITED OPPORTUNITY \(GENERAL\)$/, 'Limited opportunity general', 'rifle'],
    [/^LIMITED OPPORTUNITY \(ARCHERY-ONLY\)$/, 'Limited opportunity archery', 'archery'],
    [/^LIMITED OPPORTUNITY \(HAM\)$/, 'Limited opportunity HAM', undefined],
    [/^LIMITED OPPORTUNITY \(MUZZLELOADER\)$/, 'Limited opportunity muzzleloader', 'muzzleloader'],
  ];
  for (const [re, label, weapon] of map) if (re.test(h)) return { label, weapon };
  return { label: h.toLowerCase().replace(/^./, (c) => c.toUpperCase()), weapon: undefined };
}

function unitsFrom(openAreas) {
  const s = openAreas
    .replace(/\((?:[^()]|\([^()]*\))*\)/g, ' ')            // parentheticals (excluding…, south of Hwy…)
    .replace(/\b(?:Hwy|Highway|I-|Note|Route|Road)\s*\d+/gi, ' ')
    .replace(/\b(\d{1,2}) (East|West)\b/g, (_, n, d) => (n === '7' ? `7${d[0]}` : `${n} ${d}`));
  const units = [];
  for (const m of s.matchAll(/\b(\d{1,2}[A-Z]?[A-Z]?)\b/g)) {
    const u = m[1];
    if (GMUS.has(u) && !units.includes(u)) units.push(u);
  }
  return units;
}

// Deer subspecies note for the label.
function deerKind(w) {
  if (/whitetail/i.test(w)) return `${w} (Coues whitetail)`;
  if (/mule/i.test(w)) return w;
  return `${w} (mule deer or Coues whitetail)`;
}

// Hunt-area notes name their GMUs: "46. Escudilla-Auger Canyon Hunt Area in
// Unit 1 - That portion of Unit 1 …" → Map("46" → ["1"]).
function parseAreaNotes(txt) {
  const flat = txt.replace(/([a-z])-\r?\n([a-z])/g, '$1$2').replace(/\s+/g, ' ');
  const notes = new Map();
  for (const m of flat.matchAll(/(?:^| )(\d{1,3})\. [^.]{0,120}?Hunt Areas? in Units? (.{1,60}?) - /g)) {
    if (notes.has(m[1])) continue;
    const units = unitsFrom(m[2].replace(/\b(\d{1,2}[A-Z]?) (North|South)\b/g, '$1'));
    if (units.length) notes.set(m[1], units);
  }
  return notes;
}

const DATES = new RegExp(`^(?:${MONTH} \\d{1,2}\\s*\\S\\s*${MONTH} \\d{1,2}, \\d{4}\\s*(?:and\\s*)?)+`);

// → Map(hunt → { species, label, weapon, unit, units, openAreas })
function parseRegs(txt) {
  const out = new Map();
  const notes = parseAreaNotes(txt);
  let cat = null, sheep = null, rec = null;
  const finish = () => {
    if (!rec) return;
    const joined = rec.parts.join(' ').replace(/\s+/g, ' ').trim();
    const w = joined.match(WILDLIFE);
    if (w && rec.cat) {
      let rest = joined.slice(0, w.index).trim().replace(DATES, '');
      rest = rest.replace(/^\([\d,\s]+\)\s*/, ''); // notes column
      rest = rest.replace(/^\([\d,\s]+\)\s*/, '');
      let units = unitsFrom(rest);
      if (!units.length) {
        // named hunt area: take the GMUs its "See Note N" paragraph names
        const refs = (rest.match(/See Notes? ([\d ,and]+)/) || ['', ''])[1].match(/\d+/g) ?? [];
        for (const n of refs) for (const u of notes.get(n) ?? []) if (!units.includes(u)) units.push(u);
      }
      const sp = rec.species;
      let wild = w[1].trim().replace(/One-horned\s*ram/i, 'One-horned ram');
      if (sp === 'DEER') wild = deerKind(wild);
      if (sp === 'BIGHORNSHEEP') wild = `${rec.sheep ?? 'Bighorn'} sheep, ${wild.toLowerCase()}`;
      const plain = /^[\d\sA-Z,]*(?:and)?[\d\sA-Z,]*$/.test(rest) && units.length > 0;
      // keep the label short: drop "(Special Restrictions Apply …)" and long boundary descriptions
      const area = rest
        .replace(/\s*\(Special Restrictions[^()]*\)/gi, '')
        .replace(/\s*\((?:[^()]|\([^()]*\)){40,}\)/g, '')
        .trim();
      out.set(rec.hunt, {
        species: sp,
        label: `${wild} — ${rec.cat.label}${plain || !area ? '' : ` (${area})`}`,
        weapon: rec.cat.weapon,
        units,
        openAreas: rest,
        permits: num(w[2]),
      });
    }
    rec = null;
  };
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(HEADER);
    if (h) {
      finish();
      const species = { ELK: 'ELK', PRONGHORN: 'ANTELOPE', DEER: 'DEER', 'BIGHORN SHEEP': 'BIGHORNSHEEP' }[h[2]];
      cat = { ...category(h[1]), species };
      if (category(h[1]) === null) cat = null;
      continue;
    }
    const s = line.match(/^(Desert|Rocky Mountain) Bighorn Sheep$/);
    if (s) { finish(); sheep = s[1] === 'Desert' ? 'Desert bighorn' : 'Rocky Mountain bighorn'; continue; }
    const m = line.match(HUNT_START);
    if (m) {
      finish();
      rec = { hunt: m[1], cat, species: cat?.species, sheep, parts: [m[3]] };
      if (WILDLIFE.test(m[3])) finish();
      continue;
    }
    if (/^\d{4} BONUS POINT ONLY/.test(line)) { finish(); continue; }
    const bare = line.match(/^(\d{4})$/); // hunt no. alone, dates on the next lines
    if (bare && cat) { finish(); rec = { hunt: bare[1], cat, species: cat.species, sheep, parts: [] }; continue; }
    if (rec) {
      rec.parts.push(line);
      if (WILDLIFE.test(rec.parts.join(' ').replace(/\s+/g, ' ').trim())) finish();
      else if (rec.parts.length > 6) rec = null; // ran off the table
    }
  }
  finish();
  return out;
}

// ------------------------------------------------------------- assemble
const r1 = (x) => Math.round(x * 10) / 10;

// A blank cell in an otherwise populated row means none (AZGFD leaves zero
// counts blank in some rows).
const z = (v) => v ?? 0;
function stat(bp, p12) {
  if (!bp || !p12) return null;
  const apps = z(bp.app1);
  if (!apps) return { tags: null, applicants: 0, successPct: null };
  const drawn = z(bp.drawn1) + z(p12.drawn1);
  return { tags: null, applicants: apps, successPct: r1((100 * drawn) / apps) };
}

function pointLinesFor(rows, idx) {
  const lines = rows
    .map((r) => ({ points: r.points, applicants: r.app12[idx], drawn: r.bp12[idx] }))
    .filter((l) => l.applicants > 0 || l.drawn > 0);
  return lines.length ? lines : null;
}

function buildDraw({ bpTxt, p12Txt, ptsTxt, regs, speciesOf }) {
  const bp = parseDrawReport(bpTxt);
  const p12 = parseDrawReport(p12Txt);
  const pts = parsePointReport(ptsTxt);
  const species = {};
  const dropped = [];
  for (const [hunt, b] of bp) {
    const sp = speciesOf(hunt);
    if (!sp) continue;
    const reg = regs.get(hunt);
    const p = p12.get(hunt);
    if (!reg) { dropped.push({ hunt, why: 'not in regulations', apps: b.All?.app1 ?? 0, auth: b.All?.authorized ?? 0 }); continue; }
    if (reg.species !== sp) { dropped.push({ hunt, why: `regs species ${reg.species}` }); continue; }
    if (!b.All || !p?.All) { dropped.push({ hunt, why: 'missing draw rows' }); continue; }
    const row = {
      huntCode: hunt,
      unit: reg.units[0] ?? null,
      ...(reg.units.length > 1 ? { units: reg.units } : {}),
      label: reg.label,
      ...(reg.weapon ? { weapon: reg.weapon } : {}),
      tags: b.All.authorized,
      draw: { resident: stat(b.Res, p.Res), nonresident: stat(b.NonRes, p.NonRes) },
    };
    const pl = pts.get(hunt);
    if (pl) {
      const res = pointLinesFor(pl, 1), nr = pointLinesFor(pl, 2);
      row.pointLines = {};
      if (res) row.pointLines.resident = res;
      if (nr) row.pointLines.nonresident = nr;
      for (const [k, lines] of Object.entries(row.pointLines)) {
        const first = lines.find((l) => l.drawn > 0);
        if (first && row.draw[k]) row.draw[k].minPoints = first.points;
      }
      if (!Object.keys(row.pointLines).length) delete row.pointLines;
    }
    if (!row.unit) { dropped.push({ hunt, why: `no GMU in open areas "${reg.openAreas}"` }); continue; }
    (species[sp] ??= []).push(row);
  }
  return { species, dropped };
}

// ------------------------------------------------------------------ main
const keys = [
  ...(await listBucket('wp-content/uploads/2025/')),
  ...(await listBucket('wp-content/uploads/2026/')),
  ...(await listBucket('wp-content/uploads/2027/')),
];

function pickDraw(code) {
  // newest year having bonus pass + 1-2 pass + bonus point report for this draw
  const years = [...new Set(keys.map((k) => +(path.basename(k.key).match(new RegExp(`^(\\d{4})-${code}-`)) || [])[1]).filter(Boolean))]
    .sort((a, b) => b - a);
  for (const y of years) {
    const f = (re) => newest(keys, new RegExp(`^(${y})-${code}-${re}\\.pdf$`, 'i'));
    const bp = f('Draw-Report-Bonus(?:-Point)?-Pass'), p12 = f('Draw-Report-1-2-Pass'), pts = f('Bonus-Point-Report');
    if (bp && p12 && pts) return { year: y, bp, p12, pts };
  }
  throw new Error(`no complete ${code} draw report set`);
}

const M = pickDraw('M');
const F = pickDraw('F');
const peRegs = newest(keys, new RegExp(`^(${M.year})-Pronghorn-and-Elk-Regulations.*\\.pdf$`, 'i'));
const fallRegs = newest(keys, new RegExp(`^(${F.year})-\\d{2}-Arizona-Hunting-Regulations.*\\.pdf$`, 'i'));
if (!peRegs || !fallRegs) throw new Error('regulation booklets not found');

const txt = async (k, mode) => pdfText(await download(k.key), mode);
const m = buildDraw({
  bpTxt: await txt(M.bp, "table"), p12Txt: await txt(M.p12, "table"), ptsTxt: await txt(M.pts),
  regs: parseRegs(await txt(peRegs)),
  speciesOf: (h) => (h[0] === '2' && h !== '2000' ? 'ANTELOPE' : h[0] === '3' && h !== '3000' ? 'ELK' : null),
});
const f = buildDraw({
  bpTxt: await txt(F.bp, "table"), p12Txt: await txt(F.p12, "table"), ptsTxt: await txt(F.pts),
  regs: parseRegs(await txt(fallRegs)),
  speciesOf: (h) => (h[0] === '1' && h !== '1000' ? 'DEER' : h[0] === '6' && h !== '6000' ? 'BIGHORNSHEEP' : null),
});

const sources = [M.bp, M.p12, M.pts, peRegs, F.bp, F.p12, F.pts, fallRegs].map((k) => BUCKET + k.key);
const out = {
  state: 'AZ',
  year: M.year === F.year ? M.year : Math.max(M.year, F.year),
  source: { name: 'Arizona Game and Fish Department — draw reports and bonus point reports', url: BUCKET + M.p12.key },
  notes: [
    `Draw years: elk & pronghorn = ${M.year} Pronghorn and Elk ("M") draw; deer & bighorn sheep = ${F.year} Fall ("F") draw.`,
    'applicants = first-choice applicants from the Bonus Point Pass draw report (the full pool before any permits are issued).',
    'successPct = FIRST-CHOICE success: (first-choice drawn in the bonus point pass + first-choice drawn in the 1-2 pass) ÷ first-choice applicants × 100, per residency. Permits issued later to 2nd–5th choices are not counted.',
    'tags = total authorized permits for the hunt (DrawRow.tags). Per-residency tags are null: AZGFD reports only the nonresident cap, not a resident allotment.',
    'pointLines come from the Bonus Point Report: applicants = first + second choice applicants at that bonus-point level; drawn = permits issued to that level in the bonus point pass plus the 1-2 pass (first or second choice). Third-to-fifth-choice draws are not in that report.',
    'minPoints = lowest bonus-point level in pointLines with at least one permit issued (bonus + 1-2 pass, 1st or 2nd choice). Arizona draws are random with bonus points, so this is not a cutoff.',
    'GMUs, weapon and label come from the regulations booklet for that draw. "7 East/West" → 7E/7W; portions like "22 North" map to the whole GMU (22) with the portion kept in the label. Youth-only and HAM hunts have no weapon.',
    `Sources: ${sources.join(' ; ')}`,
  ].join(' '),
  species: { ...m.species, ...f.species },
};
for (const rows of Object.values(out.species)) rows.sort((a, b) => a.huntCode.localeCompare(b.huntCode));
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`M draw ${M.year}, F draw ${F.year}`);
for (const [sp, rows] of Object.entries(out.species)) {
  console.log(`${sp}: ${rows.length} hunts, ${rows.filter((r) => r.pointLines).length} with pointLines`);
}
const dropped = [...m.dropped, ...f.dropped];
console.log(`dropped ${dropped.length}:`, JSON.stringify(dropped));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
