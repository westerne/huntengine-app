'use client';

// "Start planning": two short steps, then a starting
// calendar built from the draw data for the hunter to accept or drop.
// Nothing goes on the calendar until they press "Add to my calendar".

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SetupAnswers, Suggestion } from '@/lib/suggest';
import { KIND_LABEL, yearsCovering } from '@/lib/calendar';
import { huntTitle } from '@/lib/huntName';
import { STATES, speciesFor } from '../../planner/constants';

const inputCls = 'bg-black border border-zinc-800 p-2 rounded-lg text-zinc-200 text-sm outline-none focus:border-amber-500';
const chip = (on: boolean) => `px-3 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest ${on ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-300 hover:border-amber-600'}`;
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

  if (review) {
    const kept = review.suggestions.filter((s) => s.keep).length;
    // A patient hunter can be pointed at a year past the opening window, so
    // the year picker has to offer it or they cannot keep the suggestion.
    const yearOptions = yearsCovering(years, review.suggestions.map((s) => s.target_year));
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-black italic uppercase">Your starting calendar</h1>
        <p className="text-zinc-400 text-sm">Built from each state&apos;s last published draw and harvest results. Keep what fits, untick the rest, and change any year. You can edit everything later.</p>
        {review.suggestions.length === 0 && <p className="text-zinc-300">No suggestions from those answers. Try more states or species, or a longer wait.</p>}
        <ul className="space-y-3">
          {review.suggestions.map((s, i) => (
            <li key={i} className={`border rounded-xl p-4 ${s.keep ? 'bg-zinc-900 border-zinc-700' : 'bg-black border-zinc-900 opacity-60'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex items-start gap-3 min-w-0 cursor-pointer">
                  <input type="checkbox" checked={s.keep} onChange={() => setReview({ ...review, suggestions: review.suggestions.map((x, j) => j === i ? { ...x, keep: !x.keep } : x) })} className="mt-1 accent-amber-600 w-4 h-4" />
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-amber-500">{KIND_LABEL[s.kind]}{s.kind === 'target' && s.target_year === years[0] ? (s.recommended ? ' · our pick' : ' · alternative') : ''}</span>
                    <span className="block text-white font-black uppercase italic text-sm">{s.state} {s.species}{s.unit ? ` · ${huntTitle(s.unit, s.hunt_code)}` : ''}</span>
                    {s.label && <span className="block text-zinc-500 text-xs">{s.label}</span>}
                    <span className="block text-zinc-300 text-xs mt-1">{s.why}</span>
                  </span>
                </label>
                <select aria-label="Year" className={`${inputCls} text-xs py-1`} value={s.target_year ?? ''} onChange={(e) => setReview({ ...review, suggestions: review.suggestions.map((x, j) => j === i ? { ...x, target_year: e.target.value ? Number(e.target.value) : null } : x) })}>
                  <option value="">No year</option>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
        {review.refine.weapons.length > 1 && (
          <div className="border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-zinc-300 text-sm">These cover every weapon. Narrow them if you hunt with one.</p>
            <div className="flex flex-wrap gap-2">
              {(['any', ...review.refine.weapons] as const).map((w) => (
                <button key={w} type="button" disabled={busy} aria-pressed={a.weapon === w}
                  onClick={() => build(w as SetupAnswers['weapon'])}
                  className={chip(a.weapon === w)}>{w === 'any' ? 'Any weapon' : w}</button>
              ))}
            </div>
            <p className="text-zinc-600 text-xs">We kept this out of the questions up front — it only matters once there is a list to narrow.</p>
          </div>
        )}
        {review.notes.length > 0 && (
          <div className="border border-zinc-800 rounded-xl p-4 space-y-1">
            {review.notes.map((n, i) => <p key={i} className="text-zinc-400 text-sm">{n}</p>)}
          </div>
        )}
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || (kept === 0 && !review.points.length)} onClick={accept} className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50">
            {busy ? 'Saving…' : `Add ${kept} to my calendar`}
          </button>
          <button type="button" onClick={() => setReview(null)} className="text-zinc-400 text-[11px] font-black uppercase tracking-widest">← Change answers</button>
        </div>
        <p className="text-zinc-600 text-xs">Odds are last year&apos;s results, not a forecast. Your points{review.points.length ? ` (${review.points.length} balance${review.points.length === 1 ? '' : 's'})` : ''} are saved with your calendar.</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <Link href="/plan" className="text-zinc-500 text-[11px] font-black uppercase tracking-widest hover:text-white">← Your plan</Link>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        <h1 className="text-3xl font-black italic uppercase mt-1">Start planning</h1>
        <div className="flex gap-1 mt-3" aria-hidden>{STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-amber-600' : 'bg-zinc-800'}`} />)}</div>
      </div>

      {step === 0 && (
        <section className="space-y-6">
          <div>
            <label htmlFor="home" className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Home state</label>
            <select id="home" className={inputCls} value={a.homeState ?? ''} onChange={(e) => set('homeState', e.target.value || null)}>
              <option value="">Choose…</option>
              {[...new Set([...STATES, 'Other'])].map((s) => <option key={s} value={s === 'Other' ? 'XX' : s}>{s === 'Other' ? 'Another state' : s}</option>)}
            </select>
            <p className="text-zinc-600 text-xs mt-1">Sets whether you&apos;re a resident or non-resident in each state.</p>
          </div>

          <div className="space-y-3">
            <p className="text-zinc-400 text-sm">Where do you have points? Add a state and species for each balance. Just starting out? Add what you want to hunt and leave the points blank — that works too.</p>
            {rows.length > 0 && (
              <ul className="space-y-2">
                {rows.map((r, i) => (
                  <li key={r.state + '|' + r.species} className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
                    <span className="text-zinc-200">{r.state} {r.species}</span>
                    <span className="flex items-center gap-3">
                      {RANDOM_DRAW.includes(r.state)
                        ? <span className="text-zinc-500 text-xs">Random draw — no points</span>
                        : <input inputMode="numeric" aria-label={r.state + ' ' + r.species + ' points'} className={`${inputCls} w-20`} placeholder="Points" value={r.points ?? ''} onChange={(e) => setRowPoints(i, e.target.value.replace(/[^0-9]/g, ''))} />}
                      <button type="button" onClick={() => setRows((l) => l.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest">Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <select aria-label="State" className={inputCls} value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value, species: speciesFor(e.target.value).includes(d.species) ? d.species : speciesFor(e.target.value)[0] }))}>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select aria-label="Species" className={inputCls} value={draft.species} onChange={(e) => setDraft((d) => ({ ...d, species: e.target.value }))}>
                {speciesFor(draft.state).map((s) => <option key={s}>{s}</option>)}
              </select>
              {!RANDOM_DRAW.includes(draft.state) && (
                <input inputMode="numeric" aria-label="Points" placeholder="Points (optional)" className={`${inputCls} w-36`} value={draft.points} onChange={(e) => setDraft((d) => ({ ...d, points: e.target.value.replace(/[^0-9]/g, '') }))} />
              )}
              <button type="button" onClick={addRow} className="text-amber-500 text-[11px] font-black uppercase tracking-widest">+ Add</button>
            </div>
            <p className="text-zinc-600 text-xs">Not sure of a balance? Leave it blank — each state&apos;s licensing site has it, and you can fill it in later.</p>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-6">
          <fieldset>
            <legend className="text-zinc-400 text-sm mb-3">How soon do you want to hunt?</legend>
            <div className="flex flex-wrap gap-2">
              {([['now', 'This season'], ['few', 'Within about 3 years'], ['long', 'I’ll wait for the right tag']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={a.wait === v} onClick={() => set('wait', v)} className={chip(a.wait === v)}>{l}</button>)}
            </div>
          </fieldset>
          <p className="text-zinc-500 text-sm">{interests.length ? `${interests.length} state and species combination${interests.length === 1 ? '' : 's'} to look at${points.length ? `, ${points.length} with points` : ''}.` : 'Go back and add at least one state and species.'}</p>
        </section>
      )}

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3 items-center">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="text-zinc-400 text-[11px] font-black uppercase tracking-widest">← Back</button>}
        {step < STEPS.length - 1
          ? <button type="button" disabled={!interests.length} onClick={() => setStep(step + 1)} className="bg-zinc-100 text-black px-6 py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px] disabled:opacity-50">Next</button>
          : <button type="button" disabled={busy || (!interests.length && !a.bucket.length)} onClick={() => build()} className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50">{busy ? 'Building…' : 'Build my calendar'}</button>}
      </div>
    </main>
  );
}
