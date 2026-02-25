"use client";

interface MapViewProps {
  coords: { lat: number; lng: number };
  label: string;
}

export default function MapView({ coords, label }: MapViewProps) {
  // Use the environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  
  if (!apiKey) {
    return (
      <div className="w-full h-full bg-[#0c0a09] flex items-center justify-center border border-stone-800">
        <span className="text-red-500 font-mono text-xs">MISSING MAP API KEY</span>
      </div>
    );
  }

  const { lat, lng } = coords;
  const zoom = 11;
  const size = "640x640";

  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&key=${apiKey}&scale=2`;
  const interactiveLink = `https://www.google.com/maps/@${lat},${lng},${zoom}z/data=!3m1!1e3`;

  return (
    <div className="w-full h-full bg-[#0c0a09] border border-stone-800 relative group overflow-hidden">
      <a href={interactiveLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={staticMapUrl} 
          alt={`Satellite view of ${label}`} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 grayscale-[20%] group-hover:grayscale-0"
        />
        
        <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
           <span className="text-[10px] font-mono text-red-500 font-bold bg-black/70 px-2 py-1 border-l-2 border-red-500 backdrop-blur-sm">
             LIVE SATELLITE FEED // ACTIVE
           </span>
           <span className="text-[9px] font-mono text-stone-300 bg-black/70 px-2 py-1 backdrop-blur-sm">
             LAT: {lat.toFixed(4)} // LNG: {lng.toFixed(4)}
           </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="w-[1px] h-20 bg-white/50"></div>
            <div className="w-20 h-[1px] bg-white/50 absolute"></div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40">
             <span className="bg-[#c5a358] text-[#1c1917] px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(197,163,88,0.4)] transform translate-y-4 group-hover:translate-y-0 transition-transform border border-[#c5a358]">
                LAUNCH INTERACTIVE MAP ↗
             </span>
        </div>
      </a>
    </div>
  );
}