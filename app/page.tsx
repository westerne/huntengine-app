"use client";
import { useState } from 'react';
import dynamic from 'next/dynamic';

// DYNAMIC IMPORT: Loads the map only when needed to save bandwidth
// Note: We assume MapView.tsx is in the 'app' folder. 
// If you put it in 'app/api/strategy', change this path to './api/strategy/MapView'
const MapView = dynamic(() => import('./MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#0c0a09] animate-pulse" />
});

export default function Home() {
  const [formData, setFormData] = useState({
    state: '', unit: '', species: '', weapon: 'Rifle',
    huntDates: '', groupSize: '1', atv: false, livestock: false,
    physicalAbility: 'Average', proficiency: 'Intermediate',
    harvestObjective: 'Mature Buck/Bull', notes: '' 
  });
  
  const [macroResult, setMacroResult] = useState('');
  const [microResult, setMicroResult] = useState('');
  const [gearResult, setGearResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [betaCode, setBetaCode] = useState('');
  
  // State to hold the specific coordinates returned by your smart route.ts
  const [unitCoords, setUnitCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePrint = () => window.print();

  const handleMacro = async () => {
    if (betaCode.trim().toUpperCase() !== 'SCOUT2026') { alert("Invalid Code."); return; }
    setLoading(true);
    setMacroResult(''); setMicroResult(''); setGearResult(''); setUnitCoords(null);
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'MACRO', formData }),
      });
      const data = await res.json();
      setMacroResult(data.strategy);
      
      // CAPTURE COORDINATES: This connects your backend logic to the frontend map
      if (data.coords) {
          setUnitCoords(data.coords);
      }
    } catch (err) { setMacroResult("Uplink Failed."); }
    setLoading(false);
  };

  const handleDeepDive = async (mode: 'MICRO' | 'GEAR') => {
    setLoading(true);
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, formData, context: macroResult }),
      });
      const data = await res.json();
      if (mode === 'MICRO') setMicroResult(data.strategy);
      if (mode === 'GEAR') setGearResult(data.strategy);
    } catch (err) { console.error("Failed."); }
    setLoading(false);
  };

  const scrub = (text: string) => text.replace(/\*/g, '');

  const getFallbackMapLink = () => {
    const query = encodeURIComponent(`${formData.state} Unit ${formData.unit} hunting`);
    return `http://googleusercontent.com/maps.google.com/search?q=${query}&maptype=satellite`;
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900 p-6 pb-32 font-sans antialiased">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="bg-[#1c1917] p-6 border-b-4 border-[#c5a358] shadow-2xl">
            <h2 className="text-[#00eadc] font-black uppercase text-[12px] tracking-widest border-b border-stone-800 pb-3 mb-6">HUNT PARAMETERS</h2>
            
            <div className="space-y-4">
              <input type="password" placeholder="BETA ACCESS CODE" className="w-full bg-[#0c0a09] p-3 border border-[#00eadc]/20 text-xs font-bold text-[#00eadc] uppercase outline-none focus:border-[#00eadc]" onChange={(e) => setBetaCode(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-2">
                <input name="state" placeholder="STATE" className="bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange} />
                <input name="unit" placeholder="UNIT" className="bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange} />
              </div>

              <input name="species" placeholder="TARGET SPECIES" className="w-full bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange} />

              <div className="grid grid-cols-2 gap-2">
                <select name="weapon" className="bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange}>
                  <option value="Rifle">Rifle</option>
                  <option value="Archery">Archery</option>
                  <option value="Muzzleloader">Muzzleloader</option>
                </select>
                <input name="huntDates" placeholder="DATES" className="bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 text-[9px] uppercase font-black tracking-widest px-1">Harvest Objective</label>
                <select name="harvestObjective" className="w-full bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange}>
                  <option>Mature Buck/Bull</option>
                  <option>Any Legal Animal</option>
                  <option>Trophy Class Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input name="groupSize" type="number" placeholder="GROUP SIZE" className="bg-[#0c0a09] p-3 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange} />
                <div className="flex flex-col justify-center gap-1 px-2 border border-stone-800">
                    <label className="flex items-center gap-2 text-[9px] font-black text-stone-400 uppercase cursor-pointer">
                      <input type="checkbox" name="atv" className="accent-[#00eadc]" onChange={handleChange} /> ATV/OHV
                    </label>
                    <label className="flex items-center gap-2 text-[9px] font-black text-stone-400 uppercase cursor-pointer">
                      <input type="checkbox" name="livestock" className="accent-[#00eadc]" onChange={handleChange} /> STOCK
                    </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 text-[9px] uppercase font-black tracking-widest px-1">Field Notes / User Intel</label>
                <textarea name="notes" placeholder="EX: TRAIL CAM SPOTS, SPECIFIC CREEKS..." className="w-full bg-[#0c0a09] p-3 h-24 border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc] resize-none" onChange={handleChange} />
              </div>

              <button onClick={handleMacro} disabled={loading} className="w-full bg-[#c5a358] text-[#1c1917] font-black py-4 uppercase text-xs tracking-widest hover:bg-[#d4b97a] transition-all shadow-lg disabled:opacity-50">
                {loading && !macroResult ? '...CONNECTING TO HUNTENGINE.AI...' : 'START YOUR HUNT PLAN'}
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT AREA */}
        <div className="lg:col-span-3 space-y-8">
          {macroResult && (
            <div className="bg-[#1c1917] p-10 border-t-8 border-[#c5a358] shadow-2xl animate-in fade-in">
              <div className="flex justify-between items-center mb-8 border-b border-stone-800 pb-4">
                <h2 className="text-[#00eadc] font-black uppercase text-2xl tracking-tight">I. STRATEGIC UNIT BRIEF</h2>
                <a href={getFallbackMapLink()} target="_blank" className="text-[10px] font-black uppercase bg-[#0c0a09] border border-stone-700 px-5 py-2 hover:text-[#00eadc] text-white">OPEN EXTERNAL MAP ↗</a>
              </div>
              <div className="whitespace-pre-wrap leading-[1.7] text-stone-200 text-lg font-medium">{scrub(macroResult)}</div>
            </div>
          )}

          {/* THE NEW TACTICAL MAP VIEW */}
          {macroResult && (
            <div className="bg-[#1c1917] p-4 border border-stone-800 shadow-xl print:hidden animate-in fade-in">
              <h3 className="text-[#c5a358] font-black text-[11px] tracking-widest uppercase mb-3 px-2 flex items-center gap-2">
                 <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span> Live Satellite Uplink // {formData.species} Unit {formData.unit}
              </h3>
              <div className="w-full h-[550px] bg-stone-900 border border-stone-800 relative">
                 {unitCoords ? (
                   <MapView 
                      coords={unitCoords} 
                      label={`${formData.state} ${formData.unit}`}
                   />
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-stone-500 bg-[#0c0a09] gap-4">
                      <span className="text-4xl opacity-20">🛰️</span>
                      <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#c5a358]">NO SATELLITE LOCK</p>
                        <p className="text-[10px] text-stone-600 mt-1">Unit {formData.unit} coordinates not found in database.</p>
                      </div>
                      <a href={getFallbackMapLink()} target="_blank" className="text-[10px] text-[#00eadc] border-b border-[#00eadc] pb-0.5 hover:opacity-80">
                        TRY MANUAL SEARCH ↗
                      </a>
                   </div>
                 )}
              </div>
            </div>
          )}

          {microResult && (
            <div className="bg-[#1c1917] p-10 border-t-8 border-[#00eadc] shadow-2xl animate-in slide-in-from-bottom-6">
              <h2 className="text-[#c5a358] font-black uppercase text-2xl tracking-tight mb-8 border-b border-stone-800 pb-4">II. TACTICAL HUNT PLAN</h2>
              <div className="whitespace-pre-wrap leading-[1.7] text-stone-200 text-lg font-medium">{scrub(microResult)}</div>
            </div>
          )}

          {gearResult && (
            <div className="bg-[#1c1917] p-10 border-t-8 border-[#c5a358] shadow-2xl animate-in slide-in-from-bottom-6">
              <h2 className="text-[#c5a358] font-black uppercase text-2xl tracking-tight mb-8 border-b border-stone-800 pb-4">III. FINALIZED LOADOUT</h2>
              <div className="whitespace-pre-wrap leading-[1.7] text-stone-200 text-lg font-medium">{scrub(gearResult)}</div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY COMMAND BAR */}
      {macroResult && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1c1917]/95 border-t-4 border-[#c5a358] p-5 z-50 print:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-end gap-6">
            <button onClick={handlePrint} className="text-[#00eadc] font-black px-8 py-5 border border-[#00eadc]/30 hover:bg-stone-800 text-xs tracking-widest transition-all">PRINT/PDF</button>
            <button onClick={() => handleDeepDive('MICRO')} disabled={loading} className="w-full md:w-80 bg-[#00eadc] text-[#1c1917] font-black py-5 uppercase text-xs tracking-widest hover:bg-[#33f0e5] disabled:opacity-50 transition-all">GENERATE 72-HOUR PLAN</button>
            <button onClick={() => handleDeepDive('GEAR')} disabled={loading} className="w-full md:w-80 bg-[#c5a358] text-[#1c1917] font-black py-5 uppercase text-xs tracking-widest hover:bg-[#d4b97a] disabled:opacity-50 transition-all">GENERATE GEAR LIST</button>
          </div>
        </div>
      )}
    </main>
  );
}