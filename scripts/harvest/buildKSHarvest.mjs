// Builds lib/huntdata/harvest/ks.json (HarvestFile, see lib/huntdata/harvest/format.ts)
// from Kansas Department of Wildlife and Parks (KDWP) harvest reports on ksoutdoors.gov.
//
// What KDWP publishes (checked 2026-10):
//   - ELK: "<yyyy>-<yy> Elk Harvest Report" PDF linked from the elk page
//     (/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/elk). Survey-based. Success is
//     given in the text only by permit class (Fort Riley any-elk, Fort Riley antlerless-only, all
//     any-elk permits, all antlerless-only permits); per-unit numbers are only in charts. Those
//     text figures are parsed here.
//   - ANTELOPE: "<yyyy> Pronghorn (Antelope) Harvest Report" PDF (antelope page). Success by unit
//     and by weapon is shown only in charts (no printed numbers), so no rows can be built; the
//     script downloads it and reports what it found.
//   - DEER: no deer harvest / hunter-success report is linked on the current ksoutdoors.gov site
//     (deer page, deer management page, research page, site search). KDWP's ArcGIS "Deer_Combined"
//     table has harvest COUNTS only (no hunter numbers) and stops at 2021, so it cannot give
//     hunter success and is not used.
//
// PDFs: Node fetch (curl is refused by the CDN; nothing is bypassed — if fetch is refused the
// script stops), cached in os.tmpdir()/ksharvest, text via pdftotext -layout
// (PDFTOTEXT env var, default "pdftotext" on PATH, then /mingw64/bin/pdftotext).
//
// Run: node scripts/harvest/buildKSHarvest.mjs
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'harvest', 'ks.json');
const DRAW = path.join(ROOT, 'lib', 'huntdata', 'draw', 'ks.json');
const SITE = 'https://www.ksoutdoors.gov';
const ELK_PAGE = `${SITE}/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/elk`;
const ANT_PAGE = `${SITE}/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/antelope`;
const CACHE = path.join(os.tmpdir(), 'ksharvest');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

async function fetchOk(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}. KDWP refused the request; not working around it.`);
  return r;
}
async function getCached(url, name, binary = false) {
  const file = path.join(CACHE, name);
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetchOk(url);
    const buf = Buffer.from(await r.arrayBuffer());
    if (!binary && /Access Denied|security verification/i.test(buf.subarray(0, 2000).toString())) throw new Error(`${url}: blocked page`);
    if (binary && buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`${url}: not a PDF`);
    writeFileSync(file, buf);
  }
  return binary ? file : readFileSync(file, 'utf8');
}
function pdftotext(file) {
  const cands = [process.env.PDFTOTEXT, 'pdftotext', '/mingw64/bin/pdftotext', 'C:/Program Files/Git/mingw64/bin/pdftotext.exe'].filter(Boolean);
  for (const exe of cands) {
    try { return execFileSync(exe, ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }); } catch { /* next */ }
  }
  throw new Error('pdftotext not found (set PDFTOTEXT)');
}
// Newest "<year>... <title>" link on a page: returns { url, year, text }.
function newestLink(html, re) {
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ url: new URL(m[1].replace(/&amp;/g, '&'), SITE).href, text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }))
    .filter((l) => re.test(l.text) && /showpublisheddocument/i.test(l.url))
    .map((l) => ({ ...l, year: +(/(20\d\d)/.exec(l.text)?.[1] ?? 0) }));
  if (!links.length) return null;
  return links.sort((a, b) => b.year - a.year)[0];
}
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const n = (s) => (s == null ? null : /^\d+$/.test(s) ? +s : WORDS[s.toLowerCase()] ?? null);
const pct1 = (h, k) => Math.round((h / k) * 1000) / 10;

const notes = [];
const species = {};
const speciesYear = {};

// ---------------------------------------------------------------- elk
const elkLink = newestLink(await getCached(ELK_PAGE, 'elk.html'), /Elk Harvest Report/i);
if (!elkLink) throw new Error('elk harvest report link not found on elk page');
const elkTxt = pdftotext(await getCached(elkLink.url, `elk-harvest-${elkLink.year}.pdf`, true)).replace(/\s+/g, ' ');
{
  const rows = [];
  // "Ten of 12 hunters (83%) with Fort Riley any-elk permits and eight of 18 hunters (44%) with Fort Riley antlerless-only elk permits harvested elk."
  const fr = /(\w+) of (\d+) hunters \((\d+)%\) with Fort Riley any-elk permits and (\w+) of (\d+) hunters \((\d+)%\) with Fort Riley antlerless-only/i.exec(elkTxt);
  if (fr) {
    const [hA, kA, pA, hB, kB, pB] = [n(fr[1]), n(fr[2]), +fr[3], n(fr[4]), n(fr[5]), +fr[6]];
    for (const [label, h, k, p] of [['Fort Riley any-elk (draw permit; Sub-unit 2A, inside Unit 2)', hA, kA, pA], ['Fort Riley antlerless-only (draw permit; Sub-unit 2A, inside Unit 2)', hB, kB, pB]]) {
      if (h == null || k == null) { notes.push(`Could not read numbers for ${label}.`); continue; }
      const s = pct1(h, k);
      if (Math.abs(s - p) > 1) notes.push(`${label}: computed ${s}% vs printed ${p}%.`);
      rows.push({ unit: '2', weapon: 'any', label, hunters: k, harvest: h, successPct: s });
    }
  } else notes.push('Fort Riley success sentence not found in the elk report.');
  // "including 34 elk taken on 782 any-elk permits (19%) and 13 taken on 51 antlerless-only elk permits (25%)"
  const sw = /including (\d+) elk taken on (\d+) any-elk permits \((\d+)%\) and (\d+) taken on (\d+) antlerless-only elk permits \((\d+)%\)/i.exec(elkTxt);
  if (sw) {
    const [hA, kA, pA, hB, kB, pB] = sw.slice(1).map(Number);
    for (const [label, h, k, p] of [['All any-elk permits, statewide (Fort Riley + over-the-counter Units 2 & 3)', hA, kA, pA], ['All antlerless-only elk permits, statewide (Fort Riley + over-the-counter Units 2 & 3)', hB, kB, pB]]) {
      // Report prints harvest, permit count and KDWP's success %; the permit count is permits, not
      // hunters afield, so hunters stays null and successPct is KDWP's printed figure.
      const chk = pct1(h, k);
      if (Math.abs(chk - p) > 1) notes.push(`${label}: KDWP prints ${h} elk on ${k} permits (${p}%), but ${h}/${k} = ${chk}%; the printed ${p}% is used and hunters left null (the permit count looks like a misprint — report also says 229 elk permits were sold in total).`);
      rows.push({ unit: 'Statewide', weapon: 'any', label: `${label} — ${h} elk on ${k} permits as printed`, hunters: null, harvest: h, successPct: p });
    }
  } else notes.push('Statewide permit-success sentence not found in the elk report.');
  const season = /(20\d\d)-(\d\d) Kansas Elk Harvest Report/i.exec(elkTxt);
  speciesYear.ELK = season ? +season[1] : elkLink.year;
  species.ELK = rows;
  notes.unshift(`ELK: ${elkLink.text} ${elkLink.url} — KDWP mail/e-mail harvest survey of all elk hunters plus Fort Riley mandatory registration; reported harvest, not expanded for nonrespondents (KDWP: response rate ${/response rate was (\d+%)/i.exec(elkTxt)?.[1] ?? 'n/a'}). Rows are the success figures printed in the report text; per-unit success appears only in charts and is not used. Fort Riley rows use unit "2" (Fort Riley is Sub-unit 2A inside elk Unit 2; KDWP's Elk_Units layer has no 2A polygon); hunters = Fort Riley permit holders who hunted. Statewide rows use unit "Statewide".`);
}

// ---------------------------------------------------------------- antelope (report found, no tabular success)
const antLink = newestLink(await getCached(ANT_PAGE, 'antelope.html'), /Harvest Report/i);
if (antLink) {
  const t = pdftotext(await getCached(antLink.url, `pronghorn-harvest-${antLink.year}.pdf`, true)).replace(/\s+/g, ' ');
  const est = /An estimate of (\d+) pronghorn were harvested in (20\d\d)/i.exec(t);
  notes.push(`ANTELOPE: ${antLink.text} ${antLink.url} — harvest success by unit and by weapon is shown only as charts (Figures 8 and 14) with no printed values${est ? `; the text gives only a statewide estimate of ${est[1]} pronghorn harvested in ${est[2]}` : ''}. No ANTELOPE rows written.`);
} else notes.push('ANTELOPE: no harvest report link found on the antelope page. No ANTELOPE rows written.');

notes.push('DEER: KDWP does not currently publish a deer harvest / hunter-success report on ksoutdoors.gov (checked the deer, deer-management and research pages and site search). KDWP\'s ArcGIS Deer_Combined/FeatureServer/2 table has deer harvest counts by unit only for 2017-2021 with no hunter counts, so success cannot be computed; not used. No DEER rows written.');

// ---------------------------------------------------------------- self-check + join
let bad = 0;
for (const [sp, rows] of Object.entries(species)) {
  for (const r of rows) {
    if (!(r.successPct >= 0 && r.successPct <= 100)) { bad++; console.error('bad successPct', sp, r); }
    if (r.hunters != null && r.harvest != null && r.harvest > r.hunters) { bad++; console.error('harvest > hunters', sp, r); }
  }
  console.log(`${sp}: ${rows.length} rows`);
}
if (existsSync(DRAW)) {
  const draw = JSON.parse(readFileSync(DRAW, 'utf8'));
  for (const [sp, hunts] of Object.entries(draw.species)) {
    const hv = species[sp] || [];
    const joined = hunts.filter((h) => hv.some((r) => r.huntCode === h.huntCode || r.unit === h.unit)).length;
    console.log(`join ${sp}: ${joined}/${hunts.length} draw hunts have a harvest row (by huntCode or unit)`);
  }
}
if (bad) { console.error(`${bad} check(s) failed; not writing.`); process.exit(1); }

const file = {
  state: 'KS',
  year: Math.max(...Object.values(speciesYear)),
  speciesYear,
  source: { name: 'Kansas Department of Wildlife and Parks — big game harvest reports', url: elkLink.url },
  notes: notes.join(' '),
  species,
};
writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)} (${Object.entries(species).map(([k, v]) => `${k} ${v.length}`).join(', ')})`);
