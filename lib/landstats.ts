// Computes a REAL public-land percentage for a unit by sampling BLM surface
// ownership at a grid of points inside the unit's boundary. This replaces the
// brief's guessed public-land number where we have no curated publicPct
// (notably Idaho). Best-effort and cached per unit.

import { pointOwnership } from './ownership';

type FC = { features?: Array<{ geometry?: { type: string; coordinates: unknown } }> };

function bboxOf(fc: FC): [number, number, number, number] | null {
  let s = 90, w = 180, n = -90, e = -180, any = false;
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [lng, lat] = c as number[];
      if (lat < s) s = lat; if (lat > n) n = lat;
      if (lng < w) w = lng; if (lng > e) e = lng;
      any = true;
    } else if (Array.isArray(c)) {
      c.forEach(walk);
    }
  };
  (fc.features || []).forEach((f) => f.geometry && walk(f.geometry.coordinates));
  return any ? [s, w, n, e] : null;
}

// Ray-casting point-in-ring.
function inRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inGeometry(x: number, y: number, geom: { type: string; coordinates: unknown }): boolean {
  const polys = (geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]) as number[][][][];
  for (const poly of polys) {
    const [outer, ...holes] = poly;
    if (inRing(x, y, outer) && !holes.some((h) => inRing(x, y, h))) return true;
  }
  return false;
}

type Stats = { publicPct: number; sampled: number };
const cache = new Map<string, { at: number; val: Stats | null }>();
const TTL_MS = 24 * 60 * 60 * 1000;

// origin: the running app's origin (so we can reuse /api/boundary on dev & Vercel).
export async function getPublicLandPct(
  origin: string,
  state: string,
  species: string,
  unit: string,
): Promise<Stats | null> {
  const key = `${state}:${species}:${unit}`.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.val;

  let val: Stats | null = null;
  try {
    const r = await fetch(
      `${origin}/api/boundary?state=${encodeURIComponent(state)}&species=${encodeURIComponent(species)}&unit=${encodeURIComponent(unit)}`,
      { signal: AbortSignal.timeout(20000) },
    );
    const fc: FC = await r.json();
    const bb = bboxOf(fc);
    if (fc.features?.length && bb) {
      const [s, w, n, e] = bb;
      // 8x8 grid of cell centers; keep those inside the polygon.
      const N = 8;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const lng = w + (e - w) * ((i + 0.5) / N);
          const lat = s + (n - s) * ((j + 0.5) / N);
          if (fc.features.some((f) => f.geometry && inGeometry(lng, lat, f.geometry))) pts.push([lat, lng]);
        }
      }
      // Cap the number of BLM calls; thin evenly if needed.
      const sample = pts.length > 30 ? pts.filter((_, k) => k % Math.ceil(pts.length / 30) === 0) : pts;
      let pub = 0, tot = 0;
      for (let i = 0; i < sample.length; i += 6) {
        const batch = sample.slice(i, i + 6);
        const res = await Promise.all(batch.map(([la, lo]) => pointOwnership(la, lo, 12000).catch(() => null)));
        for (const o of res) { if (o) { tot++; if (o.isPublic) pub++; } }
      }
      if (tot >= 5) val = { publicPct: Math.round((100 * pub) / tot), sampled: tot };
    }
  } catch {
    val = null;
  }

  cache.set(key, { at: Date.now(), val });
  return val;
}
