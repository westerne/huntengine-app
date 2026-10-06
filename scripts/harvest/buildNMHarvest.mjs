// Builds lib/huntdata/harvest/nm.json from the New Mexico Department of Game and
// Fish annual harvest reports (mandatory harvest reporting results).
//
// Landing page: https://wildlife.dgf.nm.gov/hunting/harvest-reporting-information/
// It links one WordPress Download Manager entry per species and season, e.g.
//   /download/2025-2026-elk-harvest-report/?wpdmdl=55155
// which serves the PDF directly. Per species we take the newest season listed:
//
//   ELK          — "<y>-<y+1>-elk-harvest-report"
//   ANTELOPE     — "<y>-<y+1>-pronghorn-harvest-report"
//   DEER         — "<y>-<y+1>-deer-harvest-report" (mule deer and white-tailed
//                  deer share DER hunt codes; the bag limit — FAMD, FAWTD,
//                  ESWTD, FAD — says which, and goes into the label)
//   BIGHORNSHEEP — "<y>-<y+1>-bighorn-sheep-harvest-report"
//
// Report layout (`pdftotext -table` keeps the columns aligned):
//   ELK:   [GMU] [Public/Private] Type  HuntCode  Weapon  Dates  Bag  Sold
//          #Reporting  %Reporting  Success  Bulls  Cows  Satisfaction  Days
//   DEER / PRONGHORN: GMU  Public/Private  Category  Weapon  HuntCode  Dates
//          Bag  Sold  #Reporting  %Reporting  EstHunters  Success  Bucks  Does
//          Satisfaction  Days
//   SHEEP: Type  HuntCode ("BHS 1-201")  Weapon  Bag  Sold  #Reporting
//          %Reporting  Success  Rams  Ewes  Satisfaction  Days  (no GMU)
// The GMU label sits in the left column, vertically centred in its block; each
// block ends with a "... Total(s)" line, so rows are grouped by those lines.
// Deer/pronghorn report one hunt code several times (public vs private land,
// and per GMU where hunters reported hunting); those rows are combined into
// one row per hunt code. Private-land rows without a hunt code (elk
// landowner authorizations, pronghorn PCRP etc.) are not draw hunts and are
// skipped.
//
// Bighorn hunt codes cover several hunt areas and the report has no GMU column,
// so their GMUs are read from the same season's "Hunting Rules and Info"
// booklet (BHS hunt tables).
//
// Keys: huntCode = NMDGF hunt code, e.g. "ELK-1-100", "DER-2-104", "ANT-1-101",
// "BHS-1-201" (sheep report writes "BHS 1-201"; normalised to the booklet form).
// unit = NMDGF's GMU text ("2", "5A", "16B/22", "2, 7, 9, 10", "23 Burros");
// codes >= 500 (enhancement/auction/raffle/premium) are "Statewide" unless the
// report gives GMUs.
//
// Requires pdftotext on PATH. Run: node scripts/harvest/buildNMHarvest.mjs [--refresh]
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'harvest', 'nm.json');
const SITE = 'https://wildlife.dgf.nm.gov';
const PAGE = `${SITE}/hunting/harvest-reporting-information/`;
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const CACHE = path.join(os.tmpdir(), 'nm-harvest');
const REFRESH = process.argv.includes('--refresh');

const SPECIES = {
  ELK: { slug: 'elk', prefix: 'ELK' },
  ANTELOPE: { slug: 'pronghorn', prefix: 'ANT' },
  DEER: { slug: 'deer', prefix: 'DER' },
  BIGHORNSHEEP: { slug: 'bighorn-sheep', prefix: 'BHS' },
};

// Bag-limit codes expanded in labels (others, e.g. elk MB/APRE/6, pronghorn MB,
// are kept as NMDGF writes them).
const BAG = {
  FAD: 'fork-antlered deer (mule or white-tailed)',
  FAMD: 'fork-antlered mule deer',
  FAWTD: 'fork-antlered white-tailed deer',
  ESWTD: 'either-sex white-tailed deer',
  ES: 'either sex',
  A: 'antlerless',
};

async function fetchRes(url) {
  const r = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r;
}

async function cached(name, url) {
  mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, name);
  if (!REFRESH && existsSync(file)) return file;
  const r = await fetchRes(url);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.subarray(0, 5).toString() !== '%PDF-') {
    throw new Error(`${url} did not return a PDF (content-type ${r.headers.get('content-type')}); possible bot challenge — not bypassing.`);
  }
  writeFileSync(file, buf);
  return file;
}

function pdfText(file) {
  const out = file.replace(/\.pdf$/, '.table.txt');
  if (REFRESH || !existsSync(out)) execFileSync('pdftotext', ['-table', file, out]);
  return readFileSync(out, 'latin1');
}

// Newest season's download link per species from the landing page.
async function findReports() {
  const html = await (await fetchRes(PAGE)).text();
  if (/challenge-platform|cf-chl|Just a moment/i.test(html)) throw new Error('Harvest page returned a bot challenge; stopping.');
  const found = {};
  const re = /https:\/\/wildlife\.dgf\.nm\.gov\/download\/(\d{4})(?:[-_](\d{4}))?-([a-z-]+?)-harvest-(?:report|results)\/\?wpdmdl=(\d+)/g;
  for (const m of html.matchAll(re)) {
    const [, y1, , slug, id] = m;
    const sp = Object.keys(SPECIES).find((k) => SPECIES[k].slug === slug);
    if (!sp) continue;
    const year = Number(y1);
    if (!found[sp] || year > found[sp].year) {
      found[sp] = { year, slug: m[0].split('/download/')[1].split('/')[0], url: `${SITE}/download/${m[0].split('/download/')[1].split('/')[0]}/?wpdmdl=${id}` };
    }
  }
  for (const sp of Object.keys(SPECIES)) if (!found[sp]) throw new Error(`No ${sp} harvest report linked on ${PAGE}`);
  return found;
}

// ---------- report parsing ----------

const CODE_RE = /\b(ELK|DER|ANT|BHS)[- ](\d)-(\d{3})\b/;

// Column starts from a header line containing "Sold ... Hunted".
function headerCols(line) {
  const cols = [];
  const push = (name, idx) => idx >= 0 && cols.push({ name, start: idx });
  const lim = line.search(/\bBag Limit\b/);
  push('limit', lim >= 0 ? lim : line.search(/\bLimit\b/));
  let soldIdx = line.search(/\bSold\b/);
  // "#  Sold" (sheep): numbers start under the "#".
  const hashSold = line.slice(0, soldIdx).search(/#\s*$/);
  push('sold', hashSold >= 0 ? hashSold : soldIdx);
  const rep = [...line.matchAll(/(?:[#%]\s*)?Reporting/g)].map((m) => m.index);
  push('reporting', rep[0] ?? -1);
  push('pctReporting', rep[1] ?? -1);
  push('estHunters', line.search(/\bHunters\b/));
  push('rate', line.search(/\bRate\b/));
  push('h1', line.search(/\b(?:Bulls|Bucks|Rams)\b/));
  push('h2', line.search(/\b(?:Cows|Does|Ewes)\b/));
  push('rating', line.search(/\bRating\b/));
  push('days', line.search(/\bHunted\b/));
  return cols.sort((a, b) => a.start - b.start);
}

const num = (s) => {
  if (s == null) return null;
  const t = s.replace(/,/g, '').replace(/%$/, '');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

function parseReport(text, species) {
  const rows = [];
  let cols = null;
  let seg = [];
  let segLabels = [];
  let special = false;
  const flush = (totalLine) => {
    let unit = segLabels[0] ?? null;
    if (segLabels.length > 1 && new Set(segLabels).size > 1) console.warn(`  [${species}] several GMU labels in one block: ${segLabels.join(' | ')} — using "${unit}"`);
    if (!unit && totalLine) {
      const m = totalLine.match(/^\s*GMU\s+(\S+)\s+Totals?\b/);
      if (m) unit = m[1];
    }
    for (const r of seg) if (!r.unit) r.unit = unit;
    rows.push(...seg);
    seg = [];
    segLabels = [];
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\f/g, '');
    if (!line.trim()) continue;
    if (/\bSold\b/.test(line) && /\bHunted\b/.test(line)) { cols = headerCols(line); continue; }
    if (/Special (Authorizations|Hunts)|Special Management|Population Management/i.test(line)) special = /Special Authorizations|Special Hunts/i.test(line) || special;
    if (/\bTotals?\b/.test(line) && !CODE_RE.test(line)) { flush(line); continue; }

    // Left-column GMU label: first chunk (up to a double space) starting near column 0.
    const lead = line.match(/^(\s*)(\S+(?: \S+)*)/);
    if (lead && lead[1].length < 12) {
      const chunk = lead[2].replace(/\b(Public|Private)\b/g, '').trim();
      if (/^(GMU\s+)?\d/.test(chunk) && !CODE_RE.test(chunk)) segLabels.push(chunk.replace(/^GMU\s+/, ''));
    }

    const cm = line.match(CODE_RE);
    if (!cm || !cols) continue;
    const huntCode = `${cm[1]}-${cm[2]}-${cm[3]}`;
    const codeEnd = cm.index + cm[0].length;
    const limitStart = cols.find((c) => c.name === 'limit')?.start ?? codeEnd;

    const vals = {};
    let mid = [];
    for (const t of line.slice(codeEnd).matchAll(/\S+/g)) {
      const s = codeEnd + t.index;
      if (s < limitStart - 3) { mid.push({ s, v: t[0] }); continue; }
      let col = null;
      for (const c of cols) if (c.start <= s + 3) col = c.name;
      if (!col) continue;
      // Bag limits are letter codes; a bare number here is the tail of the dates.
      if (col === 'limit' && !/[A-Za-z]/.test(t[0])) { mid.push({ s, v: t[0] }); continue; }
      vals[col] = vals[col] ? `${vals[col]} ${t[0]}` : t[0];
    }

    // Text before the code: GMU label / land type / hunter category / weapon (deer, pronghorn).
    let pre = line.slice(0, cm.index);
    if (lead && lead[1].length < 12 && /^(GMU\s+)?\d/.test(lead[2].replace(/\b(Public|Private)\b/g, '').trim())) {
      pre = pre.replace(lead[2].replace(/\s+(Public|Private)\b.*$/, ''), '');
    }
    pre = pre.replace(/\b(Public|Private)\b/g, '').replace(/\s+/g, ' ').trim();
    const midText = mid.map((x) => x.v).join(' ');
    const weaponText = (`${pre} ${midText}`.match(/\b(archery|muzzleloader|rifle|bow|any)\b/i) || [])[1]?.toLowerCase() ?? null;
    const dates = midText.replace(/\b(archery|muzzleloader|rifle|bow|any)\b/i, '').trim();
    const category = pre.replace(/\b(archery|muzzleloader|rifle|bow|any)\b/i, '').replace(/\s+/g, ' ').trim();

    const codeNum = Number(cm[3]);
    let unit = null;
    if (codeNum >= 500 || species === 'BIGHORNSHEEP') {
      const g = line.slice(0, cm.index).match(/\d+[A-Z]?(?:\s*,\s*\d+[A-Z]?)+/);
      unit = g ? g[0].replace(/\s+/g, ' ') : 'Statewide';
    }

    const h1 = num(vals.h1), h2 = num(vals.h2);
    const harvestKnown = h1 != null || h2 != null;
    seg.push({
      huntCode,
      unit,
      category,
      weaponText,
      codeWeapon: cm[2],
      dates,
      bag: vals.limit ?? null,
      sold: num(vals.sold),
      reporting: num(vals.reporting),
      pctReporting: num(vals.pctReporting),
      estHunters: num(vals.estHunters),
      rate: num(vals.rate),
      harvest: harvestKnown ? (h1 ?? 0) + (h2 ?? 0) : null,
      days: num(vals.days),
      raw: line.trim().replace(/\s+/g, ' '),
    });
  }
  flush(null);
  // Column-alignment check: % reporting must match #reporting / sold.
  for (const r of rows) {
    if (r.sold && r.reporting != null && r.pctReporting != null && Math.abs((100 * r.reporting) / r.sold - r.pctReporting) > 1.5) {
      throw new Error(`[${species}] columns misread for ${r.huntCode}: ${r.raw}`);
    }
    if (r.rate != null && (r.sold == null || r.reporting == null)) throw new Error(`[${species}] missing counts for ${r.huntCode}: ${r.raw}`);
  }
  return rows;
}

// ---------- bighorn hunt areas from the Rules & Info booklet ----------

async function sheepAreas(year) {
  const slug = `${year}-${year + 1}-new-mexico-hunting-rules-and-info`;
  const page = `${SITE}/download/${slug}/`;
  const html = await (await fetchRes(page)).text();
  const m = html.match(new RegExp(`${slug}/\\?wpdmdl=(\\d+)`));
  if (!m) throw new Error(`No download link on ${page}`);
  const url = `${SITE}/download/${slug}/?wpdmdl=${m[1]}`;
  const text = pdfText(await cached(`${slug}.pdf`, url));
  const out = {};
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^\s*(.*?):\s*Hunt Code (BHS-\d-\d{3})\s*$/);
    if (h) { cur = { title: h[1].trim(), gmus: [], areas: [] }; out[h[2]] = cur; continue; }
    if (!cur) continue;
    const row = line.match(/^\s*(GMUs? .+?\))/);
    if (row && /\b(Ram|Ewe)\s*$/.test(line)) {
      const area = row[1].replace(/\s+/g, ' ');
      if (!cur.areas.includes(area)) cur.areas.push(area);
      const list = area.replace(/^GMUs?\s+/, '').replace(/\(.*$/, '');
      for (const g of list.split(/,|\band\b/)) {
        const t = g.trim().split(/\s+/)[0];
        if (/^\d+[A-Z]?$/.test(t) && !cur.gmus.includes(t)) cur.gmus.push(t);
      }
    }
    if (/^\s*Bighorn Sheep\s*$/.test(line) && cur.areas.length && Object.keys(out).length >= 4) cur = null;
  }
  return { url, areas: out };
}

// ---------- combine & shape ----------

const WEAPON = { archery: 'archery', bow: 'archery', muzzleloader: 'muzzleloader', rifle: 'rifle', any: 'any' };
const r1 = (x) => Math.round(x * 10) / 10;

function speciesLabel(sp, bag) {
  if (sp !== 'DEER') return null;
  if (/WTD/.test(bag ?? '')) return 'White-tailed deer';
  if (/MD$/.test(bag ?? '')) return 'Mule deer';
  return 'Mule or white-tailed deer';
}

function buildRows(sp, parsed, sheep) {
  const byCode = new Map();
  for (const r of parsed) {
    if (!byCode.has(r.huntCode)) byCode.set(r.huntCode, []);
    byCode.get(r.huntCode).push(r);
  }
  const out = [];
  const problems = [];
  for (const [code, rs] of byCode) {
    const usable = rs.filter((r) => r.rate != null);
    if (!usable.length) continue; // nobody reported hunting
    const primary = [...rs].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))[0];
    const unit = sp === 'BIGHORNSHEEP' && !(Number(code.slice(-3)) >= 500)
      ? (sheep[code]?.gmus.join(', ') || 'Statewide')
      : primary.unit;
    if (!unit) { problems.push(code); continue; }

    let hunters, harvest, successPct, daysPerHarvest;
    const hasEst = usable.every((r) => r.estHunters != null);
    if (usable.length === 1) {
      const r = usable[0];
      hunters = r.estHunters ?? null;
      harvest = r.harvest;
      successPct = r.rate;
      daysPerHarvest = r.days != null && r.rate > 0 ? r1(r.days / (r.rate / 100)) : null;
    } else {
      // Several rows (public/private land, GMUs): weight agency rates by estimated
      // hunters (deer, pronghorn) or by hunters reporting (elk, sheep).
      const w = (r) => (hasEst ? r.estHunters : r.reporting) ?? 0;
      const W = usable.reduce((s, r) => s + w(r), 0);
      hunters = hasEst ? W : null;
      harvest = usable.every((r) => r.harvest != null) ? usable.reduce((s, r) => s + r.harvest, 0) : null;
      successPct = W > 0 ? r1(usable.reduce((s, r) => s + r.rate * w(r), 0) / W) : r1(usable.reduce((s, r) => s + r.rate, 0) / usable.length);
      const withDays = usable.filter((r) => r.days != null);
      const succW = withDays.reduce((s, r) => s + (r.rate / 100) * w(r), 0);
      daysPerHarvest = withDays.length === usable.length && succW > 0 ? r1(withDays.reduce((s, r) => s + r.days * w(r), 0) / succW) : null;
    }

    const weapon = WEAPON[primary.weaponText] ??
      (primary.codeWeapon === '2' ? 'archery' : primary.codeWeapon === '3' ? 'muzzleloader' : undefined);
    const bag = primary.bag;
    const parts = [];
    const sl = speciesLabel(sp, bag);
    if (sl) parts.push(sl);
    if (sp === 'BIGHORNSHEEP' && sheep[code]) parts.push(sheep[code].title);
    if (primary.category) parts.push(primary.category);
    if (weapon) parts.push(weapon[0].toUpperCase() + weapon.slice(1));
    if (primary.dates && !/^(TBD|various)$/i.test(primary.dates)) parts.push(primary.dates);
    if (bag) parts.push(`bag ${bag}${BAG[bag] ? ` (${BAG[bag]})` : ''}`);
    if (sp === 'BIGHORNSHEEP' && sheep[code]) parts.push(`areas: ${sheep[code].areas.join('; ')}`);
    if (rs.length > 1) {
      const others = sp === 'BIGHORNSHEEP' ? [] : [...new Set(rs.map((r) => r.unit).filter((u) => u && u !== unit))];
      parts.push(`combined ${rs.length} NMDGF report rows (public/private land${others.length ? `; also GMU ${others.join(', ')}` : ''})`);
    }

    const row = { unit, huntCode: code };
    if (weapon) row.weapon = weapon;
    row.label = parts.join(' — ');
    row.hunters = hunters;
    row.harvest = harvest;
    row.successPct = successPct;
    row.daysPerHarvest = daysPerHarvest;
    out.push(row);
  }
  return { rows: out, problems };
}

// ---------- main ----------

const reports = await findReports();
const species = {};
const speciesYear = {};
const notesSrc = [];
let sheepInfo = { areas: {} };
for (const [sp, rep] of Object.entries(reports)) {
  console.log(`${sp}: ${rep.slug} (${rep.year})  ${rep.url}`);
  const file = await cached(`${rep.slug}.pdf`, rep.url);
  const text = pdfText(file);
  const parsed = parseReport(text, sp);
  if (sp === 'BIGHORNSHEEP') {
    sheepInfo = await sheepAreas(rep.year);
    notesSrc.push(`BHS hunt areas: ${rep.year}-${rep.year + 1} Hunting Rules and Info ${sheepInfo.url}`);
  }
  const { rows, problems } = buildRows(sp, parsed, sheepInfo.areas);
  if (problems.length) throw new Error(`${sp}: no GMU found for ${problems.join(', ')} — layout changed? stopping.`);
  if (!rows.length) throw new Error(`${sp}: no rows parsed — layout changed? stopping.`);
  rows.sort((a, b) => a.huntCode.localeCompare(b.huntCode, 'en', { numeric: true }));
  species[sp] = rows;
  speciesYear[sp] = rep.year;
  notesSrc.push(`${sp}: ${rep.slug} ${rep.url}`);
  console.log(`  ${parsed.length} report rows → ${rows.length} hunt codes`);
}

const years = Object.values(speciesYear);
const out = {
  state: 'NM',
  year: Math.max(...years),
  ...(new Set(years).size > 1 ? { speciesYear } : {}),
  source: {
    name: 'New Mexico Department of Game and Fish — Harvest Reports (mandatory harvest reporting)',
    url: PAGE,
  },
  notes:
    `Reports: ${notesSrc.join('; ')}. ` +
    'Mandatory harvest reporting; NMDGF success rate = harvest among licensed hunters reporting they went afield; harvest = NMDGF estimated harvest (bulls+cows / bucks+does / rams+ewes). ' +
    'hunters = NMDGF "Estimated Hunters" (deer, pronghorn); null for elk and bighorn (not published — those reports give licenses sold and hunters reporting only). ' +
    'daysPerHarvest is derived: NMDGF average days hunted per hunter ÷ success rate. ' +
    'NMDGF reports a hunt code once per land type (public/private) and per GMU hunted; such rows are combined into one row per hunt code (success weighted by estimated hunters, or by hunters reporting for elk/bighorn; unit = GMU of the row with most licenses). ' +
    'Private-land elk/pronghorn rows with no hunt code (landowner authorizations, PCRP, population-management hunts) are omitted. Hunt codes where nobody reported hunting are omitted. ' +
    'Deer: mule and white-tailed (Coues in southwest NM) deer share DER hunt codes; the bag limit (FAMD, FAWTD, ESWTD, FAD) in the label says which. ' +
    `Bighorn: newest NMDGF report is ${speciesYear.BIGHORNSHEEP}-${speciesYear.BIGHORNSHEEP + 1}; BHS hunt codes span several hunt areas, so unit lists the GMUs from that season's booklet.`,
  species,
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
