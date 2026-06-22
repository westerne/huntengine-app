// Parse public/Wyoming_Deer_Areas.geojson -> per-area centroid + name.
// Writes scripts/deerGeo.json : { "<area>": { lat, lng, name } }
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = import.meta.dirname;
const g = JSON.parse(readFileSync(join(DIR, '..', 'public', 'Wyoming_Deer_Areas.geojson'), 'utf8'));

function ringCentroid(pts) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cross = x0 * y1 - x1 * y0;
    A += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-12) {
    const n = pts.length;
    return { lng: pts.reduce((s, p) => s + p[0], 0) / n, lat: pts.reduce((s, p) => s + p[1], 0) / n, area: 0 };
  }
  return { lng: cx / (6 * A), lat: cy / (6 * A), area: Math.abs(A) };
}

// Largest ring across Polygon / MultiPolygon
function featureCentroid(geom) {
  let rings = [];
  if (geom.type === 'Polygon') rings = [geom.coordinates[0]];
  else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map(p => p[0]);
  let best = null;
  for (const r of rings) {
    if (!r || r.length < 3) continue;
    const c = ringCentroid(r);
    if (!best || c.area > best.area) best = c;
  }
  return best;
}

const byArea = {};
for (const f of g.features) {
  const area = String(parseInt(f.properties.HUNTAREA, 10));
  const name = f.properties.HUNTNAME || '';
  const c = featureCentroid(f.geometry);
  if (!c) continue;
  if (!byArea[area] || c.area > byArea[area].area) {
    byArea[area] = { lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), name, area: c.area };
  }
}

const out = {};
for (const [k, v] of Object.entries(byArea)) out[k] = { lat: v.lat, lng: v.lng, name: v.name };
writeFileSync(join(DIR, 'deerGeo.json'), JSON.stringify(out, null, 1));
console.log(`Parsed ${g.features.length} features -> ${Object.keys(out).length} distinct deer hunt areas.`);
for (const a of ['143', '141', '128', '102', '105', '64']) if (out[a]) console.log(`  area ${a}: ${out[a].name} (${out[a].lat}, ${out[a].lng})`);
