// Parse the ElkHuntAreas KML -> per-area centroid, then replace the placeholder
// coords in wyoelkdata.ts. Elk area number = the key prefix ("7-1" -> 7);
// "Region E/S/W" entries (no numeric area) are skipped.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const DATA = join(import.meta.dirname, '..', 'app', 'api', 'strategy', 'wyoelkdata.ts');
const KML = join(tmpdir(), 'pdftools', 'elk_kmz', 'doc.kml');
const src0 = readFileSync(KML, 'utf8');

function ringCentroid(pts) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cr = x0 * y1 - x1 * y0; A += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-12) { const n = pts.length; return { lng: pts.reduce((s, p) => s + p[0], 0) / n, lat: pts.reduce((s, p) => s + p[1], 0) / n, area: 0 }; }
  return { lng: cx / (6 * A), lat: cy / (6 * A), area: Math.abs(A) };
}
function parseCoords(block) {
  const m = block.match(/<outerBoundaryIs>\s*<LinearRing>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/);
  if (!m) return null;
  return m[1].trim().split(/\s+/).map(t => { const [lng, lat] = t.split(',').map(Number); return [lng, lat]; })
    .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

const placemarks = src0.split('<Placemark').slice(1).map(s => '<Placemark' + s.split('</Placemark>')[0]);
const byArea = {};
for (const pm of placemarks) {
  const am = pm.match(/<td>HUNTAREA<\/td><td>(\d+)<\/td>/);
  if (!am) continue;
  const area = String(parseInt(am[1], 10));
  const pts = parseCoords(pm);
  if (!pts || pts.length < 3) continue;
  const c = ringCentroid(pts);
  if (!byArea[area] || c.area > byArea[area].area) byArea[area] = { lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), area: c.area };
}
console.log(`KML -> ${Object.keys(byArea).length} elk hunt areas.`);

let src = readFileSync(DATA, 'utf8');
const starts = [];
const re = /\n  '([^']+)':\s*\{/g; let m;
while ((m = re.exec(src)) !== null) starts.push({ key: m[1], idx: m.index });

const coordRe = /coords:\s*\{ lat: -?[0-9.]+, lng: -?[0-9.]+ \}/;
let changed = 0, noArea = 0, noGeo = 0;
for (let i = starts.length - 1; i >= 0; i--) {
  const start = starts[i].idx;
  const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
  const block = src.slice(start, end);
  const area = String(parseInt(starts[i].key.split('-')[0], 10));
  if (!/^\d+$/.test(area)) { noArea++; continue; }      // Region E/S/W etc.
  const g = byArea[area];
  if (!g) { noGeo++; continue; }
  if (!coordRe.test(block)) { noArea++; continue; }
  const newBlock = block.replace(coordRe, `coords: { lat: ${g.lat}, lng: ${g.lng} }`);
  if (newBlock !== block) { changed++; src = src.slice(0, start) + newBlock + src.slice(end); }
}
writeFileSync(DATA, src);
console.log(`Updated coords on ${changed} elk entries. (non-numeric area: ${noArea}, no KML match: ${noGeo})`);
