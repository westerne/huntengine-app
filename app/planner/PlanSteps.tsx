'use client';

// "I already have a tag" questionnaire: plan-1 … plan-4.

import type { StepProps } from './types';
import { FITNESS_LEVELS, SCOUTING_OPTIONS, STATES, STYLE_OPTIONS, WEAPON_OPTIONS, speciesFor, withState } from './constants';
import { ChipRow, ChoiceList, FieldLabel, PointsInput, ProgressBar, ResidencyPicker, StepHeader, StepNav, TogglePill } from './ui';
import { Card } from '../ui';

const twoUp = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' } as const;

export default function PlanSteps(props: StepProps & { onSubmit: () => void }) {
  const { profile, updateProfile, goTo, togglePreference, progress, flags, onSubmit } = props;
  const step = progress.current;

  if (step === 'plan-1') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="Your tag" />
      <Card>
        <div className="hq-stack hq-stack--lg">
          <div className="hq-fields">
            <label className="hq-field">
              <span className="hq-label">State</span>
              <select aria-label="State" className="hq-input" value={profile.states[0]} onChange={(e) => updateProfile(withState(profile, e.target.value))}>
                {STATES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </label>
            <label className="hq-field">
              <span className="hq-label">Species</span>
              <select aria-label="Species" className="hq-input" value={profile.species} onChange={(e) => updateProfile({ species: e.target.value })}>
                {speciesFor(profile.states[0]).map((sp) => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            </label>
            <label className="hq-field hq-span">
              <span className="hq-label">Unit name or number</span>
              <input type="text" aria-label="Unit name or number" placeholder="e.g. 102 or Book Cliffs" className="hq-input" style={{ fontSize: 17, fontWeight: 700 }} value={profile.unit} onChange={(e) => updateProfile({ unit: e.target.value })} />
            </label>
          </div>
          <StepNav onNext={() => goTo('plan-2')} />
        </div>
      </Card>
    </section>
  );

  if (step === 'plan-2') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="Hunter profile" />
      <Card>
        <div className="hq-stack hq-stack--lg">
          <div>
            <FieldLabel>Residency</FieldLabel>
            <ResidencyPicker value={profile.residency} onPick={(r) => updateProfile({ residency: r })} />
          </div>
          <div className="hq-inset" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p className="hq-h3">Total points</p>
              <p className="hq-small">Points you held when you drew</p>
            </div>
            {flags.noPointSystem ? (
              <span className="hq-small" style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Random draw</span>
            ) : (
              <PointsInput
                style={{ width: 96 }}
                value={profile.points[flags.selState] || 0}
                onChange={(n) => updateProfile({ points: { ...profile.points, [flags.selState]: n } })}
              />
            )}
          </div>
          <StepNav onBack={() => goTo('plan-1')} onNext={() => goTo('plan-3')} />
        </div>
      </Card>
    </section>
  );

  if (step === 'plan-3') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="Style and weapon" />
      <div style={twoUp}>
        <Card>
          <div className="hq-stack hq-stack--lg">
            <div>
              <FieldLabel>Weapon</FieldLabel>
              <ChipRow>{WEAPON_OPTIONS.map((w) => <TogglePill key={w} label={w} active={profile.weapons.includes(w)} onClick={() => togglePreference('weapons', w)} />)}</ChipRow>
            </div>
            <div>
              <FieldLabel>Fitness</FieldLabel>
              <ChipRow>{FITNESS_LEVELS.map((f) => <TogglePill key={f} label={f} active={profile.fitness === f} onClick={() => updateProfile({ fitness: f })} />)}</ChipRow>
            </div>
          </div>
        </Card>
        <Card>
          <FieldLabel>Style</FieldLabel>
          <ChoiceList options={STYLE_OPTIONS.map((o) => ({ value: o, label: o }))} isActive={(o) => profile.huntStyles.includes(o)} onPick={(o) => togglePreference('huntStyles', o)} />
        </Card>
      </div>
      <StepNav onBack={() => goTo('plan-2')} onNext={() => goTo('plan-4')} />
    </section>
  );

  if (step === 'plan-4') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="Logistics and context" />
      <Card>
        <div className="hq-stack hq-stack--lg">
          <div className="hq-fields">
            <label className="hq-field">
              <span className="hq-label">Days to hunt</span>
              <input type="number" min={1} aria-label="Days to hunt" className="hq-input" value={profile.daysToHunt} onChange={(e) => updateProfile({ daysToHunt: e.target.value })} />
            </label>
            <label className="hq-field">
              <span className="hq-label">Scouting</span>
              <select aria-label="Scouting availability" className="hq-input" value={profile.scoutingAvailability} onChange={(e) => updateProfile({ scoutingAvailability: e.target.value })}>
                {SCOUTING_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="hq-field hq-span">
              <span className="hq-label">Additional info</span>
              <textarea rows={5} aria-label="Additional info" className="hq-input" placeholder="I've looked at the north ridge, I usually access from the south…" value={profile.notes} onChange={(e) => updateProfile({ notes: e.target.value })} />
            </label>
          </div>
          <StepNav onBack={() => goTo('plan-3')} onNext={onSubmit} nextLabel="Generate plan" primary />
        </div>
      </Card>
    </section>
  );

  return null;
}
