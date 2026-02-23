"use client";
import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    state: '',
    unit: '',
    species: '',
    weapon: 'Rifle',
    huntDates: '',
    groupSize: '1',
    atv: false,
    livestock: false,
    physicalAbility: 'Average',
    proficiency: 'Intermediate',
    harvestObjective: 'Mature Buck/Bull'
  });
  
  const [macroResult, setMacroResult] = useState('');
  const [microResult, setMicroResult] = useState('');
  const [gearResult, setGearResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [betaCode, setBetaCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMacro = async () => {
    if (betaCode !== 'SCOUT2026') { 
      alert("Invalid Beta Access Code.");
      return;
    }
    setLoading(true);
    setMacroResult(''); setMicroResult(''); setGearResult('');
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        body: JSON.stringify({ mode: 'MACRO', formData }),
      });
      const data = await res.json();
      setMacroResult(data.strategy);
    } catch (err) {
      setMacroResult("Uplink Interrupted.");
    }
    setLoading(false);
  };

  const handleDeepDive = async (mode: 'MICRO' | 'GEAR') => {
    setLoading(true);
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        body: JSON.stringify({ mode, formData, context: macroResult }),
      });
      const data = await res.json();
      if (mode === 'MICRO') setMicroResult(data.strategy);
      if (mode === 'GEAR') setGearResult(data.strategy);
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) {
      console.error("Deep dive failed.");
    }
    setLoading(false);
  };

  // CLEANING FUNCTION: Removes AI Markdown artifacts (asterisks)
  const scrub = (text: string) => text.replace(/\*/g, '');

// UPDATED GOOGLE EARTH LOGIC: Removed hardcoded coordinates to prevent "Kansas Jump"
  const getMapLink = () => {
    const query = encodeURIComponent(`${formData.state} Unit ${formData.unit} hunting area`);
    // 't=k' forces Satellite view
    // Removing the @coordinates allows Google to auto-center on your specific search query
    return `https://www.google.com/maps/search/${query}?t=k`;
  };

  return (
    <main className="min-h-screen bg-[#00eadc] text-[#1c1917] p-6 pb-32 font-sans antialiased">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#1c1917] p-6 rounded-none border-b-4 border-[#c5a358] shadow-2xl">
            <h2 className="text-[#00eadc] font-black uppercase text-[12px] tracking-[0.2em] border-b border-stone-800 pb-3 mb-6 flex justify-between items-center">
              <span>HUNT INFO, PREFERENCES, AND PLANS</span>
              <span className="w-2 h-2 bg-[#00eadc] rounded-full animate-pulse"></span>
            </h2>
            
            <div className="space-y-4">
              <input 
                type="password" 
                placeholder="BETA ACCESS CODE" 
                className="w-full bg-[#0c0a09] p-3 rounded-none border border-[#00eadc]/20 text-[11px] font-bold outline-none focus:border-[#00eadc] transition-all uppercase text-[#00eadc] placeholder:text-stone-700" 
                onChange={(e) => setBetaCode(e.target.value)} 
              />
              
              <div className="grid grid-cols-2 gap-2">
                <input name="state" placeholder="STATE" className="bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold outline-none focus:border-[#00eadc] uppercase text-white placeholder:text-stone-600" onChange={handleChange} />
                <input name="unit" placeholder="UNIT" className="bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold outline-none focus:border-[#00eadc] uppercase text-white placeholder:text-stone-600" onChange={handleChange} />
              </div>
              
              <input name="species" placeholder="TARGET SPECIES" className="w-full bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold outline-none focus:border-[#00eadc] uppercase text-white placeholder:text-stone-600" onChange={handleChange} />
              
              <div className="grid grid-cols-2 gap-2">
                <select name="weapon" className="bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange}>
                  <option value="Rifle">Rifle</option>
                  <option value="Archery">Archery</option>
                  <option value="Muzzleloader">Muzzleloader</option>
                </select>
                <input name="huntDates" placeholder="DATES" className="bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold outline-none uppercase text-white placeholder:text-stone-600" onChange={handleChange} />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 text-[9px] uppercase font-black tracking-widest">Harvest Objective</label>
                <select name="harvestObjective" className="w-full bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold text-white uppercase outline-none focus:border-[#00eadc]" onChange={handleChange}>
                  <option>Mature Buck/Bull</option>
                  <option>Any Legal Animal</option>
                  <option>Trophy Class Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input name="groupSize" type="number" placeholder="GROUP SIZE" className="bg-[#0c0a09] p-3 rounded-none border border-stone-800 text-xs font-bold outline-none uppercase text-white placeholder:text-stone-600" onChange={handleChange} />
                <div className="flex flex-col justify-center gap-1 px-2 border border-stone-800">
                    <label className="flex items-center gap-2 text-[9px] font-black text-stone-400 uppercase cursor-pointer">
                      <input type="checkbox" name="atv" className="accent-[#00eadc]" onChange={handleChange} /> ATV/OHV
                    </label>
                    <label className="flex items-center gap-2 text-[9px] font-black text-stone-400 uppercase cursor-pointer">
                      <input type="checkbox" name="livestock" className="accent-[#00eadc]" onChange={handleChange} /> STOCK
                    </label>
                </div>
              </div>

              <button 
                onClick={handleMacro} 
                disabled={loading} 
                className="w-full bg-[#c5a358] text-[#1c1917] font-black py-4 rounded-none uppercase text-[12px] tracking-[0.1em] hover:bg-[#d4b97a] transition-all shadow-lg disabled:opacity-50"
              >
                {loading && !macroResult ? '...CONNECTING TO HUNTENGINE.AI...' : 'START YOUR HUNT PLAN'}
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT AREA */}
        <div className="lg:col-span-3 space-y-8">
          {macroResult && (
            <div className="bg-[#1c1917] p-10 rounded-none border-t-8 border-[#c5a358] shadow-2xl animate-in fade-in">
              <div className="flex justify-between items-center mb-8 border-b border-stone-800 pb-4">
                <h2 className="text-[#00eadc] font-black uppercase text-2xl tracking-tight">I. STRATEGIC UNIT BRIEF</h2>
                <a 
                  href={getMapLink()}
                  target="_blank"
                  className="text-[10px] font-black uppercase bg-[#0c0a09] border border-stone-700 px-5 py-2 hover:text-[#00eadc] transition-all text-white tracking-widest"
                >
                  VIEW REGION IN GOOGLE EARTH ↗
                </a>
              </div>
              <div className="whitespace-pre-wrap leading-[1.7] text-stone-200 text-lg font-medium">
                {scrub(macroResult)}
              </div>
            </div>
          )}

          {microResult && (
            <div className="bg-[#1c1917] p-10 rounded-none border-l-8 border-[#00eadc] shadow-2xl animate-in slide-in-from-bottom-6">
              <h2 className="text-[#00eadc] font-black uppercase text-2xl tracking-tight mb-8 border-b border-stone-800 pb-4">II. TACTICAL HUNT PLAN</h2>
              <div className="whitespace-pre-wrap leading-[1.7] text-stone-200 text-lg font-medium">
                {scrub(microResult)}
              </div>
            </div>
          )}

          {gearResult && (
            <div className="bg-[#0c0a09] p-10 rounded-none border-l-8 border-[#c5a358] shadow-2xl animate-in slide-in-from-bottom-6">
              <h2 className="text-[#c5a358] font-black uppercase text-2xl tracking-tight mb-8 border-b border-stone-800 pb-4">III. FINALIZED LOADOUT</h2>
              <div className="whitespace-pre-wrap leading-[1.7] text-stone-400 text-lg font-medium">
                {scrub(gearResult)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY COMMAND BAR */}
      {macroResult && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1c1917]/98 backdrop-blur-xl border-t-4 border-[#c5a358] p-5 z-50">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-end gap-6">
            <button 
              onClick={() => handleDeepDive('MICRO')} 
              disabled={loading}
              className="w-full md:w-80 bg-[#00eadc] text-[#1c1917] font-black py-5 rounded-none uppercase text-[12px] tracking-[0.15em] hover:bg-[#33f0e5] transition-all disabled:opacity-50 shadow-xl"
            >
              {loading ? "CALCULATING..." : "GENERATE 3-DAY HUNT PLAN"}
            </button>
            <button 
              onClick={() => handleDeepDive('GEAR')} 
              disabled={loading}
              className="w-full md:w-80 bg-[#c5a358] text-[#1c1917] font-black py-5 rounded-none uppercase text-[12px] tracking-[0.15em] hover:bg-[#d4b97a] transition-all disabled:opacity-50 shadow-xl"
            >
              {loading ? "CALCULATING..." : "GENERATE GEAR LIST"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}