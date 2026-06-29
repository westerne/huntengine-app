// Shared OpenStreetMap/Overpass access helper, used by both the map's
// /api/access route and the strategy brief (to ground "Terrain & Access" in
// real roads/trailheads instead of letting the model invent them).
//
// Overpass 406s clients without a User-Agent and rate-limits a single mirror,
// so we send a UA and fall back across mirrors.

const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export async function overpass(query: string, timeoutMs = 22000): Promise<any> {
  let lastErr: unknown = null;
  for (const url of MIRRORS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'huntengine-app/1.0 (hunt planner; access layer)',
          Accept: 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) { lastErr = new Error(`${url} → ${r.status}`); continue; }
      return await r.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('all overpass mirrors failed');
}

export type AccessSummary = {
  trailheads: number;
  parking: number;
  gates: number;
  roads: string[];
  /** Prompt-ready text block, or '' if the lookup failed. */
  text: string;
};

// Real access features within ~10-12 mi of a unit centroid, summarized for the
// brief prompt. Best-effort: returns empty text on any failure so the brief
// still generates (the prompt then instructs the model not to fabricate).
export async function getAccessSummary(lat: number, lng: number): Promise<AccessSummary> {
  const empty: AccessSummary = { trailheads: 0, parking: 0, gates: 0, roads: [], text: '' };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return empty;

  const d = 0.18; // ~12 mi N/S
  const bb = `${(lat - d).toFixed(4)},${(lng - d).toFixed(4)},${(lat + d).toFixed(4)},${(lng + d).toFixed(4)}`;
  const q =
    `[out:json][timeout:20];` +
    `(node["highway"="trailhead"](${bb});node["amenity"="parking"]["name"](${bb});node["barrier"="gate"](${bb}););out tags 80;` +
    `way["highway"~"primary|secondary|tertiary|unclassified|track"]["name"](${bb});out tags 80;`;

  try {
    const j = await overpass(q, 18000);
    const els: any[] = j.elements || [];
    let trailheads = 0, parking = 0, gates = 0;
    const roadNames = new Set<string>();
    for (const el of els) {
      const t = el.tags || {};
      if (t.highway === 'trailhead') trailheads++;
      else if (t.amenity === 'parking') parking++;
      else if (t.barrier === 'gate') gates++;
      else if (t.highway) {
        const name = t.name || t.ref;
        if (name) roadNames.add(name);
      }
    }
    const roads = [...roadNames].slice(0, 16);
    const text =
      `REAL ACCESS DATA (OpenStreetMap, within ~12 miles of the unit center):\n` +
      `- Cataloged trailheads: ${trailheads}\n` +
      `- Named parking areas / pullouts: ${parking}\n` +
      `- Access gates: ${gates}\n` +
      `- Named roads/routes in and around the unit: ${roads.length ? roads.join(', ') : 'none cataloged'}\n` +
      `Use ONLY these named roads and these counts when describing access. If a category is 0 or "none cataloged", say so plainly — do NOT invent trailhead names, road numbers, or parking areas that are not listed here.`;
    return { trailheads, parking, gates, roads, text };
  } catch {
    return empty;
  }
}
