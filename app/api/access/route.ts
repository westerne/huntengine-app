import { NextResponse } from 'next/server';
import { overpass } from '@/lib/access';

// Access-data proxy: real roads, trails, trailheads, parking, and gates from
// OpenStreetMap via Overpass.
//
// Why OSM and not the federal services? BLM's national GTLF travel-management
// layer is unpublished for many field offices (e.g. Rock Springs returns zero),
// and USFS MVUM only covers Forest land. OSM is the one source with complete
// coverage of dirt roads, two-tracks, trailheads, and parking everywhere a
// western hunter goes. The shared overpass() client (lib/access) sends a proper
// User-Agent (Overpass 406s bare clients) and falls back across mirrors.
//
// kind=points  → trailheads / parking / gates as {lat,lng,type,name}
// kind=roads   → drive-in road classes as a GeoJSON LineString FeatureCollection
//
// Roads are heavy (a full unit bbox is ~9MB), so the client only requests them
// for the current viewport at closer zoom; points are light and always loaded.

const ROAD_CLASSES = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|track';

// Small in-memory TTL cache keyed by kind+rounded-bbox. Good enough for dev /
// single-instance; the pipeline phase will replace Overpass with our own extract.
type CacheEntry = { at: number; body: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;

function roundBbox(s: number, w: number, n: number, e: number): string {
  const r = (x: number) => x.toFixed(3);
  return `${r(s)},${r(w)},${r(n)},${r(e)}`;
}

const POINT_TYPE: Record<string, string> = {
  trailhead: 'Trailhead',
  parking: 'Parking',
  gate: 'Gate',
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind') === 'roads' ? 'roads' : 'points';
  const parts = (searchParams.get('bbox') || '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: 'bbox=s,w,n,e required' }, { status: 400 });
  }
  const [s, w, n, e] = parts;
  const bb = `${s},${w},${n},${e}`;
  const cacheKey = `${kind}:${roundBbox(s, w, n, e)}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, { headers: { 'x-cache': 'hit' } });
  }

  try {
    if (kind === 'points') {
      const q = `[out:json][timeout:25];(node["highway"="trailhead"](${bb});node["amenity"="parking"](${bb});way["amenity"="parking"](${bb});node["barrier"="gate"](${bb}););out center tags 300;`;
      const j = await overpass(q);
      const points = (j.elements || [])
        .map((el: any) => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (lat == null || lng == null) return null;
          const t = el.tags || {};
          const type = t.highway === 'trailhead' ? 'trailhead' : t.amenity === 'parking' ? 'parking' : 'gate';
          return { lat, lng, type, label: POINT_TYPE[type], name: t.name || null };
        })
        .filter(Boolean);
      const body = { points };
      cache.set(cacheKey, { at: Date.now(), body });
      return NextResponse.json(body);
    }

    // roads
    const q = `[out:json][timeout:25];way["highway"~"${ROAD_CLASSES}"](${bb});out geom 4000;`;
    const j = await overpass(q);
    const features = (j.elements || [])
      .filter((el: any) => Array.isArray(el.geometry) && el.geometry.length > 1)
      .map((el: any) => ({
        type: 'Feature',
        properties: {
          highway: el.tags?.highway || null,
          name: el.tags?.name || el.tags?.ref || null,
          surface: el.tags?.surface || null,
        },
        geometry: { type: 'LineString', coordinates: el.geometry.map((g: any) => [g.lon, g.lat]) },
      }));
    const body = { type: 'FeatureCollection', features };
    cache.set(cacheKey, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      kind === 'points' ? { points: [] } : { type: 'FeatureCollection', features: [] },
      { status: 200, headers: { 'x-access': 'upstream-failed' } }
    );
  }
}
