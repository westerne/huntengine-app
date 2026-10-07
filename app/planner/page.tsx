'use client';

// HuntQuarters planner: holds the questionnaire state and talks to the API.
// Screens live in their own files (ScoutSteps, PlanSteps, ScoutResults,
// BriefView, …); this file only wires them together.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import type { FlowStep, HuntPlannerState, Profile } from './types';
import { INITIAL_STATE } from './types';
import { PLAN_STEPS, SCOUT_STEPS, plannerFlags } from './constants';
import { BETA_KEY, failureMessage, messageForStatus, postStrategy } from './api';
import BetaGate from './BetaGate';
import DrawablePanel from './DrawablePanel';
import ScoutSteps from './ScoutSteps';
import PlanSteps from './PlanSteps';
import ScoutResults from './ScoutResults';
import SearchSummary from './SearchSummary';
import BriefView, { BRIEF_TABS } from './BriefView';
import AccountGate from './AccountGate';
import { accountsEnabled } from '@/lib/supabase/config';
import { pointsFor, prefillFromAccount, savePayload, type Me } from './account';

const isBriefTab = (s: FlowStep): s is (typeof BRIEF_TABS)[number] => (BRIEF_TABS as readonly string[]).includes(s);

export default function App() {
  const [state, setState] = useState<HuntPlannerState>(INITIAL_STATE);
  const { profile } = state;
  const flags = plannerFlags(profile);

  const updateProfile = (patch: Partial<Profile>) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const goTo = (step: FlowStep) => setState((s) => ({ ...s, step }));

  // ─── Access: accounts (when Supabase is configured) or the beta code ──────
  const accounts = accountsEnabled();
  const [me, setMe] = useState<Me | null>(null);
  const [betaReady, setBetaReady] = useState(false);
  useEffect(() => {
    try {
      if ((sessionStorage.getItem(BETA_KEY) || '').trim()) setBetaReady(true);
    } catch {}
    if (!accounts) return;
    fetch('/api/me').then((r) => r.json()).then((m: Me) => {
      setMe(m);
      // Members: fill the questionnaire from their saved profile and points.
      if (m.accounts && m.member) setState((s) => ({ ...s, profile: prefillFromAccount(s.profile, m) }));
    }).catch(() => setMe({ accounts: true, signedIn: false, member: false }));
    // Deep links from My Season: /planner?start=find | tag
    const start = new URLSearchParams(window.location.search).get('start');
    if (start === 'find') setState((s) => ({ ...s, step: 'scout-1', entryMode: 'needs-tag' }));
    if (start === 'tag') setState((s) => ({ ...s, step: 'plan-1', entryMode: 'has-tag' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isMember = !!(me && me.accounts && me.member);
  // A member's saved points follow the species they pick.
  useEffect(() => {
    if (me && me.accounts && me.member) updateProfile({ points: pointsFor(me.points, profile.species) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.species]);
  // …and residency follows the state: resident only in their saved home state.
  // (They can still flip it by hand for this search.)
  useEffect(() => {
    const home = me && me.accounts && me.member ? me.profile?.home_state : null;
    if (home) updateProfile({ residency: profile.states[0] === home ? 'Resident' : 'Non-Resident' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.states]);
  const enterBeta = (code: string) => {
    try { sessionStorage.setItem(BETA_KEY, code); } catch {}
    setState((s) => ({ ...s, error: null }));
    setBetaReady(true);
  };
  // If the server rejects the code (401), clear it and re-show the gate.
  const resetBeta = () => {
    try { sessionStorage.removeItem(BETA_KEY); } catch {}
    setBetaReady(false);
  };

  // Random-draw combinations hold no points; keep the stored value at 0.
  useEffect(() => {
    if (!flags.selState) return;
    if (flags.noPointSystem && profile.points[flags.selState] !== 0) {
      updateProfile({ points: { ...profile.points, [flags.selState]: 0 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.residency, profile.species, profile.states]);

  const togglePreference = (field: 'weapons' | 'huntStyles' | 'seasons', value: string) => {
    setState((s) => {
      let next = [...s.profile[field]];
      if (field === 'weapons') {
        if (value === 'Any') next = ['Any'];
        else {
          next = next.filter((v) => v !== 'Any');
          next = next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
          if (next.length === 0) next = ['Any'];
        }
      } else {
        next = next.includes(value) ? next.filter((v) => v !== value) : [...next, value];
      }
      return { ...s, profile: { ...s.profile, [field]: next } };
    });
  };

  // ─── API calls ─────────────────────────────────────────────────────────────
  const handleScoutSubmit = async () => {
    setState((s) => ({ ...s, loading: true, loadingMessage: 'Analyzing planning horizons...', error: null }));
    try {
      const res = await postStrategy({ mode: 'SCOUT', formData: profile });
      if (!res.ok) {
        if (res.status === 401) resetBeta();
        setState((s) => ({ ...s, loading: false, error: messageForStatus(res.status) }));
        return;
      }
      const data = await res.json();
      setState((s) => ({
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
      setState((s) => ({ ...s, loading: false, error: failureMessage(err, 'Analysis') }));
    }
  };

  const handlePlanSubmit = async (customProfile?: any) => {
    const dataToSubmit = customProfile || profile;
    setState((s) => ({ ...s, loading: true, loadingMessage: 'Building Tactical Strategy...', error: null }));
    try {
      const res = await postStrategy({ mode: 'FULL_SUITE', formData: dataToSubmit });
      if (!res.ok) {
        if (res.status === 401) resetBeta();
        setState((s) => ({ ...s, loading: false, error: messageForStatus(res.status) }));
        return;
      }
      const data = await res.json();
      setState((s) => ({
        ...s,
        unitBrief: data.brief,
        huntPlan: data.tactical,
        gearList: data.gear,
        planUnit: String(dataToSubmit.unit || ''),
        planState: String(dataToSubmit.selectedState || dataToSubmit.states?.[0] || 'WY'),
        planSpecies: String(dataToSubmit.species || ''),
        planRec: dataToSubmit.planRec ?? null,
        step: 'unit-brief',
        loading: false,
      }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: failureMessage(err, 'Building the plan') }));
    }
  };

  // ─── Save to My Season ─────────────────────────────────────────────────────
  // Saved state per card, keyed by hunt code (or unit), so a card shows
  // "Saved" and links to the existing record instead of saving twice.
  const [saved, setSaved] = useState<Record<string, { id?: string; busy?: boolean; error?: string }>>({});
  const saveKey = (rec: any) => String(rec.huntCode ?? rec.unit ?? '');
  const saveHunt = async (rec: any, extra: { status?: string; source?: string } = {}) => {
    const key = saveKey(rec);
    setSaved((m) => ({ ...m, [key]: { busy: true } }));
    try {
      const res = await fetch('/api/hunts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload(rec, profile, extra)),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not save.');
      setSaved((m) => ({ ...m, [key]: { id: j.hunt?.id } }));
    } catch (e) {
      setSaved((m) => ({ ...m, [key]: { error: e instanceof Error ? e.message : 'Could not save.' } }));
    }
  };

  // Brief for a specific hunt picked off the results or the drawable panel.
  const briefFor = (rec: any) =>
    handlePlanSubmit({ ...profile, unit: rec.unit, huntCode: rec.huntCode, selectedState: rec.state || profile.states[0], planRec: rec });

  const startOver = () => setState((s) => ({
    ...s, step: 'entry', entryMode: null, unitBrief: null, recommendations: [], drawableUnits: [],
    drawReality: null, actionPlan: null, strategyPath: null, showDrawablePanel: false, error: null,
  }));

  // From a brief opened off the results, go back to the results, not the form.
  const goBack = () => setState((s) => ({
    ...s,
    step: isBriefTab(s.step) && s.recommendations.length > 0
      ? 'recommendations'
      : s.entryMode === 'has-tag' ? 'plan-4' : 'scout-4',
  }));

  const stepProps = (steps: readonly FlowStep[]) => ({
    profile, updateProfile, goTo, togglePreference, flags,
    progress: { steps: steps as FlowStep[], current: state.step },
  });

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-amber-500/30">
      {accounts
        ? me && !isMember && !betaReady && <AccountGate signedIn={me.accounts && me.signedIn} />
        : !betaReady && <BetaGate error={state.error} onEnter={enterBeta} />}

      {state.loading && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
          <div className="w-12 h-12 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin mb-4" />
          <p className="text-amber-500 font-black uppercase tracking-[0.2em] animate-pulse text-xs">{state.loadingMessage}</p>
        </div>
      )}

      {state.error && !state.loading && (
        <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)] bg-red-950/90 border border-red-700 text-red-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur flex items-start gap-3">
          <p className="flex-1 text-[11px] font-bold uppercase tracking-wide leading-snug">{state.error}</p>
          <button type="button" aria-label="Dismiss error" onClick={() => setState((s) => ({ ...s, error: null }))} className="text-red-300 hover:text-white font-black leading-none text-lg">×</button>
        </div>
      )}

      {state.showDrawablePanel && (
        <DrawablePanel
          units={state.drawableUnits}
          stateCode={profile.states[0]}
          onClose={() => setState((s) => ({ ...s, showDrawablePanel: false }))}
          onPick={(unit) => { setState((s) => ({ ...s, showDrawablePanel: false })); briefFor(unit); }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        {state.step !== 'entry' && (
          <div className="flex items-center justify-center space-x-4 mb-8 text-[10px] uppercase tracking-widest font-black">
            <button type="button" className="text-zinc-600 hover:text-amber-500 transition-colors" onClick={startOver}>START OVER</button>
            <span className="text-zinc-800">|</span>
            {(isBriefTab(state.step) || state.step === 'recommendations') && (
              <button type="button" className="text-zinc-500 hover:text-white" onClick={goBack}>BACK</button>
            )}
          </div>
        )}

        {state.step === 'entry' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
            <h1 className="text-6xl font-black mb-16 tracking-tighter uppercase italic text-amber-500">HuntQuarters</h1>
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl text-left">
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:border-amber-900/50 transition-all">
                <h2 className="text-2xl font-black mb-2 italic text-zinc-300 uppercase tracking-tighter">Find a Hunt</h2>
                <p className="text-zinc-500 mb-8 text-sm">Analyze states and units based on points and trophy goals.</p>
                <button type="button" onClick={() => setState((s) => ({ ...s, step: 'scout-1', entryMode: 'needs-tag' }))} className="w-full border-2 border-zinc-700 text-white py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Start Scouting</button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl hover:border-amber-900/50 transition-all">
                <h2 className="text-2xl font-black mb-2 italic text-amber-500 uppercase tracking-tighter">I Already Have a Tag</h2>
                <p className="text-zinc-500 mb-8 text-sm">Get a unit brief, hunt plan and gear list for your hunt.</p>
                <button type="button" onClick={() => setState((s) => ({ ...s, step: 'plan-1', entryMode: 'has-tag' }))} className="w-full bg-zinc-100 text-black py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs transition-colors">Start Planning</button>
              </div>
            </div>
          </div>
        )}

        {(SCOUT_STEPS as readonly string[]).includes(state.step) && (
          <ScoutSteps {...stepProps(SCOUT_STEPS)} onSubmit={handleScoutSubmit} />
        )}

        {(PLAN_STEPS as readonly string[]).includes(state.step) && (
          <PlanSteps {...stepProps(PLAN_STEPS)} onSubmit={() => handlePlanSubmit()} />
        )}

        {state.step === 'recommendations' && (
          <div className="animate-in fade-in duration-500">
            <ScoutResults
              recommendations={state.recommendations}
              drawReality={state.drawReality}
              actionPlan={state.actionPlan}
              stateCode={profile.states[0]}
              species={profile.species}
              drawableCount={state.drawableUnits.length}
              onLearnMore={briefFor}
              onShowDrawable={() => setState((s) => ({ ...s, showDrawablePanel: true }))}
              searchSummary={<SearchSummary profile={profile} flags={flags} />}
              save={isMember ? { state: saved, keyOf: saveKey, onSave: (rec) => saveHunt(rec) } : undefined}
            />
          </div>
        )}

        {isBriefTab(state.step) && (
          <BriefView
            tab={state.step}
            onTab={goTo}
            unitBrief={state.unitBrief}
            huntPlan={state.huntPlan}
            gearList={state.gearList}
            map={{ unit: state.planUnit, state: state.planState, species: state.planSpecies }}
            save={!isMember ? undefined
              // "I already have a tag" → saved as Tag secured.
              : state.entryMode === 'has-tag' ? {
                  saved: saved[state.planUnit],
                  label: 'Save this tag to My Season',
                  savedText: 'Saved to My Season as Tag secured — open it',
                  onSave: () => saveHunt({ unit: state.planUnit, state: state.planState }, { status: 'tag_secured', source: 'has_tag' }),
                }
              // Brief opened from a recommendation → save that hunt.
              : state.planRec ? {
                  saved: saved[saveKey(state.planRec)],
                  label: 'Save this hunt to My Season',
                  savedText: 'Saved to My Season — open it',
                  onSave: () => saveHunt(state.planRec),
                }
              : undefined}
          />
        )}
      </div>
    </div>
  );
}
