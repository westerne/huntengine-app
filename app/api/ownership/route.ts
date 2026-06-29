import { NextResponse } from 'next/server';

// Surface-ownership identify proxy.
//
// Given a lat/lng, asks the BLM National Surface Management Agency (SMA) service
// which agency manages that exact spot, and returns a normalized, hunter-friendly
// answer ("Bureau of Land Management — Rock Springs FO" / "Private"). Proxied
// server-side so we dodge browser CORS, can cache, and keep the upstream URL in
// one place. This is the authoritative federal surface-ownership dataset.
//
// The colored map tiles come straight from BLM's cached tile service (see
// UnitMap.tsx); this route is only the point lookup behind tap-to-identify.

const SMA_QUERY =
  'https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_LimitedScale/MapServer/1/query';

// ADMIN_AGENCY_CODE → friendly label. Codes per the BLM SMA schema.
const AGENCY_LABELS: Record<string, string> = {
  BLM: 'Bureau of Land Management',
  USFS: 'US Forest Service',
  FS: 'US Forest Service',
  NPS: 'National Park Service',
  FWS: 'US Fish & Wildlife Service',
  USFW: 'US Fish & Wildlife Service',
  BOR: 'Bureau of Reclamation',
  USBR: 'Bureau of Reclamation',
  BIA: 'Bureau of Indian Affairs',
  DOD: 'Department of Defense',
  ST: 'State',
  STATE: 'State',
  SL: 'State',
  LG: 'Local / County',
  OTHER: 'Other Federal',
  OF: 'Other Federal',
  PVT: 'Private',
  PRI: 'Private',
  UND: 'Private / Undetermined',
};

// Agencies that generally mean huntable public land (varies by unit/season, so
// this is a hint, not legal advice). Private/local/undetermined are not flagged.
const PUBLIC_CODES = new Set(['BLM', 'USFS', 'FS', 'ST', 'STATE', 'SL', 'BOR', 'USBR', 'OTHER', 'OF']);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng query params required' }, { status: 400 });
  }

  const qs = new URLSearchParams({
    where: '1=1',
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'ADMIN_AGENCY_CODE,ADMIN_UNIT_NAME',
    returnGeometry: 'false',
    f: 'json',
  });

  try {
    const r = await fetch(`${SMA_QUERY}?${qs.toString()}`, {
      signal: AbortSignal.timeout(15000),
      headers: { accept: 'application/json' },
    });
    const j = await r.json();
    const attr = j?.features?.[0]?.attributes;
    const code = (attr?.ADMIN_AGENCY_CODE || 'PVT').toUpperCase();
    const agency = AGENCY_LABELS[code] || code;
    // ADMIN_UNIT_NAME often just echoes the agency at this scale; only surface it
    // when it adds something (e.g. a specific field office / forest / refuge).
    const rawUnit = (attr?.ADMIN_UNIT_NAME || '').trim();
    const unitName = rawUnit && rawUnit.toLowerCase() !== agency.toLowerCase() ? rawUnit : null;
    return NextResponse.json({
      agencyCode: code,
      agency,
      unitName,
      isPublic: PUBLIC_CODES.has(code),
    });
  } catch {
    // Never hard-fail the map over an upstream hiccup.
    return NextResponse.json(
      { agencyCode: null, agency: 'Lookup unavailable', unitName: null, isPublic: null },
      { status: 200 }
    );
  }
}
