// Replace deer entry coords with authoritative centroids derived from
// public/Wyoming_Deer_Areas.geojson (via scripts/deerGeo.json).
// Single-area entries -> that area's centroid; multi-area / GENERAL_REGION
// entries -> mean of their areaNumbers' centroids. Coords only; descriptions
// (hand-written) are left untouched.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = import.meta.dirname;
const DATA = join(DIR, '..', 'app', 'api', 'strategy', 'wyodeerdata.ts');
const geo = JSON.parse(readFileSync(join(DIR, 'deerGeo.json'), 'utf8'));

let src = readFileSync(DATA, 'utf8');

// Split into top-level entry blocks: key + its text span.
const re = /\n  "([^"]+)":\s*\{/g;
const starts = [];
let m;
while ((m = re.exec(src)) !== null) starts.push({ key: m[1], idx: m.index });

let changed = 0, skipped = 0, noGeo = 0;
const coordRe = /coords:\s*\{ lat: -?[0-9.]+, lng: -?[0-9.]+ \}/;

// Process back-to-front so earlier indices stay valid as we splice.
for (let i = starts.length - 1; i >= 0; i--) {
  const start = starts[i].idx;
  const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
  const block = src.slice(start, end);

  const am = block.match(/areaNumbers:\s*\[([0-9,\s]*)\]/);
  if (!am) { skipped++; continue; }
  const areas = am[1].split(',').map(x => x.trim()).filter(Boolean).map(n => String(parseInt(n, 10)));
  const cs = areas.map(a => geo[a]).filter(Boolean);
  if (!cs.length) { noGeo++; continue; }

  const lat = +(cs.reduce((s, c) => s + c.lat, 0) / cs.length).toFixed(4);
  const lng = +(cs.reduce((s, c) => s + c.lng, 0) / cs.length).toFixed(4);
  const replacement = `coords: { lat: ${lat}, lng: ${lng} }`;

  const cm = block.match(coordRe);
  if (!cm) { skipped++; continue; }
  const newBlock = block.replace(coordRe, replacement);
  if (newBlock !== block) { changed++; src = src.slice(0, start) + newBlock + src.slice(end); }
}

writeFileSync(DATA, src);
console.log(`Updated coords on ${changed} entries. (skipped no-areaNumbers/coords: ${skipped}, no-geo-match: ${noGeo})`);
