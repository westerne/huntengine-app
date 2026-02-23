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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMacro = async () => {
    if (!formData.state || !formData.unit || !formData.species) {
      alert("Please enter State, Unit, and Species.");
      return;
    }
    setLoading(true);
    setMacroResult(''); 
    setMicroResult('');
    setGearResult('');
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        body: JSON.stringify({ mode: 'MACRO', formData }),
      });
      const data = await res.json();
      setMacroResult(data.strategy);
    } catch (err) {
      setMacroResult("Failed to generate brief.");
    }
    setLoading(false);
  };

  const handleDeepDive = async (mode: 'MICRO' | 'GEAR') => {
    setLoading(true);
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        body: JSON.stringify({ 
          mode: mode, 
          formData, 
          context: macroResult 
        }),
      });
      const data = await res.json();
      if (mode === 'MICRO') setMicroResult(data.strategy);
      if (mode === 'GEAR') setGearResult(data.strategy);
      
      // Auto-scroll to the new result
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error("Deep dive failed.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-200 p-6 pb-32 font-sans">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-stone-900 p-6 rounded border border-stone-800 shadow-xl">
            <h2 className="text-orange-500 font-bold uppercase text-[10px] tracking-widest border-b border-stone-800 pb-2 mb-4 italic">Mission Target</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <input name="state" placeholder="State" className="bg-stone-950 p-2 rounded border border-stone-800 text-xs outline-none" onChange={handleChange} />
                <input name="unit" placeholder="Unit" className="bg-stone-950 p-2 rounded border border-stone-800 text-xs outline-none" onChange={handleChange} />
              </div>
              <input name="species" placeholder="Species" className="w-full bg-stone-950 p-2 rounded border border-stone-800 text-xs outline-none" onChange={handleChange} />
              
              <div className="grid grid-cols-2 gap-2">
                <select name="weapon" className="bg-stone-950 p-2 rounded border border-stone-800 text-xs text-white" onChange={handleChange}>
                  <option value="Rifle">Rifle</option>
                  <option value="Archery">Archery</option>
                  <option value="Muzzleloader">Muzzleloader</option>
                </select>
                <input name="huntDates" placeholder="Dates" className="bg-stone-950 p-2 rounded border border-stone-800 text-xs outline-none" onChange={handleChange} />
              </div>

              <div>
                <label className="text-stone-500 text-[9px] uppercase font-bold mb-1 block">Harvest Objective</label>
                <select name="harvestObjective" className="w-full bg-stone-950 p-2 rounded border border-stone-800 text-xs text-white" onChange={handleChange}>
                  <option>Mature Buck/Bull</option>
                  <option>Any Legal Animal</option>
                  <option>Trophy Class Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input name="groupSize" type="number" placeholder="Group Size" className="bg-stone-950 p-2 rounded border border-stone-800 text-xs outline-none" onChange={handleChange} />
                <div className="flex items-center gap-2 px-1">
                  <label className="flex items-center gap-1 text-[9px] font-bold uppercase"><input type="checkbox" name="atv" onChange={handleChange} /> ATV</label>
                  <label className="flex items-center gap-1 text-[9px] font-bold uppercase"><input type="checkbox" name="livestock" onChange={handleChange} /> Stock</label>
                </div>
              </div>

              <button onClick={handleMacro} disabled={loading} className="w-full bg-orange-600 font-black py-4 rounded uppercase text-xs tracking-widest hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-900/20">
                {loading && !macroResult ? 'Analyzing Unit...' : 'Generate Macro Brief'}
              </button>
            </div>
          </div>
        </div>

        {/* OUTPUT AREA */}
        <div className="lg:col-span-3 space-y-8">
          {macroResult && (
            <div className="bg-stone-900 p-10 rounded border border-stone-800 shadow-2xl animate-in fade-in">
              <div className="flex justify-between items-center mb-6 border-b border-stone-800 pb-2">
                <h2 className="text-orange-500 font-black uppercase text-xl italic tracking-tighter">Macro Unit Brief</h2>
                <a 
                  href={`https://www.google.com/maps/search/${formData.state}+Unit+${formData.unit}+hunting+area`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold uppercase bg-stone-950 border border-stone-700 px-4 py-2 rounded hover:border-orange-600 hover:text-orange-500 transition-all"
                >
                  View Unit on Google Maps ↗
                </a>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-stone-200 text-lg">{macroResult}</div>
            </div>
          )}

          {microResult && (
            <div className="bg-stone-900 p-10 rounded border-t-4 border-orange-600 shadow-2xl animate-in slide-in-from-bottom-6 duration-700">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-white font-black uppercase text-xl italic tracking-tighter">Tactical Mission Plan</h2>
                <button onClick={() => window.print()} className="text-[10px] font-bold uppercase border border-stone-700 px-4 py-2 rounded hover:bg-white hover:text-black transition-all">
                  Print Plan PDF
                </button>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-stone-200 text-lg">{microResult}</div>
            </div>
          )}

          {gearResult && (
            <div className="bg-stone-800/40 p-10 rounded border border-stone-700 shadow-2xl animate-in slide-in-from-bottom-6 duration-700">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-white font-black uppercase text-xl italic tracking-tighter">Hyper-Detailed Gear List</h2>
                <button onClick={() => window.print()} className="text-[10px] font-bold uppercase border border-stone-700 px-4 py-2 rounded hover:bg-white hover:text-black transition-all">
                  Print Gear PDF
                </button>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-stone-200 text-lg">{gearResult}</div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY COMMAND BAR */}
      {macroResult && (
        <div className="fixed bottom-0 left-0 right-0 bg-stone-950/80 backdrop-blur-md border-t border-stone-800 p-4 z-50 animate-in slide-in-from-bottom-full duration-500">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="hidden md:block">
              <p className="text-orange-500 font-black uppercase text-[10px] tracking-widest italic">Mission Intelligence Active</p>
              <p className="text-stone-500 text-[9px] uppercase font-bold">{formData.state} Unit {formData.unit} | {formData.species}</p>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => handleDeepDive('MICRO')} 
                disabled={loading}
                className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-3 rounded uppercase text-[11px] tracking-widest transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Tactical Mission Plan"}
              </button>
              <button 
                onClick={() => handleDeepDive('GEAR')} 
                disabled={loading}
                className="flex-1 md:flex-none bg-stone-800 hover:bg-stone-700 text-white font-black px-8 py-3 rounded uppercase text-[11px] tracking-widest border border-stone-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Detailed Gear List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}