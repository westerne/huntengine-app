'use client';

// "I already have a tag" questionnaire: plan-1 … plan-4.

import type { StepProps } from './types';
import { FITNESS_LEVELS, SCOUTING_OPTIONS, STATES, STYLE_OPTIONS, WEAPON_OPTIONS, speciesFor, withState } from './constants';
import { ChoiceList, FieldLabel, PointsInput, ProgressBar, ResidencyPicker, StepNav, TogglePill } from './ui';

export default function PlanSteps(props: StepProps & { onSubmit: () => void }) {
  const { profile, updateProfile, goTo, togglePreference, progress, flags, onSubmit } = props;
  const step = progress.current;

  if (step === 'plan-1') return (
    <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">The Tag</h2>
      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>State</FieldLabel>
            <select aria-label="State" className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={profile.states[0]} onChange={(e) => updateProfile(withState(profile, e.target.value))}>
              {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Species</FieldLabel>
            <select aria-label="Species" className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={profile.species} onChange={(e) => updateProfile({ species: e.target.value })}>
              {speciesFor(profile.states[0]).map((sp) => <option key={sp} value={sp}>{sp}</option>)}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel>Unit Name or Number</FieldLabel>
          <input type="text" aria-label="Unit name or number" placeholder="e.g. 102 or Book Cliffs" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-100 font-black text-xl outline-none focus:border-amber-500" value={profile.unit} onChange={(e) => updateProfile({ unit: e.target.value })} />
        </div>
        <StepNav onNext={() => goTo('plan-2')} />
      </div>
    </div>
  );

  if (step === 'plan-2') return (
    <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Hunter Profile</h2>
      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
        <div>
          <FieldLabel>Residency</FieldLabel>
          <ResidencyPicker value={profile.residency} onPick={(r) => updateProfile({ residency: r })} />
        </div>
        <div className="bg-black p-6 rounded-2xl border border-zinc-800">
          <div className="flex justify-between items-center">
            <div><h4 className="font-black uppercase text-sm">Total Points</h4><p className="text-[10px] text-zinc-500 font-bold uppercase">Points held when you drew</p></div>
            {flags.noPointSystem ? (
              <div className="bg-amber-900/20 border border-amber-900/40 px-4 py-2 rounded-xl text-center">
                <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest leading-none">Random Draw</p>
              </div>
            ) : (
              <PointsInput
                className="bg-zinc-900 border border-zinc-700 w-24 p-3 text-center rounded-xl text-amber-500 font-black text-2xl outline-none"
                value={profile.points[flags.selState] || 0}
                onChange={(n) => updateProfile({ points: { ...profile.points, [flags.selState]: n } })}
              />
            )}
          </div>
        </div>
        <StepNav onBack={() => goTo('plan-1')} onNext={() => goTo('plan-3')} />
      </div>
    </div>
  );

  if (step === 'plan-3') return (
    <div className="max-w-4xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Style & Weapon</h2>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
          <div>
            <FieldLabel>Weapon</FieldLabel>
            <div className="flex flex-wrap gap-2">{WEAPON_OPTIONS.map((w) => <TogglePill key={w} label={w} active={profile.weapons.includes(w)} onClick={() => togglePreference('weapons', w)} />)}</div>
          </div>
          <div>
            <FieldLabel>Fitness</FieldLabel>
            <div className="flex flex-wrap gap-2">{FITNESS_LEVELS.map((f) => <TogglePill key={f} label={f} active={profile.fitness === f} onClick={() => updateProfile({ fitness: f })} />)}</div>
          </div>
        </div>
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
          <div>
            <FieldLabel>Style</FieldLabel>
            <ChoiceList options={STYLE_OPTIONS.map((o) => ({ value: o, label: o }))} isActive={(o) => profile.huntStyles.includes(o)} onPick={(o) => togglePreference('huntStyles', o)} />
          </div>
        </div>
      </div>
      <StepNav className="flex gap-4 max-w-md mx-auto" onBack={() => goTo('plan-2')} onNext={() => goTo('plan-4')} />
    </div>
  );

  if (step === 'plan-4') return (
    <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Logistics & Context</h2>
      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Days to Hunt</FieldLabel>
            <input type="number" min={1} aria-label="Days to hunt" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold outline-none" value={profile.daysToHunt} onChange={(e) => updateProfile({ daysToHunt: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Scouting</FieldLabel>
            <select aria-label="Scouting availability" className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none" value={profile.scoutingAvailability} onChange={(e) => updateProfile({ scoutingAvailability: e.target.value })}>
              {SCOUTING_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel>Additional Info</FieldLabel>
          <textarea rows={5} aria-label="Additional info" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold outline-none focus:border-amber-500" placeholder="I've looked at the north ridge, I usually access from the south..." value={profile.notes} onChange={(e) => updateProfile({ notes: e.target.value })} />
        </div>
        <StepNav onBack={() => goTo('plan-3')} onNext={onSubmit} nextLabel="Generate Plan" primary />
      </div>
    </div>
  );

  return null;
}
