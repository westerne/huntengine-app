// Shared BLM Surface Management Agency point lookup. Used by the /api/ownership
// tap-to-identify route and by the public-land sampler (lib/landstats).

const SMA_QUERY =
  'https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_LimitedScale/MapServer/1/query';

// ADMIN_AGENCY_CODE → friendly label.
export const AGENCY_LABELS: Record<string, string> = {
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

// Agencies that generally mean huntable public land (varies by unit/season, so a
// hint, not legal advice). Private/local/undetermined are not flagged.
const PUBLIC_CODES = new Set(['BLM', 'USFS', 'FS', 'ST', 'STATE', 'SL', 'BOR', 'USBR', 'OTHER', 'OF']);

export type Ownership = {
  agencyCode: string;
  agency: string;
  unitName: string | null;
  isPublic: boolean;
};

export async function pointOwnership(lat: number, lng: number, timeoutMs = 15000): Promise<Ownership> {
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
  const r = await fetch(`${SMA_QUERY}?${qs.toString()}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  const j = await r.json();
  const attr = j?.features?.[0]?.attributes;
  const code = (attr?.ADMIN_AGENCY_CODE || 'PVT').toUpperCase();
  const agency = AGENCY_LABELS[code] || code;
  const rawUnit = (attr?.ADMIN_UNIT_NAME || '').trim();
  const unitName = rawUnit && rawUnit.toLowerCase() !== agency.toLowerCase() ? rawUnit : null;
  return { agencyCode: code, agency, unitName, isPublic: PUBLIC_CODES.has(code) };
}
