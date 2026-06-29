'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Leaflet touches `window`, so load the map client-side only.
const UnitMap = dynamic(() => import('../UnitMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[440px] w-full flex items-center justify-center bg-zinc-950">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Loading unit boundary…</p>
    </div>
  ),
});

// --- Types ---
type FlowStep = 
  | 'entry' 
  | 'scout-1' | 'scout-2' | 'scout-3' | 'scout-4'
  | 'plan-1' | 'plan-2' | 'plan-3' | 'plan-4'
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
    sacrificeTrophy: string;
    knownAreas: string;
    pastExperience: string;
    hunterContext: string;
    includeSpecialDraw: boolean;   // WY only — special draw costs more but better odds
    grizzlyComfort: boolean;       // WY/MT/ID only — willing to hunt grizzly country
  };
  drawReality: any | null;
  strategyPath: string | null;
  actionPlan: any | null;
  recommendations: any[];
  drawableUnits: any[];
  showDrawablePanel: boolean;
  unitBrief: string | null;
  huntPlan: any | null;
  gearList: any | null;
  planUnit: string;       // unit the active plan was built for (drives the map)
  planState: string;
  planSpecies: string;    // WY hunt-area boundaries differ by species
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
const EXPERIENCE_OPTIONS = [
  'First time hunting this species',
  'Hunted this species before',
  'Multiple years experience',
];
const SACRIFICE_OPTIONS = [
  { value: 'yes', label: 'Hunt every year — best drawable option' },
  { value: 'no', label: 'Holding out for a trophy unit' },
  { value: 'middle', label: 'Somewhere in between' },
];

// States with grizzly bear populations relevant to hunting
const GRIZZLY_STATES = ['WY', 'MT', 'ID'];

// States with special draw pools (Wyoming only currently)
const SPECIAL_DRAW_STATES = ['WY'];

// The beta access code is validated server-side. It is entered on the home
// page, which stores it in sessionStorage; we replay it here as a header so
// the planner can call the gated AI endpoints. If it is missing, the API
// returns 401 and the user is told to enter it on the home page first.
function betaHeaders(): Record<string, string> {
  let code = '';
  try { code = sessionStorage.getItem('hq_beta')?.trim() || ''; } catch {}
  return { 'Content-Type': 'application/json', 'x-beta-code': code };
}

function messageForStatus(status: number): string {
  if (status === 401) return 'Invalid beta access code — please re-enter it.';
  if (status === 429) return 'Too many requests — please wait a few minutes and try again.';
  return 'Engine error during analysis. Please try again.';
}

const STRATEGY_LABELS: Record<string, { label: string; color: string; description: string }> = {
  DRAW_NOW: { label: 'Draw Now', color: 'text-green-400', description: 'You have units you can draw this year.' },
  RANDOM_PLAY: { label: 'Random Pool Play', color: 'text-amber-400', description: 'Low points but viable random pool options exist.' },
  BUILD_AND_WAIT: { label: 'Build & Wait', color: 'text-blue-400', description: "You're 2-4 years from your best realistic unit." },
  LONG_GAME: { label: 'Long Game', color: 'text-red-400', description: "Your target unit is a serious points commitment." },
};

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
      sacrificeTrophy: 'middle',
      knownAreas: '',
      pastExperience: 'First time hunting this species',
      hunterContext: '',
      includeSpecialDraw: true,
      grizzlyComfort: true,
    },
    drawReality: null,
    strategyPath: null,
    actionPlan: null,
    recommendations: [],
    drawableUnits: [],
    showDrawablePanel: false,
    unitBrief: null,
    huntPlan: null,
    gearList: null,
    planUnit: '',
    planState: 'WY',
    planSpecies: 'Mule Deer',
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

  const selState = state.profile.states[0];
  const isWyResidentNoPoints = selState === 'WY' && state.profile.residency === 'Resident' && (state.profile.species === 'Mule Deer' || state.profile.species === 'Antelope' || state.profile.species === 'Elk');
  const isIdaho = selState === 'ID';
  const noPointSystem = isWyResidentNoPoints || isIdaho;
  const showGrizzlyOption = GRIZZLY_STATES.includes(selState);
  const showSpecialDrawOption = SPECIAL_DRAW_STATES.includes(selState) && state.profile.residency === 'Non-Resident';

  // ─── Beta access gate ──────────────────────────────────────────────────────
  // The AI endpoints require a beta code (sent as the x-beta-code header by
  // betaHeaders()). We collect it on this landing page and persist it in
  // sessionStorage. The code itself is validated server-side, not here.
  const [betaReady, setBetaReady] = useState(false);
  const [betaInput, setBetaInput] = useState('');

  useEffect(() => {
    try {
      if ((sessionStorage.getItem('hq_beta') || '').trim()) setBetaReady(true);
    } catch {}
  }, []);

  const submitBeta = () => {
    const code = betaInput.trim();
    if (!code) return;
    try { sessionStorage.setItem('hq_beta', code); } catch {}
    setState(s => ({ ...s, error: null }));
    setBetaReady(true);
  };

  // If the server rejects the code (401), clear it and re-show the gate.
  const resetBeta = () => {
    try { sessionStorage.removeItem('hq_beta'); } catch {}
    setBetaInput('');
    setBetaReady(false);
  };

  // Residency & Points logic
  useEffect(() => {
    if (!selState) return;
    if ((isWyResidentNoPoints || isIdaho) && state.profile.points[selState] !== 0) {
      setState(s => ({ ...s, profile: { ...s.profile, points: { ...s.profile.points, [selState]: 0 } } }));
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
        headers: betaHeaders(),
        body: JSON.stringify({ mode: 'SCOUT', formData: state.profile }),
      });
      if (!res.ok) {
        if (res.status === 401) resetBeta();
        setState(s => ({ ...s, loading: false, error: messageForStatus(res.status) }));
        return;
      }
      const data = await res.json();
      setState(s => ({
        ...s,
        recommendations: data.recommendations || [],
        drawableUnits: data.drawableUnits || [],
        drawReality: data.drawReality || null,
        strategyPath: data.strategyPath || null,
        actionPlan: data.actionPlan || null,
        step: 'recommendations',
        loading: false,
      }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Analysis failed — check your connection and try again.' }));
    }
  };

  const handlePlanSubmit = async (customProfile?: any) => {
    const dataToSubmit = customProfile || state.profile;
    setState(s => ({ ...s, loading: true, loadingMessage: "Building Tactical Strategy...", error: null }));
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: betaHeaders(),
        body: JSON.stringify({ mode: 'FULL_SUITE', formData: dataToSubmit }),
      });
      if (!res.ok) {
        if (res.status === 401) resetBeta();
        setState(s => ({ ...s, loading: false, error: messageForStatus(res.status) }));
        return;
      }
      const data = await res.json();
      setState(s => ({
        ...s,
        unitBrief: data.brief,
        huntPlan: data.tactical,
        gearList: data.gear,
        planUnit: String(dataToSubmit.unit || ''),
        planState: String(dataToSubmit.selectedState || dataToSubmit.states?.[0] || 'WY'),
        planSpecies: String(dataToSubmit.species || ''),
        step: 'unit-brief',
        loading: false,
      }));
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: 'Failed to build plan — check your connection and try again.' }));
    }
  };

  // Helper Components
  const ProgressBar = () => {
    const steps = state.entryMode === 'has-tag'
      ? ['plan-1', 'plan-2', 'plan-3', 'plan-4']
      : ['scout-1', 'scout-2', 'scout-3', 'scout-4'];
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

  const TogglePill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
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

  // Toggle switch component for yes/no preferences
  const ToggleSwitch = ({ 
    label, 
    sublabel, 
    value, 
    onChange,
    warningLabel,
  }: { 
    label: string; 
    sublabel?: string; 
    value: boolean; 
    onChange: (v: boolean) => void;
    warningLabel?: string;
  }) => (
    <div className="flex items-center justify-between gap-4 p-4 bg-black rounded-xl border border-zinc-800">
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{label}</p>
        {sublabel && <p className="text-[9px] text-zinc-600 font-bold uppercase mt-0.5">{sublabel}</p>}
        {!value && warningLabel && (
          <p className="text-[9px] text-amber-600 font-bold uppercase mt-1">{warningLabel}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 ${value ? 'bg-amber-600' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500/30">
      {!betaReady && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-amber-500 font-black uppercase tracking-[0.25em] text-3xl mb-1">HuntQuarters</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-10">Western Big Game Intelligence — Beta</p>
          <input
            type="password"
            autoFocus
            value={betaInput}
            onChange={(e) => setBetaInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitBeta(); }}
            placeholder="ENTER BETA ACCESS CODE"
            aria-label="Beta access code"
            className="w-full max-w-xs bg-zinc-950 border border-amber-600/30 text-amber-400 text-center text-xs font-bold uppercase tracking-widest px-4 py-3 outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={submitBeta}
            className="mt-4 w-full max-w-xs bg-amber-600 text-black font-black uppercase text-xs tracking-widest py-3 hover:bg-amber-500 transition-colors"
          >
            Enter
          </button>
          {state.error && (
            <p role="alert" className="mt-5 text-red-400 text-[11px] font-bold uppercase tracking-wide max-w-xs leading-snug">{state.error}</p>
          )}
        </div>
      )}

      {state.loading && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin mb-4" />
          <p className="text-amber-500 font-black uppercase tracking-[0.2em] animate-pulse text-xs">{state.loadingMessage}</p>
        </div>
      )}

      {state.error && !state.loading && (
        <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-red-950/90 border border-red-700 text-red-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur flex items-start gap-3">
          <p className="flex-1 text-[11px] font-bold uppercase tracking-wide leading-snug">{state.error}</p>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setState(s => ({ ...s, error: null }))}
            className="text-red-300 hover:text-white font-black leading-none text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* DRAWABLE UNITS PANEL */}
      {state.showDrawablePanel && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-start justify-end">
          <div className="h-full w-full max-w-xl bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800 shrink-0">
              <div>
                <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">All Drawable Units</p>
                <h3 className="text-xl font-black italic uppercase text-green-400">{state.drawableUnits.length} Units You Can Draw Now</h3>
              </div>
              <button
                onClick={() => setState(s => ({ ...s, showDrawablePanel: false }))}
                className="text-zinc-500 hover:text-white transition-colors text-2xl font-black leading-none"
              >×</button>
            </div>

            {/* Pool type legend */}
            <div className="px-8 py-3 border-b border-zinc-800 flex gap-4 shrink-0">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Regular Pool
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Special Pool
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />OTC / General
              </span>
            </div>

            {/* Scrollable unit list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {state.drawableUnits.map((unit: any, i: number) => (
                <button
                  key={unit.unit + i}
                  onClick={() => {
                    setState(s => ({ ...s, showDrawablePanel: false }));
                    handlePlanSubmit({ ...state.profile, unit: unit.unit, selectedState: unit.state || state.profile.states[0] });
                  }}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-amber-700 hover:bg-zinc-800/60 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Pool type dot */}
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          unit.poolType === 'OTC' ? 'bg-blue-500' :
                          unit.poolType === 'Special' ? 'bg-amber-500' :
                          'bg-green-500'
                        }`} />
                        <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">{unit.state || state.profile.states[0]}</span>
                        <span className="text-[9px] text-zinc-600 font-black uppercase">{unit.poolType}</span>
                      </div>
                      <p className="text-lg font-black italic uppercase text-white leading-tight truncate">
                        Unit {unit.unit}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate">{unit.terrain}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {unit.requiresGuide && (
                          <span className="text-[8px] font-black uppercase text-orange-400 border border-orange-800/40 bg-orange-900/20 px-2 py-0.5 rounded-full">Guide Req.</span>
                        )}
                        {unit.grizzlyPresence && (
                          <span className="text-[8px] font-black uppercase text-yellow-500 border border-yellow-800/40 bg-yellow-900/20 px-2 py-0.5 rounded-full">🐻 Grizzly</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[8px] uppercase text-zinc-600 font-black mb-0.5">Odds</p>
                      <p className="text-lg font-black text-green-400">{unit.currentOdds}</p>
                      <p className="text-[9px] text-zinc-500 font-bold">{unit.topEnd}</p>
                      <p className="text-[8px] text-zinc-600 font-black uppercase mt-1 group-hover:text-amber-500 transition-colors">Build Plan →</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="px-8 py-4 border-t border-zinc-800 shrink-0">
              <p className="text-[9px] text-zinc-600 font-bold uppercase text-center">Tap any unit to build a full tactical plan</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        {state.step !== 'entry' && (
          <div className="flex items-center justify-center space-x-4 mb-8 text-[10px] uppercase tracking-widest font-black">
            <button className="text-zinc-600 hover:text-amber-500 transition-colors" onClick={() => setState(s => ({ ...s, step: 'entry', entryMode: null, unitBrief: null, recommendations: [], drawableUnits: [], drawReality: null, actionPlan: null, strategyPath: null, showDrawablePanel: false, error: null }))}>START OVER</button>
            <span className="text-zinc-800">|</span>
            {['unit-brief', 'hunt-plan', 'gear-list', 'recommendations'].includes(state.step) && (
              <button className="text-zinc-500 hover:text-white" onClick={() => setState(s => ({ ...s, step: s.entryMode === 'has-tag' ? 'plan-4' : 'scout-4' }))}>BACK</button>
            )}
          </div>
        )}

        {/* ENTRY */}
        {state.step === 'entry' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
            <h1 className="text-6xl font-black mb-16 tracking-tighter uppercase italic text-amber-500">HuntEngine</h1>
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl text-left">
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:border-amber-900/50 transition-all">
                <h2 className="text-2xl font-black mb-2 italic text-zinc-300 uppercase tracking-tighter">Find a Hunt</h2>
                <p className="text-zinc-500 mb-8 text-sm">Analyze states and units based on points and trophy goals.</p>
                <button type="button" onClick={() => setState(s => ({ ...s, step: 'scout-1', entryMode: 'needs-tag' }))} className="w-full border-2 border-zinc-700 text-white py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Start Scouting</button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:border-amber-900/50 transition-all">
                <h2 className="text-2xl font-black mb-2 italic text-amber-500 uppercase tracking-tighter">Plan a Hunt</h2>
                <p className="text-zinc-500 mb-8 text-sm">Already have a tag? Build your tactical 72-hour guide.</p>
                <button type="button" onClick={() => setState(s => ({ ...s, step: 'plan-1', entryMode: 'has-tag' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs transition-colors">Start Planning</button>
              </div>
            </div>
          </div>
        )}

        {/* SCOUT-1: State & Species */}
        {state.step === 'scout-1' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Target State & Species</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-10">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Select State</label>
                <div className="flex flex-wrap gap-2">{STATES.map(st => <TogglePill key={st} label={st} active={state.profile.states.includes(st)} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, states: [st] } }))} />)}</div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Select Species</label>
                <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none focus:border-amber-600" value={state.profile.species} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, species: e.target.value } }))}>{SPECIES.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Residency</label>
                <div className="flex gap-4">
                  {['Resident', 'Non-Resident'].map(r => (
                    <button key={r} type="button" onClick={() => setState(s => ({ ...s, profile: { ...s.profile, residency: r } }))} className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs transition-all ${state.profile.residency === r ? 'bg-amber-700 border-amber-600 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => setState(s => ({ ...s, step: 'scout-2' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
            </div>
          </div>
        )}

        {/* SCOUT-2: Timeline & Goals */}
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
                    <input type="number" className="bg-zinc-900 border border-zinc-700 w-full p-3 text-center rounded-xl text-amber-500 font-black text-2xl outline-none" value={state.profile.points[selState] || 0} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, points: { ...s.profile.points, [selState]: parseInt(e.target.value) || 0 } } }))} />
                  )}
                </div>

                {/* Special Draw toggle — WY Non-Resident only */}
                {showSpecialDrawOption && (
                  <ToggleSwitch
                    label="Include Wyoming Special Draw"
                    sublabel="Special draw has better odds but costs ~$50 more per application. Toggle off to see regular draw only."
                    value={state.profile.includeSpecialDraw}
                    onChange={(v) => setState(s => ({ ...s, profile: { ...s.profile, includeSpecialDraw: v } }))}
                    warningLabel="Special draw excluded — recommendations will use regular and random pools only."
                  />
                )}

                <div className="bg-black p-6 rounded-2xl border border-zinc-800">
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">When do you want to hunt this?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['This Year', '1-3 Years', '5 Years', '10+ Years'] as DrawTimeline[]).map(t => (
                      <button key={t} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, drawTimeline: t } }))} className={`py-3 rounded-xl border font-black uppercase text-[10px] transition-all ${state.profile.drawTimeline === t ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-900/50' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>{t}</button>
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
                      <input type="range" min={config.min} max={config.max} step={config.step} value={val} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, trophyQuality: e.target.value } }))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
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

        {/* SCOUT-3: Hunting Style */}
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
                  <div className="flex flex-wrap gap-2">{FITNESS_LEVELS.map(f => <TogglePill key={f} label={f} active={state.profile.fitness === f} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, fitness: f } }))} />)}</div>
                </div>

                {/* Grizzly Country Toggle — WY, MT, ID only */}
                {showGrizzlyOption && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Grizzly Bear Country</label>
                    <ToggleSwitch
                      label="Comfortable hunting active grizzly habitat"
                      sublabel="Several top units in WY/MT/ID have significant grizzly populations. Toggle off to exclude these units."
                      value={state.profile.grizzlyComfort}
                      onChange={(v) => setState(s => ({ ...s, profile: { ...s.profile, grizzlyComfort: v } }))}
                      warningLabel="Grizzly units excluded — some top trophy units will not appear in your results."
                    />
                  </div>
                )}
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
              <button onClick={() => setState(s => ({ ...s, step: 'scout-4' }))} className="flex-[2] bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
            </div>
          </div>
        )}

        {/* SCOUT-4: Hunter Context */}
        {state.step === 'scout-4' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-2 text-amber-500">Your Hunting Context</h2>
            <p className="text-zinc-500 text-sm mb-8">The more you tell us, the more specific your recommendations will be. All fields optional.</p>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Experience with this species</label>
                <div className="flex flex-col gap-2">
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => setState(s => ({ ...s, profile: { ...s.profile, pastExperience: opt } }))} className={`p-4 text-left rounded-xl border transition-all text-[10px] font-black uppercase tracking-[0.1em] ${state.profile.pastExperience === opt ? 'bg-amber-900/20 border-amber-600 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}>{opt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Trophy vs. Opportunity — what matters more?</label>
                <div className="flex flex-col gap-2">
                  {SACRIFICE_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setState(s => ({ ...s, profile: { ...s.profile, sacrificeTrophy: opt.value } }))} className={`p-4 text-left rounded-xl border transition-all text-[10px] font-black uppercase tracking-[0.1em] ${state.profile.sacrificeTrophy === opt.value ? 'bg-amber-900/20 border-amber-600 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Units or areas you already know</label>
                <p className="text-[9px] text-zinc-600 font-bold uppercase mb-3">We'll weight familiar units higher in your recommendations.</p>
                <textarea
                  rows={3}
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm font-bold outline-none focus:border-amber-500 resize-none"
                  placeholder="e.g. I've hunted the Hoback Canyon area, know the Gros Ventre drainage well..."
                  value={state.profile.knownAreas}
                  onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, knownAreas: e.target.value } }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Tell us about yourself as a hunter</label>
                <p className="text-[9px] text-zinc-600 font-bold uppercase mb-3">Past hunts, what you're after, animals you've passed on, specific goals.</p>
                <textarea
                  rows={5}
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm font-bold outline-none focus:border-amber-500 resize-none"
                  placeholder="e.g. I've been hunting Wyoming deer for 3 years, passed on 170&quot; bucks waiting for something special. Looking for a unit where I have a realistic shot at 185&quot;+ with my rifle in October..."
                  value={state.profile.hunterContext}
                  onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, hunterContext: e.target.value } }))}
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setState(s => ({ ...s, step: 'scout-3' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
                <button onClick={handleScoutSubmit} className="flex-[2] bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs shadow-xl shadow-amber-900/20">Find Units</button>
              </div>
            </div>
          </div>
        )}

        {/* PLAN STEPS */}
        {state.step === 'plan-1' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">The Tag</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">State</label>
                  <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={state.profile.states[0]} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, states: [e.target.value] } }))}>{STATES.map(st => <option key={st} value={st}>{st}</option>)}</select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Species</label>
                  <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={state.profile.species} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, species: e.target.value } }))}>{SPECIES.map(sp => <option key={sp} value={sp}>{sp}</option>)}</select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Unit Name or Number</label>
                <input type="text" placeholder="e.g. 102 or Book Cliffs" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-100 font-black text-xl outline-none focus:border-amber-500" value={state.profile.unit} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, unit: e.target.value } }))} />
              </div>
              <button onClick={() => setState(s => ({ ...s, step: 'plan-2' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Next Step</button>
            </div>
          </div>
        )}

        {state.step === 'plan-2' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Hunter Profile</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Residency</label>
                <div className="flex gap-4">
                  {['Resident', 'Non-Resident'].map(r => (
                    <button key={r} type="button" onClick={() => setState(s => ({ ...s, profile: { ...s.profile, residency: r } }))} className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs transition-all ${state.profile.residency === r ? 'bg-amber-700 border-amber-600 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500'}`}>{r}</button>
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
                    <input type="number" className="bg-zinc-900 border border-zinc-700 w-24 p-3 text-center rounded-xl text-amber-500 font-black text-2xl outline-none" value={state.profile.points[selState] || 0} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, points: { ...s.profile.points, [selState]: parseInt(e.target.value) || 0 } } }))} />
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
                  <div className="flex flex-wrap gap-2">{FITNESS_LEVELS.map(f => <TogglePill key={f} label={f} active={state.profile.fitness === f} onClick={() => setState(s => ({ ...s, profile: { ...s.profile, fitness: f } }))} />)}</div>
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

        {state.step === 'plan-4' && (
          <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
            <ProgressBar />
            <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Logistics & Context</h2>
            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Days to Hunt</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold outline-none" value={state.profile.daysToHunt} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, daysToHunt: e.target.value } }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Scouting</label>
                  <select className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={state.profile.scoutingAvailability} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, scoutingAvailability: e.target.value } }))}>
                    {['None', 'Minimal', 'Several Days', 'Local'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Additional Info</label>
                <textarea rows={5} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold outline-none focus:border-amber-500" placeholder="I've looked at the north ridge, I usually access from the south..." value={state.profile.notes} onChange={(e) => setState(s => ({ ...s, profile: { ...s.profile, notes: e.target.value } }))} />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setState(s => ({ ...s, step: 'plan-3' }))} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
                <button onClick={() => handlePlanSubmit()} className="flex-[2] bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs shadow-xl shadow-amber-900/20">Generate Plan</button>
              </div>
            </div>
          </div>
        )}

        {/* RECOMMENDATIONS */}
        {state.step === 'recommendations' && (
          <div className="space-y-10 animate-in fade-in duration-500 text-left">
            <h2 className="text-4xl font-black italic uppercase text-center mb-8 tracking-tighter leading-none">Top Tier Selections</h2>

            {/* ── INPUT OVERVIEW CARD ───────────────────────────────────────── */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-2">
              <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-4">Your Search Parameters</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">State / Species</p>
                  <p className="text-xs font-black text-zinc-200 uppercase">{state.profile.states[0]} / {state.profile.species}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">Residency</p>
                  <p className="text-xs font-black text-zinc-200 uppercase">{state.profile.residency}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">Points</p>
                  <p className="text-xs font-black text-amber-400 uppercase">
                    {noPointSystem ? 'Random Draw' : `${state.profile.points[selState] || 0} pts`}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">Weapon / Season</p>
                  <p className="text-xs font-black text-zinc-200 uppercase">{state.profile.weapons.join(', ')} / {state.profile.seasons.join(', ')}</p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">Trophy Floor</p>
                  <p className="text-xs font-black text-amber-400 uppercase">
                    {trophyConfig[state.profile.species] ? `${state.profile.trophyQuality}"` : 'Any'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">Style / Fitness</p>
                  <p className="text-xs font-black text-zinc-200 uppercase">{state.profile.huntStyles.join(', ')} / {state.profile.fitness}</p>
                </div>
              </div>

              {/* Flags row — show active preference flags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {showSpecialDrawOption && (
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${state.profile.includeSpecialDraw ? 'bg-amber-900/20 border-amber-800/40 text-amber-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                    {state.profile.includeSpecialDraw ? '✓ Special Draw Included' : '✕ Special Draw Excluded'}
                  </span>
                )}
                {showGrizzlyOption && (
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${state.profile.grizzlyComfort ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-red-900/20 border-red-800/40 text-red-400'}`}>
                    {state.profile.grizzlyComfort ? '✓ Grizzly Country OK' : '✕ No Grizzly Units'}
                  </span>
                )}
                {state.profile.knownAreas && (
                  <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border bg-blue-900/20 border-blue-800/40 text-blue-400">
                    Familiar: {state.profile.knownAreas.slice(0, 30)}{state.profile.knownAreas.length > 30 ? '...' : ''}
                  </span>
                )}
                <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border bg-zinc-800 border-zinc-700 text-zinc-400">
                  Timeline: {state.profile.drawTimeline}
                </span>
              </div>
            </div>

            {/* Strategy Card */}
            {state.drawReality && state.actionPlan && state.strategyPath && (() => {
              const path = STRATEGY_LABELS[state.strategyPath] || { label: state.strategyPath, color: 'text-amber-400', description: '' };
              return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl mb-10">
                  <div className="bg-zinc-800/60 px-8 py-5 border-b border-zinc-700 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Your Draw Reality</p>
                      <p className="text-zinc-300 text-sm leading-relaxed">{state.drawReality.summary}</p>
                    </div>
                    <div className="text-right shrink-0 ml-8">
                      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Strategy</p>
                      <p className={`text-lg font-black uppercase italic ${path.color}`}>{path.label}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800">
                    <button
                      className="px-6 py-4 text-center group hover:bg-zinc-800/50 transition-colors cursor-pointer w-full"
                      onClick={() => state.drawableUnits.length > 0 && setState(s => ({ ...s, showDrawablePanel: true }))}
                    >
                      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Drawable Now</p>
                      <p className="text-2xl font-black text-green-400 group-hover:text-green-300 transition-colors">{state.drawReality.regularPoolUnits || state.drawableUnits.length || 0}</p>
                      <p className="text-[9px] font-bold uppercase text-zinc-600 group-hover:text-green-500 transition-colors">
                        {state.drawableUnits.length > 0 ? 'Tap to see all →' : 'Regular Pool Units'}
                      </p>
                    </button>
                    <div className="px-6 py-4 text-center">
                      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Random Pool</p>
                      <p className="text-2xl font-black text-amber-400">{state.drawReality.randomPoolUnits}</p>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase">Viable Options</p>
                    </div>
                    <div className="px-6 py-4 text-center">
                      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">Best Unit</p>
                      <p className="text-2xl font-black text-zinc-100">{state.drawReality.bestLimitedUnit || '—'}</p>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase">{state.drawReality.pointsToNextUnit > 0 ? `${state.drawReality.pointsToNextUnit} pts away` : 'Drawable now'}</p>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div>
                      <p className="text-amber-500 font-black uppercase text-xs tracking-widest mb-3">{state.actionPlan.headline}</p>
                      <div className="space-y-2">
                        {(state.actionPlan.steps || []).map((step: string, i: number) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="text-amber-600 font-black text-xs mt-0.5 shrink-0">{i + 1}.</span>
                            <p className="text-zinc-300 text-sm">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {state.actionPlan.randomPoolPlays?.length > 0 && (
                      <div className="bg-black border border-zinc-800 rounded-xl p-5">
                        <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-3">Random Pool Plays This Year</p>
                        <div className="flex flex-wrap gap-2">
                          {state.actionPlan.randomPoolPlays.map((unit: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-amber-900/20 border border-amber-800/40 rounded-full text-amber-400 text-[10px] font-black uppercase">{unit}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {state.actionPlan.pointBankingAdvice && (
                      <p className="text-zinc-500 text-xs italic border-l-2 border-zinc-700 pl-3">{state.actionPlan.pointBankingAdvice}</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Unit Recommendation Cards */}
            <div className="grid gap-8">
              {state.recommendations.map((rec, i) => {
                const isResidentProfile = state.profile.residency === 'Resident';
                const tierConfig = STRATEGY_LABELS[rec.tier] || null;
                return (
                  <div key={rec.unit || i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-zinc-800/40 px-8 py-6 border-b border-zinc-800 grid grid-cols-2 md:grid-cols-6 gap-6 items-center">
                      <div>
                        <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest leading-none">{rec.state || state.profile.states[0]}</span>
                        <p className="text-2xl font-black italic uppercase text-white leading-tight">UNIT {rec.unit}</p>
                        {tierConfig && (
                          <span className={`text-[9px] font-black uppercase tracking-widest ${tierConfig.color}`}>{tierConfig.label}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Trophy Ceiling</p>
                        <p className="text-lg font-black italic text-zinc-100">{rec.topEndScore || rec.topEnd}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Season</p>
                        <p className="text-lg font-black italic text-zinc-100 uppercase">
                          {(() => {
                            if (typeof rec.season === 'string') return rec.season;
                            const parts = [];
                            if (rec.season?.archery) parts.push(`Archery: ${rec.season.archery.open} - ${rec.season.archery.close}`);
                            if (rec.season?.rifle) parts.push(`Rifle: ${rec.season.rifle.open} - ${rec.season.rifle.close}`);
                            return parts.length > 0 ? parts.join(' | ') : rec.seasonName || 'Oct 1-31';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Terrain</p>
                        <p className="text-lg font-black italic capitalize">{rec.terrain || rec.terrainType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Current Odds</p>
                        <p className="text-lg font-black italic text-green-500 uppercase">
                          {rec.currentOdds || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase text-zinc-500 font-black mb-1">Predicted</p>
                        <p className={`text-lg font-black italic uppercase ${rec.oddsDirection === 'UP' ? 'text-green-400' : rec.oddsDirection === 'DOWN' ? 'text-red-400' : 'text-amber-400'}`}>
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
                        {rec.tradeoffs && <p className="text-zinc-500 text-xs mt-3 italic border-l-2 border-zinc-700 pl-3">{rec.tradeoffs}</p>}
                      </div>
                      <button
                        onClick={() => handlePlanSubmit({ ...state.profile, unit: rec.unit, selectedState: rec.state || state.profile.states[0] })}
                        className="w-full md:w-64 bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[10px] shadow-xl"
                      >
                        Learn More
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* UNIT BRIEF / HUNT PLAN / GEAR LIST */}
        {['unit-brief', 'hunt-plan', 'gear-list'].includes(state.step) && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-1000 text-left">
            <div className="flex justify-center gap-4 mb-4">
              {['unit-brief', 'hunt-plan', 'gear-list'].map(t => (
                <button key={t} onClick={() => setState(s => ({ ...s, step: t as any }))} className={`px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border transition-all ${state.step === t ? 'bg-amber-600 border-amber-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                  {t.replace('-', ' ')}
                </button>
              ))}
            </div>
            <h2 className="text-4xl font-black italic uppercase border-l-8 border-amber-600 pl-8 leading-none">
              {state.step === 'unit-brief' ? 'Unit Visualization' : state.step.replace('-', ' ')}
            </h2>
            <div className="bg-zinc-900/80 p-12 rounded-3xl border border-zinc-800 shadow-inner">
              {state.step === 'unit-brief' && (
                <div className="space-y-8">
                  {/* Real unit boundary on satellite imagery — the first grounded
                      e-scouting layer, replacing invented "access" prose. */}
                  <div className="rounded-2xl overflow-hidden border border-zinc-800">
                    <UnitMap unit={state.planUnit} state={state.planState} species={state.planSpecies} />
                  </div>
                  {typeof state.unitBrief === 'object' && state.unitBrief !== null ? (
                    Object.entries(state.unitBrief).map(([key, value]) => (
                      <div key={key} className="border-b border-zinc-800 pb-6 last:border-0">
                        <h3 className="font-black uppercase text-amber-500 text-xs tracking-[0.2em] mb-3">{key}</h3>
                        <div className="text-zinc-300 text-sm leading-loose whitespace-pre-wrap font-sans">
                          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">{state.unitBrief || 'No data available.'}</pre>
                  )}
                </div>
              )}
              {state.step === 'hunt-plan' && (() => {
                const plan = state.huntPlan;
                const days: any[] = Array.isArray(plan) ? plan : typeof plan === 'object' && plan !== null ? Object.values(plan) : [];
                if (days.length === 0) return <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">{String(plan || 'No plan generated.')}</pre>;
                return (
                  <div className="space-y-8">
                    {days.map((day: any, i: number) => (
                      <div key={day.title || i} className="border-l-4 border-amber-600 pl-6">
                        <h3 className="font-black uppercase text-amber-500 text-xs tracking-widest mb-3">{day.title || 'Day ' + (i + 1)}</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed">{day.plan || day.description || day.content || ''}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {state.step === 'gear-list' && (() => {
                const gear = state.gearList;
                const categories: any[] = Array.isArray(gear) ? gear : typeof gear === 'object' && gear !== null ? Object.values(gear) : [];
                if (categories.length === 0) return <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">{String(gear || 'No gear list generated.')}</pre>;
                return (
                  <div className="space-y-10">
                    {categories.map((cat: any, i: number) => (
                      <div key={cat.category || i}>
                        <h3 className="font-black uppercase text-amber-500 text-xs tracking-widest mb-4 border-b border-zinc-800 pb-2">{cat.category || 'Category ' + (i + 1)}</h3>
                        <div className="space-y-4">
                          {(cat.items || []).map((item: any, j: number) => (
                            <div key={j} className="flex gap-4">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
                              <div>
                                <p className="font-black text-zinc-100 text-sm">{item.item}</p>
                                {item.reason && <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.reason}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}