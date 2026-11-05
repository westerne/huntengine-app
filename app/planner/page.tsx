'use client';

// HuntQuarters planner: holds the questionnaire state and talks to the API.
// Screens live in their own files (ScoutSteps, PlanSteps, ScoutResults,
// BriefView, …); this file only wires them together.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { ArrowLeft, OctagonAlert, RotateCcw, X } from 'lucide-react';
import { Button, ButtonLink, Card, Eyebrow } from '../ui';
import { Loader } from '../ui/client';
import type { FlowStep, HuntPlannerState, Profile } from './types';
import { INITIAL_STATE } from './types';
import { PLAN_STEPS, SCOUT_STEPS, STATES, plannerFlags, speciesFor } from './constants';
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
    // Deep links: /planner?start=find|tag, optionally with the state and
    // species already chosen. /find sends those, having just shown the hunter
    // what their points buy there — asking again would throw that away.
    const params = new URLSearchParams(window.location.search);
    const start = params.get('start');
    const st = (params.get('state') || '').toUpperCase();
    const sp = params.get('species') || '';
    const chosen = STATES.includes(st)
      ? { states: [st], ...(speciesFor(st).includes(sp) ? { species: sp } : {}) }
      : {};

    fetch('/api/me').then((r) => r.json()).then((m: Me) => {
      setMe(m);
      // Members: fill the questionnaire from their saved profile and points,
      // then let an explicit deep-link choice win — it arrives first but the
      // prefill resolves later and would otherwise overwrite it.
      if (m.accounts && m.member) setState((s) => ({ ...s, profile: { ...prefillFromAccount(s.profile, m), ...chosen } }));
    }).catch(() => setMe({ accounts: true, signedIn: false, member: false }));

    if (start === 'find') setState((s) => ({ ...s, step: 'scout-1', entryMode: 'needs-tag', profile: { ...s.profile, ...chosen } }));
    if (start === 'tag') setState((s) => ({ ...s, step: 'plan-1', entryMode: 'has-tag', profile: { ...s.profile, ...chosen } }));
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
    <div className="hq" style={{ minHeight: '100vh' }}>
      {accounts
        ? me && !isMember && !betaReady && <AccountGate signedIn={me.accounts && me.signedIn} />
        : !betaReady && <BetaGate error={state.error} onEnter={enterBeta} />}

      {state.loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 24,
          background: 'var(--scrim)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <Loader lines={[state.loadingMessage.replace(/\.+$/, '') || 'Working']} />
        </div>
      )}

      {state.error && !state.loading && (
        <div
          role="alert"
          className="hq-caveat hq-caveat--stop"
          style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60,
            width: 'calc(100% - 32px)', maxWidth: 448, boxShadow: 'var(--shadow-md)', alignItems: 'center',
          }}
        >
          <OctagonAlert size={16} aria-hidden="true" />
          <p style={{ flex: 1, minWidth: 0 }}>{state.error}</p>
          <Button type="button" variant="ghost" size="sm" aria-label="Dismiss error" onClick={() => setState((s) => ({ ...s, error: null }))}>
            <X size={16} aria-hidden="true" />
          </Button>
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

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {state.step !== 'entry' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '-8px -12px 0' }}>
            {(isBriefTab(state.step) || state.step === 'recommendations') ? (
              <Button type="button" variant="ghost" size="sm" onClick={goBack}><ArrowLeft size={16} aria-hidden="true" /> Back</Button>
            ) : <span />}
            <Button type="button" variant="ghost" size="sm" onClick={startOver}><RotateCcw size={14} aria-hidden="true" /> Start over</Button>
          </div>
        )}

        {state.step === 'entry' && (
          <>
            <div>
              <Eyebrow>Find</Eyebrow>
              <h1 className="hq-h1" style={{ marginTop: 4 }}>Where do you want to start?</h1>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <Card className="hq-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 className="hq-h2">Find a hunt</h2>
                <p className="hq-body" style={{ flex: 1 }}>Build your next seasons from your points, then compare the hunts worth applying for.</p>
                {/* Planning first: the unit picker runs inside it, not before
                    it. Reached as a tool from My Season via ?start=find. */}
                <div style={{ marginTop: 8 }}><ButtonLink href="/calendar/setup" variant="secondary" block>Start planning</ButtonLink></div>
              </Card>
              <Card className="hq-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 className="hq-h2">I already have a tag</h2>
                <p className="hq-body" style={{ flex: 1 }}>Drew it or bought it? Get a unit brief, hunt plan and gear list.</p>
                <Button type="button" block style={{ marginTop: 8 }} onClick={() => setState((s) => ({ ...s, step: 'plan-1', entryMode: 'has-tag' }))}>Start scouting</Button>
              </Card>
            </div>
          </>
        )}

        {(SCOUT_STEPS as readonly string[]).includes(state.step) && (
          <ScoutSteps {...stepProps(SCOUT_STEPS)} onSubmit={handleScoutSubmit} />
        )}

        {(PLAN_STEPS as readonly string[]).includes(state.step) && (
          <PlanSteps {...stepProps(PLAN_STEPS)} onSubmit={() => handlePlanSubmit()} />
        )}

        {state.step === 'recommendations' && (
          <div className="hq-fade-up">
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
      </main>
    </div>
  );
}
