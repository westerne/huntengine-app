// Ingests Montana FWP big-game HARVEST ESTIMATES into lib/huntdata/harvest/mt.json
// (shape: lib/huntdata/harvest/format.ts → HarvestFile).
//
// Source: MT FWP "Harvest Estimates Search" app (https://myfwp.mt.gov/fwpPub/harvestReports).
// Its "Generate CSV" button posts to /fwpPub/downloadHarvReports.action with
// survey=<species code>&startYr&endYr&district=ALL and returns one CSV per species
// with a row per hunting district × residency (N / R / SUM). Values are FWP's
// survey-based (phone survey) estimates. We keep only the SUM (all-residency) row
// for each numeric hunting district; regional/statewide aggregates are dropped.
//
// Year: per species, the most recent license year whose district rows carry
// hunter counts (FWP posts preliminary harvest-only numbers before hunters/days
// are estimated — those can't yield a success %, so we fall back a year).
//
// Run: node scripts/harvest/buildMTHarvest.mjs   (downloads cached in os.tmpdir())
import { writeFileSync, readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'lib/huntdata/harvest/mt.json');
const BASE = 'https://myfwp.mt.gov/fwpPub';
const PAGE = `${BASE}/harvestReports`;
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const CACHE = path.join(os.tmpdir(), 'mt_harvest');
mkdirSync(CACHE, { recursive: true });

// app speciesKey → FWP survey code
const SPECIES = { DEER: 'DE', ELK: 'EL', ANTELOPE: 'PA', MOOSE: 'MO', BIGHORNSHEEP: 'BS', MTNGOAT: 'MG' };
const DEER_SUB = { all_deer: 'All deer (mule + whitetail)', md: 'Mule deer', wt: 'White-tailed deer' };

let cookie = '';
async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(body).toString(),
  });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r;
}
async function session() {
  const r = await fetch(PAGE, { headers: UA });
  if (!r.ok) throw new Error(`${PAGE} → ${r.status}`);
  const sc = r.headers.getSetCookie?.() ?? [r.headers.get('set-cookie') || ''];
  cookie = sc.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
}

async function years(code) {
  const j = await (await post(`${BASE}/portalJsonData/licYearStartSelectList.action`, { speciesCd: code })).json();
  return (j.licYearStartList || []).map((x) => +x.itemVal).filter(Boolean).sort((a, b) => b - a);
}

async function csv(code, year) {
  const f = path.join(CACHE, `${code}_${year}.csv`);
  const fresh = existsSync(f) && statSync(f).size > 200 && Date.now() - statSync(f).mtimeMs < 7 * 864e5;
  if (!fresh) {
    const r = await post(`${BASE}/downloadHarvReports.action`, {
      fileType: 'CSV', fileName: 'fwpHarvestEstimatesReport', survey: code, startYr: year, endYr: year, district: 'ALL',
    });
    if (!/csv/i.test(r.headers.get('content-type') || '')) throw new Error(`${code} ${year}: not CSV`);
    writeFileSync(f, await r.text());
  }
  return readFileSync(f, 'utf8');
}

function parse(txt) {
  const lines = txt.trim().split(/\r?\n/);
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const ix = {
    year: col('license year'), dist: col('hunting district'), sub: col('deer species'), res: col('residency'),
    hunters: col('hunters'), days: col('days'), harvest: col('total harvest'),
  };
  if ([ix.dist, ix.res, ix.hunters, ix.days, ix.harvest].some((i) => i < 0)) throw new Error('unexpected CSV header: ' + lines[0]);
  return lines.slice(1).map((l) => {
    const c = l.split(',').map((s) => s.trim());
    const num = (i) => (c[i] === '' || c[i] == null ? null : Number(c[i]));
    return {
      year: +c[ix.year], dist: c[ix.dist], sub: ix.sub >= 0 ? c[ix.sub] : null, res: c[ix.res],
      hunters: num(ix.hunters), days: num(ix.days), harvest: num(ix.harvest),
    };
  });
}

// District-level SUM rows for real (3-digit, optionally lettered) hunting districts.
const isDistrict = (d) => /^\d{3}[A-Z]?$/.test(d);
const sumRows = (rows) => rows.filter((r) => r.res === 'SUM' && isDistrict(r.dist));
const hasHunters = (rows) => {
  const s = sumRows(rows);
  return s.length > 0 && s.filter((r) => r.hunters > 0).length / s.length >= 0.8;
};

await session();
const species = {};
const yearUsed = {};
for (const [key, code] of Object.entries(SPECIES)) {
  let chosen = null;
  for (const y of (await years(code)).slice(0, 3)) {
    const rows = parse(await csv(code, y));
    if (hasHunters(rows)) { chosen = { y, rows }; break; }
    console.log(`${key}: ${y} has no hunter estimates yet (harvest-only/preliminary) — trying ${y - 1}`);
  }
  if (!chosen) { console.error(`${key}: no year with hunter counts`); species[key] = []; continue; }
  yearUsed[key] = chosen.y;
  const out = [];
  for (const r of sumRows(chosen.rows)) {
    // Only "all deer" is a true hunter-success rate: FWP doesn't split deer
    // hunters by species, so mule-deer/whitetail harvest / all hunters isn't one.
    if (key === 'DEER' && r.sub !== 'all_deer') continue;
    if (!(r.hunters > 0) || r.harvest == null) continue; // no hunter estimate → no success %
    const what = key === 'DEER'
      ? (r.sub === 'all_deer' ? `${DEER_SUB[r.sub]}` : `${DEER_SUB[r.sub]} harvest ÷ all deer hunters (hunters not split by species)`)
      : 'General + permits';
    out.push({
      unit: r.dist,
      label: `${chosen.y} season — ${what}, all weapons, residents + nonresidents`,
      hunters: r.hunters,
      harvest: r.harvest,
      successPct: Math.round((100 * r.harvest) / r.hunters),
      daysPerHarvest: r.harvest > 0 && r.days != null ? Math.round((10 * r.days) / r.harvest) / 10 : null,
      _order: key === 'DEER' ? Object.keys(DEER_SUB).indexOf(r.sub) : 0,
    });
  }
  out.sort((a, b) => a.unit.localeCompare(b.unit) || a._order - b._order);
  species[key] = out.map(({ _order, ...r }) => r);
  console.log(`${key}: ${chosen.y} → ${species[key].length} rows`);
}

const ys = Object.values(yearUsed);
const file = {
  state: 'MT',
  year: Math.max(...ys),
  speciesYear: yearUsed,
  source: { name: 'Montana Fish, Wildlife & Parks — Harvest Estimates (myfwp.mt.gov)', url: PAGE },
  notes:
    'FWP survey-based (hunter phone survey) estimates, per hunting district, all license types (general + permits), ' +
    'all weapons, residents + nonresidents combined. successPct = total harvest / hunters; daysPerHarvest = hunter days / harvest. ' +
    `Season by species: ${Object.entries(yearUsed).map(([k, y]) => `${k} ${y}`).join(', ')} ` +
    '(newer seasons skipped where FWP had posted harvest but not yet hunter estimates). ' +
    'Deer rows are all deer (mule + whitetail): FWP does not split deer hunters by species. ' +
    'Some elk districts are reported only as lettered sub-districts (e.g. 411E/411W). Not reported per permit (LPT).',
  species,
};
writeFileSync(OUT, JSON.stringify(file, null, 1) + '\n');
console.log('wrote', path.relative(ROOT, OUT));
