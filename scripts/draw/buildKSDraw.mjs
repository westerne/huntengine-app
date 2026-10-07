// Builds lib/huntdata/draw/ks.json (DrawFile, see lib/huntdata/draw/format.ts)
// from Kansas Department of Wildlife and Parks (KDWP) published draw statistics.
//
// Sources (ksoutdoors.gov only; ksoutdoors.com redirects there):
//   - Deer: /outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/deer/deer-quotas-and-draw-statistics
//     HTML page with one section per draw year ("2026 Deer Draw", "2025 Deer Draw"). The newest
//     section is used. Tables in that section:
//       resident either-species/either-sex (ESES) firearm: permits authorized; quota +
//         first-choice applications (general / landowner-tenant / youth / nonresident tenant);
//         permits issued by preference point (PP)
//       nonresident whitetail either-sex (NR WT): permits authorized (+ mule deer stamps);
//         quota + applications by 1st/2nd/3rd/4th choice; permits issued by PP
//       nonresident mule deer stamp: permits issued + first-choice applications
//   - Antelope: /outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/antelope, section
//     "<year> Antelope Draw Statistics": quota + first-choice applications per unit/weapon
//     (general / landowner-tenant / youth) and permits issued by PP (general / landowner-tenant).
//   - Elk: KDWP publishes no per-hunt elk draw statistics (only a statewide applications +
//     bonus-point total inside the elk harvest report), so no ELK rows are written.
//
// KDWP publishes permits ISSUED per point level but NOT applicants per point level, so
// PointLine[] (which needs applicants) cannot be filled; minPoints = lowest PP with ≥1 permit.
//
// Notes on access: curl gets HTTP 403 from the site's CDN, but Node's built-in fetch is served
// normally (no challenge page). Nothing is bypassed; if the fetch is refused the script stops.
// Pages are cached in os.tmpdir()/ksdraw (delete the folder to refetch).
//
// Run: node scripts/draw/buildKSDraw.mjs
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'lib', 'huntdata', 'draw', 'ks.json');
const SITE = 'https://www.ksoutdoors.gov';
const DEER_URL = `${SITE}/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/deer/deer-quotas-and-draw-statistics`;
const ANT_URL = `${SITE}/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/antelope`;
const CACHE = path.join(os.tmpdir(), 'ksdraw');
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- download
async function getCached(url, name) {
  const file = path.join(CACHE, name);
  if (!existsSync(file) || statSync(file).size === 0) {
    const r = await fetch(url, { headers: UA });
    const body = await r.text();
    if (!r.ok || /Access Denied|security verification|captcha/i.test(body.slice(0, 2000))) {
      throw new Error(`${url} → HTTP ${r.status}. KDWP refused the request; not retrying or working around it.`);
    }
    writeFileSync(file, body);
  }
  return readFileSync(file, 'utf8');
}

// ---------------------------------------------------------------- html helpers
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", rsquo: "'", ndash: '-', mdash: '-' };
function text(html) {
  return html
    .replace(/<(br|\/li|\/p|\/div)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (m, e) => (e in ENT ? ENT[e] : /^#\d+$/.test(e) ? String.fromCharCode(+e.slice(1)) : ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
// Tables in document order, each with its character offset, as arrays of cell text.
function tables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => ({
    at: m.index,
    rows: [...m[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) =>
      [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => text(c[1]))),
  }));
}
const num = (s) => {
  if (s == null) return null;
  const t = String(s).replace(/,/g, '').trim();
  if (t === '' || t === '-' || t === '—') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const pct = (a, b) => (a == null || !b ? null : Math.round(Math.min(100, (a / b) * 100) * 10) / 10);
const grab = (s, re) => { const m = s.match(re); return m ? num(m[1]) : null; };

// Section of the page belonging to the newest year: [start, end) offsets.
function newestSection(html, re) {
  const hits = [...html.matchAll(re)].map((m) => ({ year: +m[1], at: m.index }));
  if (!hits.length) throw new Error(`no section heading matching ${re}`);
  const year = Math.max(...hits.map((h) => h.year));
  const start = Math.min(...hits.filter((h) => h.year === year).map((h) => h.at));
  const later = hits.filter((h) => h.at > start && h.year !== year).map((h) => h.at);
  return { year, start, end: later.length ? Math.min(...later) : html.length };
}

// ---------------------------------------------------------------- deer
const notes = [];
const warn = (s) => { notes.push(s); console.warn('NOTE:', s); };

function buildDeer(html) {
  const sec = newestSection(html, /(20\d\d) Deer Draw/g);
  const secText = text(html.slice(sec.start, sec.end));
  const tbs = tables(html).filter((t) => t.at >= sec.start && t.at < sec.end);
  const head = (t) => t.rows[0].join(' | ').toUpperCase();
  const isRes = (t) => t.rows.slice(1).some((r) => /Western Kansas|Eastern Kansas/i.test(r[0] || ''));
  const find = (pred, what) => {
    const t = tbs.find(pred);
    if (!t) throw new Error(`deer ${sec.year}: table not found: ${what}`);
    return t;
  };
  const resApps = find((t) => /APPLICATIONS RECEIVED/.test(head(t)) && isRes(t), 'resident applications');
  const resPP = find((t) => /PREFERENCE POINTS/.test(head(t)) && isRes(t), 'resident PP');
  const nrAuth = find((t) => /PERMIT TYPE/.test(head(t)) && !isRes(t), 'NR permits authorized');
  const nrApps = find((t) => /APPLICATIONS RECEIVED/.test(head(t)) && !isRes(t), 'NR applications');
  const nrPP = find((t) => /PREFERENCE POINTS/.test(head(t)) && !isRes(t), 'NR PP');
  const mdStamp = find((t) => /PERMITS ISSUED/.test(head(t)) && /FIRST CHOICE/.test(head(t)), 'mule deer stamps');

  const unitOf = (s) => { const m = /Unit\s*(\d+[A-Z]?)/i.exec(s || ''); return m ? m[1] : null; };
  const zoneOf = (s) => (/Western/i.test(s) ? 'WEST' : /Eastern/i.test(s) ? 'EAST' : null);

  // Issued-by-PP tables: [unitKey][pp] = permits
  const ppTable = (t, keyFn) => {
    const out = {};
    let key = null;
    for (const r of t.rows.slice(1)) {
      if (r.length < 3) continue;
      key = keyFn(r[0]) ?? key;
      const pp = num(r[1]); const n = num(r[2]);
      if (key == null || pp == null) continue;
      (out[key] ??= {})[pp] = (out[key][pp] ?? 0) + (n ?? 0);
    }
    return out;
  };
  const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
  const minPts = (o) => { const k = Object.keys(o || {}).filter((p) => o[p] > 0).map(Number); return k.length ? Math.min(...k) : null; };

  const rows = [];

  // ---- nonresident whitetail either-sex, one row per unit
  const nrPPBy = ppTable(nrPP, unitOf);
  const authWT = {}; const authMD = {};
  for (const r of nrAuth.rows.slice(1)) {
    const u = unitOf(r[0]); if (!u) continue;
    if (/Mule Deer/i.test(r[1])) authMD[u] = num(r[2]); else if (/Whitetail/i.test(r[1])) authWT[u] = num(r[2]);
  }
  for (const r of nrApps.rows.slice(1)) {
    const u = unitOf(r[0]); if (!u) continue;
    const quota = num(r[1]);
    const c1 = grab(r[2], /1st Choice:\s*([\d,]+)/i);
    const issued = sum(nrPPBy[u]);
    if (authWT[u] != null && authWT[u] !== quota) warn(`NR WT Unit ${u}: authorized ${authWT[u]} ≠ quota ${quota} (quota used).`);
    rows.push({
      huntCode: `DEER-NR-WT-ES-${u}`,
      unit: u,
      label: `Nonresident Whitetail Either-sex — Unit ${u} (archery, muzzleloader or firearm; also valid in one chosen adjacent unit)`,
      tags: quota,
      draw: {
        resident: null,
        nonresident: { tags: quota, applicants: c1, successPct: pct(issued, c1), minPoints: minPts(nrPPBy[u]) },
      },
      _issued: issued,
      _c: [2, 3, 4].map((k) => grab(r[2], new RegExp(`${k}(?:nd|rd|th) Choice:\\s*([\\d,]+)`, 'i'))),
      _pp: nrPPBy[u],
    });
  }

  // ---- nonresident mule deer stamp (random draw among successful archery/ML applicants in 1, 2, 17, 18)
  for (const r of mdStamp.rows.slice(1)) {
    const u = unitOf(r[0]); if (!u) continue;
    const issued = num(r[1]); const apps = num(r[2]);
    if (authMD[u] != null && authMD[u] !== issued) warn(`Mule deer stamp Unit ${u}: authorized ${authMD[u]} ≠ issued ${issued}.`);
    rows.push({
      huntCode: `DEER-NR-MD-STAMP-${u}`,
      unit: u,
      label: `Nonresident Mule Deer Stamp — Unit ${u} (add-on for an archery or muzzleloader whitetail permit; converts it to either-species)`,
      tags: issued,
      draw: { resident: null, nonresident: { tags: issued, applicants: apps, successPct: pct(issued, apps) } },
    });
  }

  // ---- resident either-species/either-sex firearm (west / east zones)
  const resPPBy = ppTable(resPP, zoneOf);
  for (const r of resApps.rows.slice(1)) {
    const z = zoneOf(r[0]); if (!z) continue;
    const quota = num(r[1]);
    const apps = grab(r[2], /([\d,]+)\s*total 1st Choice/i);
    const gen = grab(r[2], /1st Choice:?\s*General:\s*([\d,]+)/i);
    const lt = grab(r[2], /1st Choice:?\s*Landowner Tenant:\s*([\d,]+)/i);
    const yth = grab(r[2], /1st Choice:?\s*Youth:\s*([\d,]+)/i);
    const nrt = grab(r[2], /1st Choice:?\s*Nonresident Tenant:\s*([\d,]+)/i);
    const parts = [gen, lt, yth, nrt].map((x) => x ?? 0).reduce((a, b) => a + b, 0);
    if (parts !== apps) warn(`Resident ESES ${z}: printed total ${apps} first-choice applications ≠ sum of printed parts ${parts} (general ${gen} + landowner/tenant ${lt} + youth ${yth} + nonresident tenant ${nrt}); printed total used.`);
    // Drawn split from the summary sentence: "Western Kansas - Units ...: 854 (693 general, 117 landowner tenant, 44 youth)"
    const zre = z === 'WEST' ? 'Western' : 'Eastern';
    const m = new RegExp(`${zre} Kansas[^:]*:\\s*([\\d,]+)\\s*\\(([\\d,]+) general, ([\\d,]+) landowner tenant, ([\\d,]+) youth\\)`, 'i').exec(secText);
    const drawn = sum(resPPBy[z]);
    if (m && num(m[1]) !== drawn) warn(`Resident ESES ${z}: summary drawn ${num(m[1])} ≠ PP-table total ${drawn}.`);
    const units = (/Units?\s*([\d,\s&]+)/i.exec(r[0])?.[1] || '').split(/[,&\s]+/).filter(Boolean);
    // The PP and authorized tables print the zone's units; the applications table has a typo (West "1, 12, 17 & 18").
    const ppZoneLabel = resPP.rows.find((x) => zoneOf(x[0]) === z)?.[0] || r[0];
    const zoneUnits = (/Units?\s*([\d,\s&]+)/i.exec(ppZoneLabel)?.[1] || '').split(/[,&\s]+/).filter(Boolean);
    if (units.join() !== zoneUnits.join()) warn(`Resident ESES ${z}: applications table says units "${units.join(', ')}", other tables say "${zoneUnits.join(', ')}" (latter used).`);
    const pool = (name, a, d) => ({ name, tags: null, applicants: a, successPct: pct(d, a) });
    rows.push({
      huntCode: `DEER-R-ESES-FA-${z}`,
      unit: zoneUnits[0],
      units: zoneUnits,
      label: `Resident Firearm Either-species/Either-sex — ${z === 'WEST' ? 'West' : 'East'} zone (Units ${zoneUnits.join(', ')})`,
      weapon: 'rifle',
      tags: quota,
      draw: {
        resident: {
          tags: quota,
          applicants: apps,
          successPct: pct(drawn, apps),
          minPoints: minPts(resPPBy[z]),
          ...(m ? { pools: [
            pool('general', gen, num(m[2])),
            pool('landowner-tenant', lt, num(m[3])),
            pool('youth', yth, num(m[4])),
          ] } : {}),
        },
        nonresident: null,
      },
      _issued: drawn,
      _pp: resPPBy[z],
    });
  }
  // Statewide totals printed on the page (for the self-check)
  const totals = {
    nrApplications: grab(secText, /White-?Tail Either Sex\s*Total Number of Permit Applications:\s*([\d,]+)/i),
    nrDrawn: grab(secText, /Total Permits Drawn:\s*([\d,]+)\s*\(\d+ over quota/i),
    nrAuthorized: grab(secText, /White Tail Either Sex Permits Authorized:\s*([\d,]+)/i),
    resDrawn: grab(secText, /Resident Draw Statistics[\s\S]*?Total Permits Drawn:\s*([\d,]+)/i),
  };
  return { year: sec.year, rows, totals };
}

// ---------------------------------------------------------------- antelope
function buildAntelope(html) {
  const sec = newestSection(html, /(20\d\d) Antelope Draw Statistics/g);
  const secText = text(html.slice(sec.start, sec.end));
  const tbs = tables(html).filter((t) => t.at >= sec.start && t.at < sec.end);
  const apps = tbs.find((t) => /FIRST CHOICE APPLICATIONS/i.test(t.rows[0].join(' ')));
  const pp = tbs.find((t) => /PREFERENCE POINTS/i.test(t.rows[0].join(' ')));
  if (!apps || !pp) throw new Error(`antelope ${sec.year}: tables not found`);
  const keyOf = (s) => {
    const m = /Unit\s*(\d+)\s*-\s*(Muzzleloader|Firearms?)/i.exec(s || '');
    return m ? `${m[1]}|${/Muzz/i.test(m[2]) ? 'ML' : 'FA'}` : null;
  };
  const issued = {};
  for (const r of pp.rows.slice(1)) {
    const k = keyOf(r[0]); const p = num(r[1]); if (!k || p == null) continue;
    const o = (issued[k] ??= { general: {}, lt: {} });
    if (num(r[2])) o.general[p] = (o.general[p] ?? 0) + num(r[2]);
    if (num(r[3])) o.lt[p] = (o.lt[p] ?? 0) + num(r[3]);
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const minPts = (o) => { const k = Object.keys(o).map(Number); return k.length ? Math.min(...k) : null; };
  const rows = [];
  for (const r of apps.rows.slice(1)) {
    const k = keyOf(r[0]); if (!k) continue;
    const [u, w] = k.split('|');
    const qGen = grab(r[1], /General:\s*([\d,]+)/i); const qLT = grab(r[1], /Landowner Tenant:\s*([\d,]+)/i);
    const aGen = grab(r[2], /General:\s*([\d,]+)/i); const aLT = grab(r[2], /Landowner Tenant:\s*([\d,]+)/i);
    const aY = grab(r[2], /Youth:\s*([\d,]+)/i);
    const iss = issued[k] || { general: {}, lt: {} };
    const iGen = sum(iss.general); const iLT = sum(iss.lt);
    const tags = (qGen ?? 0) + (qLT ?? 0);
    const applicants = [aGen, aLT, aY].some((x) => x != null) ? (aGen ?? 0) + (aLT ?? 0) + (aY ?? 0) : null;
    if (aLT === 0 && iLT > 0) warn(`Antelope Unit ${u} ${w}: page prints 0 landowner/tenant first-choice applications but ${iLT} landowner/tenant permits issued; that pool's successPct left null.`);
    const allPts = { ...iss.general }; for (const [p, n] of Object.entries(iss.lt)) allPts[p] = (allPts[p] ?? 0) + n;
    rows.push({
      huntCode: `ANTELOPE-R-${w}-${u}`,
      unit: u,
      label: `Resident ${w === 'ML' ? 'Muzzleloader' : 'Firearm'} Antelope — Unit ${u}`,
      weapon: w === 'ML' ? 'muzzleloader' : 'rifle',
      tags,
      draw: {
        resident: {
          tags,
          applicants,
          successPct: pct(iGen + iLT, applicants),
          minPoints: minPts(allPts),
          pools: [
            { name: 'general', tags: qGen, applicants: aGen, successPct: pct(iGen, aGen), minPoints: minPts(iss.general) },
            { name: 'landowner-tenant', tags: qLT, applicants: aLT, successPct: aLT ? pct(iLT, aLT) : null, minPoints: minPts(iss.lt) },
          ],
        },
        nonresident: null,
      },
      _issued: iGen + iLT,
    });
  }
  const totals = {
    applications: grab(secText, /Total Applications:\s*([\d,]+)/i),
    issued: grab(secText, /Total Permits Issued:\s*([\d,]+)/i),
    authorized: grab(secText, /Total Permits Authorized:\s*([\d,]+)/i),
  };
  return { year: sec.year, rows, totals };
}

// ---------------------------------------------------------------- main
const deer = buildDeer(await getCached(DEER_URL, 'deer-quotas-and-draw-statistics.html'));
const ant = buildAntelope(await getCached(ANT_URL, 'antelope.html'));

// ---- self-check
let bad = 0;
const fail = (s) => { bad++; console.error('CHECK FAILED:', s); };
for (const r of [...deer.rows, ...ant.rows]) {
  for (const side of ['resident', 'nonresident']) {
    const d = r.draw[side]; if (!d) continue;
    for (const s of [d, ...(d.pools || [])]) {
      if (s.successPct != null && (s.successPct < 0 || s.successPct > 100)) fail(`${r.huntCode} ${side} successPct ${s.successPct}`);
    }
  }
}
const nrRows = deer.rows.filter((r) => r.huntCode.startsWith('DEER-NR-WT'));
const sumOf = (a, f) => a.reduce((s, r) => s + (f(r) ?? 0), 0);
const c1 = sumOf(nrRows, (r) => r.draw.nonresident.applicants);
const nrIssued = sumOf(nrRows, (r) => r._issued);
const nrQuota = sumOf(nrRows, (r) => r.tags);
console.log(`NR whitetail: ${nrRows.length} units, quota ${nrQuota} (page ${deer.totals.nrAuthorized}), issued by PP ${nrIssued} (page drawn ${deer.totals.nrDrawn}), 1st-choice apps ${c1} (page applications ${deer.totals.nrApplications})`);
if (deer.totals.nrAuthorized != null && nrQuota !== deer.totals.nrAuthorized) fail('NR quota sum ≠ page total');
if (deer.totals.nrDrawn != null && nrIssued !== deer.totals.nrDrawn) warn(`NR whitetail: PP-table permits sum ${nrIssued} ≠ printed Total Permits Drawn ${deer.totals.nrDrawn}.`);
if (deer.totals.nrApplications != null && c1 !== deer.totals.nrApplications) warn(`NR whitetail: sum of unit 1st-choice applications ${c1} ≠ printed Total Number of Permit Applications ${deer.totals.nrApplications}.`);
for (const r of nrRows) if (r._issued > r.draw.nonresident.applicants) warn(`${r.huntCode}: permits issued ${r._issued} > first-choice applications ${r.draw.nonresident.applicants}; successPct capped at 100.`);
const resRows = deer.rows.filter((r) => r.huntCode.startsWith('DEER-R-'));
console.log(`Resident ESES firearm: ${resRows.length} zones, drawn ${sumOf(resRows, (r) => r._issued)} (page ${deer.totals.resDrawn})`);
for (const r of resRows) if (r._issued !== r.tags) warn(`${r.huntCode}: PP-table permits ${r._issued} ≠ quota ${r.tags}.`);
const antIssued = sumOf(ant.rows, (r) => r._issued);
const antApps = sumOf(ant.rows, (r) => r.draw.resident.applicants);
console.log(`Antelope: ${ant.rows.length} hunts, quota ${sumOf(ant.rows, (r) => r.tags)} (page ${ant.totals.authorized}), issued ${antIssued} (page ${ant.totals.issued}), first-choice applications ${antApps} (page Total Applications ${ant.totals.applications})`);
if (ant.totals.applications != null && antApps !== ant.totals.applications) warn(`Antelope: sum of per-hunt first-choice applications (general + landowner/tenant + youth) ${antApps} ≠ printed Total Applications ${ant.totals.applications}; per-hunt figures kept as printed.`);
if (ant.totals.issued != null && antIssued !== ant.totals.issued) warn(`Antelope: PP-table permits ${antIssued} ≠ printed Total Permits Issued ${ant.totals.issued}.`);
for (const r of ant.rows) if (r._issued !== r.tags) warn(`${r.huntCode}: permits issued ${r._issued} ≠ quota ${r.tags} (group-draw overage or table inconsistency).`);
if (bad) { console.error(`${bad} check(s) failed; not writing.`); process.exit(1); }

const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')));
const year = Math.max(deer.year, ant.year);
const file = {
  state: 'KS',
  year,
  source: {
    name: `Kansas Department of Wildlife and Parks — ${deer.year} Deer Quotas and Draw Statistics; ${ant.year} Antelope Draw Statistics`,
    url: DEER_URL,
  },
  notes: [
    `KDWP ${deer.year} deer and ${ant.year} antelope draws. Deer: ${DEER_URL} ; antelope: ${ANT_URL} (section "${ant.year} Antelope Draw Statistics"). Both are HTML tables on ksoutdoors.gov.`,
    'Point system: deer and antelope use PREFERENCE points (highest points drawn first; ties drawn at random; group applications drawn at the group\'s lowest point level). Elk uses BONUS points (extra chances), but KDWP publishes no per-hunt elk draw statistics, so no ELK rows. The nonresident Mule Deer Stamp is a random draw (points do not count).',
    'pointLines are NOT filled: KDWP prints permits ISSUED at each preference-point level but not applicants per level. minPoints = lowest point level with ≥1 permit issued (includes any 2nd-4th choice / group draws at that level).',
    'DEER nonresident whitetail either-sex (DEER-NR-WT-ES-<unit>): one row per deer management unit 1-18; the applicant picks archery, muzzleloader or firearm and one adjacent unit, but KDWP does not split the stats by season, so weapon is unset. tags = permit quota. applicants = 1st-choice applications to the unit. successPct = permits issued in the unit (sum of the issued-by-PP table) ÷ 1st-choice applications × 100. KDWP also prints 2nd/3rd/4th-choice application counts and the issued counts can include lower-choice draws, so this is permits-per-first-choice-applicant, an upper bound on pure first-choice odds; it is not a KDWP-published percentage.',
    'DEER nonresident Mule Deer Stamp (DEER-NR-MD-STAMP-<unit>, units 1, 2, 17, 18): tags = stamps issued, applicants = first-choice stamp applications, successPct = issued ÷ applications. Only nonresidents who drew an archery or muzzleloader whitetail permit in those units are entered.',
    'DEER resident firearm either-species/either-sex (DEER-R-ESES-FA-WEST / -EAST): drawn by zone (West = units 1, 2, 17, 18; East = 3, 4, 5, 7, 16); unit = first unit of the zone, units = all. weapon "rifle" = firearm season, any legal equipment. applicants = printed total 1st-choice applications (includes general, landowner/tenant, youth and nonresident-tenant applicants; nonresident tenants apply in the resident draw). successPct = permits drawn ÷ applicants. pools general / landowner-tenant / youth use the drawn split printed in the page summary sentence; pool tags are not printed (null).',
    'ANTELOPE (resident only; firearm and muzzleloader by unit 2, 17, 18; archery is over the counter, not drawn): tags = general + landowner/tenant quota (by law half of the permits go to each). applicants = general + landowner/tenant + youth first-choice applications as printed (youth applications are printed separately and KDWP does not say which pool they draw in, so pool "general" applicants exclude youth). successPct = permits issued ÷ applicants. "-" cells in the issued-by-PP table are read as 0.',
    'Units: deer and antelope unit numbers are KDWP deer management unit numbers ("16"); in the KDWP ArcGIS layers the field value is "UNIT 16" (see ks-research.md).',
    'No season dates are published with the draw statistics.',
    ...notes,
  ].join(' '),
  species: {
    DEER: deer.rows.map(strip),
    ANTELOPE: ant.rows.map(strip),
  },
};
writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, OUT)}: DEER ${file.species.DEER.length}, ANTELOPE ${file.species.ANTELOPE.length}, year ${year}`);
