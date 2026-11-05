'use client';

// "Find a Hunt" questionnaire: scout-1 … scout-4.

import type { DrawTimeline, StepProps } from './types';
import {
  COMING_SOON_STATES, EXPERIENCE_OPTIONS, FITNESS_LEVELS, SACRIFICE_OPTIONS, SEASON_WINDOWS,
  STATES, STYLE_OPTIONS, TIMELINES, TROPHY_CONFIG, WEAPON_OPTIONS, speciesFor, withState,
} from './constants';
import { ChipRow, ChoiceList, FieldLabel, PointsInput, ProgressBar, ResidencyPicker, StepHeader, StepNav, TogglePill, ToggleSwitch } from './ui';
import { BigNumber, Card, Caveat } from '../ui';

const twoUp = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' } as const;

export default function ScoutSteps(props: StepProps & { onSubmit: () => void }) {
  const { profile, updateProfile, goTo, togglePreference, progress, flags, onSubmit } = props;
  const step = progress.current;

  if (step === 'scout-1') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="State and species" />
      <Card>
        <div className="hq-stack hq-stack--lg">
          <div>
            <FieldLabel>State</FieldLabel>
            <ChipRow>
              {STATES.map((st) => (
                <TogglePill key={st} label={st} active={profile.states.includes(st)} onClick={() => updateProfile(withState(profile, st))} />
              ))}
              {COMING_SOON_STATES.map((st) => (
                <span key={st} title="Coming soon" className="hq-chip" style={{ cursor: 'not-allowed', opacity: 0.5 }}>{st} · soon</span>
              ))}
            </ChipRow>
          </div>
          <label className="hq-field">
            <span className="hq-label">Species</span>
            <select aria-label="Species" className="hq-input" value={profile.species} onChange={(e) => updateProfile({ species: e.target.value })}>
              {speciesFor(profile.states[0]).map((sp) => <option key={sp} value={sp}>{sp}</option>)}
            </select>
          </label>
          <div>
            <FieldLabel>Residency</FieldLabel>
            <ResidencyPicker value={profile.residency} onPick={(r) => updateProfile({ residency: r })} />
          </div>
          <StepNav onNext={() => goTo('scout-2')} />
        </div>
      </Card>
    </section>
  );

  if (step === 'scout-2') {
    const config = TROPHY_CONFIG[profile.species];
    const trophy = config ? parseInt(profile.trophyQuality) || config.min : 0;
    return (
      <section className="hq-stack hq-fade-up">
        <ProgressBar {...progress} />
        <StepHeader title="Timeline and goals" />
        <Card>
          <div className="hq-stack hq-stack--lg">
            {flags.noPointSystem ? (
              <div>
                <FieldLabel>Points held</FieldLabel>
                <Caveat tone="info">
                  <strong>Pure random draw.</strong> No point system applies to this combination.
                </Caveat>
              </div>
            ) : (
              <label className="hq-field">
                <span className="hq-label">Points held now</span>
                <PointsInput
                  style={{ maxWidth: 140 }}
                  value={profile.points[flags.selState] || 0}
                  onChange={(n) => updateProfile({ points: { ...profile.points, [flags.selState]: n } })}
                />
              </label>
            )}

            {/* Special Draw toggle — WY Non-Resident only */}
            {flags.showSpecialDrawOption && (
              <ToggleSwitch
                label="Include Wyoming special draw"
                sublabel="Special draw licenses cost more than regular ones (check WGFD for current fees) and often draw at lower point levels. Turn off to see the regular draw only."
                value={profile.includeSpecialDraw}
                onChange={(v) => updateProfile({ includeSpecialDraw: v })}
                warningLabel="Special draw excluded. Recommendations use the regular and random pools only."
              />
            )}

            <div role="group" aria-label="When do you want to hunt this?">
              <FieldLabel>When do you want to hunt this?</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {TIMELINES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="hq-chip"
                    style={{ justifyContent: 'center', minHeight: 44 }}
                    aria-pressed={profile.drawTimeline === t}
                    onClick={() => updateProfile({ drawTimeline: t as DrawTimeline })}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="hq-small" style={{ marginTop: 8 }}>A longer horizon lets us suggest units with more trophy potential.</p>
            </div>

            <div>
              <FieldLabel>Minimum trophy goal</FieldLabel>
              {!config ? (
                <p className="hq-inset hq-small">Score tracking isn&apos;t available for this species.</p>
              ) : (
                <div className="hq-stack" style={{ gap: 12 }}>
                  <BigNumber value={trophy} unit={'"+'} sub={config.label} />
                  <input
                    type="range"
                    aria-label="Minimum trophy score"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={trophy}
                    onChange={(e) => updateProfile({ trophyQuality: e.target.value })}
                    style={{ width: '100%', accentColor: 'var(--action)', cursor: 'pointer' }}
                  />
                </div>
              )}
            </div>

            <StepNav onBack={() => goTo('scout-1')} onNext={() => goTo('scout-3')} />
          </div>
        </Card>
      </section>
    );
  }

  if (step === 'scout-3') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="How you hunt" />
      <div style={twoUp}>
        <Card>
          <div className="hq-stack hq-stack--lg">
            <div>
              <FieldLabel>Weapon</FieldLabel>
              <ChipRow>{WEAPON_OPTIONS.map((w) => <TogglePill key={w} label={w} active={profile.weapons.includes(w)} onClick={() => togglePreference('weapons', w)} />)}</ChipRow>
            </div>
            <div>
              <FieldLabel>Fitness level</FieldLabel>
              <ChipRow>{FITNESS_LEVELS.map((f) => <TogglePill key={f} label={f} active={profile.fitness === f} onClick={() => updateProfile({ fitness: f })} />)}</ChipRow>
            </div>

            {/* Grizzly Country Toggle — WY, MT, ID only */}
            {flags.showGrizzlyOption && (
              <div>
                <FieldLabel>Grizzly country</FieldLabel>
                <ToggleSwitch
                  label="Comfortable hunting active grizzly habitat"
                  sublabel="Several top units in WY, MT and ID have large grizzly populations. Turn off to leave those units out."
                  value={profile.grizzlyComfort}
                  onChange={(v) => updateProfile({ grizzlyComfort: v })}
                  warningLabel="Grizzly units excluded. Some top trophy units won't appear in your results."
                />
              </div>
            )}
          </div>
        </Card>
        <Card>
          <div className="hq-stack hq-stack--lg">
            <div>
              <FieldLabel>Hunt style</FieldLabel>
              <ChoiceList options={STYLE_OPTIONS.map((o) => ({ value: o, label: o }))} isActive={(o) => profile.huntStyles.includes(o)} onPick={(o) => togglePreference('huntStyles', o)} />
            </div>
            <div>
              <FieldLabel>Preferred season</FieldLabel>
              <ChipRow>{SEASON_WINDOWS.map((sw) => <TogglePill key={sw.id} label={sw.label} active={profile.seasons.includes(sw.id)} onClick={() => togglePreference('seasons', sw.id)} />)}</ChipRow>
            </div>
          </div>
        </Card>
      </div>
      <StepNav onBack={() => goTo('scout-2')} onNext={() => goTo('scout-4')} />
    </section>
  );

  if (step === 'scout-4') return (
    <section className="hq-stack hq-fade-up">
      <ProgressBar {...progress} />
      <StepHeader title="About you" intro="The more you tell us, the more specific your recommendations. Everything here is optional." />
      <Card>
        <div className="hq-stack hq-stack--lg">
          <div>
            <FieldLabel>Experience with this species</FieldLabel>
            <ChoiceList options={EXPERIENCE_OPTIONS.map((o) => ({ value: o, label: o }))} isActive={(o) => profile.pastExperience === o} onPick={(o) => updateProfile({ pastExperience: o })} />
          </div>

          <div>
            <FieldLabel>Trophy or opportunity: what matters more?</FieldLabel>
            <ChoiceList options={SACRIFICE_OPTIONS} isActive={(v) => profile.sacrificeTrophy === v} onPick={(v) => updateProfile({ sacrificeTrophy: v })} />
          </div>

          <label className="hq-field">
            <span className="hq-label">Units or areas you already know</span>
            <span className="hq-small">We&apos;ll weight familiar units higher in your recommendations.</span>
            <textarea
              rows={3}
              aria-label="Units or areas you already know"
              className="hq-input"
              placeholder="e.g. I've hunted the Hoback Canyon area, know the Gros Ventre drainage well…"
              value={profile.knownAreas}
              onChange={(e) => updateProfile({ knownAreas: e.target.value })}
            />
          </label>

          <label className="hq-field">
            <span className="hq-label">Tell us about yourself as a hunter</span>
            <span className="hq-small">Past hunts, what you&apos;re after, animals you&apos;ve passed on, specific goals.</span>
            <textarea
              rows={5}
              aria-label="About you as a hunter"
              className="hq-input"
              placeholder={'e.g. I\'ve hunted Wyoming deer for 3 years and passed on 170" bucks waiting for something special. Looking for a unit where I have a realistic shot at 185"+ with my rifle in October…'}
              value={profile.hunterContext}
              onChange={(e) => updateProfile({ hunterContext: e.target.value })}
            />
          </label>

          <StepNav onBack={() => goTo('scout-3')} onNext={onSubmit} nextLabel="Find units" primary />
        </div>
      </Card>
    </section>
  );

  return null;
}
