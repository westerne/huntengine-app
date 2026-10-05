// Ingests Idaho big-game harvest statistics from IDFG's Hunt Planner stats
// pages (https://fishandgame.idaho.gov/ifwis/huntplanner/stats/) into
// lib/huntdata/harvest/id.json (format: lib/huntdata/harvest/format.ts).
//
// Two kinds of rows per species:
//   - controlled hunts: one row per hunt number (joins to the draw data's huntCode)
//   - general seasons: one row per unit + take method (no draw; OTC/general tags)
// IDFG builds these from mandatory harvest reports, mortality reports and check
// stations. The page tables are server-rendered HTML, parsed by header name.
//
// Run: node scripts/harvest/buildIDHarvest.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://fishandgame.idaho.gov/ifwis/huntplanner/stats/';
const UA = { 'User-Agent': 'Mozilla/5.0 (huntengine-app ingestion)' };
const YEARS = [2025, 2024]; // newest first; fall back if a season isn't posted yet

// app speciesKey → IDFG "game" values (sheep has two IDFG names)
const SPECIES = {
  DEER: ['deer'],
  ELK: ['elk'],
  ANTELOPE: ['pronghorn'],
  MOOSE: ['moose'],
  BIGHORNSHEEP: ['rocky mountain sheep', 'california sheep'],
  MTNGOAT: ['goat'],
};

const decode = (s) =>
  s.replace(/<[^>]+>/g, '').replace(/&#37;/g, '%').replace(/&#35;/g, '#').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

function parseTable(html) {
  const thead = html.match(/<thead>([\s\S]*?)<\/thead>/);
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!thead || !tbody) return [];
  const headers = [...thead[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => decode(m[1]));
  return [...tbody[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) => {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => decode(m[1]));
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

const num = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

function weapon(method) {
  const m = method.toLowerCase();
  if (m.includes('archery')) return 'archery';
  if (m.includes('muzzle')) return 'muzzleloader';
  if (m.includes('any weapon')) return 'any';
  return undefined;
}

// IDFG silently serves the deer general table when a species/season/year combo
// doesn't exist (e.g. moose has no general season), so check the page heading
// ("2025 Elk Controlled Hunt Harvest Statistics") before trusting the table.
async function fetchRows(season, game, yr) {
  const url = `${BASE}?season=${season}&game=${encodeURIComponent(game)}&yr=${yr}`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  const html = await r.text();
  const heading = decode((html.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '').toLowerCase().replace(/\s+/g, ' ');
  const want = `${yr} ${game} ${season === 'controlled' ? 'controlled' : 'general'}`;
  if (!heading.startsWith(want)) return [];
  return parseTable(html);
}

function toRow(season, raw) {
  const success = num(raw['Success%']);
  if (success == null) return null;
  const method = raw['TakeMethod'] ?? raw['Take Method'] ?? '';
  if (/combined/i.test(method)) return null; // per-method rows already cover it
  const row = {
    unit: season === 'controlled' ? raw['Area'] : raw['Unit'],
    weapon: weapon(method),
    label: season === 'controlled' ? `Controlled hunt ${raw['Hunt#']} — ${method}` : `General — ${method}`,
    hunters: num(raw['Hunters']),
    harvest: num(raw['Harvest']),
    successPct: success,
    daysPerHarvest: null,
  };
  if (season === 'controlled') row.huntCode = raw['Hunt#'];
  const days = num(raw['Days']);
  if (days != null && row.harvest) row.daysPerHarvest = Math.round((days / row.harvest) * 10) / 10;
  if (!row.weapon) delete row.weapon;
  return row.unit ? row : null;
}

// Use the newest year that has controlled-hunt data for elk (the anchor species).
let year = null;
for (const yr of YEARS) {
  if ((await fetchRows('controlled', 'elk', yr)).length) { year = yr; break; }
}
if (!year) throw new Error('No Idaho harvest year found');

const species = {};
for (const [key, games] of Object.entries(SPECIES)) {
  const rows = [];
  for (const game of games) {
    for (const season of ['controlled', 'general']) {
      try {
        const got = (await fetchRows(season, game, year)).map((r) => toRow(season, r)).filter(Boolean);
        rows.push(...got);
      } catch (e) {
        console.error(`${key} ${game} ${season}:`, e.message);
      }
    }
  }
  species[key] = rows;
  console.log(`${key}: ${rows.filter((r) => r.huntCode).length} controlled, ${rows.filter((r) => !r.huntCode).length} general`);
}

const out = {
  state: 'ID',
  year,
  source: { name: 'Idaho Department of Fish and Game — Hunt Planner harvest statistics', url: BASE },
  notes: 'From mandatory harvest reports, big game mortality reports and check stations. Controlled-hunt rows are per hunt number; general rows are per unit and take method. daysPerHarvest = hunter days / harvest.',
  species,
};

const file = path.join('lib', 'huntdata', 'harvest', 'id.json');
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote ${file} (${year})`);
