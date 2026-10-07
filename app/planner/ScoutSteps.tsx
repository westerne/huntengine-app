'use client';

// "Find a Hunt" questionnaire: scout-1 … scout-4.

import type { DrawTimeline, StepProps } from './types';
import {
  COMING_SOON_STATES, EXPERIENCE_OPTIONS, FITNESS_LEVELS, SACRIFICE_OPTIONS, SEASON_WINDOWS,
  STATES, STYLE_OPTIONS, TIMELINES, TROPHY_CONFIG, WEAPON_OPTIONS, speciesFor, withState,
} from './constants';
import { ChoiceList, FieldLabel, PointsInput, ProgressBar, ResidencyPicker, StepNav, TogglePill, ToggleSwitch } from './ui';

export default function ScoutSteps(props: StepProps & { onSubmit: () => void }) {
  const { profile, updateProfile, goTo, togglePreference, progress, flags, onSubmit } = props;
  const step = progress.current;

  if (step === 'scout-1') return (
    <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Target State & Species</h2>
      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-10">
        <div>
          <FieldLabel>Select State</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {STATES.map((st) => (
              <TogglePill key={st} label={st} active={profile.states.includes(st)} onClick={() => updateProfile(withState(profile, st))} />
            ))}
            {COMING_SOON_STATES.map((st) => (
              <span key={st} title="Coming soon" className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-950 text-[10px] font-black uppercase tracking-widest text-zinc-700 cursor-not-allowed">{st} · Soon</span>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Select Species</FieldLabel>
          <select aria-label="Species" className="w-full bg-black border border-zinc-800 p-4 rounded-xl font-bold text-zinc-300 outline-none focus:border-amber-600" value={profile.species} onChange={(e) => updateProfile({ species: e.target.value })}>
            {speciesFor(profile.states[0]).map((sp) => <option key={sp} value={sp}>{sp}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Residency</FieldLabel>
          <ResidencyPicker value={profile.residency} onPick={(r) => updateProfile({ residency: r })} />
        </div>
        <StepNav onNext={() => goTo('scout-2')} />
      </div>
    </div>
  );

  if (step === 'scout-2') {
    const config = TROPHY_CONFIG[profile.species];
    const trophy = config ? parseInt(profile.trophyQuality) || config.min : 0;
    return (
      <div className="max-w-3xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
        <ProgressBar {...progress} />
        <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500">Timeline & Goals</h2>
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-10">
          <div className="grid md:grid-cols-1 gap-6">
            <div className="bg-black p-6 rounded-2xl border border-zinc-800">
              <FieldLabel>Current Points Held</FieldLabel>
              {flags.noPointSystem ? (
                <div className="bg-amber-900/20 border border-amber-900/40 p-4 rounded-xl text-center">
                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Pure Random Draw Pool</p>
                  <p className="text-[8px] text-amber-600/80 font-bold uppercase mt-1">No point system applicable for this combination</p>
                </div>
              ) : (
                <PointsInput
                  className="bg-zinc-900 border border-zinc-700 w-full p-3 text-center rounded-xl text-amber-500 font-black text-2xl outline-none"
                  value={profile.points[flags.selState] || 0}
                  onChange={(n) => updateProfile({ points: { ...profile.points, [flags.selState]: n } })}
                />
              )}
            </div>

            {/* Special Draw toggle — WY Non-Resident only */}
            {flags.showSpecialDrawOption && (
              <ToggleSwitch
                label="Include Wyoming Special Draw"
                sublabel="Special draw licenses cost more than regular ones (check WGFD for current fees) and often draw at lower point levels. Toggle off to see regular draw only."
                value={profile.includeSpecialDraw}
                onChange={(v) => updateProfile({ includeSpecialDraw: v })}
                warningLabel="Special draw excluded — recommendations will use regular and random pools only."
              />
            )}

            <div className="bg-black p-6 rounded-2xl border border-zinc-800">
              <FieldLabel>When do you want to hunt this?</FieldLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIMELINES.map((t) => (
                  <button key={t} type="button" aria-pressed={profile.drawTimeline === t} onClick={() => updateProfile({ drawTimeline: t as DrawTimeline })} className={`py-3 rounded-xl border font-black uppercase text-[10px] transition-all ${profile.drawTimeline === t ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-900/50' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>{t}</button>
                ))}
              </div>
              <p className="text-[9px] text-zinc-600 font-bold uppercase mt-4 text-center">Selecting a longer horizon allows the engine to suggest units with higher trophy potential.</p>
            </div>
          </div>

          <div className="space-y-6">
            <FieldLabel className="">Minimum Trophy Goal</FieldLabel>
            {!config ? (
              <div className="p-6 bg-black rounded-xl text-zinc-600 text-[10px] font-black uppercase text-center">Score Tracking Restricted</div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-4xl font-black text-amber-500 italic">{trophy}&quot;+</span>
                  <span className="text-[10px] font-black text-zinc-600 uppercase">{config.label}</span>
                </div>
                <input type="range" aria-label="Minimum trophy score" min={config.min} max={config.max} step={config.step} value={trophy} onChange={(e) => updateProfile({ trophyQuality: e.target.value })} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
              </div>
            )}
          </div>

          <StepNav onBack={() => goTo('scout-1')} onNext={() => goTo('scout-3')} />
        </div>
      </div>
    );
  }

  if (step === 'scout-3') return (
    <div className="max-w-4xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-8 text-amber-500 text-center">Hunting Style</h2>
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
          <div>
            <FieldLabel>Weapon Preference</FieldLabel>
            <div className="flex flex-wrap gap-2">{WEAPON_OPTIONS.map((w) => <TogglePill key={w} label={w} active={profile.weapons.includes(w)} onClick={() => togglePreference('weapons', w)} />)}</div>
          </div>
          <div>
            <FieldLabel>Fitness Level</FieldLabel>
            <div className="flex flex-wrap gap-2">{FITNESS_LEVELS.map((f) => <TogglePill key={f} label={f} active={profile.fitness === f} onClick={() => updateProfile({ fitness: f })} />)}</div>
          </div>

          {/* Grizzly Country Toggle — WY, MT, ID only */}
          {flags.showGrizzlyOption && (
            <div>
              <FieldLabel>Grizzly Bear Country</FieldLabel>
              <ToggleSwitch
                label="Comfortable hunting active grizzly habitat"
                sublabel="Several top units in WY/MT/ID have significant grizzly populations. Toggle off to exclude these units."
                value={profile.grizzlyComfort}
                onChange={(v) => updateProfile({ grizzlyComfort: v })}
                warningLabel="Grizzly units excluded — some top trophy units will not appear in your results."
              />
            </div>
          )}
        </div>
        <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
          <div>
            <FieldLabel>Hunt Style</FieldLabel>
            <ChoiceList options={STYLE_OPTIONS.map((o) => ({ value: o, label: o }))} isActive={(o) => profile.huntStyles.includes(o)} onPick={(o) => togglePreference('huntStyles', o)} />
          </div>
          <div>
            <FieldLabel>Preferred Season</FieldLabel>
            <div className="flex flex-wrap gap-2">{SEASON_WINDOWS.map((sw) => <TogglePill key={sw.id} label={sw.label} active={profile.seasons.includes(sw.id)} onClick={() => togglePreference('seasons', sw.id)} />)}</div>
          </div>
        </div>
      </div>
      <StepNav className="flex gap-4 max-w-md mx-auto" onBack={() => goTo('scout-2')} onNext={() => goTo('scout-4')} />
    </div>
  );

  if (step === 'scout-4') return (
    <div className="max-w-2xl mx-auto text-left animate-in fade-in slide-in-from-bottom-4">
      <ProgressBar {...progress} />
      <h2 className="text-3xl font-black uppercase italic mb-2 text-amber-500">Your Hunting Context</h2>
      <p className="text-zinc-500 text-sm mb-8">The more you tell us, the more specific your recommendations will be. All fields optional.</p>
      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 space-y-8">
        <div>
          <FieldLabel>Experience with this species</FieldLabel>
          <ChoiceList options={EXPERIENCE_OPTIONS.map((o) => ({ value: o, label: o }))} isActive={(o) => profile.pastExperience === o} onPick={(o) => updateProfile({ pastExperience: o })} />
        </div>

        <div>
          <FieldLabel>Trophy vs. Opportunity — what matters more?</FieldLabel>
          <ChoiceList options={SACRIFICE_OPTIONS} isActive={(v) => profile.sacrificeTrophy === v} onPick={(v) => updateProfile({ sacrificeTrophy: v })} />
        </div>

        <div>
          <FieldLabel className="mb-2">Units or areas you already know</FieldLabel>
          <p className="text-[9px] text-zinc-600 font-bold uppercase mb-3">We&apos;ll weight familiar units higher in your recommendations.</p>
          <textarea
            rows={3}
            aria-label="Units or areas you already know"
            className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm font-bold outline-none focus:border-amber-500 resize-none"
            placeholder="e.g. I've hunted the Hoback Canyon area, know the Gros Ventre drainage well..."
            value={profile.knownAreas}
            onChange={(e) => updateProfile({ knownAreas: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel className="mb-2">Tell us about yourself as a hunter</FieldLabel>
          <p className="text-[9px] text-zinc-600 font-bold uppercase mb-3">Past hunts, what you&apos;re after, animals you&apos;ve passed on, specific goals.</p>
          <textarea
            rows={5}
            aria-label="About you as a hunter"
            className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm font-bold outline-none focus:border-amber-500 resize-none"
            placeholder={'e.g. I\'ve been hunting Wyoming deer for 3 years, passed on 170" bucks waiting for something special. Looking for a unit where I have a realistic shot at 185"+ with my rifle in October...'}
            value={profile.hunterContext}
            onChange={(e) => updateProfile({ hunterContext: e.target.value })}
          />
        </div>

        <StepNav onBack={() => goTo('scout-3')} onNext={onSubmit} nextLabel="Find Units" primary />
      </div>
    </div>
  );

  return null;
}
