// Builds lib/huntdata/draw/ut.json (DrawFile, see lib/huntdata/draw/format.ts)
// from the Utah Division of Wildlife Resources (DWR) big game draw results.
//
// Source: "<year> Draw 5, Big Game Bonus Point Draw Results"
// (wildlife.utah.gov/pdf/bg/<year>/<yy>_bg-odds.pdf, linked from
// wildlife.utah.gov/biggame/odds). One page per hunt: for each bonus-point
// level and residency, eligible applicants, permits from the bonus pool (the
// half of the permits that goes to the highest point holders), permits from
// the regular pool (the random draw) and the total.
//
// Utah's draw (R657-62): half of each hunt's permits go to the applicants with
// the most bonus points; the rest are drawn at random, each applicant getting
// one entry plus one per bonus point. lib/huntdata/weightedDraw.ts models it.
//
// Hunts are keyed by DWR hunt number (EB3000), the same key as
// lib/huntdata/harvest/ut.json.
//
// PDF read with pdftotext -raw (poppler), which keeps one table row per line.
//
// Run: node scripts/draw/buildUTDraw.mjs [year]

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'draw', 'ut.json');
const YEAR = Number(process.argv[2] ?? 2025);
const URL = `https://wildlife.utah.gov/pdf/bg/${YEAR}/${String(YEAR).slice(2)}_bg-odds.pdf`;
const CACHE = path.join(os.tmpdir(), 'utdraw');
mkdirSync(CACHE, { recursive: true });

async function download(url) {
  const file = path.join(CACHE, url.split('/').pop());
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' } });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    if (/text\/html/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${url} returned HTML (not posted yet?)`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return file;
}

const pdf = await download(URL);
const txt = pdf.replace(/\.pdf$/, '.raw.txt');
if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', pdf, txt], { stdio: 'ignore' });
const lines = readFileSync(txt, 'utf8').split(/\r?\n/);

// DWR hunt-number prefix → our species key. Bison and mountain goat aren't
// offered for Utah yet; their pages are skipped.
const SPECIES = { DB: 'DEER', EB: 'ELK', PB: 'ANTELOPE', MB: 'MOOSE', DS: 'BIGHORNSHEEP', RS: 'BIGHORNSHEEP' };

// pdftotext splits some words ("An y", "Mor Gan") and loses a space around some
// separators ("Late -Boulder"). A hyphen inside a word ("Limited-entry",
// "Oquirrh-stansbury") is not a separator.
const cleanText = (s) => s.replace(/\s+/g, ' ').replace(/An y/g, 'Any').replace(/Henr y/g, 'Henry').replace(/Mor Gan/gi, 'Morgan')
  .replace(/Pan Guitch/gi, 'Panguitch').replace(/ -(?=\S)/g, ' - ').replace(/(?<=\S)- /g, ' - ').replace(/ , /g, ', ').trim();
// DWR prints names in sentence case after the first letter ("Book Cliffs, Bitter Creek/east").
const titleCase = (s) => s.replace(/(^|[\s/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase());

function weaponOf(last) {
  const w = last.toLowerCase();
  if (/archery/.test(w)) return 'archery';
  if (/muzzle/.test(w)) return 'muzzleloader';
  if (/any legal weapon/.test(w)) return 'rifle';
  return undefined; // H.A.M.S.S. (handgun, archery, muzzleloader, shotgun) and other restricted weapons
}

const ROW = /^(\d+) (\d+) (\d+) (\d+) (\d+) (?:N\/A|1 in [\d.,]+) (\d+) (\d+) (\d+) (\d+) (\d+) (?:N\/A|1 in [\d.,]+)$/;
// The "1" of "1 in N" sometimes runs into the cell before it ("2 1 3 in 1137.0").
const TOTAL = /^Totals ((?:\d+ ?){3,4}) (?:N\/A|(?:1 )?in [\d.,]+) Totals ((?:\d+ ?){3,4}) (?:N\/A|(?:1 )?in [\d.,]+)$/;

const out = { state: 'UT', year: YEAR, source: null, notes: null, species: {} };
const problems = [];
let skipped = 0;

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^Hunt: ([A-Z]{2})(\d{4}) (.+?) Page \d+$/);
  if (!m) continue;
  const [, prefix, num, rawName] = m;
  const code = prefix + num;
  const sp = SPECIES[prefix];
  if (!sp) { skipped++; continue; }

  const parts = cleanText(rawName).split(' - ').map((s) => s.trim()).filter(Boolean);
  // Usually "<hunt> - <unit> - <weapon>"; a few restricted hunts print no weapon.
  const hasWeapon = parts.length > 2 || /weapon|archery|muzzle|h\.a\.m/i.test(parts[parts.length - 1]);
  const weaponText = hasWeapon ? parts[parts.length - 1] : '';
  const body = hasWeapon ? parts.slice(0, -1) : parts;
  const unit = titleCase(body[body.length - 1].replace(/ Bull Elk$/, '').replace(/ Le$/, ''));
  const kind = body.slice(0, -1).join(' - ') || body[0];

  const res = [], nr = [];
  let total = null;
  for (let j = i + 1; j < lines.length && !lines[j].startsWith('Hunt: '); j++) {
    const r = lines[j].match(ROW);
    if (r) {
      const n = r.slice(1).map(Number);
      if (n[0] !== n[5]) problems.push(`${code}: point columns differ (${n[0]} / ${n[5]})`);
      res.push({ points: n[0], applicants: n[1], bonus: n[2], drawn: n[4], regular: n[3] });
      nr.push({ points: n[5], applicants: n[6], bonus: n[7], drawn: n[9], regular: n[8] });
      continue;
    }
    const t = lines[j].match(TOTAL);
    if (t) { total = [t[1], t[2]].map((g) => g.trim().split(' ').map(Number)); break; }
  }
  if (!total) { problems.push(`${code}: no Totals row`); continue; }

  // Every column has to add up to DWR's own totals, or the page was misread.
  const sum = (a, k) => a.reduce((s, l) => s + l[k], 0);
  // DWR sometimes leaves one Totals cell blank; the others must still match.
  const matches = (a, printed) => {
    const want = [sum(a, 'applicants'), sum(a, 'bonus'), sum(a, 'regular'), sum(a, 'drawn')];
    if (printed.length === 4) return printed.every((n, k) => n === want[k]);
    return [0, 1, 2, 3].some((drop) => want.filter((_, k) => k !== drop).every((n, k) => n === printed[k]));
  };
  const ok = matches(res, total[0]) && matches(nr, total[1]);
  if (!ok) { problems.push(`${code}: columns don't sum to Totals`); continue; }

  const stat = (pool, a) => {
    const applicants = sum(a, 'applicants');
    const tags = sum(a, 'drawn');
    if (!applicants && !tags) return null;
    const drew = a.filter((l) => l.drawn > 0).map((l) => l.points);
    return {
      tags,
      applicants,
      successPct: applicants ? Math.round((1000 * tags) / applicants) / 10 : null,
      minPoints: drew.length ? Math.min(...drew) : null,
      pools: [
        { name: 'Bonus (most points)', tags: sum(a, 'bonus'), applicants: null, successPct: null },
        { name: 'Random', tags: sum(a, 'regular'), applicants: null, successPct: null },
      ],
    };
  };
  const linesOf = (a) => a.filter((l) => l.applicants > 0 || l.drawn > 0)
    .map(({ points, applicants, drawn, bonus }) => ({ points, applicants, drawn, bonus }))
    .sort((x, y) => x.points - y.points);

  const resident = stat('resident', res);
  const nonresident = stat('nonresident', nr);
  const cwmu = /cwmu/i.test(kind);
  const row = {
    huntCode: code,
    unit,
    label: `${titleCase(kind.replace(/\bLe\b/g, 'LE').replace(/\bAlw\b/g, 'ALW').replace(/\bCwmu\b/g, 'CWMU').replace(/\bHamss\b/g, 'HAMSS'))} — ${unit}${weaponText ? `, ${weaponText.replace(/\bH\.a\.m\.s\.s\./i, 'HAMSS')}` : ''}${cwmu ? ' (private-land CWMU)' : ''}`,
    weapon: weaponOf(weaponText),
    draw: { resident, nonresident },
    pointLines: {
      ...(resident ? { resident: linesOf(res) } : {}),
      ...(nonresident ? { nonresident: linesOf(nr) } : {}),
    },
  };
  if (!row.weapon) delete row.weapon;
  (out.species[sp] ??= []).push(row);
}

for (const rows of Object.values(out.species)) rows.sort((a, b) => a.huntCode.localeCompare(b.huntCode));

out.source = { name: `Utah Division of Wildlife Resources — ${YEAR} Draw 5, Big Game Bonus Point Draw Results`, url: URL };
out.notes = [
  `DWR ${YEAR} limited-entry, premium limited-entry, CWMU and once-in-a-lifetime draw (${URL}). Utah's bonus-point draw: half of each hunt's permits go to the applicants with the most bonus points, the rest by random draw with one entry plus one per bonus point.`,
  `pointLines per residency and bonus-point level: applicants = DWR "Eligible Applicants", drawn = "Total # Permits", bonus = "Bonus # Permits" (from the top-points pool); drawn − bonus = permits from the random pool. Every hunt's columns were checked against DWR's Totals row.`,
  `DrawStat: tags = total permits issued to that residency, applicants = eligible applicants, successPct = tags ÷ applicants × 100 (computed here), minPoints = fewest points that drew any permit (bonus or random) — the random pool means it is not a cutoff. pools = permits from the bonus pool and the random pool.`,
  `Weapon: Any Legal Weapon → rifle; Archery; Muzzleloader; H.A.M.S.S. (handgun, archery, muzzleloader, shotgun) left unset. CWMU hunts are on private cooperative wildlife management units and are labeled. Not included: bison and mountain goat; general-season deer (a separate preference-point draw); antlerless and youth draws.`,
].join(' ');

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)} — UT ${YEAR}`);
for (const [sp, rows] of Object.entries(out.species)) console.log(`  ${sp}: ${rows.length} hunts`);
console.log(`skipped (species not offered): ${skipped}`);
if (problems.length) { console.log(`problems (${problems.length}):`); for (const p of problems) console.log('  ' + p); }
