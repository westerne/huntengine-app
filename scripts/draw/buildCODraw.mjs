// Builds lib/huntdata/draw/co.json (DrawFile, see lib/huntdata/draw/format.ts)
// from Colorado Parks and Wildlife's primary-draw "Post Draw Recap" reports.
//
// Source: each species' statistics page on cpw.state.co.us links the recap
// (cpw.widen.net/s/<id>/postdrawrecapreport_<species>-<yy>_…); the PDF is that
// asset's original. One block per hunt code: quota, "Drawn Out At" (the point
// level where each pool's licenses ran out, and how many at that level drew),
// the hybrid-draw allocation, and first-choice applicants and successful
// applicants by preference point for adult residents and non-residents.
//
// Moose, sheep and goat print weighted points beside preference points; their
// levels are stored as the total.
//
// Colorado's draw: first-choice applicants are drawn in preference-point order,
// so above the drawn-out level everyone drew and below it nobody did — except
// through the hybrid draw, which on the hardest hunt codes sets aside up to 20%
// of licenses for a random draw among applicants below that level.
//
// PDF read with pdftotext -raw (poppler). Every hunt's per-point rows are checked
// against CPW's own "Total Choice 1" lines; a hunt whose rows don't add up keeps
// its draw stats but no pointLines.
//
// Run: node scripts/draw/buildCODraw.mjs

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'draw', 'co.json');
const CACHE = path.join(os.tmpdir(), 'codraw');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

const STATS = {
  ELK: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-elk/elk-statistics',
  DEER: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-deer/deer-statistics',
  ANTELOPE: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-pronghorn/pronghorn-statistics',
  MOOSE: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-moose/moose-statistics',
  BIGHORNSHEEP: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-bighorn-sheep/bighorn-sheep-statistics',
  MTNGOAT: 'https://cpw.state.co.us/activities/hunting/big-game/hunting-mountain-goat/mountain-goat-statistics',
};
const WEIGHTED = new Set(['MOOSE', 'BIGHORNSHEEP', 'MTNGOAT']);
const NOUN = {
  ELK: ['Bull elk', 'Cow elk', 'Either-sex elk'],
  DEER: ['Buck deer', 'Doe deer', 'Either-sex deer'],
  ANTELOPE: ['Buck pronghorn', 'Doe pronghorn', 'Either-sex pronghorn'],
  MOOSE: ['Bull moose', 'Cow moose', 'Either-sex moose'],
  BIGHORNSHEEP: ['Ram bighorn sheep', 'Ewe bighorn sheep', 'Either-sex bighorn sheep'],
  MTNGOAT: ['Billy mountain goat', 'Nanny mountain goat', 'Either-sex mountain goat'],
};

async function text(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// Stats page → newest primary recap share link → the asset's original PDF.
async function recapFor(statsUrl) {
  const page = await text(statsUrl);
  const shares = [...new Set(page.match(/https:\/\/cpw\.widen\.net\/s\/[a-z0-9]+\/postdrawrecapreport[a-z0-9_-]*/gi) || [])];
  const dated = shares.map((s) => ({ s, yy: +(s.match(/-(\d{2})_/) || [])[1] || 0 })).sort((a, b) => b.yy - a.yy);
  if (!dated.length) throw new Error(`no recap link on ${statsUrl}`);
  const { s: share, yy } = dated[0];
  const cid = ((await text(share)).match(/\/content\/([a-z0-9]+)\/png\//i) || [])[1];
  if (!cid) throw new Error(`no asset id for ${share}`);
  const name = share.split('/').pop();
  const url = `https://cpw.widen.net/content/${cid}/original/${name}.pdf`;
  const file = path.join(CACHE, `${name}.pdf`);
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok || !/pdf/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${url} → ${r.status} ${r.headers.get('content-type')}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const txt = file.replace(/\.pdf$/, '.raw.txt');
  if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, txt], { stdio: 'ignore' });
  return { url, share, year: 2000 + yy, lines: readFileSync(txt, 'utf8').split(/\r?\n/).map((l) => l.trim()) };
}

// "20 Pref Points" | "None Drawn" | "Choice 2" | "Leftover" | "No Apps" | "N/A"
// Moose, sheep and goat print "3+ Pref Points": three points enter a weighted
// random draw rather than a points line.
const OUTCOME = /(\d+)(\+?) Pref Points|None Drawn|Leftover|Choice (\d)|No Apps|N\/A/g;
function outcome(m) {
  if (m[1] != null) return m[2] ? { kind: 'weighted', minPoints: +m[1] } : { kind: 'points', points: +m[1] };
  if (m[3] != null) return { kind: 'choice', choice: +m[3] }; // every first-choice applicant drew
  if (m[0] === 'Leftover') return { kind: 'leftover' };
  return { kind: { 'None Drawn': 'none', 'No Apps': 'noApps', 'N/A': 'na' }[m[0]] };
}

// A per-point row: adult res, adult non-res, youth res, youth non-res, landowner x2.
// At a page break the next chunk's "1 0" labels can end up on the same line.
const ROW_OR_TAIL = /^(-|\d+) (-|\d+) (-|\d+) (-|\d+) (-|\d+) (-|\d+)(?: 1 0)?$/;
const n = (t) => (t === '-' ? 0 : +t);

function parseBlock(lines, weighted) {
  if (/P99999P/.test(lines[1])) return { skip: true }; // CPW's placeholder code
  const head = lines[1].match(/^(\d+) ([A-Z]{2}[A-Z0-9]{3}[A-Z]\d[A-Z]) ([A-Z])$/);
  if (!head) return { error: `bad header "${lines[1]}"` };
  const [, , code] = head;
  const all = lines.join('\n');

  const doa = all.match(/Drawn Out At\s([\s\S]*?)\n# Drawn at Final Level\s([\s\S]*?)\n% Drawn at Final Level/);
  if (!doa) return { code, error: 'no Drawn Out At' };
  // Only the adult resident and non-resident cells (the first two) are used.
  // Landowner cells can read "Leftover Choice 1", which can't be told apart
  // from a "Leftover" cell next to a "Choice 1" cell, so those aren't counted.
  const outs = [...doa[1].replace(/\n/g, ' ').matchAll(OUTCOME)].map(outcome);
  const finals = [...doa[2].replace(/\n/g, ' ').matchAll(/(\d+) of (\d+)|N\/A/g)].map((m) => (m[1] ? { drawn: +m[1], of: +m[2] } : null));
  if (outs.length < 2 || finals.length < 2) return { code, error: `drawn-out columns ${outs.length}/${finals.length}` };

  const hyb = all.match(/Hybrid Draw \(up to\) (\S+) (\d+|N\/A)/);
  const hybrid = hyb && hyb[2] !== 'N/A' ? +hyb[2] : 0;
  const quota = +(all.match(/Total Quota\nAmount\n(\d+)/) || [])[1] || null;

  const totals = [...all.matchAll(/^Total Choice 1 (\d+) (\d+) (\d+) (\d+) (\d+) (\d+)$/gm)].map((m) => m.slice(1).map(Number));
  const drawnLine = all.match(/# Drawn Balance Res NonRes Res NonRes Unrestricted Restricted\n(\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+)/);

  // Point labels come in descending runs (35…13, then 12…0 after a page break),
  // each printed twice: over the pre-draw rows, then over the post-draw rows.
  // Levels always run from the top level down to 0, so a chunk whose labels
  // got swallowed by a page break ("… - - 1 0") is whatever is left over.
  // Moose, sheep and goat print each level as preference then weighted points
  // ("3 24") under the rows instead of over them. Counted as one total (27 =
  // 3 preference + 24 weighted), the labels run down by one like the others.
  // At a page break the choice marker and a lone "0 0" label land on one line,
  // sometimes ahead of a row ("1 0 0 - - - - - -"); the 0 level is then the
  // chunk left over, as below.
  if (weighted) {
    lines = lines.flatMap((l) => {
      const tail = l.match(/^1 0 0(?: (.+))?$/);
      if (tail) return tail[1] ? [tail[1]] : [];
      const m = l.match(/^([0-3]) (\d+)$/);
      return [m ? String(+m[1] + +m[2]) : l];
    });
  }
  const header = weighted ? 'Pre-Draw Applicants' : 'Choice Preference Points';
  const from = Math.max(0, lines.indexOf(header));
  const pointTable = lines.includes(header);
  const runs = [];
  let cur = [];
  const rows = [];
  let afterBalance = false;
  for (const l of lines.slice(from)) {
    if (/^\d+$/.test(l)) {
      const v = +l;
      if (cur.length && v === cur[cur.length - 1] - 1) cur.push(v);
      else { if (cur.length > 1) runs.push(cur); cur = [v]; }
      continue;
    }
    if (cur.length > 1) runs.push(cur);
    cur = [];
    if (afterBalance) { afterBalance = false; continue; }
    if (l.startsWith('# Drawn Balance')) { afterBalance = true; continue; }
    const r = l.match(ROW_OR_TAIL);
    if (r) rows.push(r);
  }
  if (cur.length > 1) runs.push(cur);
  const chunks = runs.filter((r, i) => i % 2 === 0);
  // Only a 0-point level, its labels printed as "1 0" with the choice marker.
  if (!chunks.length && rows.length === 2) chunks.push([0]);
  if (!chunks.length) chunks.push([]);
  const top = chunks[0][0] ?? -1;
  const covered = chunks.reduce((s, c) => s + c.length, 0);
  const low = chunks[chunks.length - 1][chunks[chunks.length - 1].length - 1] ?? 0;
  if (covered < top + 1 && low > 0) chunks.push(Array.from({ length: low }, (_, i) => low - 1 - i));
  const pre = new Map(), post = new Map();
  let k = 0;
  for (const c of chunks) {
    for (const into of [pre, post]) {
      for (const p of c) {
        const r = rows[k++];
        if (r) into.set(p, { res: n(r[1]), nr: n(r[2]) });
      }
    }
  }
  const rowsOk = pointTable && top >= 0 && rows.length === 2 * (top + 1) && covered + (top + 1 - covered) === top + 1;

  const res = { tags: drawnLine ? +drawnLine[3] : null, out: outs[0], final: finals[0] };
  const nr = { tags: drawnLine ? +drawnLine[4] : null, out: outs[1], final: finals[1] };
  const levels = [...pre.keys()].sort((a, b) => a - b);
  const line = (k) => levels.map((p) => ({ points: p, applicants: pre.get(p)[k], drawn: post.get(p)?.[k] ?? 0 })).filter((l) => l.applicants || l.drawn);
  const pl = { res: line('res'), nr: line('nr') };
  const sum = (a, k) => a.reduce((s, l) => s + l[k], 0);
  const checked = rowsOk && totals.length >= 2 && levels.length > 0
    && sum(pl.res, 'applicants') === totals[0][0] && sum(pl.nr, 'applicants') === totals[0][1]
    && sum(pl.res, 'drawn') === totals[1][0] && sum(pl.nr, 'drawn') === totals[1][1];
  return {
    code, quota, hybrid, res, nr,
    apps: totals[0] ? { res: totals[0][0], nr: totals[0][1] } : null,
    pointLines: checked ? pl : null,
  };
}

// GMU from the hunt code: "EE001E1R" → "1"; sheep and goat units keep their letter ("SMS09O1R" → "S9").
const unitOf = (code) => {
  const u = code.slice(2, 5);
  return /^\d+$/.test(u) ? String(+u) : u[0] + String(+u.slice(1));
};

function label(sp, code) {
  const [m, f, e] = NOUN[sp];
  const noun = { M: m, F: f, E: e }[code[1]] ?? e;
  const unit = unitOf(code);
  const season = code.slice(5, 7);
  const method = { R: 'rifle', A: 'archery', M: 'muzzleloader' }[code[7]];
  const when = { E: 'early', L: 'late', P: 'private land only', O: '' }[season[0]];
  const seasonText = when == null ? `season ${season}` : season[0] === 'O' ? (method === 'rifle' ? `season ${season[1]}` : '') : when;
  return `${noun} — Unit ${unit}${[seasonText, method].filter(Boolean).length ? `, ${[seasonText, method].filter(Boolean).join(' ')}` : ''}`;
}

const stat = (pool, apps) => {
  if (pool.tags == null && apps == null) return null;
  const o = pool.out;
  return {
    tags: pool.tags,
    applicants: apps,
    successPct: apps ? Math.min(100, Math.round((1000 * (pool.tags ?? 0)) / apps) / 10) : null,
    minPoints: o.kind === 'points' ? o.points : o.kind === 'choice' || o.kind === 'leftover' ? 0 : null,
  };
};


// ---------------------------------------------------------------- season dates
// The recap has no dates; CPW's brochures do (Big Game, and Sheep & Goat for
// those two). Their hunt tables print a
// date line ("Oct. 24–Nov. 1", sometimes split over two lines) and then the hunt
// codes it covers; codes on the standard seasons often print no date, so those
// take the brochure's "Season Dates" table. A code listed under two different
// dates is left without one.
const BROCHURES = [
  'https://cpw.widen.net/s/5wvx7rggrd/colorado-big-game-hunting-brochure',
  'https://cpw.widen.net/s/n87kwmkzbt/colorado-sheep-and-goat-brochure',
];
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, June: 6, Jul: 7, July: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
const M = '(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)';
const RANGE = new RegExp(`${M}\\.? ?(\\d{1,2}) ?- ?(?:${M}\\.? ?)?(\\d{1,2})(?:, ?(\\d{4}))?`, 'g');
const STARTS_WITH_DATE = new RegExp(`^${M}\\.? \\d`);
const CODE_DASHED = /\b([DEAMSG])-([EMF])-([A-Z0-9]{3})-([A-Z]\d)-([RAMX])\b/g;
// "Season Dates: 2026" table: [month, day, month, day] by species and season code.
const STANDARD = {
  DEER: { O1A: [9, 2, 9, 30], O1M: [9, 12, 9, 20], O2R: [10, 24, 11, 1], O3R: [11, 7, 11, 15], O4R: [11, 18, 11, 22] },
  ELK: { O1A: [9, 2, 9, 30], O1M: [9, 12, 9, 20], O1R: [10, 14, 10, 18], O2R: [10, 24, 11, 1], O3R: [11, 7, 11, 15], O4R: [11, 18, 11, 22] },
  ANTELOPE: { O1A: [8, 15, 9, 20], O1M: [9, 21, 9, 29], O1R: [10, 3, 10, 11] },
  MOOSE: { O1A: [9, 12, 9, 30], O1M: [9, 12, 9, 20], O1R: [10, 1, 10, 14] },
};

// A widen share page → that asset's original PDF, as text.
async function widenText(share) {
  const name = share.split('/').pop();
  const file = path.join(CACHE, `${name}.pdf`);
  if (!existsSync(file) || statSync(file).size === 0) {
    const cid = ((await text(share)).match(/\/content\/([a-z0-9]+)\/png\//i) || [])[1];
    if (!cid) throw new Error(`no asset id for ${share}`);
    const r = await fetch(`https://cpw.widen.net/content/${cid}/original/${name}.pdf`, { headers: UA });
    if (!r.ok || !/pdf/i.test(r.headers.get('content-type') ?? '')) throw new Error(`${name} → ${r.status} ${r.headers.get('content-type')}`);
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  const txt = file.replace(/\.pdf$/, '.raw.txt');
  if (!existsSync(txt)) execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', file, txt], { stdio: 'ignore' });
  return readFileSync(txt, 'utf8');
}

async function brochureSeasons(seasonYear) {
  const found = new Map();
  const conflict = new Set();
  const otc = [];
  for (const share of BROCHURES) {
    const raw = (await widenText(share)).split(/\r?\n/).map((l) => l.replace(/[–—�]/g, '-').trim());
    // Rejoin a range broken after its dash: "Oct. 1-" + "Jan. 31, 2027".
    const lines = [];
    for (const l of raw) {
      if (lines.length && /-$/.test(lines[lines.length - 1]) && STARTS_WITH_DATE.test(l)) lines[lines.length - 1] += l;
      else lines.push(l);
    }
    readDates(lines, seasonYear, found, conflict);
    if (/big-game/.test(share)) otc.push(...otcFromBrochure(lines, seasonYear));
  }
  for (const c of conflict) found.delete(c);
  return { found, conflicts: conflict.size, otc };
}

// First to last range on a line: "Sept. 12-30 Sept. 12-20 Oct. 1-14" (moose
// season choice) is Sept. 12 to Oct. 14.
function spanOf(ranges, seasonYear) {
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const first = ranges[0], last = ranges[ranges.length - 1];
  const m1 = MON[first[1]], d1 = +first[2];
  const m2 = MON[last[3] ?? last[1]], d2 = +last[4];
  // Big-game seasons open from August on; one that opens in January–March
  // ("Jan. 1-15, 2027") is the tail of the season year, in the next year.
  const y1 = m1 <= 3 ? seasonYear + 1 : seasonYear;
  const y2 = last[5] ? +last[5] : m2 < m1 ? y1 + 1 : y1;
  return { open: iso(y1, m1, d1), close: iso(y2, m2, d2) };
}

// ---------------------------------------------------------------- over the counter
// The brochure's "Over-the-Counter Licenses" panels: unlimited licenses sold
// from Aug. 4, no draw. Each prints its hunt code ("License agents only:
// E-M-000-U2-R"), season dates, sometimes "Resident only" or a nonresident
// line, and "Valid units:" — the list that matters, since one code covers many
// units. Read back from the code for dates and residency (never past the
// panel's header or the previous code), forward for units. "Same as second
// season" takes the previous code's units.
const OTC_CODE = /\b([ADE])-([EMF])-(\d{3})-(U\d)-([RAM])\b/;
const UNIT_LINE = /^(\*?\d|New\b|and\b|on\b|lands\b|except|Bosque|del\b|SWA)/i;
function otcFromBrochure(lines, seasonYear) {
  const out = [];
  let lastCode = -1;
  let prevUnits = { units: [], publicOnly: null };
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OTC_CODE);
    if (!m || !/License ?agents ?only/i.test(lines[i] + lines[i - 1])) continue;
    let from = Math.max(lastCode + 1, i - 40);
    for (let j = i; j >= from; j--) if (/^Over-the-Counter Licenses:/.test(lines[j])) { from = j; break; }
    const back = lines.slice(from, i).reverse();
    const resLine = back.find((l) => /resident ?only|nonresident|non-resident/i.test(l)) ?? '';
    const openTo = /^non-?resident/i.test(resLine.replace(/\s/g, '')) ? 'nonresident' : /resident ?only/i.test(resLine) ? 'resident' : null;
    // The labeled date ("Season dates: Aug. 15-Sept. 20", or on the next line)
    // beats a nearer range in the notes ("either sex from Sept. 1-20").
    const fwd = lines.slice(from, i);
    const at = fwd.findIndex((l) => /dates:/i.test(l));
    const labeled = at < 0 ? [] : [...fwd[at].matchAll(RANGE)].length ? [...fwd[at].matchAll(RANGE)] : [...(fwd[at + 1] ?? '').matchAll(RANGE)];
    const dated = labeled.length ? labeled : back.map((l) => [...l.matchAll(RANGE)]).find((r) => r.length);
    // Units: the "Valid units:" line onward, while lines read like a unit list.
    let text = '';
    let k = i + 1;
    while (k < lines.length && !/Valid ?units:/i.test(lines[k]) && k < i + 3) k++;
    if (/Valid ?units:/i.test(lines[k] ?? '')) {
      text = lines[k].replace(/^.*Valid ?units:/i, '');
      for (k = k + 1; k < lines.length && UNIT_LINE.test(lines[k]); k++) text += ` ${lines[k]}`;
    }
    const same = /same ?as ?second/i.test(text);
    // A one-unit license ("Unit 128") prints no list; the unit is in the code.
    const listed = [...new Set((text.match(/\d{1,3}/g) ?? []).map((u) => String(+u)))];
    const units = same ? prevUnits.units : listed.length ? listed : +m[3] ? [String(+m[3])] : [];
    const publicOnly = same ? prevUnits.publicOnly : (text.match(/(\d{1,3}) ?on ?public ?lands? ?only/i) || [])[1] ?? null;
    lastCode = i;
    prevUnits = { units, publicOnly };
    const [, sp, sex, , season, method] = m;
    out.push({
      code: m.slice(1).join(''), species: { E: 'ELK', D: 'DEER', A: 'ANTELOPE' }[sp], sex, season, method,
      openTo, season_: dated ? spanOf(dated, seasonYear) : null, units, publicOnly,
    });
  }
  return out;
}

function readDates(lines, seasonYear, found, conflict) {
  const span = (ranges) => spanOf(ranges, seasonYear);
  const record = (code, se) => {
    const prev = found.get(code);
    if (prev && (prev.open !== se.open || prev.close !== se.close)) conflict.add(code);
    found.set(code, se);
  };
  // Three places a date comes from, nearest first: the code's own row ("4, 5,
  // 14 Sept. 12-30 … Bull M-M-004-O1-X", "Plains 110 Oct. 24-Nov. 3"), a date
  // line just above the codes, or the table's header ("Archery — Limited
  // Nonresident Licenses — Season Dates: Sept. 2-30"), which covers every
  // code in that table that prints no date of its own.
  // The header's date only covers codes for its weapon (the PDF interleaves
  // the archery and muzzleloader tables).
  let cur = null;
  let section = null;
  let method = null;
  for (const raw of lines) {
    const l = raw.replace(/^■/, '');
    const codes = [...l.matchAll(CODE_DASHED)];
    const weapon = l.match(/^(Archery|Muzzleloader|Rifle) - /);
    if (weapon) method = weapon[1][0];
    // "Pronghorn Season Dates" starts the next species: nothing carries over.
    if (/Season Dates/.test(l)) {
      const r = [...l.matchAll(RANGE)];
      section = r.length && method ? { ...span(r), method } : null;
      cur = null;
      continue;
    }
    const before = codes.length ? l.slice(0, codes[0].index) : l;
    const ranges = [...before.matchAll(RANGE)];
    if (ranges.length) {
      cur = span(ranges);
    } else if (!codes.length && !/^(Late|Early|Season|Either|Buck|Doe|Bull|Cow|Plains)\b/.test(l)) {
      cur = null;
    }
    for (const c of codes) {
      const se = cur ?? (section && c[5] === section.method ? { open: section.open, close: section.close } : null);
      if (se) record(c.slice(1).join(''), se);
    }
  }
}

function seasonFor(sp, code, fromTables, seasonYear) {
  const hit = fromTables.get(code);
  if (hit) return { ...hit, from: 'table' };
  const std = STANDARD[sp]?.[code.slice(5)];
  if (!std) return null;
  const iso = (m, d) => `${seasonYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { open: iso(std[0], std[1]), close: iso(std[2], std[3]), from: 'standard' };
}

const out = { state: 'CO', year: null, source: null, notes: null, species: {} };
// Draw year = season year (the 2026 draw is for the 2026 seasons).
let brochure = null;
const seasonStats = { table: 0, standard: 0, none: 0 };
const report = [];
const sources = [];
for (const [sp, statsUrl] of Object.entries(STATS)) {
  let recap;
  try { recap = await recapFor(statsUrl); } catch (e) { report.push(`${sp}: ${e.message}`); continue; }
  out.year ??= recap.year;
  if (recap.year !== out.year) report.push(`${sp}: recap is ${recap.year}, others ${out.year}`);
  sources.push(recap.url);
  if (!brochure) {
    try { brochure = await brochureSeasons(recap.year); } catch (e) { report.push(`season dates: ${e.message}`); brochure = { found: new Map(), conflicts: 0 }; }
  }
  const starts = recap.lines.flatMap((l, i) => (l === '# Drawn Hunt Code List' ? [i] : []));
  const rows = [];
  let bad = 0;
  for (let k = 0; k < starts.length; k++) {
    const b = parseBlock(recap.lines.slice(starts[k], starts[k + 1] ?? recap.lines.length), WEIGHTED.has(sp));
    if (b.skip) continue;
    // "G" seasons are 2025 licenses given back to the hunters who drew them
    // and couldn't hunt because of the fires; nobody else can apply.
    if (b.code?.[5] === 'G') continue;
    if (b.error) { report.push(`${sp} ${b.code ?? '?'}: ${b.error}`); continue; }
    if (!b.pointLines) bad++;
    const row = {
      huntCode: b.code,
      unit: unitOf(b.code),
      label: label(sp, b.code),
      ...(() => {
        const se = seasonFor(sp, b.code, brochure.found, recap.year);
        seasonStats[se ? se.from : 'none']++;
        return se ? { season: { open: se.open, close: se.close } } : {};
      })(),
      draw: { resident: stat(b.res, b.apps?.res ?? null), nonresident: stat(b.nr, b.apps?.nr ?? null) },
      drawnOut: {
        resident: { ...b.res.out, ...(b.res.final ? { drawnAtLevel: b.res.final.drawn, appliedAtLevel: b.res.final.of } : {}) },
        nonresident: { ...b.nr.out, ...(b.nr.final ? { drawnAtLevel: b.nr.final.drawn, appliedAtLevel: b.nr.final.of } : {}) },
      },
      ...(b.hybrid ? { hybridTags: b.hybrid } : {}),
      ...(b.pointLines ? { pointLines: { resident: b.pointLines.res, nonresident: b.pointLines.nr } } : {}),
    };
    const w = { R: 'rifle', A: 'archery', M: 'muzzleloader' }[b.code[7]];
    if (w) row.weapon = w;
    rows.push(row);
  }
  // Over-the-counter licenses: one row per valid unit, so "what's in unit 35"
  // finds them. The huntCode is CPW's code plus the unit; the label names the
  // code they'd actually buy.
  const otc = (brochure.otc ?? []).filter((o) => o.species === sp);
  for (const o of otc) {
    const [m, f, e] = NOUN[sp];
    const noun = { M: m, F: f, E: e }[o.sex];
    const method = { R: 'rifle', A: 'archery', M: 'muzzleloader' }[o.method];
    const which = o.method === 'R' ? { U2: '2nd season ', U3: '3rd season ', U6: 'late ' }[o.season] ?? '' : '';
    const dashed = `${o.code[0]}-${o.code[1]}-${o.code.slice(2, 5)}-${o.code.slice(5, 7)}-${o.code[7]}`;
    const extra = [
      o.code === 'DE048U6R' ? 'white-tailed deer only' : null,
      o.openTo === 'resident' ? 'residents only' : o.openTo === 'nonresident' ? 'nonresident license' : null,
    ];
    for (const u of o.units) {
      rows.push({
        huntCode: `${o.code}-${u}`, unit: u,
        label: `${noun} — Unit ${u}, over the counter ${which}${method} (license ${dashed}${[...extra, u === o.publicOnly ? 'public land only' : null].filter(Boolean).map((x) => `; ${x}`).join('')})`,
        weapon: method, otc: true,
        ...(o.openTo ? { openTo: o.openTo } : {}),
        ...(o.season_ ? { season: o.season_ } : {}),
        draw: { resident: null, nonresident: null },
      });
    }
  }
  if (otc.length) report.push(`${sp}: ${otc.length} over-the-counter licenses → ${otc.reduce((s, o) => s + o.units.length, 0)} unit rows`);
  rows.sort((a, b) => a.huntCode.localeCompare(b.huntCode));
  out.species[sp] = rows;
  report.push(`${sp}: ${rows.filter((r) => !r.otc).length} hunt codes (${starts.length} in recap), ${rows.filter((r) => !r.otc).length - bad} with checked pointLines, ${rows.filter((r) => r.hybridTags).length} with hybrid licenses`);
}

out.source = { name: `Colorado Parks and Wildlife — ${out.year} Primary Draw Post Draw Recap reports`, url: 'https://cpw.state.co.us/hunting/big-game/elk/statistics' };
out.notes = [
  `CPW ${out.year} primary big-game draw, from the per-species Post Draw Recap PDFs: ${sources.join(' ; ')}.`,
  `Colorado draws first-choice applicants in preference-point order. drawnOut per residency (adult) is CPW's "Drawn Out At": kind "points" = licenses ran out at that point level (drawnAtLevel of appliedAtLevel drew there); "choice" = every first-choice applicant drew and licenses went to later choices; "leftover" = licenses were left after the draw; "none" = none drawn in that pool; "noApps" = no applicants; "na" = not applicable.`,
  `hybridTags = licenses CPW issued through the hybrid draw (up to 20% of the quota on hunt codes where it applies), a random draw among applicants below the drawn-out level.`,
  `Moose, bighorn sheep and mountain goat are drawn by weighted random draw once an applicant holds 3 preference points: drawnOut kind "weighted" (minPoints 3), and their pointLines are by total points (3 preference + weighted points, so 3 preference and 5 weighted = 8). "G" season codes (2025 licenses returned after the fires, guaranteed to the original holders) are left out.`,
  `Rows with otc true are CPW's unlimited over-the-counter licenses (on sale Aug. 4, no draw), from the brochure's "Over-the-Counter Licenses" panels: one row per valid unit, huntCode = CPW code + "-" + unit, openTo set where the panel says resident only or nonresident; no draw stats.`,
  `DrawStat: tags = adult licenses drawn by that residency; applicants = adult first-choice applicants; successPct = tags ÷ applicants (computed here; includes licenses drawn through hybrid); minPoints = the drawn-out level (0 when every first-choice applicant drew). pointLines: adult first-choice applicants and successful applicants per preference-point level, checked against CPW's Total Choice 1 lines. Youth and landowner (LPP) pools are not included.`,
].join(' ');

out.notes += ` Season dates are the ${out.year} seasons from CPW's Big Game and Sheep & Goat brochures (${BROCHURES.join(' ; ')}): ${seasonStats.table} hunt codes from the hunt tables' own dates, ${seasonStats.standard} from the brochure's "Season Dates" table for standard archery, muzzleloader and rifle seasons (hunt codes the tables print without a date), ${seasonStats.none} without dates (late, private-land and other special seasons the tables don't date, and ${brochure?.conflicts ?? 0} codes listed under two different dates).`;
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)} — CO ${out.year}`);
for (const r of report) console.log('  ' + r);
console.log(`  season dates: ${JSON.stringify(seasonStats)}, conflicts ${brochure?.conflicts ?? 0}`);
