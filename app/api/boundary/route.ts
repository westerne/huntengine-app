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
  whereFor?: (unit: string) => string; // custom where-clause (overrides unitField matching)
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

// Colorado Parks & Wildlife — GMUID is the unit number. Big-game GMUs (deer/elk/
// antelope/moose) share layer 6; bighorn sheep and mountain goat have their own
// (layers 7/8). '*' outFields since the layers' schemas differ.
const CPW_BASE =
  'https://services5.arcgis.com/ttNGmDvKQA7oeDQ3/arcgis/rest/services/CPWAdminData/FeatureServer';
const cpw = (layer: number): Source => ({
  url: `${CPW_BASE}/${layer}/query`,
  unitField: 'GMUID',
  numeric: true,
  outFields: '*',
  labelField: 'COUNTY',
});
const CO_SOURCES: Record<string, Source> = {
  DEER: cpw(6),
  ELK: cpw(6),
  ANTELOPE: cpw(6),
  MOOSE: cpw(6),
  BIGHORNSHEEP: cpw(7),
  MTNGOAT: cpw(8),
};

// Montana FWP — DISTRICT (hunting district number, stored as a string). Deer/elk
// share the "Deer Elk Lion" layer (11); antelope/moose/sheep/goat have their own.
const FWP_BASE =
  'https://fwp-gis.mt.gov/arcgis/rest/services/admbnd/huntingDistricts/MapServer';
const fwp = (layer: number): Source => ({
  url: `${FWP_BASE}/${layer}/query`,
  unitField: 'DISTRICT',
  numeric: false,
  outFields: '*',
});
const MT_SOURCES: Record<string, Source> = {
  DEER: fwp(11),
  ELK: fwp(11),
  ANTELOPE: fwp(3),
  MOOSE: fwp(16),
  BIGHORNSHEEP: fwp(5),
  MTNGOAT: fwp(19),
};

// Arizona Game & Fish — GMUs with split hunt units (12AE/12AW, 22N/22S, 5BN…),
// GMUNAME as a string ("27", "5A"). Shared across species. A unit ending in a
// letter ("12A") also matches its split halves; a bare number ("23") matches
// itself or its directional halves (23N/23S) but never "1" → "10".
const AZGFD_GMU: Source = {
  url: 'https://maps.azgfd.com/host/rest/services/SDR_GFAW-GIS-SQL1p/Boundaries_GameMgmtUnitsWithHuntUnits/FeatureServer/0/query',
  unitField: 'GMUNAME',
  numeric: false,
  outFields: 'GMUNAME,REG_NAME',
  labelField: 'REG_NAME',
  whereFor: (u) => (/[A-Z]$/.test(u)
    ? `GMUNAME='${u}' OR GMUNAME LIKE '${u}_'`
    : `GMUNAME IN ('${u}','${u}N','${u}S','${u}E','${u}W')`),
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
  if (state === 'CO') return CO_SOURCES[speciesKey(species)] ?? null;
  if (state === 'MT') return MT_SOURCES[speciesKey(species)] ?? null;
  if (state === 'AZ') return AZGFD_GMU;
  return null;
}

type CacheEntry = { at: number; body: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000; // boundaries are static

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = (searchParams.get('state') || '').toUpperCase().trim();
  const species = searchParams.get('species') || '';
  // Hunt keys carry a suffix after the area: WY "7-1" (area-type), "143-GEN",
  // ID "1-1" (hunt area in GMU 1). The boundary is the area before the first
  // dash — stripping the dash instead turned "7-1" into area 71.
  const rawUnit = (searchParams.get('unit') || '').trim().toUpperCase().split('-')[0].replace(/[^A-Z0-9]/g, '');

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
    where = src.whereFor
      ? src.whereFor(unit)
      : src.numeric ? `${src.unitField}=${unit}` : `${src.unitField}='${unit}'`;
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
