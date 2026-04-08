"use client";
import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

setOptions({
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY as string,
  version: "weekly",
});

interface MapViewProps {
  coords: { lat: number; lng: number };
  label: string; // e.g., "Wyoming 143"
}

export default function MapView({ coords, label }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // 1. Stabilize primitives to prevent React Hook re-render loops
  const lat = coords?.lat ?? 42.5;
  const lng = coords?.lng ?? -108.5;

  useEffect(() => {
    const startUplink = async () => {
      try {
        const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;

        if (mapRef.current) {
          // 2. Initialize the Map
          const map = new Map(mapRef.current, {
            center: { lat, lng },
            zoom: 10,
            mapTypeId: "satellite",
            tilt: 45,
          });

          // 3. Load the GeoJSON file
          map.data.loadGeoJson("/Wyoming_Deer_Areas.geojson");

          // 4. AUTO-ZOOM LOGIC: Fly to the unit polygon once it's found
          map.data.addListener('addfeature', () => {
            const bounds = new window.google.maps.LatLngBounds();
            let hasMatch = false;
            
            map.data.forEach((feature) => {
              const featureUnit = String(feature.getProperty("HUNTAREA") || feature.getProperty("NAME") || "");
              const currentSearch = label.split(" ").pop() || "";
              
              if (featureUnit !== "" && featureUnit === currentSearch) {
                hasMatch = true;
                feature.getGeometry().forEachLatLng((ll) => {
                  bounds.extend(ll);
                });
              }
            });

            if (hasMatch) {
              map.fitBounds(bounds);
            }
          });

          // 5. HIGHLIGHTING LOGIC: Neon cyan for the active unit
          map.data.setStyle((feature) => {
            const featureUnit = String(feature.getProperty("HUNTAREA") || feature.getProperty("NAME") || "");
            const currentSearch = label.split(" ").pop() || "";
            const isActive = featureUnit !== "" && featureUnit === currentSearch;

            return {
              fillColor: isActive ? "#00eadc" : "transparent",
              fillOpacity: isActive ? 0.25 : 0,
              strokeColor: isActive ? "#00eadc" : "#ffffff",
              strokeWeight: isActive ? 3 : 0.5,
              strokeOpacity: isActive ? 1 : 0.2,
              visible: true,
            };
          });
        }
      } catch (error) {
        console.error("Satellite Uplink Failed:", error);
      }
    };

    startUplink();
  }, [lat, lng, label]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[550px] rounded-lg border border-white/10 bg-stone-950 shadow-2xl" 
    />
  );
}