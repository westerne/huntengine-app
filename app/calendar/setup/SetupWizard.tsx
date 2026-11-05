'use client';

// "Start planning": two short steps, then a starting
// calendar built from the draw data for the hunter to accept or drop.
// Nothing goes on the calendar until they press "Add to my plan".

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import type { SetupAnswers, Suggestion } from '@/lib/suggest';
import { KIND_LABEL, yearsCovering } from '@/lib/calendar';
import { huntTitle } from '@/lib/huntName';
import { STATES, speciesFor } from '../../planner/constants';
import { Button, Card, Caveat, Eyebrow } from '../../ui';
import { Loader } from '../../ui/client';

const RANDOM_DRAW = ['ID', 'NM', 'AK'];
const STEPS = ['Your points', 'How soon'];

type Pair = { state: string; species: string };
// A balance the hunter holds, or — with points null — somewhere they want to
// hunt but have none yet. Both are the same row.
type Row = Pair & { points: number | null };

export default function SetupWizard({ initial, years }: { initial: SetupAnswers; years: number[] }) {
  const router = useRouter();
  const [a, setA] = useState<SetupAnswers>(initial);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<Row[]>(() => {
    const out: Row[] = initial.points.map((p) => ({ state: p.state, species: p.species, points: p.points }));
    const seen = new Set(out.map((r) => r.state + '|' + r.species));
    for (const i of initial.interests) {
      if (!seen.has(i.state + '|' + i.species)) out.push({ state: i.state, species: i.species, points: null });
    }
    return out;
  });
  const [draft, setDraft] = useState({ state: 'CO', species: 'Elk', points: '' });
  const [review, setReview] = useState<{ suggestions: Array<Suggestion & { keep: boolean }>; notes: string[]; points: SetupAnswers['points']; refine: { weapons: string[] } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SetupAnswers>(k: K, v: SetupAnswers[K]) => setA((x) => ({ ...x, [k]: v }));

  // One list drives both answers. Every row is a state and species the hunter
  // is after; a row that also carries a number is a balance. Where your points
  // are and what you want to hunt are the same question, which is why this is
  // one step and not two — and why "none yet" is just a row with no number
  // rather than a different path through the wizard.
  const interests: Pair[] = rows.map(({ state, species }) => ({ state, species }));
  const points = rows
    .filter((r) => r.points != null && !RANDOM_DRAW.includes(r.state))
    .map((r) => ({ state: r.state, species: r.species, points: r.points as number }));

  const addRow = () => {
    const key = draft.state + '|' + draft.species;
    if (rows.some((r) => r.state + '|' + r.species === key)) return;
    const n = draft.points === '' ? null : Number(draft.points);
    setRows((l) => [...l, { state: draft.state, species: draft.species, points: n }]);
    setDraft((d) => ({ ...d, points: '' }));
  };
  const setRowPoints = (i: number, v: string) =>
    setRows((l) => l.map((r, j) => (j === i ? { ...r, points: v === '' ? null : Number(v) } : r)));

  const build = async (weapon?: SetupAnswers['weapon']) => {
    setBusy(true); setError(null);
    try {
      if (weapon) set('weapon', weapon);
      const answers = weapon ? { ...a, weapon } : a;
      const res = await fetch('/api/calendar/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...answers, interests, points }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not build suggestions.');
      setReview({ suggestions: j.suggestions.map((s: Suggestion) => ({ ...s, keep: s.recommended })), notes: j.notes, points: j.points, refine: j.refine ?? { weapons: [] } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build suggestions.');
    } finally { setBusy(false); }
  };

  const accept = async () => {
    if (!review) return;
    setBusy(true); setError(null);
    try {
      const items = review.suggestions.filter((s) => s.keep).map(({ keep, why, recommended, ...s }) => ({ ...s, notes: s.kind === 'bucket' ? why : null })); // eslint-disable-line @typescript-eslint/no-unused-vars
      const res = await fetch('/api/calendar/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points: review.points, items }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not save.');
      router.push('/plan');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  };

  const main = { maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 } as const;
  const back = (
    <Link href="/plan" className="hq-link hq-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}><ArrowLeft size={14} aria-hidden="true" /> Your plan</Link>
  );

  if (review) {
    const kept = review.suggestions.filter((s) => s.keep).length;
    // A patient hunter can be pointed at a year past the opening window, so
    // the year picker has to offer it or they cannot keep the suggestion.
    const yearOptions = yearsCovering(years, review.suggestions.map((s) => s.target_year));
    return (
      <main style={main}>
        {back}
        <div>
          <Eyebrow>Suggestions</Eyebrow>
          <h1 className="hq-h1" style={{ marginTop: 4 }}>Your starting plan</h1>
          <p className="hq-body" style={{ marginTop: 6 }}>Built from each state&apos;s last published draw and harvest results. Keep what fits, untick the rest, and change any year. You can edit everything later.</p>
        </div>
        {review.suggestions.length === 0 && <Caveat tone="warn">No suggestions from those answers. Try more states or species, or a longer wait.</Caveat>}
        <ul className="hq-stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 12 }}>
          {review.suggestions.map((s, i) => (
            <Card key={i} as="li" variant={s.keep ? undefined : 'flat'} style={{ padding: 16, opacity: s.keep ? 1 : 0.65 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flex: '1 1 220px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={s.keep} onChange={() => setReview({ ...review, suggestions: review.suggestions.map((x, j) => j === i ? { ...x, keep: !x.keep } : x) })}
                    style={{ marginTop: 3, width: 18, height: 18, flex: 'none', accentColor: 'var(--brand)' }} />
                  <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="hq-eyebrow">{KIND_LABEL[s.kind]}{s.kind === 'target' && s.target_year === years[0] ? (s.recommended ? ' · our pick' : ' · alternative') : ''}</span>
                    <span className="hq-h3" style={{ overflowWrap: 'anywhere' }}>{s.state} {s.species.toLowerCase()}{s.unit ? ` · ${huntTitle(s.unit, s.hunt_code)}` : ''}</span>
                    {s.label && <span className="hq-small">{s.label}</span>}
                    <span className="hq-body" style={{ fontSize: 14, marginTop: 4 }}>{s.why}</span>
                  </span>
                </label>
                <select aria-label="Year" className="hq-input" style={{ minHeight: 36 }} value={s.target_year ?? ''} onChange={(e) => setReview({ ...review, suggestions: review.suggestions.map((x, j) => j === i ? { ...x, target_year: e.target.value ? Number(e.target.value) : null } : x) })}>
                  <option value="">No year</option>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </Card>
          ))}
        </ul>
        {review.refine.weapons.length > 1 && (
          <Card variant="flat">
            <p className="hq-body">These cover every weapon. Narrow them if you hunt with one.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }} role="group" aria-label="Weapon">
              {(['any', ...review.refine.weapons] as const).map((w) => (
                <button key={w} type="button" className="hq-chip" disabled={busy} aria-pressed={a.weapon === w}
                  onClick={() => build(w as SetupAnswers['weapon'])}>{w === 'any' ? 'Any weapon' : w}</button>
              ))}
            </div>
            <p className="hq-small" style={{ marginTop: 10 }}>We kept this out of the questions up front. It only matters once there is a list to narrow.</p>
          </Card>
        )}
        {review.notes.length > 0 && (
          <div className="hq-inset hq-stack" style={{ gap: 6 }}>
            {review.notes.map((n, i) => <p key={i} className="hq-body" style={{ fontSize: 14 }}>{n}</p>)}
          </div>
        )}
        {error && <Caveat tone="stop">{error}</Caveat>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Button disabled={busy || (kept === 0 && !review.points.length)} onClick={accept}>
            {busy ? 'Saving…' : `Add ${kept} to my plan`}
          </Button>
          <Button variant="ghost" onClick={() => setReview(null)}><ArrowLeft size={16} aria-hidden="true" /> Change answers</Button>
        </div>
        <p className="hq-small">Odds are last year&apos;s results, not a forecast. Confirm with the agency before you apply. Your points{review.points.length ? ` (${review.points.length} balance${review.points.length === 1 ? '' : 's'})` : ''} are saved with your plan.</p>
      </main>
    );
  }

  return (
    <main style={main}>
      {back}
      <div>
        <Eyebrow>Step {step + 1} of {STEPS.length} · {STEPS[step]}</Eyebrow>
        <h1 className="hq-h1" style={{ marginTop: 4 }}>Start planning</h1>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }} aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= step ? 'var(--brand)' : 'var(--surface-sunk)' }} />)}
        </div>
      </div>

      {busy ? (
        <Card><Loader lines={['Reading the draw results', 'Checking your points', 'Lining up hunts by year']} /></Card>
      ) : (
        <>
          {step === 0 && (
            <section className="hq-stack hq-stack--lg">
              <Card>
                <label className="hq-field" style={{ maxWidth: 280 }}>
                  <span className="hq-label">Home state</span>
                  <select id="home" className="hq-input" value={a.homeState ?? ''} onChange={(e) => set('homeState', e.target.value || null)}>
                    <option value="">Choose…</option>
                    {[...new Set([...STATES, 'Other'])].map((s) => <option key={s} value={s === 'Other' ? 'XX' : s}>{s === 'Other' ? 'Another state' : s}</option>)}
                  </select>
                </label>
                <p className="hq-small" style={{ marginTop: 6 }}>Sets whether you&apos;re a resident or non-resident in each state.</p>
              </Card>

              <Card aria-labelledby="pts-h">
                <h2 id="pts-h" className="hq-h3">Where do you have points?</h2>
                <p className="hq-body" style={{ marginTop: 4, fontSize: 14 }}>Add a state and species for each balance. Just starting out? Add what you want to hunt and leave the points blank. That works too.</p>
                {rows.length > 0 && (
                  <ul className="hq-list" style={{ marginTop: 8 }}>
                    {rows.map((r, i) => (
                      <li key={r.state + '|' + r.species} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', flexWrap: 'wrap' }}>
                        <span className="hq-badge">{r.state}</span>
                        <span className="hq-row__title" style={{ flex: 1, minWidth: 80 }}>{r.species}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {RANDOM_DRAW.includes(r.state)
                            ? <span className="hq-small">Random draw, no points</span>
                            : <input inputMode="numeric" aria-label={r.state + ' ' + r.species + ' points'} className="hq-input" style={{ width: 90 }} placeholder="Points" value={r.points ?? ''} onChange={(e) => setRowPoints(i, e.target.value.replace(/[^0-9]/g, ''))} />}
                          <Button size="sm" variant="ghost" aria-label={`Remove ${r.state} ${r.species}`} onClick={() => setRows((l) => l.filter((_, j) => j !== i))}>Remove</Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="hq-inset" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                    <label className="hq-field" style={{ flex: '1 1 110px' }}><span className="hq-label">State</span>
                      <select className="hq-input" value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value, species: speciesFor(e.target.value).includes(d.species) ? d.species : speciesFor(e.target.value)[0] }))}>
                        {STATES.map((s) => <option key={s}>{s}</option>)}
                      </select></label>
                    <label className="hq-field" style={{ flex: '1 1 140px' }}><span className="hq-label">Species</span>
                      <select className="hq-input" value={draft.species} onChange={(e) => setDraft((d) => ({ ...d, species: e.target.value }))}>
                        {speciesFor(draft.state).map((s) => <option key={s}>{s}</option>)}
                      </select></label>
                    {!RANDOM_DRAW.includes(draft.state) && (
                      <label className="hq-field" style={{ flex: '1 1 110px' }}><span className="hq-label">Points</span>
                        <input inputMode="numeric" placeholder="Optional" className="hq-input" value={draft.points} onChange={(e) => setDraft((d) => ({ ...d, points: e.target.value.replace(/[^0-9]/g, '') }))} /></label>
                    )}
                    <Button variant="secondary" onClick={addRow}><Plus size={16} aria-hidden="true" /> Add</Button>
                  </div>
                </div>
                <p className="hq-small" style={{ marginTop: 10 }}>Not sure of a balance? Leave it blank. Each state&apos;s licensing site has it, and you can fill it in later.</p>
              </Card>
            </section>
          )}

          {step === 1 && (
            <Card>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="hq-h3" style={{ marginBottom: 12 }}>How soon do you want to hunt?</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {([['now', 'This season'], ['few', 'Within about 3 years'], ['long', 'I’ll wait for the right tag']] as const).map(([v, l]) => <button key={v} type="button" className="hq-chip" aria-pressed={a.wait === v} onClick={() => set('wait', v)}>{l}</button>)}
                </div>
              </fieldset>
              <p className="hq-small" style={{ marginTop: 14 }}>{interests.length ? `${interests.length} state and species combination${interests.length === 1 ? '' : 's'} to look at${points.length ? `, ${points.length} with points` : ''}.` : 'Go back and add at least one state and species.'}</p>
            </Card>
          )}
        </>
      )}

      {error && <Caveat tone="stop">{error}</Caveat>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Back</Button>}
        {step < STEPS.length - 1
          ? <Button disabled={!interests.length} onClick={() => setStep(step + 1)}>Next</Button>
          : <Button disabled={busy || (!interests.length && !a.bucket.length)} onClick={() => build()}>{busy ? 'Building…' : 'Build my plan'}</Button>}
      </div>
    </main>
  );
}
