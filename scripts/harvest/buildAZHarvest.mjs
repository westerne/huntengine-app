// Builds lib/huntdata/harvest/az.json from the Arizona Game and Fish
// Department's annual per-hunt harvest summaries (hunter questionnaire results).
//
// Landing page: https://www.azgfd.com/hunting/hunt-draw-and-licenses/harvest-reporting/
// That page sits behind a Cloudflare browser challenge, so we do not scrape it.
// Its PDFs live in AZGFD's own public WordPress media bucket
// (azgfd-portal-wordpress-pantheon), which allows S3 ListObjects. We list the
// recent upload folders and pick, per species, the newest season's
// "<year>-AZ-<Species>-Harvest-Summary[-N].pdf" (latest upload wins, so
// re-posted corrections are used).
//
//   ELK          — "<year>-AZ-Elk-Harvest-Summary"
//   ANTELOPE     — "<year>-AZ-Pronghorn-Harvest-Summary"
//   DEER         — "<year>-AZ-Deer-Harvest-Summary" (draw hunts only; mule deer
//                  and Coues whitetail). Legal wildlife per hunt (mule /
//                  whitetail / any antlered) is not in the summary, so it is read
//                  from the matching "<year>-<yy+1>-Arizona-Hunting-Regulations"
//                  hunt tables and put in the label.
//   BIGHORNSHEEP — "<year>-AZ-Bighorn-Sheep-Harvest-Summary"
//
// Each summary has one row per hunt number: Unit, Hunt No., permits, hunters,
// hunter days, harvest by class, total harvest, % success, ... Section headings
// ("General Bull", "Archery-Only Antlerless", "Desert", ...) precede the rows.
// `pdftotext -table` (xpdf 4) keeps unit text, hunt numbers and headings in
// the right order (`-layout` misaligns the unit column; `-raw` misplaces the
// headings).
//
// Keys: huntCode = AZGFD hunt number ("3001"); unit = AZGFD's unit text
// ("5A", "1, 2B, and 2C", "12A/12B/13A").
//
// Requires pdftotext on PATH. Run: node scripts/harvest/buildAZHarvest.mjs [--refresh]
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'harvest', 'az.json');
const PAGE = 'https://www.azgfd.com/hunting/hunt-draw-and-licenses/harvest-reporting/';
const BUCKET = 'https://azgfd-portal-wordpress-pantheon.s3.us-west-2.amazonaws.com/';
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const CACHE = path.join(os.tmpdir(), 'az-harvest');
const REFRESH = process.argv.includes('--refresh');

const SPECIES = {
  ELK: 'Elk',
  ANTELOPE: 'Pronghorn',
  DEER: 'Deer',
  BIGHORNSHEEP: 'Bighorn-Sheep',
};

// Numeric columns after "Hunt No." and where hunters/days/harvest/success sit.
const LAYOUT = {
  // Authorized, 1stChoice, Issued, Hunters, Days, Bull, Spike, Cow, Calf, Total, %Succ, AvePts, %Wound, CI, Returns
  ELK: { n: 15, hunters: 3, days: 4, harvest: 9, success: 10 },
  // Authorized, 1stChoice, Issued, Hunters, Days, Total, %Succ, %Wound, CI, Returns
  ANTELOPE: { n: 10, hunters: 3, days: 4, harvest: 5, success: 6 },
  // Authorized, 1stChoice, Issued, Hunters, Days, MD Buck, MD Antlerless, WT Buck, WT Antlerless, Total,
  // %Succ, MD %Buck, MD %Spike, WT %Buck, WT %Spike, %Wound, CI, Returns
  DEER: { n: 18, hunters: 3, days: 4, harvest: 9, success: 10 },
  // Authorized, 1stChoice, Hunters, Days, Harvest, %Succ, MeanScore, MeanAge
  BIGHORNSHEEP: { n: 8, hunters: 2, days: 3, harvest: 4, success: 5 },
};

async function fetchText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// All keys (with LastModified) under the given upload-folder prefixes.
async function listKeys(prefixes) {
  const out = [];
  for (const prefix of prefixes) {
    let token = null;
    do {
      const u = new URL(BUCKET);
      u.searchParams.set('list-type', '2');
      u.searchParams.set('prefix', prefix);
      if (token) u.searchParams.set('continuation-token', token);
      const xml = await fetchText(u.href);
      for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
        const key = (m[1].match(/<Key>([^<]+)<\/Key>/) || [])[1];
        const mod = (m[1].match(/<LastModified>([^<]+)<\/LastModified>/) || [])[1];
        if (key && /\.pdf$/i.test(key)) out.push({ key: key.replace(/&amp;/g, '&'), mod });
      }
      token = (xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/) || [])[1] || null;
    } while (token);
  }
  return out;
}

async function resolveSources() {
  const now = new Date().getFullYear();
  const prefixes = [];
  for (let y = now - 2; y <= now; y++) prefixes.push(`wp-content/uploads/${y}/`);
  const keys = await listKeys(prefixes);
  const reports = {};
  for (const [sp, name] of Object.entries(SPECIES)) {
    const re = new RegExp(`/(\\d{4})-AZ-${name}-Harvest-Summary(?:-\\d+)?\\.pdf$`, 'i');
    const cands = keys
      .map((k) => ({ ...k, m: k.key.match(re) }))
      .filter((k) => k.m)
      .map((k) => ({ key: k.key, mod: k.mod, year: +k.m[1] }))
      .sort((a, b) => b.year - a.year || (b.mod > a.mod ? 1 : b.mod < a.mod ? -1 : 0));
    if (!cands.length) throw new Error(`no harvest summary found for ${sp}`);
    const c = cands[0];
    reports[sp] = { year: c.year, url: BUCKET + c.key, file: path.basename(c.key) };
  }
  // Hunting regulations (fall season tables) for the deer season year.
  const dy = reports.DEER.year;
  const rre = new RegExp(`/${dy}-${String((dy + 1) % 100).padStart(2, '0')}-Arizona-Hunting-Regulations[^/]*\\.pdf$`, 'i');
  const regs = keys.filter((k) => rre.test(k.key)).sort((a, b) => (b.mod > a.mod ? 1 : -1))[0];
  if (regs) reports.REGS = { year: dy, url: BUCKET + regs.key, file: path.basename(regs.key) };
  return reports;
}

async function pdfText(rep, mode) {
  mkdirSync(CACHE, { recursive: true });
  const pdf = path.join(CACHE, rep.file);
  const txt = pdf.replace(/\.pdf$/i, `.${mode}.txt`);
  if (REFRESH || !existsSync(pdf) || statSync(pdf).size < 10000) {
    const r = await fetch(rep.url, { headers: UA });
    if (!r.ok) throw new Error(`${rep.url} → ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.subarray(0, 4).toString() !== '%PDF') throw new Error(`${rep.url} is not a PDF`);
    writeFileSync(pdf, buf);
  }
  if (REFRESH || !existsSync(txt)) {
    execSync(`pdftotext -q -${mode} "${pdf}" "${txt}"`, { stdio: 'ignore', maxBuffer: 1 << 28 });
  }
  return readFileSync(txt, 'utf8');
}

const num = (t) => {
  if (t == null || t === '-' || t === '') return null;
  const v = Number(t.replace(/[,%]/g, ''));
  return Number.isFinite(v) ? v : null;
};

// Summary table → [{ section, unit, huntCode, vals[] }]. Stops at the
// "MULTI-UNIT BREAKDOWN" / measurement tables.
function parseSummary(txt, sp, warn, noData) {
  const { n } = LAYOUT[sp];
  const rows = [];
  let section = null;
  let group = null; // enclosing heading, e.g. "Archery-Only"
  let lastWasHeading = false;
  const rowRe = /^(\S.*?)\s{2,}(\d{4}|BS\d{2})\s+(\S.*?)\s*$/;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/\f/g, '');
    if (!line.trim()) continue;
    if (/MULTI-UNIT BREAKDOWN|SUCCESSFUL HUNTERS AND THE MEASU/i.test(line)) break;
    if (/^\s/.test(line)) continue; // titles, column headers, page footers
    if (/^(Unit|Total\b|Page \d)/.test(line)) continue;
    const m = line.match(rowRe);
    if (!m) {
      // A heading: a bare line with no numbers in the unit column.
      const h = line.trim();
      if (/\d{3,}\s/.test(h)) { warn(`${sp} unparsed: ${h}`); continue; }
      // Two headings in a row: the first is a group ("Limited Opportunity
      // (General)"), the second its section ("Limited Opportunity Bull").
      // A later heading with the same base name ("Limited Opportunity
      // Antlerless") stays in that group.
      const base = (group || '').replace(/\s*\(.*$/, '');
      if (lastWasHeading) group = section;
      else if (!group || !h.startsWith(base)) group = h;
      section = h;
      lastWasHeading = true;
      continue;
    }
    if (/Grand Total/i.test(m[1])) continue;
    const toks = [...m[3].matchAll(/\S+/g)];
    let vals = toks.map((t) => t[0]);
    // Non-draw hunts (tribal / military) leave "1st Choice Applicants" blank:
    // one column short, with a double-width gap after Permits Authorized.
    if (vals.length === n - 1 && sp !== 'BIGHORNSHEEP') {
      const gaps = toks.slice(1).map((t, i) => t.index - (toks[i].index + toks[i][0].length));
      const rest = gaps.slice(1).sort((a, b) => a - b);
      if (gaps[0] >= 2 * rest[Math.floor(rest.length / 2)]) vals = [vals[0], null, ...vals.slice(1)];
    }
    if (vals.length !== n) {
      // Rows with only permit counts (no questionnaire results) are expected.
      if (vals.length > 5) warn(`${sp} hunt ${m[2]}: ${vals.length} columns (expected ${n}): ${line.trim()}`);
      else noData.push(`${sp} ${m[2]}`);
      continue;
    }
    lastWasHeading = false;
    rows.push({ section, group, unit: m[1].trim().replace(/\s+/g, ' '), huntCode: m[2], vals });
  }
  return rows;
}

// Hunt number → legal wildlife text from the hunting regulations' hunt tables.
function deerLegalWildlife(txt) {
  const lines = txt.split(/\r?\n/);
  const out = new Map();
  const huntRe = /^(1\d{3})(?: [A-Z][a-z]{2} \d{1,2} - |$)/;
  const lwRe = /\b(Any antlered deer|Antlered mule deer|Antlered whitetail deer|Antlerless mule deer|Antlerless whitetail deer|Antlerless deer|Any deer)\b/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(huntRe);
    if (!m) continue;
    // A bare hunt number must be followed by its season dates.
    if (lines[i].trim() === m[1] && !/^[A-Z][a-z]{2} \d{1,2} - /.test(lines[i + 1] || '')) continue;
    let block = lines[i];
    for (let j = i + 1; j < Math.min(lines.length, i + 7) && !huntRe.test(lines[j]); j++) block += ' ' + lines[j];
    const lw = block.match(lwRe);
    if (lw && !out.has(m[1])) out.set(m[1], lw[1].replace(/^./, (c) => c.toUpperCase()));
  }
  return out;
}

function weaponFor(sp, section, group) {
  const s = `${group} ${section}`;
  if (/HAM|CHAMP/i.test(s)) return undefined;
  if (/Archery/i.test(s)) return 'archery';
  if (/Muzzleloader/i.test(s)) return 'muzzleloader';
  if (sp !== 'BIGHORNSHEEP' && /General/i.test(s)) return 'rifle';
  return undefined;
}

function toRows(sp, parsed, { legal, skipped }) {
  const L = LAYOUT[sp];
  const out = [];
  for (const r of parsed) {
    if (/Special Tags/i.test(r.group || '')) { skipped.push(`${sp} ${r.huntCode} (special tag)`); continue; }
    const v = r.vals.map(num);
    const hunters = v[L.hunters];
    const success = v[L.success];
    if (success == null || !hunters) {
      skipped.push(`${sp} ${r.huntCode} (${!hunters ? 'no hunters reported' : 'no success figure'})`);
      continue;
    }
    let label = `${r.section} — ${r.unit}`;
    if (sp === 'BIGHORNSHEEP') label = `${r.section} bighorn sheep — ${r.unit}`;
    if (sp === 'DEER') {
      const lw = legal.get(r.huntCode);
      label += lw ? ` — ${lw}${/whitetail/i.test(lw) ? ' (Coues)' : ''}` : '';
    }
    const days = v[L.days];
    const harvest = v[L.harvest];
    const row = {
      unit: r.unit,
      huntCode: r.huntCode,
      label,
      hunters,
      harvest,
      successPct: success,
      daysPerHarvest: harvest ? Math.round((days / harvest) * 10) / 10 : null,
    };
    const w = weaponFor(sp, r.section, r.group);
    if (w) row.weapon = w;
    out.push(row);
  }
  return out;
}

async function main() {
  const reps = await resolveSources();
  const warnings = [];
  const warn = (s) => warnings.push(s);
  const skipped = [];
  let legal = new Map();
  if (reps.REGS) legal = deerLegalWildlife(await pdfText(reps.REGS, 'raw'));
  else warn(`no ${reps.DEER.year} hunting regulations found; deer labels lack legal wildlife`);

  const species = {};
  const titles = {};
  for (const sp of Object.keys(SPECIES)) {
    const txt = await pdfText(reps[sp], 'table');
    titles[sp] = (txt.match(/(PRELIMINARY|FINAL)\s+RESULTS/i) || [])[1]?.toUpperCase() || '?';
    species[sp] = toRows(sp, parseSummary(txt, sp, warn, skipped), { legal, skipped });
    const codes = species[sp].map((r) => r.huntCode);
    const dup = codes.filter((c, i) => codes.indexOf(c) !== i);
    if (dup.length) warn(`${sp} duplicate hunt numbers: ${[...new Set(dup)].join(', ')}`);
  }
  if (reps.REGS) {
    const missing = species.DEER.filter((r) => !legal.has(r.huntCode)).map((r) => r.huntCode);
    if (missing.length) warn(`DEER hunts without legal wildlife in regulations: ${missing.join(', ')}`);
  }

  const years = Object.fromEntries(Object.keys(SPECIES).map((k) => [k, reps[k].year]));
  const yearVals = [...new Set(Object.values(years))];
  const file = {
    state: 'AZ',
    year: Math.max(...yearVals),
    ...(yearVals.length > 1 ? { speciesYear: years } : {}),
    source: { name: 'Arizona Game and Fish Department — Harvest Summaries (hunter questionnaire results)', url: PAGE },
    notes: [
      `Reports: ${Object.keys(SPECIES).map((k) => `${k}: ${reps[k].file} (${titles[k]} results) ${reps[k].url}`).join('; ')}.`,
      reps.REGS ? `Deer legal wildlife from ${reps.REGS.url}.` : '',
      'Survey-based: AZGFD estimates from mailed/online hunter questionnaires (the summaries list questionnaire returns and 90% confidence intervals), not mandatory reporting.',
      titles.ELK === 'PRELIMINARY' ? 'ELK figures are AZGFD\'s PRELIMINARY results and may be revised.' : '',
      'One row per AZGFD hunt number (huntCode). Multi-unit hunts keep AZGFD\'s unit text (e.g. "1, 2B, and 2C"); the per-unit "multi-unit breakdown" is not included.',
      'hunters = hunters afield; harvest = total harvest (all sexes/classes); successPct = AZGFD % success. daysPerHarvest = hunter days ÷ total harvest (computed; null when harvest is 0).',
      'DEER: draw hunts only (mule deer and Coues whitetail in one table); label carries the hunt\'s legal wildlife from the regulations ("Antlered whitetail deer" = Coues). Over-the-counter archery deer (reported per unit, no hunt number) is not included.',
      'Weapon: archery for Archery-Only sections, muzzleloader for Muzzleloader, rifle for General (any legal weapon) sections; unset for HAM/CHAMP and bighorn sheep.',
      'Hunts with no hunters afield or no published success figure, and bighorn special (auction/raffle) tags, are omitted. Section/total rows are omitted.',
      yearVals.length > 1 ? `Season years differ by species: ${Object.entries(years).map(([k, y]) => `${k} ${y}`).join(', ')}.` : '',
    ].filter(Boolean).join(' '),
    species,
  };
  writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n');

  for (const [k, v] of Object.entries(species)) {
    console.log(`${k}: ${v.length} rows (${v.filter((r) => r.huntCode).length} with huntCode) — ${reps[k].file} [${titles[k]}]`);
  }
  if (skipped.length) console.log(`\nskipped ${skipped.length}: ${skipped.join('; ')}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log('  ' + w);
  }
  console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
