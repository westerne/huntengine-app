import { NextResponse } from 'next/server';

// Per-unit hunt-boundary proxy — the scalable pattern for the multi-state,
// multi-species pipeline. Fetch one unit's polygon on demand from the agency's
// GIS and cache it; no giant bundled GeoJSON.
//
// IMPORTANT: Wyoming draws hunt-area boundaries DIFFERENTLY per species — deer
// area 7, elk area 7, and antelope area 7 are three different places — so WY
// resolves a different WGFD FeatureServer per species. Idaho GMUs are shared
// across species, so it uses one source regardless of species.
//
// Wyoming deer also supports general-region letters (e.g. "G" → the handful of
// areas in that region) via the Region field. Ownership (BLM SMA) and access
// (OSM) layers are national, so new boundaries light up the full map instantly.

type Source = {
  url: string;
  unitField: string;       // attribute holding the numeric/string unit id
  numeric: boolean;        // is unitField numeric? (controls where-clause quoting)
  outFields: string;
  labelField?: string;
  regionField?: string;    // if set, a single-letter unit matches this field instead
};

const WGFD_BASE = 'https://services6.arcgis.com/cWzdqIyxbijuhPLw/arcgis/rest/services';

// WGFD hunt-area source. Deer's clean polygons live on layer 4 of the 2024
// service (layers 0-3 are label fishnets) and carry region letters; the other
// species are layer 0. '*' outFields because the species schemas differ (antelope
// has no Region field, and naming a missing field 400s the query).
const wgfd = (svc: string, layer: number, regionField?: string): Source => ({
  url: `${WGFD_BASE}/${svc}/FeatureServer/${layer}/query`,
  unitField: 'HUNTAREA',
  numeric: true,
  outFields: '*',
  labelField: 'HUNTNAME',
  regionField,
});

const WY_SOURCES: Record<string, Source> = {
  DEER: wgfd('DeerHuntAreas_2024', 4, 'Region'),
  ELK: wgfd('ElkHuntAreas', 0),
  ANTELOPE: wgfd('AntelopeHuntAreas', 0),
  MOOSE: wgfd('MooseHuntAreas', 0),
  BIGHORNSHEEP: wgfd('BighornSheepHuntAreas', 0),
  MTNGOAT: wgfd('RockyMountainGoatHuntAreas', 0),
};

// Idaho Fish & Game — Game Units (GMUs), shared across species. NAME = "39".
const IDFG_GMU: Source = {
  url: 'https://gisportal-idfg.idaho.gov/hosting/rest/services/Hunting/MapServer/3/query',
  unitField: 'NAME',
  numeric: false,
  outFields: 'NAME,Elk_Zone',
  labelField: 'Elk_Zone',
};

function speciesKey(species: string): string {
  const x = (species || '').toUpperCase();
  if (x.includes('ELK')) return 'ELK';
  if (x.includes('ANTELOPE') || x.includes('PRONGHORN')) return 'ANTELOPE';
  if (x.includes('MOOSE')) return 'MOOSE';
  if (x.includes('GOAT')) return 'MTNGOAT';
  if (x.includes('SHEEP') || x.includes('BIGHORN')) return 'BIGHORNSHEEP';
  return 'DEER';
}

function resolveSource(state: string, species: string): Source | null {
  if (state === 'ID') return IDFG_GMU;
  if (state === 'WY') return WY_SOURCES[speciesKey(species)] ?? null;
  return null;
}

type CacheEntry = { at: number; body: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // boundaries are static

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = (searchParams.get('state') || '').toUpperCase().trim();
  const species = searchParams.get('species') || '';
  const rawUnit = (searchParams.get('unit') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const src = resolveSource(state, species);
  if (!src) return NextResponse.json({ error: `no boundary source for ${state}/${species}` }, { status: 404 });
  if (!rawUnit) return NextResponse.json({ error: 'unit required' }, { status: 400 });

  // A lone letter is a general region (deer only); otherwise the unit number.
  const asRegion = src.regionField && /^[A-Z]$/.test(rawUnit) ? rawUnit : null;
  let where: string;
  let matchVal: string;
  if (asRegion) {
    where = `${src.regionField}='${asRegion}'`;
    matchVal = `R-${asRegion}`;
  } else {
    const unit = src.numeric ? (rawUnit.match(/\d+/)?.[0] ?? '') : rawUnit;
    if (!unit) return NextResponse.json({ error: 'invalid unit' }, { status: 400 });
    where = src.numeric ? `${src.unitField}=${unit}` : `${src.unitField}='${unit}'`;
    matchVal = unit;
  }

  const key = `${state}:${speciesKey(species)}:${matchVal}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, { headers: { 'x-cache': 'hit' } });
  }

  const qs = new URLSearchParams({
    where,
    outFields: src.outFields,
    returnGeometry: 'true',
    outSR: '4326',
    geometryPrecision: '6',
    f: 'geojson',
  });

  try {
    const r = await fetch(`${src.url}?${qs.toString()}`, {
      signal: AbortSignal.timeout(20000),
      headers: { accept: 'application/json' },
    });
    const j = await r.json();
    const features = j?.features || [];
    if (!features.length) {
      return NextResponse.json({ type: 'FeatureCollection', features: [], notFound: true }, { status: 200 });
    }
    const body = {
      type: 'FeatureCollection',
      features,
      unit: matchVal,
      isRegion: !!asRegion,
      label: src.labelField ? features[0]?.properties?.[src.labelField] || null : null,
    };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { type: 'FeatureCollection', features: [], error: 'boundary lookup failed' },
      { status: 200 }
    );
  }
}
