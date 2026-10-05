// Builds lib/huntdata/harvest/wy.json from the Wyoming Game & Fish Department's
// annual big-game harvest reports (survey-based estimates produced with WYSAC).
//
// Source page: https://wgfd.wyo.gov/hunting-trapping/harvest-reports-surveys
// Each species links a PDF ("<year> <Species> Harvest Report"). We pick the
// newest year per species, convert with `pdftotext -table` (xpdf; the -table
// mode keeps the columns intact) and read the "Harvest Statistics by Hunt Area"
// table: one row per hunt area + license Type, plus area Total rows.
//
//   DEER     — "Mule Deer Harvest Statistics by Hunt Area" (all license types),
//              plus white-tailed-only license types (3, 8) from the white-tailed
//              table, plus "Mule Deer ... by Nonresident General Region" (A..Y).
//   ELK      — "Harvest Statistics by Hunt Area".
//   ANTELOPE — "Harvest Statistics by Hunt Area".
//
// Keys: unit = hunt area ("141"); huntCode = "<area>-<type>" ("141-1",
// "7-GEN"). DEER only: cross-area rows ("(12, 13, 14) 3" under area 11) whose
// areas all list each other with the same Type and the same "Licenses Sold
// (cross incl.)" → huntCode "11-12-13-14-3" (ascending), one row per area
// (harvest within that area) — matching the multi-area keys in wyodeerdata.ts.
// ELK/ANTELOPE draw data key every license by its single area, so their cross
// rows keep "<area>-<type>" (the row may mix neighbouring areas' licenses).
// Deer general-region rows: unit = huntCode = region letter (e.g. "G").
//
// Requires pdftotext on PATH. Run: node scripts/harvest/buildWYHarvest.mjs
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'harvest', 'wy.json');
const BASE = 'https://wgfd.wyo.gov';
const PAGE = `${BASE}/hunting-trapping/harvest-reports-surveys`;
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const CACHE = path.join(os.tmpdir(), 'wy-harvest');
const REFRESH = process.argv.includes('--refresh');

const SPECIES = {
  DEER: /\bdeer\b/i,
  ELK: /\belk\b/i,
  ANTELOPE: /antelope|pronghorn/i,
};

async function fetchText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// Harvest page → { title, year, url } of the newest report for each species.
async function resolveReports() {
  const html = await fetchText(PAGE);
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>/gi)]
    .map((m) => ({ href: m[1], title: m[2].replace(/&amp;/g, '&').trim() }))
    .filter((l) => /harvest\s*report/i.test(l.title.replace(/_/g, ' ')) || /HarvestReport/i.test(l.title));
  const out = {};
  for (const [sp, re] of Object.entries(SPECIES)) {
    const cands = links
      .filter((l) => re.test(l.title.replace(/_/g, ' ')))
      .map((l) => ({ ...l, year: +((l.title.match(/^(\d{4})/) || [])[1] || 0) }))
      .filter((l) => l.year)
      .sort((a, b) => b.year - a.year);
    if (!cands.length) throw new Error(`no harvest report link for ${sp}`);
    const c = cands[0];
    out[sp] = { title: c.title, year: c.year, url: new URL(c.href, BASE).href };
  }
  return out;
}

async function pdfText(sp, rep) {
  mkdirSync(CACHE, { recursive: true });
  const pdf = path.join(CACHE, `wy_${sp}_${rep.year}.pdf`);
  const txt = pdf.replace(/\.pdf$/, '.txt');
  if (REFRESH || !existsSync(pdf) || statSync(pdf).size < 10000) {
    const r = await fetch(rep.url, { headers: UA });
    if (!r.ok) throw new Error(`${rep.url} → ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.subarray(0, 4).toString() !== '%PDF') throw new Error(`${rep.url} is not a PDF`);
    writeFileSync(pdf, buf);
  }
  if (REFRESH || !existsSync(txt)) {
    execSync(`pdftotext -q -table "${pdf}" "${txt}"`, { stdio: 'ignore', maxBuffer: 1 << 28 });
  }
  return readFileSync(txt, 'utf8');
}

// Lines of one table: from its heading ("Table N: <title>", not the dotted
// table-of-contents entry) up to the next different "Table M:" heading.
function section(txt, titleRe) {
  const lines = txt.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s*Table \d+:/.test(l) && titleRe.test(l) && !/\.\s\./.test(l));
  if (start < 0) throw new Error(`table not found: ${titleRe}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*Table \d+:/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end);
}

const NUM = String.raw`(?:\d{1,3}(?:,\d{3})*(?:\.\d+)?|-)`;
const num = (t) => (t === '-' || t == null ? null : Number(t.replace(/,/g, '')));

// nHarv = number of harvest-class columns (elk 4: bull/spike/cow/calf; deer &
// antelope 3: buck/doe/fawn). Columns after the Type:
//   active, <harvest classes>, total, days, success%, days/harvest, [sold]
function parseHuntAreaTable(lines, nHarv, warn) {
  const nCols = 1 + nHarv + 4;
  const rowRe = new RegExp(
    String.raw`^\s*(?:\(([\d,\s]+)\)\s+)?(\d{1,2}|GEN|Total|Resident|Nonresident)\s+((?:${NUM}\s+){${nCols - 1}}${NUM})(?:\s+(${NUM}))?\s*$`,
  );
  const areaRe = /^\s{0,3}(\d{1,3})\s+([A-Za-z][A-Za-z .'’&()/-]*?)\s*$/;
  const rows = [];
  let area = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const a = line.match(areaRe);
    if (a) { area = { id: a[1], name: a[2].trim() }; continue; }
    const m = line.match(rowRe);
    if (!m) {
      if (area && /\d/.test(line) && !/Table \d|Harvest Statistics|^\s*\d+\s*$|Lics\/Htrs|Success|Sold|\(%\)|cross incl/i.test(line)) {
        warn(`unparsed line in area ${area.id}: ${line.trim()}`);
      }
      continue;
    }
    if (!area) continue;
    const vals = m[3].trim().split(/\s+/).map(num);
    const [active, ...rest] = vals;
    const classes = rest.slice(0, nHarv);
    const [total, days, success, dph] = rest.slice(nHarv);
    const sumClasses = classes.reduce((s, v) => s + (v || 0), 0);
    if (total != null && sumClasses !== total) warn(`harvest classes ≠ total in area ${area.id}: ${line.trim()}`);
    rows.push({
      area: area.id,
      areaName: area.name,
      cross: m[1] ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : null,
      type: m[2],
      active, total, days, success, dph,
      sold: num(m[4]),
    });
  }
  return rows;
}

// Decide huntCodes for cross-area rows (see header comment).
function assignCodes(rows, { combine }) {
  const byKey = new Map(rows.map((r) => [`${r.area}|${r.type}`, r]));
  for (const r of rows) {
    if (!/^\d+$|^GEN$/.test(r.type)) continue;
    r.huntCode = `${r.area}-${r.type}`;
    if (!r.cross || !combine) continue;
    const group = [r.area, ...r.cross].map(Number).sort((a, b) => a - b).map(String);
    const shared = group.every((g) => {
      const o = byKey.get(`${g}|${r.type}`);
      if (!o || !o.cross) return false;
      const og = [o.area, ...o.cross].map(Number).sort((a, b) => a - b).join('-');
      return og === group.join('-') && o.sold != null && o.sold === r.sold;
    });
    if (shared) r.huntCode = `${group.join('-')}-${r.type}`;
  }
}

function toHarvestRows(rows, { labelPrefix = '', typeFilter = null } = {}) {
  const out = [];
  for (const r of rows) {
    if (r.type === 'Resident' || r.type === 'Nonresident') continue;
    if (r.type === 'Total') {
      if (typeFilter) continue;
      if (r.success == null) continue;
      out.push({
        unit: r.area,
        label: `${labelPrefix}Area ${r.area} ${r.areaName} — all license types (active hunters)`,
        hunters: r.active, harvest: r.total, successPct: r.success, daysPerHarvest: r.dph,
      });
      continue;
    }
    if (typeFilter && !typeFilter.includes(r.type)) continue;
    if (r.success == null) continue;
    const typeLbl = r.type === 'GEN' ? 'General' : `Type ${r.type}`;
    const crossLbl = r.cross
      ? (r.huntCode.split('-').length > 2 ? ` (multi-area license; harvest within area ${r.area})` : ` (cross-area with ${r.cross.join(', ')})`)
      : '';
    const row = {
      unit: r.area,
      huntCode: r.huntCode,
      label: `${labelPrefix}${typeLbl}${crossLbl}`,
      hunters: r.active, harvest: r.total, successPct: r.success, daysPerHarvest: r.dph,
    };
    if (r.type === '9') row.weapon = 'archery';
    out.push(row);
  }
  return out;
}

function parseRegionTable(lines, nHarv) {
  const re = new RegExp(String.raw`^\s*NR\s+Region\s+([A-Z])\s+((?:${NUM}\s+){${nHarv + 4}}${NUM})(?:\s+(${NUM}))?\s*$`);
  const out = [];
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const vals = m[2].trim().split(/\s+/).map(num);
    const [active, ...rest] = vals;
    const [total, days, success, dph] = rest.slice(nHarv);
    if (success == null) continue;
    out.push({
      unit: m[1], huntCode: m[1], residency: 'nonresident',
      label: `Mule deer — Nonresident General Region ${m[1]} (NR general licenses only)`,
      hunters: active, harvest: total, successPct: success, daysPerHarvest: dph,
    });
  }
  return out;
}

async function main() {
  const reps = await resolveReports();
  const warnings = [];
  const warn = (s) => warnings.push(s);
  const species = {};

  // ELK
  {
    const t = await pdfText('ELK', reps.ELK);
    const rows = parseHuntAreaTable(section(t, /Harvest Statistics by Hunt Area/i), 4, (s) => warn(`ELK ${s}`));
    assignCodes(rows, { combine: false });
    species.ELK = toHarvestRows(rows);
  }
  // ANTELOPE
  {
    const t = await pdfText('ANTELOPE', reps.ANTELOPE);
    const rows = parseHuntAreaTable(section(t, /Harvest Statistics by Hunt Area/i), 3, (s) => warn(`ANTELOPE ${s}`));
    assignCodes(rows, { combine: false });
    species.ANTELOPE = toHarvestRows(rows);
  }
  // DEER
  {
    const t = await pdfText('DEER', reps.DEER);
    const md = parseHuntAreaTable(section(t, /Mule Deer Harvest Statistics by Hunt Area/i), 3, (s) => warn(`DEER(md) ${s}`));
    assignCodes(md, { combine: true });
    const wt = parseHuntAreaTable(section(t, /White-Tailed Deer Harvest Statistics by Hunt Area/i), 3, (s) => warn(`DEER(wt) ${s}`));
    assignCodes(wt, { combine: true });
    // White-tailed-only license types come from the white-tailed table; all
    // other types (and the area totals) from the mule deer table.
    const WT_TYPES = ['3', '8'];
    species.DEER = [
      ...toHarvestRows(md.filter((r) => !WT_TYPES.includes(r.type)), { labelPrefix: 'Mule deer — ' }),
      ...toHarvestRows(wt, { labelPrefix: 'White-tailed deer — ', typeFilter: WT_TYPES }),
      ...parseRegionTable(section(t, /Mule Deer Harvest Statistics by Nonresident General Region/i), 3),
    ];
  }

  const years = [...new Set(Object.values(reps).map((r) => r.year))];
  const file = {
    state: 'WY',
    year: Math.max(...years),
    source: { name: 'Wyoming Game and Fish Department — Big Game Harvest Reports', url: PAGE },
    notes: [
      `Reports: ${Object.entries(reps).map(([k, r]) => `${k}: "${r.title}" ${r.url}`).join('; ')}.`,
      'Survey-based estimates (WGFD + Wyoming Survey & Analysis Center), not check-station counts.',
      'License-type rows: hunters = active licenses (unused licenses excluded); successPct, harvest and days/harvest are the agency figures.',
      'Area "all license types" rows (unit only, no huntCode) count active hunters across all license types in that area.',
      'Cross-area licenses are reported per area (harvest within that area). DEER: a shared multi-area license gets huntCode "<areas ascending>-<type>" (e.g. "11-12-13-14-3") with one row per area. ELK/ANTELOPE (and non-shared deer cross rows): huntCode "<area>-<type>"; such rows may include licenses from the neighbouring area that are valid there.',
      'ELK area 77 "(Other)" rows (licenses issued for other areas) are omitted.',
      'DEER: mule deer harvest for all license types except white-tailed-only Types 3 and 8, which use the white-tailed deer table. "<area>-GEN" rows are general-license mule deer harvest in that area (resident + nonresident). Region-letter rows (A..Y) are nonresident general region licenses only.',
      'Weapon is set only for Type 9 (archery-only); other types are any-legal-weapon licenses usable in archery seasons too.',
      'Moose, bighorn sheep and mountain goat reports exist but use a different layout and are not included.',
      years.length > 1 ? `Season years differ by species: ${Object.entries(reps).map(([k, r]) => `${k} ${r.year}`).join(', ')}.` : '',
    ].filter(Boolean).join(' '),
    species,
  };
  writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n');

  for (const [k, v] of Object.entries(species)) {
    console.log(`${k}: ${v.length} rows (${v.filter((r) => r.huntCode).length} with huntCode) — ${reps[k].title}`);
  }
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log('  ' + w);
  }
  console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
