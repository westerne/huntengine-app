// Parse the WGFD AntelopeHuntAreas KML -> per-area centroid + name.
// Writes scripts/antelopeGeo.json : { "<area>": { lat, lng, name } }
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const DIR = import.meta.dirname;
const KML = join(tmpdir(), 'pdftools', 'an_kmz', 'doc.kml');
const src = readFileSync(KML, 'utf8');

// Area-weighted polygon centroid of a ring of [lng,lat] points.
function ringCentroid(pts) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cross = x0 * y1 - x1 * y0;
    A += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-12) { // degenerate -> vertex average
    const n = pts.length;
    return { lng: pts.reduce((s, p) => s + p[0], 0) / n, lat: pts.reduce((s, p) => s + p[1], 0) / n, area: 0 };
  }
  return { lng: cx / (6 * A), lat: cy / (6 * A), area: Math.abs(A) };
}

function parseCoords(block) {
  // first outer ring's <coordinates> "lng,lat,alt lng,lat,alt ..."
  const m = block.match(/<outerBoundaryIs>\s*<LinearRing>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/);
  if (!m) return null;
  return m[1].trim().split(/\s+/).map(t => {
    const [lng, lat] = t.split(',').map(Number);
    return [lng, lat];
  }).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

// Split into Placemark blocks
const placemarks = src.split('<Placemark').slice(1).map(s => '<Placemark' + s.split('</Placemark>')[0]);
const byArea = {}; // area -> {lat,lng,name,area}

let parsed = 0;
for (const pm of placemarks) {
  const areaM = pm.match(/<td>HUNTAREA<\/td><td>(\d+)<\/td>/);
  const nameM = pm.match(/<td>HUNTNAME<\/td><td>([^<]*)<\/td>/);
  if (!areaM) continue;
  const area = String(parseInt(areaM[1], 10));
  const name = nameM ? nameM[1].trim() : '';
  const pts = parseCoords(pm);
  if (!pts || pts.length < 3) continue;
  const c = ringCentroid(pts);
  parsed++;
  // Keep the largest-area polygon if an area spans multiple placemarks.
  if (!byArea[area] || c.area > byArea[area].area) {
    byArea[area] = { lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), name, area: c.area };
  }
}

const out = {};
for (const [k, v] of Object.entries(byArea)) out[k] = { lat: v.lat, lng: v.lng, name: v.name };
writeFileSync(join(DIR, 'antelopeGeo.json'), JSON.stringify(out, null, 1));
console.log(`Parsed ${parsed} placemarks -> ${Object.keys(out).length} distinct hunt areas.`);
// Spot-check a few
for (const a of ['80', '57', '60', '73', '1', '23']) if (out[a]) console.log(`  area ${a}: ${out[a].name}  (${out[a].lat}, ${out[a].lng})`);
