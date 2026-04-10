'use client';

import React, { useState, useEffect } from 'react';

// --- Types ---
type FlowStep = 
  | 'entry' 
  | 'scout-1' | 'scout-2' | 'scout-3' // Find a Hunt steps
  | 'plan-1' | 'plan-2' | 'plan-3' | 'plan-4' // Plan a Hunt steps
  | 'recommendations' 
  | 'unit-brief' | 'hunt-plan' | 'gear-list';

type DrawTimeline = 'This Year' | '1-3 Years' | '5 Years' | '10+ Years';

type HuntPlannerState = {
  step: FlowStep;
  entryMode: 'has-tag' | 'needs-tag' | null;
  profile: {
    states: string[];
    species: string;
    residency: string;
    points: Record<string, number>;
    weapons: string[];
    huntStyles: string[];
    fitness: string;
    trophyQuality: string;
    seasons: string[];
    drawTimeline: DrawTimeline;
    unit: string;
    daysToHunt: string;
    scoutingAvailability: string;
    notes: string;
  };
  recommendations: any[];
  unitBrief: string | null;
  huntPlan: string | null;
  gearList: string | null;
  loading: boolean;
  loadingMessage: string;
  error: string | null;
};

const STATES = ['WY', 'CO', 'MT', 'ID', 'UT', 'NV', 'AZ', 'NM'];
const SPECIES = ['Mule Deer', 'Elk', 'Antelope', 'Moose', 'Bighorn Sheep', 'Mountain Goat'];
const WEAPON_OPTIONS = ['Any', 'Rifle', 'Archery', 'Muzzleloader'];
const FITNESS_LEVELS = ['Moderate', 'High', 'Elite'];
const STYLE_OPTIONS = ['Hotel/Town Based', 'Base Camp/Truck', 'Backcountry'];
const SEASON_WINDOWS = [
  { id: 'Early', label: 'Early (Aug-Sept)' },
  { id: 'Mid', label: 'Mid (Oct)' },
  { id: 'Late', label: 'Late (Nov)' }
];

export default function App() {
  const [state, setState] = useState<HuntPlannerState>({
    step: 'entry',
    entryMode: null,
    profile: {
      states: ['WY'],
      species: 'Mule Deer',
      residency: 'Resident',
      points: {},
      weapons: ['Any'],
      huntStyles: ['Backcountry'],
      fitness: 'High',
      trophyQuality: '170',
      seasons: ['Mid'],
      drawTimeline: 'This Year',
      unit: '',
      daysToHunt: '5',
      scoutingAvailability: 'Minimal',
      notes: '',
    },
    recommendations: [],
    unitBrief: null,
    huntPlan: null,
    gearList: null,
    loading: false,
    loadingMessage: '',
    error: null,
  });

  const trophyConfig: Record<string, { min: number; max: number; step: number; label: string } | null> = {
    'Elk': { min: 260, max: 380, step: 10, label: 'B&C Gross' },
    'Mule Deer': { min: 140, max: 200, step: 5, label: 'Typical Frames' },
    'Antelope': { min: 65, max: 80, step: 2, label: 'B&C Score' },
    'Bighorn Sheep': { min: 140, max: 180, step: 5, label: 'Total Score' },
    'Moose': null,
    'Mountain Goat': null,
  };

  // Residency & Points logic (Source of truth for draw types)
  useEffect(() => {
    const selState = state.profile.states[0];
    if (!selState) return;
    
    const isWyResidentNoPoints = selState === 'WY' && state.profile.residency === 'Resident' && (state.profile.species === 'Mule Deer' || state.profile.species === 'Antelope');
    const isIdaho = selState === 'ID';

    if ((isWyResidentNoPoints || isIdaho) && state.profile.points[selState] !== 0) {
      setState(s => ({
        ...s,
        profile: { ...s.profile, points: { ...s.profile.points, [selState]: 0 } }
      }));
    }
  }, [state.profile.residency, state.profile.species, state.profile.states]);

  const togglePreference = (field: 'weapons' | 'huntStyles' | 'seasons', value: string) => {
    setState(s => {
      let next = [...s.profile[field]];
      if (field === 'weapons') {
        if (value === 'Any') next = ['Any'];
        else {
          next = next.filter(v => v !== 'Any');
          next = next.includes(value) ? next.filter(v => v !== value) : [...next, value];
          if (next.length === 0) next = ['Any'];
        }
      } else {
        next = next.includes(value) ? next.filter(v => v !== value) : [...next, value];
      }
      return { ...s, profile: { ...s.profile, [field]: next } };
    });
  };

  const handleScoutSubmit = async () => {
    setState(s => ({ ...s, loading: true, loadingMessage: "Analyzing planning horizons...", error: null }));
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'SCOUT', formData: state.profile }),
      });
      const data = await res.json();
      setState(s => ({ ...s, recommendations: data.recommendations || [], step: 'recommendations', loading: false }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Analysis failed.' }));
    }
  };

  const handlePlanSubmit = async (customProfile?: any) => {
    const dataToSubmit = customProfile || state.profile;
    setState(s => ({ ...s, loading: true, loadingMessage: "Building Tactical Strategy...", error: null }));
    
    // Safety helper to format AI output correctly
    const formatValue = (val: any): string => {
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null) {
        return Object.entries(val)
          .map(([key, value]) => `${key.toUpperCase()}:\n${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`)
          .join('\n\n');
      }
      return String(val || '');
    };

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'FULL_SUITE', formData: dataToSubmit }),
      });
      const data = await res.json();
      setState(s => ({ 
        ...s, 
        unitBrief: formatValue(data.brief), 
        huntPlan: formatValue(data.tactical), 
        gearList: formatValue(data.gear), 
        step: 'unit-brief', 
        loading: false 
      }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Failed to build plan.' }));
    }
  };

  const ProgressBar = () => {
    const steps = state.entryMode === 'has-tag' 
      ? ['plan-1', 'plan-2', 'plan-3', 'plan-4'] 
      : ['scout-1', 'scout-2', 'scout-3'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex === -1) return null;

    return (
      <div className="flex gap-1 mb-8 max-w-xs mx-auto">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentIndex ? 'bg-amber-500' : 'bg-zinc-800'}`} />
        ))}
      </div>
    );
  };

  const TogglePill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${
        active ? 'bg-amber-700 border-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
      }`}
    >
      {label}
    </button>
  );

  const selState = state.profile.states[0];
  const isWyResidentNoPoints = selState === 'WY' && state.profile.residency === 'Resident' && (state.profile.species === 'Mule Deer' || state.profile.species === 'Antelope');
  const isIdaho = selState === 'ID';
  const noPointSystem = isWyResidentNoPoints || isIdaho;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500/30">
      {state.loading && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin mb-4" />
          <p className="text-amber-500 font-black uppercase tracking-[0.2em] animate-pulse text-xs">{state.loadingMessage}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        {state.step !== 'entry' && (
          <div className="flex items-center justify-center space-x-4 mb-8 text-[10px] uppercase tracking-widest font-black">
            <button className="text-zinc-600 hover:text-amber-500 transition-colors" onClick={() => setState(s => ({ ...s, step: 'entry', entryMode: null, unitBrief: null, recommendations: [], error: null }))}>START OVER</button>
            <span className="text-zinc-800">|</span>
            {['unit-brief', 'hunt-plan', 'gear-list'].includes(state.step) && (
               <button className="text-zinc-500 hover:text-white" onClick={() => setState(s => ({ ...s, step: s.entryMode === 'has-tag' ? 'plan-4' : 'recommendations' }))}>BACK</button>
            )}
          </div>
        )}

        {state.step === 'entry' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
            <h1 className="text-6xl font-black mb-16 tracking-tighter uppercase italic text-amber-500">HuntEngine</h1>
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl text-left">
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:border-amber-900/50 transition-all group">
                <h2 className="text-2xl font-black mb-2 italic text-zinc-300 uppercase tracking-tighter">Find a Hunt</h2>
                <p className="text-zinc-500 mb-8 text-sm">Analyze states and units based on points and trophy goals.</p>
                <button type="button" onClick={() => setState(s => ({ ...s, step: 'scout-1', entryMode: 'needs-tag' }))} className="w-full border-2 border-zinc-700 text-white py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Start Scouting</button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:border-amber-900/50 transition-all group">
                <h2 className="text-2xl font-black mb-2 italic text-amber-500 uppercase tracking-tighter">Plan a Hunt</h2>
                <p className="text-zinc-500 mb-8 text-sm">Already have a tag? Build your tactical 72-hour guide.</p>
                <button type="button" onClick={() => setState(s => ({ ...s, step: 'plan-1', entryMode: 'has-tag' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs transition-colors">Start Planning</button>
              </div>
            </div>
          </div>
        )}

        {/* FIND A HUNT: STEP 1 - BASIC INFO */}
        {state.step === 'scout-1' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Target State & Species</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-10">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Select State</label>
                <div className="flex flex-wrap gap-2">{STATES.map(st => <TogglePill key={st} label={st} active={state.profile.states.includes(st)} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, states: [st] }}))} />)}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Select Species</label>
                <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none focus:border-amber-600" value={state.profile.species} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, species: e.target.value }}))}>{SPECIES.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Residency</label>
                <div className="flex gap-4">
                  {['Resident', 'Non-Resident'].map(r => (
                    <button key={r} type="button" onClick={() => setState(s => ({ ...s, profile: { ...s.profile, residency: r as any }}))} className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs transition-all ${state.profile.residency === r ? 'bg-amber-700 border-amber-600 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => setState(s => ({ ...s, step: 'scout-2' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
            </div>
          </div>
        )}

        {/* FIND A HUNT: STEP 2 - POINTS & TROPHY & TIMELINE */}
        {state.step === 'scout-2' && (
          <div className="max-w-3xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Timeline & Goals</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-10">
              <div className="grid md:grid-cols-1 gap-6">
                <div className="bg-black p-6 rounded-2xl border border-zinc-800">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Current Points Held</label>
                  {noPointSystem ? (
                    <div className="bg-amber-900/20 border border-amber-900/40 p-4 rounded-xl text-center">
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Pure Random Draw Pool</p>
                      <p className="text-[8px] text-amber-600/80 font-bold uppercase mt-1">No point system applicable for this combination</p>
                    </div>
                  ) : (
                    <input type="number" className="bg-zinc-900 border border-zinc-700 w-full p-3 text-center rounded-xl text-amber-500 font-black text-2xl outline-none" value={state.profile.points[state.profile.states[0]] || 0} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, points: { ...s.profile.points, [state.profile.states[0]]: parseInt(e.target.value) || 0 }}}))} />
                  )}
                </div>
                <div className="bg-black p-6 rounded-2xl border border-zinc-800">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">When do you want to hunt this?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['This Year', '1-3 Years', '5 Years', '10+ Years'] as DrawTimeline[]).map(t => (
                      <button key={t} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, drawTimeline: t }}))} className={`py-3 rounded-xl border font-black uppercase text-[10px] transition-all ${state.profile.drawTimeline === t ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-900/50' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>{t}</button>
                    ))}
                  </div>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase mt-4 text-center">Selecting a longer horizon allows the engine to suggest units with higher trophy potential.</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Minimum Trophy Goal</label>
                {(() => {
                  const config = trophyConfig[state.profile.species];
                  if (!config) return <div className="p-6 bg-black rounded-xl text-zinc-600 text-[10px] font-black uppercase text-center">Score Tracking Restricted</div>;
                  const val = parseInt(state.profile.trophyQuality) || config.min;
                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-4xl font-black text-amber-500 italic">{val}"+</span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase">{config.label}</span>
                      </div>
                      <input type="range" min={config.min} max={config.max} step={config.step} value={val} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, trophyQuality: e.target.value }}))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setState(s => ({ ...s, step: 'scout-1' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
                <button onClick={() => setState(s => ({ ...s, step: 'scout-3' }))} className="flex-[2] bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
              </div>
            </div>
          </div>
        )}

        {/* FIND A HUNT: STEP 3 - PREFERENCES */}
        {state.step === 'scout-3' && (
          <div className="max-w-4xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Hunting Style</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
               <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Weapon Preference</label>
                    <div className="flex flex-wrap gap-2">{WEAPON_OPTIONS.map(w => <TogglePill key={w} label={w} active={state.profile.weapons.includes(w)} onClick={() => togglePreference('weapons', w)} />)}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Fitness Level</label>
                    <div className="flex flex-wrap gap-2">{FITNESS_LEVELS.map(f => <TogglePill key={f} label={f} active={state.profile.fitness === f} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, fitness: f }}))} />)}</div>
                  </div>
               </div>
               <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Hunt Style</label>
                    <div className="flex flex-col gap-2">{STYLE_OPTIONS.map(opt => <button key={opt} type="button" onClick={() => togglePreference('huntStyles', opt)} className={`p-4 text-left rounded-xl border transition-all text-[10px] font-black uppercase tracking-[0.1em] ${state.profile.huntStyles.includes(opt) ? 'bg-amber-900/20 border-amber-600 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}>{opt}</button>)}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Preferred Season</label>
                    <div className="flex flex-wrap gap-2">{SEASON_WINDOWS.map(sw => <TogglePill key={sw.id} label={sw.label} active={state.profile.seasons.includes(sw.id)} onClick={() => togglePreference('seasons', sw.id)} />)}</div>
                  </div>
               </div>
            </div>
            <div className="flex gap-4 max-w-md mx-auto">
              <button onClick={() => setState(s => ({ ...s, step: 'scout-2' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
              <button onClick={handleScoutSubmit} className="flex-[2] bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs shadow-xl shadow-amber-900/20">Find Units</button>
            </div>
          </div>
        )}

        {/* PLAN A HUNT: STEP 1 - TARGET UNIT */}
        {state.step === 'plan-1' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">The Tag</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">State</label>
                  <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={state.profile.states[0]} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, states: [e.target.value] }}))}>{STATES.map(st => <option key={st} value={st}>{st}</option>)}</select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Species</label>
                  <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={state.profile.species} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, species: e.target.value }}))}>{SPECIES.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Unit Name or Number</label>
                <input type="text" placeholder="e.g. 102 or Book Cliffs" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-100 font-black text-xl outline-none focus:border-amber-500" value={state.profile.unit} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, unit: e.target.value }}))} />
              </div>
              <button onClick={() => setState(s => ({ ...s, step: 'plan-2' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
            </div>
          </div>
        )}

        {/* PLAN A HUNT: STEP 2 - POINTS/RESIDENCY */}
        {state.step === 'plan-2' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Hunter Profile</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Residency</label>
                <div className="flex gap-4">
                  {['Resident', 'Non-Resident'].map(r => (
                    <button key={r} type="button" onClick={() => setState(s => ({ ...s, profile: { ...s.profile, residency: r as any }}))} className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs transition-all ${state.profile.residency === r ? 'bg-amber-700 border-amber-600 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="bg-black p-6 rounded-2xl border border-zinc-800">
                <div className="flex justify-between items-center">
                  <div><h4 className="font-black uppercase text-sm">Total Points</h4><p className="text-[10px] text-zinc-500 font-bold uppercase">Points held when you drew</p></div>
                  {noPointSystem ? (
                    <div className="bg-amber-900/20 border border-amber-900/40 px-4 py-2 rounded-xl text-center">
                      <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest leading-none">Random Draw</p>
                    </div>
                  ) : (
                    <input type="number" className="bg-zinc-900 border border-zinc-700 w-24 p-3 text-center rounded-xl text-amber-500 font-black text-2xl outline-none" value={state.profile.points[state.profile.states[0]] || 0} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, points: { ...s.profile.points, [state.profile.states[0]]: parseInt(e.target.value) || 0 }}}))} />
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setState(s => ({ ...s, step: 'plan-1' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
                <button onClick={() => setState(s => ({ ...s, step: 'plan-3' }))} className="flex-[2] bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
              </div>
            </div>
          </div>
        )}

        {/* PLAN A HUNT: STEP 3 - STYLE */}
        {state.step === 'plan-3' && (
          <div className="max-w-4xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Style & Weapon</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
               <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Weapon</label>
                    <div className="flex flex-wrap gap-2">{WEAPON_OPTIONS.map(w => <TogglePill key={w} label={w} active={state.profile.weapons.includes(w)} onClick={() => togglePreference('weapons', w)} />)}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Fitness</label>
                    <div className="flex flex-wrap gap-2">{FITNESS_LEVELS.map(f => <TogglePill key={f} label={f} active={state.profile.fitness === f} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, fitness: f }}))} />)}</div>
                  </div>
               </div>
               <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Style</label>
                    <div className="flex flex-col gap-2">{STYLE_OPTIONS.map(opt => <button key={opt} type="button" onClick={() => togglePreference('huntStyles', opt)} className={`p-4 text-left rounded-xl border transition-all text-[10px] font-black uppercase tracking-[0.1em] ${state.profile.huntStyles.includes(opt) ? 'bg-amber-900/20 border-amber-600 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}>{opt}</button>)}</div>
                  </div>
               </div>
            </div>
            <div className="flex gap-4 max-w-md mx-auto">
              <button onClick={() => setState(s => ({ ...s, step: 'plan-2' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
              <button onClick={() => setState(s => ({ ...s, step: 'plan-4' }))} className="flex-[2] bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
            </div>
          </div>
        )}

        {/* PLAN A HUNT: STEP 4 - CONTEXT */}
        {state.step === 'plan-4' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Logistics & Context</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Days to Hunt</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold outline-none" value={state.profile.daysToHunt} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, daysToHunt: e.target.value }}))} />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Scouting</label>
                   <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={state.profile.scoutingAvailability} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, scoutingAvailability: e.target.value }}))}>
                     {['None', 'Minimal', 'Several Days', 'Local'].map(v => <option key={v} value={v}>{v}</option>)}
                   </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Additional Info</label>
                <textarea rows={5} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold outline-none focus:border-amber-500" placeholder="I've looked at the north ridge, I usually access from the south..." value={state.profile.notes} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, notes: e.target.value }}))} />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setState(s => ({ ...s, step: 'plan-3' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
                <button onClick={() => handlePlanSubmit()} className="flex-[2] bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs shadow-xl shadow-amber-900/20">Generate Plan</button>
              </div>
            </div>
          </div>
        )}

       {/* RECOMMENDATIONS VIEW */}
{state.step === 'recommendations' && (() => {
  const isResidentProfile = state.profile.residency === 'Resident';
  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-left">
      <h2 className="text-4xl font-black italic uppercase text-center mb-16 tracking-tighter leading-none">Top Tier Selections</h2>
      <div className="grid gap-8">
        {state.recommendations.map((rec, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-800/40 px-8 py-6 border-b border-zinc-800 grid grid-cols-2 md:grid-cols-6 gap-6 items-center">
              <div>
                <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest leading-none">{rec.state || state.profile.states[0]}</span>
                <p className="text-2xl font-black italic uppercase text-white leading-tight">UNIT {rec.unit}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Trophy Ceiling</p>
                <p className="text-lg font-black italic text-zinc-100">{rec.topEndScore || rec.topEnd}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Season</p>
                <p className="text-lg font-black italic text-zinc-100 uppercase">
                  {typeof rec.season === 'string'
                    ? rec.season
                    : rec.season?.rifle
                      ? `Rifle: ${rec.season.rifle.open} - ${rec.season.rifle.close}`
                      : rec.season?.archery
                        ? `Archery: ${rec.season.archery.open} - ${rec.season.archery.close}`
                        : rec.seasonName || 'Oct 1-31'}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Terrain</p>
                <p className="text-lg font-black italic capitalize">{rec.terrain || rec.terrainType}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">2025 Draw Odds</p>
                <p className="text-lg font-black italic text-green-500 uppercase">
                  {isResidentProfile
  ? (rec.residentOdds2025 || rec.residentOdds || rec.currentOdds || 'N/A')
  : (rec.nrRandomOdds2025 || rec.nrRandomOdds || rec.currentOdds || 'N/A')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">2026 Predicted</p>
                <p className={`text-lg font-black italic uppercase ${
                  rec.oddsDirection === 'UP' ? 'text-green-400' :
                  rec.oddsDirection === 'DOWN' ? 'text-red-400' :
                  'text-amber-400'
                }`}>
                  {rec.predictedOdds || 'N/A'}
                  {rec.oddsDirection === 'UP' && ' ↑'}
                  {rec.oddsDirection === 'DOWN' && ' ↓'}
                  {rec.oddsDirection === 'STABLE' && ' →'}
                </p>
              </div>
            </div>
            <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex-1">
                <p className="text-zinc-300 text-sm leading-relaxed">{rec.whyItFits}</p>
                {rec.tradeoffs && (
                  <p className="text-zinc-500 text-xs mt-3 italic border-l-2 border-zinc-700 pl-3">{rec.tradeoffs}</p>
                )}
              </div>
              <button
                onClick={() => handlePlanSubmit({...state.profile, unit: rec.unit, selectedState: rec.state || state.profile.states[0]})}
                className="w-full md:w-64 bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[10px] shadow-xl"
              >
                Learn More
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
})()}{/* CONTENT TABS */}
        {['unit-brief', 'hunt-plan', 'gear-list'].includes(state.step) && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-1000 text-left">
            <div className="flex justify-center gap-4 mb-4">
              {['unit-brief', 'hunt-plan', 'gear-list'].map(t => (
                <button key={t} onClick={() => setState(s => ({ ...s, step: t as any }))} className={`px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border transition-all ${state.step === t ? 'bg-amber-600 border-amber-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>{t.replace('-',' ')}</button>
              ))}
            </div>
            <h2 className="text-4xl font-black italic uppercase border-l-8 border-amber-600 pl-8 leading-none">
              {state.step === 'unit-brief' ? 'Unit Visualization' : state.step.replace('-',' ')}
            </h2>
            <div className="bg-zinc-900/80 p-12 rounded-3xl border border-zinc-800 shadow-inner">
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">
                {state.step === 'unit-brief' ? state.unitBrief : state.step === 'hunt-plan' ? state.huntPlan : state.gearList}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}