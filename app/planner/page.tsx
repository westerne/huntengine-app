'use client';

import React, { useState } from 'react';

// --- Types ---
type HuntPlannerState = {
  step: 'entry' | 'profile' | 'recommendations' | 'unit-brief' | 'hunt-plan' | 'gear-list';
  entryMode: 'has-tag' | 'needs-tag' | null;
  profile: {
    states: string[];
    species: string;
    residency: string;
    points: Record<string, number>;
    weapon: string;
    huntStyle: string;
    fitness: string;
    goal: string;
    trophyQuality: string;
    pressurePreference: string;
    timeline: string;
    seasonPreference: string;
    seasonDates: string;
    unit: string;
    selectedState: string;
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

// --- Constants ---
const STATES = ['WY', 'CO', 'MT', 'ID', 'UT', 'NV', 'AZ', 'NM'];
const SPECIES = ['Mule Deer', 'Elk', 'Antelope', 'Moose', 'Bighorn Sheep', 'Mountain Goat'];
const WEAPONS = ['Rifle', 'Archery', 'Muzzleloader'];
const HUNT_STYLES = ['Backpack', 'Horseback', 'Truck Camp', 'Day Hunt'];
const FITNESS_LEVELS = ['Moderate', 'High', 'Elite'];
const GOALS = ['Any Legal', 'Quality', 'Trophy Class'];
const TROPHY_QUALITIES = ['Any', '160-180"', '180"+'];
const PRESSURE_PREFS = ['Any', 'Low Pressure', 'High Success Odds'];

export default function HuntPlannerPage() {
  const [state, setState] = useState<HuntPlannerState>({
    step: 'entry',
    entryMode: null,
    profile: {
      states: [],
      species: 'Mule Deer',
      residency: 'Resident',
      points: {},
      weapon: 'Rifle',
      huntStyle: 'Backpack',
      fitness: 'High',
      goal: 'Trophy Class',
      trophyQuality: 'Any',
      pressurePreference: 'Any',
      timeline: 'This Year',
      seasonPreference: 'Rifle',
      seasonDates: '',
      unit: '',
      selectedState: 'WY',
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

  // --- API Helpers ---
  async function callStrategy(mode: string, formData: any) {
    const res = await fetch('/api/strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, formData }),
    });
    if (!res.ok) throw new Error('Failed to generate strategy');
    return await res.json();
  }

  async function callRecommend(profile: any) {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        states: profile.states.map((s: string) => s === 'WY' ? 'WYOMING' : s),
        species: profile.species.toLowerCase(),
        residency: profile.residency.toLowerCase(),
        points: profile.points,
        weapon: profile.weapon.toLowerCase(),
        huntStyle: profile.huntStyle.toLowerCase(),
        fitness: profile.fitness.toLowerCase(),
        goal: profile.goal.toLowerCase().includes('trophy') ? 'trophy' : 'opportunity',
        trophyQuality: profile.trophyQuality,
        pressure: profile.pressurePreference,
        timeline: profile.timeline.toLowerCase(),
        seasonPreference: profile.seasonPreference.toLowerCase(),
        notes: profile.notes,
      }),
    });
    if (!res.ok) throw new Error('Failed to find units');
    return await res.json();
  }

  // --- Action Handlers ---
  const handleHasTagSubmit = async () => {
    setState(s => ({ ...s, loading: true, loadingMessage: `Analyzing Unit ${s.profile.unit}...`, error: null }));
    try {
      const data = await callStrategy('MACRO', {
        state: state.profile.selectedState,
        unit: state.profile.unit,
        species: state.profile.species.toLowerCase(),
        weapon: state.profile.weapon,
        season: state.profile.seasonDates,
        residency: state.profile.residency,
        huntStyle: state.profile.huntStyle,
        fitness: state.profile.fitness,
        harvestObjective: state.profile.goal,
        notes: state.profile.notes
      });
      setState(s => ({ ...s, unitBrief: data.strategy, step: 'unit-brief', loading: false }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Communication with scout team failed.' }));
    }
  };

  const handleNeedsTagSubmit = async () => {
    setState(s => ({ ...s, loading: true, loadingMessage: "Analyzing trophy quality and pressure stats...", error: null }));
    try {
      const data = await callRecommend(state.profile);
      setState(s => ({ ...s, recommendations: data.recommendations, step: 'recommendations', loading: false }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Failed to find units.' }));
    }
  };

  const selectRecommendation = async (rec: any) => {
    setState(s => ({ 
        ...s, 
        loading: true, 
        loadingMessage: `Analyzing Unit ${rec.unitNumber}...`,
        profile: { ...s.profile, unit: rec.unitNumber, selectedState: rec.state }
    }));
    try {
      const data = await callStrategy('MACRO', {
        state: rec.state,
        unit: rec.unitNumber,
        species: state.profile.species.toLowerCase(),
        weapon: state.profile.weapon,
        residency: state.profile.residency,
        huntStyle: state.profile.huntStyle,
        fitness: state.profile.fitness,
        harvestObjective: state.profile.goal,
        notes: state.profile.notes
      });
      setState(s => ({ ...s, unitBrief: data.strategy, step: 'unit-brief', loading: false }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Failed to build brief.' }));
    }
  };

  const buildTacticalPlan = async () => {
    setState(s => ({ ...s, loading: true, loadingMessage: "Building your 72-hour plan...", error: null }));
    try {
      const data = await callStrategy('TACTICAL', state.profile);
      setState(s => ({ ...s, huntPlan: data.strategy, step: 'hunt-plan', loading: false }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Tactical analysis failed.' }));
    }
  };

  const generateGearList = async () => {
    setState(s => ({ ...s, loading: true, loadingMessage: "Dialing in your loadout...", error: null }));
    try {
      const data = await callStrategy('GEAR', state.profile);
      setState(s => ({ ...s, gearList: data.strategy, step: 'gear-list', loading: false }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Gear audit failed.' }));
    }
  };

  // --- Sub-Components ---
  const TogglePill = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full border transition-all text-sm font-medium ${
        active 
          ? 'bg-amber-700 border-amber-600 text-white shadow-lg shadow-amber-900/20' 
          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
      }`}
    >
      {label}
    </button>
  );

  const StepIndicator = () => {
    const steps = [
      { id: 'profile', label: 'Profile' },
      { id: 'recommendations', label: 'Units', hidden: state.entryMode === 'has-tag' },
      { id: 'unit-brief', label: 'Unit Brief' },
      { id: 'hunt-plan', label: 'Hunt Plan' },
      { id: 'gear-list', label: 'Gear List' },
    ].filter(s => !s.hidden);

    return (
      <div className="flex items-center justify-center space-x-4 mb-12 text-[10px] uppercase tracking-widest font-bold">
        <span 
          className="cursor-pointer text-zinc-600 hover:text-amber-500 transition-colors"
          onClick={() => setState(s => ({ ...s, step: 'entry', entryMode: null }))}
        >
          START OVER
        </span>
        <span className="text-zinc-800">|</span>
        {steps.map((s, idx) => {
          const isActive = state.step === s.id;
          return (
            <React.Fragment key={s.id}>
              <span 
                className={`cursor-pointer transition-colors ${isActive ? 'text-amber-500' : 'text-zinc-600'}`}
                onClick={() => {
                   if (state.unitBrief && s.id === 'unit-brief') setState(prev => ({...prev, step: 'unit-brief'}));
                   if (s.id === 'profile') setState(prev => ({...prev, step: 'profile'}));
                }}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && <span className="text-zinc-800">|</span>}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // --- Main Render ---
  if (state.loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 font-medium tracking-wide animate-pulse">{state.loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500/30">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {state.step !== 'entry' && <StepIndicator />}

        {state.error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-900 text-red-400 text-sm rounded">
                {state.error}
            </div>
        )}

        {/* STEP 1: ENTRY */}
        {state.step === 'entry' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center">
            <h1 className="text-4xl font-black mb-12 tracking-tighter uppercase italic text-amber-500">HuntEngine</h1>
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-xl hover:border-amber-900/50 transition-colors group">
                <h2 className="text-2xl font-bold mb-2">I Drew a Tag</h2>
                <p className="text-zinc-500 mb-8 text-sm">You have a unit secured. Let's build your 72-hour tactical hunt plan.</p>
                <button 
                  onClick={() => setState(s => ({ ...s, step: 'profile', entryMode: 'has-tag' }))}
                  className="w-full bg-zinc-100 text-black py-4 font-bold rounded hover:bg-amber-500 transition-colors"
                >
                  Start Planning
                </button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-xl hover:border-amber-900/50 transition-colors group">
                <h2 className="text-2xl font-bold mb-2">I Need a Tag</h2>
                <p className="text-zinc-500 mb-8 text-sm">Not sure where to apply? Help us find the right unit based on your points.</p>
                <button 
                  onClick={() => setState(s => ({ ...s, step: 'profile', entryMode: 'needs-tag' }))}
                  className="w-full border border-zinc-700 text-white py-4 font-bold rounded hover:bg-zinc-800 transition-colors"
                >
                  Find My Hunt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PROFILE FORM (Shared Logic) */}
        {state.step === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">{state.entryMode === 'has-tag' ? 'Tell us about your hunt' : "Let's find your hunt"}</h2>
            <div className="space-y-8">
              {/* Dynamic Inputs Based on Mode */}
              {state.entryMode === 'has-tag' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">State</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded" value={state.profile.selectedState} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, selectedState: e.target.value }}))}>
                      {STATES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Unit Number</label>
                    <input type="text" placeholder="e.g. 141" className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded" value={state.profile.unit} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, unit: e.target.value }}))} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">States & Points</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {STATES.map(st => (
                      <TogglePill key={st} label={st} active={state.profile.states.includes(st)} onClick={() => {
                        const newStates = state.profile.states.includes(st) ? state.profile.states.filter(s => s !== st) : [...state.profile.states, st];
                        setState(s => ({ ...s, profile: { ...s.profile, states: newStates }}));
                      }} />
                    ))}
                  </div>
                  {state.profile.states.map(st => (
                    <div key={st} className="flex items-center justify-between bg-zinc-900 p-2 rounded mb-2 border border-zinc-800">
                      <span className="text-xs font-bold text-zinc-400 ml-2">{st} Points</span>
                      <input type="number" className="bg-black border border-zinc-800 w-20 p-1 text-center rounded text-amber-500 font-bold" value={state.profile.points[st] || 0} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, points: { ...s.profile.points, [st]: parseInt(e.target.value) }}}))} />
                    </div>
                  ))}
                </div>
              )}

              {/* Shared Species Select */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Species</label>
                <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded" value={state.profile.species} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, species: e.target.value }}))}>
                  {SPECIES.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                </select>
              </div>

              {/* Preferences Logic */}
              {state.entryMode === 'needs-tag' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Desired Trophy Quality</label>
                    <div className="flex flex-wrap gap-2">
                      {TROPHY_QUALITIES.map(q => <TogglePill key={q} label={q} active={state.profile.trophyQuality === q} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, trophyQuality: q }}))} />)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Pressure vs. Success</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESSURE_PREFS.map(p => <TogglePill key={p} label={p} active={state.profile.pressurePreference === p} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, pressurePreference: p }}))} />)}
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Residency</label>
                  <div className="flex gap-2">
                    {['Resident', 'Non-Resident'].map(r => <TogglePill key={r} label={r} active={state.profile.residency === r} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, residency: r }}))} />)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-2">Weapon</label>
                  <div className="flex flex-wrap gap-2">
                    {(state.entryMode === 'needs-tag' ? [...WEAPONS, 'Any'] : WEAPONS).map(w => <TogglePill key={w} label={w} active={state.profile.weapon === w} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, weapon: w }}))} />)}
                  </div>
                </div>
              </div>

              <button onClick={state.entryMode === 'has-tag' ? handleHasTagSubmit : handleNeedsTagSubmit} className="w-full bg-amber-600 text-white py-4 font-bold rounded hover:bg-amber-500 transition-colors uppercase tracking-widest shadow-xl shadow-amber-900/20">
                {state.entryMode === 'has-tag' ? 'Build My Hunt Plan →' : 'Find My Units →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RECOMMENDATIONS (Structured View) */}
        {state.step === 'recommendations' && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">Your Top Units</h2>
              <p className="text-zinc-500 italic text-sm">Based on your points, trophy goals, and preferred season</p>
            </div>
            
            <div className="grid gap-8">
              {state.recommendations.map((rec, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-amber-500/30 transition-all shadow-2xl">
                  {/* Header */}
                  <div className="bg-zinc-800/40 px-8 py-4 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-amber-500 font-black tracking-[0.2em] mb-1 leading-none">{rec.state}</span>
                        <span className="text-3xl font-black text-white leading-none">UNIT {rec.unitNumber}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-zinc-700 mx-2 hidden md:block" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-1 leading-none">Season</span>
                        <span className="text-sm font-bold text-zinc-300">{rec.seasonName || 'General Rifle'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="bg-green-900/20 text-green-400 border border-green-900/50 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-tighter">
                        {rec.residentOdds || rec.nrOdds || 'Draw Odds: High'}
                      </span>
                      <span className="bg-amber-900/20 text-amber-500 border border-amber-900/50 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-tighter">
                        {rec.trophyRating || 'Trophy Grade'}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-8 flex flex-col md:flex-row gap-10">
                    <div className="flex-1">
                      <div className="relative mb-8">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-amber-600/50 rounded-full" />
                        <p className="text-zinc-300 leading-relaxed text-sm italic pl-2">"{rec.whyItFits}"</p>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                          <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mb-2">Dates</p>
                          <p className="text-sm font-bold text-zinc-100">{rec.seasonDates || 'Oct 01 - Oct 31'}</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                          <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mb-2">Trophy Cap</p>
                          <p className="text-sm font-bold text-zinc-100">{rec.topEndScore || '180"+'}</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                          <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mb-2">Draw Cost</p>
                          <p className="text-sm font-bold text-zinc-100">{state.profile.points[rec.state] || 0} Pts</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg border border-zinc-800/50">
                          <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mb-2">Terrain</p>
                          <p className="text-sm font-bold text-zinc-100 capitalize">{rec.terrainType || 'Backcountry'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="md:w-72 flex flex-col justify-center border-t md:border-t-0 md:border-l border-zinc-800 pt-8 md:pt-0 md:pl-10">
                      <button onClick={() => selectRecommendation(rec)} className="w-full bg-zinc-100 text-black py-5 font-black rounded hover:bg-amber-500 transition-all uppercase text-[11px] tracking-[0.2em] shadow-xl">
                        Build Strategic Plan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setState(s => ({ ...s, step: 'profile' }))} className="mt-12 flex items-center gap-3 text-zinc-600 hover:text-amber-500 transition-all text-xs font-black uppercase tracking-[0.2em]">
              ← Adjust Search Parameters
            </button>
          </div>
        )}

        {/* STEP 4: UNIT BRIEF */}
        {state.step === 'unit-brief' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Strategic Unit Brief</h2>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl mb-8 overflow-y-auto max-h-[60vh] shadow-inner">
              <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">{state.unitBrief}</pre>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setState(s => ({ ...s, step: state.entryMode === 'has-tag' ? 'profile' : 'recommendations' }))} className="flex-1 border border-zinc-800 py-4 font-bold rounded hover:bg-zinc-900 transition-colors">← Back</button>
              <button onClick={buildTacticalPlan} className="flex-[2] bg-amber-600 py-4 font-bold rounded hover:bg-amber-500 transition-colors uppercase tracking-widest">Build My 72-Hour Plan →</button>
            </div>
          </div>
        )}

        {/* STEP 5: HUNT PLAN */}
        {state.step === 'hunt-plan' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Your 72-Hour Tactical Plan</h2>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl mb-8 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed">{state.huntPlan}</pre>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setState(s => ({ ...s, step: 'unit-brief' }))} className="flex-1 border border-zinc-800 py-4 font-bold rounded hover:bg-zinc-900 transition-colors">← Back</button>
              <button onClick={generateGearList} className="flex-[2] bg-amber-600 py-4 font-bold rounded hover:bg-amber-500 transition-colors uppercase tracking-widest">Generate Gear List →</button>
            </div>
          </div>
        )}

        {/* STEP 6: GEAR LIST */}
        {state.step === 'gear-list' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Your Finalized Loadout</h2>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl mb-8 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap font-sans text-zinc-300 leading-relaxed mb-12">{state.gearList}</pre>
              <div className="border-t border-zinc-800 pt-8 space-y-4 text-sm">
                <p className="text-zinc-400 italic">For glassing systems we recommend the <span className="text-amber-500 font-bold">MTN HNTR SS Tripod Kit</span> → <a href="https://mtnhntr.com" target="_blank" className="underline hover:text-amber-500 transition-colors">Shop MTN HNTR</a></p>
                <p className="text-zinc-400 italic">Shop the full recommended loadout at <a href="https://altitudeoutdoors.com" target="_blank" className="text-amber-500 font-bold underline hover:text-white transition-colors">Altitude Outdoors</a></p>
              </div>
            </div>
            <button onClick={() => setState(s => ({ ...s, step: 'hunt-plan' }))} className="w-full border border-zinc-800 py-4 font-bold rounded hover:bg-zinc-900 transition-colors">← Back</button>
          </div>
        )}

      </div>
    </div>
  );
}