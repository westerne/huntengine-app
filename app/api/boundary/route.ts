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
  namedUnits?: boolean;    // units are names with spaces ("Unit 1", "Banner North") — keep spaces, no dash split
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

// New Mexico Game & Fish — GMU polygons (GMU string: "34", "16B"). Split units
// have no parent polygon, so a bare "16" matches 16A–16E; "1" never matches "10".
const NMDGF_GMU: Source = {
  url: 'https://services2.arcgis.com/CjbW1bVhK4dB3WOa/arcgis/rest/services/NMDGF_Game_Management_Units_I_E__v2_WFL1/FeatureServer/0/query',
  unitField: 'GMU',
  numeric: false,
  outFields: 'GMU',
  whereFor: (u) => (/[A-Z]$/.test(u)
    ? `GMU='${u}'`
    : `GMU IN ('${u}','${u}A','${u}B','${u}C','${u}D','${u}E')`),
};

// Nebraska Game & Parks — a separate unit layer per species, UnitName as a
// name ("Unit 1", "Pine Ridge", "Banner North"). Matched case-insensitively.
const NGPC_BASE = 'https://services5.arcgis.com/IOshH1zLrIieqrNk/arcgis/rest/services';
const ngpc = (svc: string): Source => ({
  url: `${NGPC_BASE}/${svc}/FeatureServer/0/query`,
  unitField: 'UnitName',
  numeric: false,
  outFields: 'UnitName',
  labelField: 'UnitName',
  namedUnits: true,
  whereFor: (u) => `UPPER(UnitName)='${u}'`,
});
const NE_SOURCES: Record<string, Source> = {
  ELK: ngpc('Elk_Hunting_Units_2022'),
  DEER: ngpc('Deer_Mangement_Units_2022'), // (sic — the service name is misspelled)
  ANTELOPE: ngpc('Antelope_Hunting_Units_2022'),
  BIGHORNSHEEP: ngpc('Bighorn_Hunting_Units_2022'),
};

// North Dakota Game & Fish — per-species layers on the State GIS hub, UNIT_ID
// as written ("4A", "3F2", "1-A", "E1E", "M10", "B1"). Dashes are part of the
// id here, so units are taken whole.
const NDGF_BASE = 'https://ndgishub.nd.gov/arcgis/rest/services/Applications/GNF_GeneralInformation/MapServer';
const ndgf = (layer: number): Source => ({
  url: `${NDGF_BASE}/${layer}/query`,
  unitField: 'UNIT_ID',
  numeric: false,
  outFields: 'UNIT_ID',
  labelField: 'UNIT_ID',
  namedUnits: true,
  whereFor: (u) => `UNIT_ID='${u}'`,
});
const ND_SOURCES: Record<string, Source> = {
  DEER: ndgf(33), ANTELOPE: ndgf(43), ELK: ndgf(34), MOOSE: ndgf(38), BIGHORNSHEEP: ndgf(29),
};

// Kansas Wildlife & Parks — deer management units, DMU as "UNIT 16". Antelope
// units 2, 17 and 18 are the same polygons. (Unit 19 is a separate layer.)
const KDWP_DMU: Source = {
  url: 'https://services1.arcgis.com/q2CglofYX6ACNEeu/arcgis/rest/services/Kansas_Deer_Management_Units/FeatureServer/0/query',
  unitField: 'DMU',
  numeric: false,
  outFields: 'DMU',
  labelField: 'DMU',
  whereFor: (u) => `DMU='UNIT ${u.replace(/^0+(?=\d)/, '')}'`,
};

// Nevada Department of Wildlife — hunt units, display_name as 3-digit text ("061").
const NDOW_UNITS: Source = {
  url: 'https://services.arcgis.com/RyxlXSfFi87rAosq/arcgis/rest/services/NDOW_Hunt_Units/FeatureServer/0/query',
  unitField: 'display_name',
  numeric: false,
  outFields: 'display_name',
  labelField: 'display_name',
  whereFor: (u) => `display_name='${/^\d+$/.test(u) ? u.padStart(3, '0') : u}'`,
};

// Oklahoma (ODWC) has no hunt-unit layer. Controlled hunts are on named public
// areas: WMAs come from ODWC's WMA layer (SHORTNAME), pronghorn hunts are whole
// counties. Refuges, Army Corps lands and McAlester AAP have no official
// layer, so they get no outline.
const ODWC_WMA_ALIAS: Record<string, string> = {
  'ATOKA WMA': 'ATOKA WMA',
  'CHEROKEE GMA': 'CHEROKEE',
  'OKMULGEE GMA': 'OKMULGEE',
  'SPAVINAW GMA': 'SPAVINAW',
  'MCCURTAIN CO WA': 'MCCURTAIN COUNTY',
  'OSAGE-WESTERN WALL WMA': 'OSAGE WESTERN WALL',
  'FORT COBB WMA AND SP': 'FORT COBB',
  'BEAVER RIVER WMA MCFARLAND UNIT': 'BEAVER RIVER',
};
const ODWC_WMA: Source = {
  url: 'https://services1.arcgis.com/jRf8jjFwxedITdFe/arcgis/rest/services/Public_WMA_Boundaries/FeatureServer/1/query',
  unitField: 'SHORTNAME',
  numeric: false,
  outFields: 'SHORTNAME',
  labelField: 'SHORTNAME',
  namedUnits: true,
  whereFor: (u) => `UPPER(SHORTNAME)='${ODWC_WMA_ALIAS[u] ?? u.replace(/ WMA$/, '')}'`,
};
const ODWC_COUNTY: Source = {
  url: 'https://services1.arcgis.com/jRf8jjFwxedITdFe/arcgis/rest/services/OK77counties/FeatureServer/2/query',
  unitField: 'COUNTY',
  numeric: false,
  outFields: 'COUNTY',
  labelField: 'COUNTY',
  namedUnits: true,
  whereFor: (u) => `UPPER(COUNTY)='${u.replace(/ COUNTY$/, '')}'`,
};

// California (CDFW BIOS) — one layer per species. Deer has three: zones
// ("X3a", lower-case suffix), G/J/M/MA special hunts, and A archery hunts.
const BIOS = 'https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services';
const bios = (svc: string, field: string, numeric = false): Source => ({
  url: `${BIOS}/${svc}/FeatureServer/0/query`,
  unitField: field,
  numeric,
  outFields: field,
  labelField: field,
  namedUnits: true,
  whereFor: (u) => (numeric ? `${field}=${Number(u)}` : `UPPER(${field})='${u}'`),
});
const CA_SOURCES: Record<string, Source> = {
  ELK: bios('biosds786_fpu', 'NAME'),
  ANTELOPE: bios('biosds787_fpu', 'Zone', true),
  BIGHORNSHEEP: bios('biosds784_fpu', 'Zone_Num', true),
};
function caDeerSource(unit: string): Source {
  const u = unit.toUpperCase();
  if (/^(G|J|M|MA)\d/.test(u)) return bios('biosds3241_fpu', 'Zone');
  if (/^A\d/.test(u)) return bios('biosds3242_fpu', 'Zone');
  return bios('biosds342_fpu', 'Zone_Nam');
}

// Washington (WDFW) — GMUs (GMU_Num, integer), plus Elk Areas, Deer Areas,
// sheep units and goat units on their own layers.
const WDFW = 'https://geodataservices.wdfw.wa.gov/arcgis/rest/services/MapServices';
const wdfw = (path: string, field: string, where: (u: string) => string): Source => ({
  url: `${WDFW}/${path}/query`, unitField: field, numeric: false, outFields: field, labelField: field, namedUnits: true, whereFor: where,
});
function waSource(unit: string): Source {
  const u = unit.toUpperCase();
  const n = (s: string) => String(Number((s.match(/\d+/) ?? ['0'])[0]));
  if (/^ELK AREA/.test(u)) return wdfw('HOReferenceService/MapServer/5', 'EA_ID', (x) => `EA_ID=${n(x)}`);
  if (/^DEER AREA/.test(u)) return wdfw('HOReferenceService/MapServer/4', 'DA_Id', (x) => `DA_Id=${n(x)}`);
  if (/^SHEEP UNIT/.test(u)) return wdfw('SharedReferenceLayers/MapServer/1', 'BSU_ID', (x) => `BSU_ID=${n(x)}`);
  if (/^\d+-\d+$/.test(u)) return wdfw('SharedReferenceLayers/MapServer/4', 'MGU_Nu_Code', (x) => `MGU_Nu_Code='${x}'`);
  return wdfw('HOReferenceService/MapServer/0', 'GMU_Num', (x) => `GMU_Num=${n(x)}`);
}

// Oregon (ODFW) — wildlife management units, UNIT_NUM numeric. The 2026
// eastern Oregon deer hunt areas ("DG02") have no official layer yet.
const ODFW_WMU: Source = {
  url: 'https://nrimp.dfw.state.or.us/arcgis/rest/services/ODFW_Admin/WildlifeManagementUnits/MapServer/0/query',
  unitField: 'UNIT_NUM',
  numeric: true,
  outFields: 'UNIT_NUM,UNIT_NAME',
  labelField: 'UNIT_NAME',
};

// Alaska (ADF&G) — game management subunits, SubLabel as written ("13A", "7").
const ADFG_GMU: Source = {
  url: 'https://gis.adfg.alaska.gov/ags/rest/services/wc_public/GMUSubunits/FeatureServer/4/query',
  unitField: 'SubLabel',
  numeric: false,
  outFields: 'SubLabel',
  labelField: 'SubLabel',
  namedUnits: true,
  whereFor: (u) => `UPPER(SubLabel)='${u}'`,
};

function speciesKey(species: string): string {
  const x = (species || '').toUpperCase();
  if (x.includes('DALL')) return 'DALLSHEEP';
  if (x.includes('CARIBOU')) return 'CARIBOU';
  if (x.includes('BISON')) return 'BISON';
  if (x.includes('MUSK')) return 'MUSKOX';
  if (x.includes('ELK')) return 'ELK';
  if (x.includes('ANTELOPE') || x.includes('PRONGHORN')) return 'ANTELOPE';
  if (x.includes('MOOSE')) return 'MOOSE';
  if (x.includes('GOAT')) return 'MTNGOAT';
  if (x.includes('SHEEP') || x.includes('BIGHORN')) return 'BIGHORNSHEEP';
  return 'DEER';
}

function resolveSource(state: string, species: string, unit?: string): Source | null {
  if (state === 'ID') return IDFG_GMU;
  if (state === 'WY') return WY_SOURCES[speciesKey(species)] ?? null;
  if (state === 'CO') return CO_SOURCES[speciesKey(species)] ?? null;
  if (state === 'MT') return MT_SOURCES[speciesKey(species)] ?? null;
  if (state === 'AZ') return AZGFD_GMU;
  if (state === 'NM') return NMDGF_GMU;
  if (state === 'NE') return NE_SOURCES[speciesKey(species)] ?? null;
  if (state === 'ND') return ND_SOURCES[speciesKey(species)] ?? null;
  if (state === 'KS') return KDWP_DMU;
  if (state === 'NV') return NDOW_UNITS;
  if (state === 'OK') return speciesKey(species) === 'ANTELOPE' ? ODWC_COUNTY : ODWC_WMA;
  if (state === 'WA') return waSource(unit ?? '');
  if (state === 'AK') return ADFG_GMU;
  if (state === 'OR') return /^\d+$/.test((unit ?? '').trim()) ? ODFW_WMU : null;
  if (state === 'CA') return speciesKey(species) === 'DEER' ? caDeerSource(unit ?? '') : CA_SOURCES[speciesKey(species)] ?? null;
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
  const src = resolveSource(state, species, searchParams.get('unit') ?? '');
  if (!src) return NextResponse.json({ error: `no boundary source for ${state}/${species}` }, { status: 404 });
  const param = (searchParams.get('unit') || '').trim().toUpperCase();
  const rawUnit = src.namedUnits
    ? param.replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trim()
    : param.split('-')[0].replace(/[^A-Z0-9]/g, '');
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
