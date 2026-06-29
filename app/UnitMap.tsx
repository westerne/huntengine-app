'use client';

// The e-scouting map for a planned unit. Layers, all real data, no API key:
//   • Esri World Imagery satellite basemap
//   • the actual hunt-unit boundary, fetched per-unit from /api/boundary
//     (WY: per-species WGFD hunt areas, incl. deer general-region letters;
//      ID: IDFG GMUs). No giant bundled file.
//   • BLM Surface Management Agency land status (public colored / private clear)
//   • roads & trails (OSM, viewport-loaded at closer zoom)
//   • access points — trailheads / parking / gates (OSM)
//   • tap-to-identify ownership at any point
//
// Ownership and OSM access are NATIONAL, so adding a state only needs a boundary
// source. Replaces the LLM's invented "terrain & access" prose with ground truth.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Authoritative BLM Surface Management Agency cached tiles. The "without_PriUnk"
// variant leaves private/undetermined land transparent, so public land is colored
// and the satellite imagery shows through everywhere else. Cache tops out around
// z14, so overzoom past that. No API key, loads as plain <img> (no CORS needed).
const OWNERSHIP_TILES =
  'https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_without_PriUnk/MapServer/tile/{z}/{y}/{x}';

const ROADS_MIN_ZOOM = 11;

const POINT_COLOR: Record<string, string> = {
  trailhead: '#22c55e',
  parking: '#38bdf8',
  gate: '#f97316',
};

const STATE_CENTER: Record<string, [number, number]> = {
  WY: [42.9, -108.5],
  ID: [45.2, -114.5],
};

// States with a boundary source in /api/boundary. (Ownership + access are
// national, so this set is the only gate on whether a unit map renders.)
const SUPPORTED_STATES = new Set(['WY', 'ID']);

type ProxyFC = FeatureCollection & { label?: string; isRegion?: boolean };
type Identify = { lat: number; lng: number; label: string; isPublic: boolean | null; loading: boolean };
type AccessPoint = { lat: number; lng: number; type: string; label: string; name: string | null };

function stateCode(state: string): string {
  const s = (state || '').trim().toUpperCase();
  if (s === 'WYOMING') return 'WY';
  if (s === 'IDAHO') return 'ID';
  return s;
}

// Min/max lng/lat over a FeatureCollection → [south, west, north, east].
function bboxOf(fc: FeatureCollection): [number, number, number, number] | null {
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
  fc.features.forEach((f) => f.geometry && walk((f.geometry as { coordinates: unknown }).coordinates));
  return any ? [s, w, n, e] : null;
}

// Tap-to-identify: on map click, ask /api/ownership who manages that spot.
function ClickIdentify({ onResult }: { onResult: (i: Identify) => void }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      onResult({ lat, lng, label: 'Checking ownership…', isPublic: null, loading: true });
      try {
        const r = await fetch(`/api/ownership?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`);
        const j = await r.json();
        const label = j.unitName ? `${j.agency} — ${j.unitName}` : j.agency;
        onResult({ lat, lng, label, isPublic: j.isPublic ?? null, loading: false });
      } catch {
        onResult({ lat, lng, label: 'Lookup failed — try again', isPublic: null, loading: false });
      }
    },
  });
  return null;
}

// Roads/trails for the current viewport, refetched on pan/zoom, gated below
// ROADS_MIN_ZOOM so we never pull a whole unit's road network at once.
function RoadsLayer({ onStatus }: { onStatus: (tooFar: boolean) => void }) {
  const map = useMap();
  const [roads, setRoads] = useState<FeatureCollection | null>(null);
  const [version, setVersion] = useState(0);
  const verRef = useRef(0);

  const load = useCallback(() => {
    if (map.getZoom() < ROADS_MIN_ZOOM) { onStatus(true); setRoads(null); return; }
    onStatus(false);
    const b = map.getBounds();
    const bbox = `${b.getSouth().toFixed(4)},${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)}`;
    const myVer = ++verRef.current;
    fetch(`/api/access?kind=roads&bbox=${bbox}`)
      .then((r) => r.json())
      .then((j) => { if (myVer === verRef.current) { setRoads(j); setVersion(myVer); } })
      .catch(() => {});
  }, [map, onStatus]);

  useEffect(() => { load(); }, [load]);
  useMapEvents({ moveend: load, zoomend: load });

  if (!roads) return null;
  return <GeoJSON key={version} data={roads} style={{ color: '#fcd34d', weight: 1.5, opacity: 0.9 }} />;
}

// Fit the map to the boundary once it renders.
function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24] });
  }, [data, map]);
  return null;
}

const Placeholder = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[480px] w-full flex items-center justify-center bg-zinc-950 text-center px-8">
    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-relaxed max-w-md">
      {children}
    </p>
  </div>
);

const TogglePill = ({ on, color, label, onClick }: { on: boolean; color: string; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border backdrop-blur transition-colors ${
      on ? 'bg-black/80 border-zinc-600' : 'bg-black/50 border-zinc-800 opacity-60'
    }`}
  >
    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: on ? color : '#52525b' }} />
    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-200 leading-none">{label}</span>
  </button>
);

export default function UnitMap({ unit, state, species = '' }: { unit: string; state: string; species?: string }) {
  const sc = stateCode(state);
  const supported = SUPPORTED_STATES.has(sc);

  const [boundary, setBoundary] = useState<ProxyFC | null>(null);
  const [boundaryErr, setBoundaryErr] = useState(false);
  const [identify, setIdentify] = useState<Identify | null>(null);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [showOwnership, setShowOwnership] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showRoads, setShowRoads] = useState(false);
  const [roadsTooFar, setRoadsTooFar] = useState(false);

  // Fetch this unit's boundary on demand.
  useEffect(() => {
    if (!supported || !unit) { setBoundary(null); return; }
    let alive = true;
    setBoundary(null);
    setBoundaryErr(false);
    fetch(`/api/boundary?state=${sc}&species=${encodeURIComponent(species)}&unit=${encodeURIComponent(unit)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.features?.length) setBoundary(j);
        else setBoundaryErr(true);
      })
      .catch(() => { if (alive) setBoundaryErr(true); });
    return () => { alive = false; };
  }, [supported, sc, species, unit]);

  const isRegion = !!boundary?.isRegion;

  const unitLabel = sc === 'WY'
    ? (isRegion ? `Region ${unit}` : `Area ${unit}`)
    : `Unit ${unit}`;

  const subLabel = useMemo(() => {
    if (!boundary?.features.length) return '';
    const p = (boundary.features[0]?.properties || {}) as Record<string, unknown>;
    if (isRegion) return `${boundary.features.length} hunt areas`;
    return String(p.HUNTNAME ?? p.Elk_Zone ?? boundary.label ?? '');
  }, [boundary, isRegion]);

  const unitBbox = useMemo(() => (boundary ? bboxOf(boundary) : null), [boundary]);

  // Load access points (trailheads/parking/gates) for the unit's extent.
  useEffect(() => {
    if (!unitBbox) { setAccessPoints([]); return; }
    let alive = true;
    const [s, w, n, e] = unitBbox;
    fetch(`/api/access?kind=points&bbox=${s},${w},${n},${e}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setAccessPoints(j.points || []); })
      .catch(() => { if (alive) setAccessPoints([]); });
    return () => { alive = false; };
  }, [unitBbox]);

  if (!supported) {
    return <Placeholder>Boundary &amp; access data is available for Wyoming and Idaho so far. {state} maps are coming as the pipeline backfills more states.</Placeholder>;
  }
  if (!boundary && !boundaryErr) return <Placeholder>Loading unit boundary…</Placeholder>;

  const center = STATE_CENTER[sc] || [44, -113];

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: 480, width: '100%' }}
        className="bg-zinc-950"
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='Imagery &copy; Esri | Land status &copy; BLM | Roads &amp; access &copy; OpenStreetMap'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />

        {showOwnership && (
          <TileLayer url={OWNERSHIP_TILES} opacity={0.5} maxNativeZoom={14} maxZoom={18} />
        )}

        {showRoads && <RoadsLayer onStatus={setRoadsTooFar} />}

        {boundary && boundary.features.length > 0 && (
          <>
            <GeoJSON
              key={`${sc}-${species}-${unit}`}
              data={boundary}
              style={{ color: '#f59e0b', weight: 3, fillColor: '#f59e0b', fillOpacity: 0.06 }}
            />
            <FitBounds data={boundary} />
          </>
        )}

        {showPoints && accessPoints.map((p, i) => (
          <CircleMarker
            key={`${p.type}-${i}`}
            center={[p.lat, p.lng]}
            radius={5}
            pathOptions={{ color: '#000', weight: 1, fillColor: POINT_COLOR[p.type] || '#38bdf8', fillOpacity: 0.95 }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                setIdentify({ lat: p.lat, lng: p.lng, label: p.name ? `${p.label}: ${p.name}` : p.label, isPublic: null, loading: false });
              },
            }}
          />
        ))}

        <ClickIdentify onResult={setIdentify} />
        {identify && (
          <CircleMarker
            center={[identify.lat, identify.lng]}
            radius={6}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }}
          />
        )}
      </MapContainer>

      {/* Unit label */}
      <div className="absolute top-3 left-3 z-[400] bg-black/80 backdrop-blur px-3 py-2 rounded-lg border border-amber-700/40">
        <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 leading-none">{unitLabel}</p>
        {subLabel && <p className="text-[9px] font-bold uppercase text-zinc-400 mt-1 leading-none">{subLabel}</p>}
      </div>

      {/* Layer toggles */}
      <div className="absolute top-16 left-3 z-[400] flex flex-col gap-1.5 items-start">
        <TogglePill on={showOwnership} color="#f59e0b" label="Public land" onClick={() => setShowOwnership((v) => !v)} />
        <TogglePill on={showPoints} color="#38bdf8" label={`Access pts${accessPoints.length ? ` (${accessPoints.length})` : ''}`} onClick={() => setShowPoints((v) => !v)} />
        <TogglePill on={showRoads} color="#fcd34d" label="Roads" onClick={() => setShowRoads((v) => !v)} />
      </div>

      {boundaryErr && (
        <div className="absolute top-3 right-14 z-[400] bg-black/80 backdrop-blur px-3 py-2 rounded-lg border border-zinc-700 max-w-[220px]">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Couldn&apos;t locate boundary for &ldquo;{unit}&rdquo; in {sc} — showing state overview</p>
        </div>
      )}

      {/* Roads zoom hint */}
      {showRoads && roadsTooFar && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[400] bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-yellow-700/40 pointer-events-none">
          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500">Zoom in to load roads &amp; trails</p>
        </div>
      )}

      {/* Tap-to-identify result */}
      {identify && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] flex justify-center pointer-events-none">
          <div className={`pointer-events-auto bg-black/85 backdrop-blur px-4 py-2.5 rounded-xl border flex items-center gap-3 shadow-2xl ${
            identify.isPublic === true ? 'border-green-700/60' : identify.isPublic === false ? 'border-red-800/50' : 'border-zinc-700'
          }`}>
            {!identify.loading && identify.isPublic !== null && (
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${identify.isPublic ? 'bg-green-500' : 'bg-red-500'}`} />
            )}
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 leading-none mb-1">
                {identify.loading ? 'Identifying' : identify.isPublic === true ? 'Public Land' : identify.isPublic === false ? 'Not Public' : 'Access Point'}
              </p>
              <p className="text-[11px] font-bold text-zinc-100 leading-none">{identify.label}</p>
            </div>
            <button
              type="button"
              onClick={() => setIdentify(null)}
              className="text-zinc-500 hover:text-white font-black leading-none text-base ml-1"
              aria-label="Dismiss"
            >×</button>
          </div>
        </div>
      )}

      {/* Legend / instruction */}
      {!identify && (
        <div className="absolute bottom-3 right-3 z-[400] bg-black/75 backdrop-blur px-3 py-2 rounded-lg border border-zinc-800 pointer-events-none">
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 leading-relaxed">
            <span className="text-amber-500">Shaded</span> = public · <span style={{ color: '#38bdf8' }}>●</span> parking · <span style={{ color: '#f97316' }}>●</span> gate · <span style={{ color: '#22c55e' }}>●</span> trailhead<br />
            Tap any spot for the managing agency
          </p>
        </div>
      )}
    </div>
  );
}
