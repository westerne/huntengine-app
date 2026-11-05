'use client';

// Find a Hunt, steps 1 to 3: pick a state and species, see what your points
// actually buy, then say what you're after and have the list re-ordered around
// it.
//
// The reality panel costs nothing (no model call), so it loads as soon as the
// pair is chosen. The asking comes after, so a hunter is never questioned
// before he knows whether there is anything to question him about.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATES, speciesFor } from '../planner/constants';
import AskBox from './AskBox';
import Matches, { type Narrowed } from './Matches';
import AddToPlan from './AddToPlan';
import { ButtonLink, Card, Caveat } from '../ui';
import { Loader } from '../ui/client';

type Hunt = {
  unit: string;
  huntCode: string | null;
  label: string | null;
  odds: number | null;
  hunterSuccess: number | null;
  pointsNeeded: number | null;
  publishedRate: number | null;
};

type Reality = {
  points: number;
  considered: number;
  basis: 'your-points' | 'points-to-draw' | 'published-rate' | 'none';
  priced: boolean;
  reachable: Hunt[];
  antlerless: Hunt[];
  best: Hunt | null;
  bestAntlerless: Hunt | null;
  soon: Array<Hunt & {
    pointsNeeded: number; yearsAway: number; year: number; farOff: boolean;
    oddsAtThatLevel: number | null; cutoffIsADate: boolean;
  }>;
  headline: string;
  caveat: string;
  residency: 'resident' | 'nonresident';
  state: string;
  species: string;
  speciesKey: string;
  seasonYear: number;
  counts: { reachable: number; antlerless: number; soon: number };
  setAside: number;
};

const pctText = (n: number) => (n >= 10 ? `${Math.round(n)}%` : `${n.toFixed(1)}%`);

function HuntRow({ h, showOdds, r }: { h: Hunt; showOdds: boolean; r: Reality }) {
  return (
    <li style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <span className="hq-h3" style={{ display: 'block' }}>
            {h.unit}{h.huntCode && h.huntCode !== h.unit ? ` · ${h.huntCode}` : ''}
          </span>
          {h.label && <span className="hq-small" style={{ display: 'block', marginTop: 2 }}>{h.label}</span>}
        </span>
        <span style={{ textAlign: 'right', flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {showOdds && h.odds != null && (
            <span className="hq-data" style={{ fontWeight: 700, fontSize: 16 }}>{pctText(h.odds)}</span>
          )}
          {/* An overall rate is the hunt's, not his. Shown in a different colour
              and spelled out, so it can't be mistaken for his own chance. */}
          {!showOdds && h.publishedRate != null && (
            <>
              <span className="hq-data" style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-soft)' }}>{pctText(h.publishedRate)}</span>
              <span className="hq-small">drew overall</span>
            </>
          )}
          {h.pointsNeeded != null && (
            <span className="hq-small">
              {h.pointsNeeded} pt{h.pointsNeeded === 1 ? '' : 's'} drew
            </span>
          )}
          {h.hunterSuccess != null && (
            <span className="hq-small">{h.hunterSuccess}% success</span>
          )}
        </span>
      </div>
      {/* Same two moves as a matched card, so skipping the question doesn't
          leave a hunter with nothing to do about what he's looking at. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <Link
          href={`/hunt/${encodeURIComponent(`${r.state}~${r.speciesKey}~${h.huntCode ?? h.unit}`)}`}
          className="hq-link hq-small"
        >
          Odds as points build
        </Link>
        <AddToPlan
          target={{
            state: r.state,
            species: r.species,
            unit: h.unit,
            huntCode: h.huntCode,
            label: h.label,
            year: r.seasonYear,
          }}
        />
      </div>
    </li>
  );
}

export default function FindView({ initialState, initialSpecies }: { initialState: string; initialSpecies: string }) {
  const [state, setState] = useState(initialState);
  const [species, setSpecies] = useState(initialSpecies);
  const [reality, setReality] = useState<Reality | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCow, setShowCow] = useState(false);
  const [narrowed, setNarrowed] = useState<Narrowed | null>(null);
  const [matching, setMatching] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // Every state change is a fetch; nothing is set synchronously here, so the
  // loading state is derived from whether the answer matches what's selected.
  useEffect(() => {
    let live = true;
    fetch(`/api/huntdata/reality?state=${state}&species=${encodeURIComponent(species)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!live) return;
        if (!r.ok) { setReality(null); setError(j.error || 'Could not read the draw data.'); return; }
        setError(null); setShowCow(false); setReality(j);
      })
      .catch(() => { if (live) setError('Could not read the draw data.'); });
    // A match belongs to one state and species; changing either throws it out
    // rather than leaving Nevada's answer sitting under Utah's hunts.
    setNarrowed(null); setAskError(null);
    return () => { live = false; };
  }, [state, species]);

  const ask = async (text: string) => {
    setMatching(true); setAskError(null);
    try {
      const r = await fetch('/api/huntdata/narrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, species, text }),
      });
      const j = await r.json();
      if (!r.ok) { setAskError(j.error || 'Could not match that.'); return; }
      setNarrowed(j);
    } catch {
      setAskError('Could not match that.');
    } finally {
      setMatching(false);
    }
  };

  const answered = !!reality && reality.state === state && reality.species === species;
  const busy = !answered && !error;

  const onState = (next: string) => {
    setState(next);
    if (!speciesFor(next).includes(species)) setSpecies(speciesFor(next)[0]);
  };

  const showOdds = reality?.basis === 'your-points';

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="hq-h1">Find a hunt</h1>
        <p className="hq-body" style={{ marginTop: 6 }}>
          Pick a state and species. We&apos;ll tell you what your points buy there before asking anything else.
        </p>
      </div>

      <div className="hq-fields">
        <label className="hq-field">
          <span className="hq-label">State</span>
          <select aria-label="State" className="hq-input" value={state} onChange={(e) => onState(e.target.value)}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="hq-field">
          <span className="hq-label">Species</span>
          <select aria-label="Species" className="hq-input" value={species} onChange={(e) => setSpecies(e.target.value)}>
            {speciesFor(state).map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {busy && <Loader lines={['Reading the draw data', 'Checking your points', 'Lining up the odds']} />}
      {error && <Caveat tone="stop">{error}</Caveat>}

      {reality && answered && (
        <section aria-labelledby="reality-h" className="hq-stack hq-stack--lg hq-fade-up">
          <h2 id="reality-h" className="hq-sr">What your points buy</h2>

          <Card>
            <div className="hq-stack" style={{ gap: 12 }}>
              <p className="hq-body" style={{ color: 'var(--ink)', fontSize: 17 }}>{reality.headline}</p>
              <Caveat>{reality.caveat}</Caveat>
              <p className="hq-small">
                {reality.residency === 'resident' ? 'Resident' : 'Non-resident'} odds, from your profile.{' '}
                <Link href="/profile" className="hq-link">Change your points or home state</Link>
              </p>
            </div>
          </Card>

          {/* Nothing to narrow unless something is reachable, so the question
              only appears once it would change an answer. */}
          {reality.reachable.length > 0 && !narrowed && (
            <AskBox onAsk={ask} busy={matching} />
          )}
          {askError && <Caveat tone="stop">{askError}</Caveat>}

          {narrowed ? (
            <Matches n={narrowed} onChange={() => setNarrowed(null)} />
          ) : reality.reachable.length > 0 && (
            <Card aria-labelledby="reach-h">
              {/* "Within reach" is a claim about him. Where all we have is the
                  hunt's own rate, the heading says what the order means. */}
              <h3 id="reach-h" className="hq-h3">
                {reality.priced
                  ? `Within reach (${reality.counts.reachable})`
                  : `Easiest to draw first (${Math.min(8, reality.reachable.length)} of ${reality.counts.reachable})`}
              </h3>
              <ul className="hq-list" style={{ marginTop: 4 }}>
                {reality.reachable.slice(0, 8).map((h) => (
                  <HuntRow key={`${h.unit}|${h.huntCode}`} h={h} showOdds={!!showOdds} r={reality} />
                ))}
              </ul>
            </Card>
          )}

          {reality.soon.length > 0 && (
            <Card aria-labelledby="soon-h">
              {/* Not "worth building toward": in a lottery state the soonest
                  hunt is often the worst bet — Nevada's nearest is 0.4% at the
                  points it takes, and one four years further out is 17%. The
                  list is a timeline, and each row says what it's really worth. */}
              <h3 id="soon-h" className="hq-h3">If you keep applying</h3>
              <ul className="hq-list" style={{ marginTop: 4 }}>
                {reality.soon.filter((h) => !h.farOff).slice(0, 4).map((h) => (
                  <li key={`${h.unit}|${h.huntCode}`} style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="hq-h3" style={{ overflowWrap: 'anywhere' }}>
                      {h.unit}{h.huntCode && h.huntCode !== h.unit ? ` · ${h.huntCode}` : ''}
                    </span>
                    <span className="hq-small" style={{ color: 'var(--ink-soft)' }}>
                      Took {h.pointsNeeded} points — you&apos;d have that in {h.year}
                      {h.hunterSuccess != null ? `, and ${h.hunterSuccess}% of hunters filled` : ''}.
                    </span>
                    {/* Reaching the cutoff is the tag only where tags go out in
                        point order. Elsewhere it's a ticket, and saying so is
                        the difference between a plan and five wasted years. */}
                    {!h.cutoffIsADate && (
                      <span className="hq-small">
                        {h.oddsAtThatLevel != null
                          ? `Still a lottery at that level — ${pctText(h.oddsAtThatLevel)} of applicants holding ${h.pointsNeeded} points drew.`
                          : 'Still a lottery at that level — the points get you into the draw, not the tag.'}
                      </span>
                    )}
                    {/* A hunt years out is only a plan once it has a year
                        against it, which is what the calendar is for. */}
                    <span style={{ display: 'block', marginTop: 6 }}>
                      <AddToPlan
                        target={{
                          state: reality.state,
                          species: reality.species,
                          unit: h.unit,
                          huntCode: h.huntCode,
                          label: h.label,
                          year: h.year,
                        }}
                        note={`Took ${h.pointsNeeded} points in the last published draw.`}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Folded into the match list once he's said whether meat matters. */}
          {!narrowed && reality.antlerless.length > 0 && (
            <div className="hq-stack" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowCow((v) => !v)}
                aria-expanded={showCow}
                className="hq-link"
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', alignSelf: 'flex-start', fontSize: 15 }}
              >
                {showCow ? 'Hide' : 'Show'} antlerless tags ({reality.counts.antlerless})
              </button>
              {showCow && (
                <Card className="hq-fade-up">
                  <ul className="hq-list">
                    {reality.antlerless.slice(0, 8).map((h) => (
                      <HuntRow key={`${h.unit}|${h.huntCode}`} h={h} showOdds={!!showOdds} r={reality} />
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {/* Was the four-screen questionnaire, which asked again for what
                this page already knows. The reachable hunts go straight to the
                side-by-side instead. */}
            {!narrowed && reality.reachable.length > 1 && (
              <ButtonLink
                href={`/compare?h=${reality.reachable.slice(0, 3)
                  .map((h) => encodeURIComponent(`${reality.state}~${reality.speciesKey}~${h.huntCode ?? h.unit}`))
                  .join(',')}`}
              >
                Compare the top {Math.min(3, reality.reachable.length)}
              </ButtonLink>
            )}
            <ButtonLink href="/plan" variant="secondary">
              Plan another year instead
            </ButtonLink>
          </div>
        </section>
      )}

      {/* The other way in: a tag already in hand needs a brief, not odds. */}
      <Card variant="flat">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <p className="hq-h3">Already have a tag?</p>
            <p className="hq-small" style={{ marginTop: 2 }}>Drew it or bought it — get a unit brief, hunt plan and gear list.</p>
          </div>
          <ButtonLink href={`/planner?start=tag&state=${state}&species=${encodeURIComponent(species)}`} variant="secondary">Start with my tag</ButtonLink>
        </div>
      </Card>
    </main>
  );
}
