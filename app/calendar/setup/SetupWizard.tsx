'use client';

// "Start planning": five short steps (each skippable), then a starting
// calendar built from the draw data for the hunter to accept or drop.
// Nothing goes on the calendar until they press "Add to my calendar".

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SetupAnswers, Suggestion } from '@/lib/suggest';
import { KIND_LABEL } from '@/lib/calendar';
import { huntTitle } from '@/lib/huntName';
import { ALL_SPECIES, STATES, speciesFor } from '../../planner/constants';

const inputCls = 'bg-black border border-zinc-800 p-2 rounded-lg text-zinc-200 text-sm outline-none focus:border-amber-500';
const chip = (on: boolean) => `px-3 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest ${on ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-300 hover:border-amber-600'}`;
const RANDOM_DRAW = ['ID', 'NM', 'AK'];
const STEPS = ['About you', 'What you’re after', 'Your points', 'Units you know', 'Bucket list'];

type Pair = { state: string; species: string };

function PairRows({ rows, onChange, withUnit, unitRequired, addLabel }: {
  rows: Array<Pair & { unit?: string | null }>; onChange: (r: Array<Pair & { unit?: string | null }>) => void;
  withUnit: boolean; unitRequired?: boolean; addLabel: string;
}) {
  const [draft, setDraft] = useState({ state: 'CO', species: 'Elk', unit: '' });
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
              <span className="text-zinc-200">{r.state} {r.species}{r.unit ? ` · ${r.unit}` : ''}</span>
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest">Remove</button>
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
        {withUnit && <input aria-label="Unit" placeholder={unitRequired ? 'Unit' : 'Unit (optional)'} className={`${inputCls} w-36`} value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} />}
        <button type="button" disabled={unitRequired && !draft.unit.trim()}
          onClick={() => { onChange([...rows, { state: draft.state, species: draft.species, unit: draft.unit.trim() || null }]); setDraft((d) => ({ ...d, unit: '' })); }}
          className="text-amber-500 text-[11px] font-black uppercase tracking-widest disabled:opacity-40">+ {addLabel}</button>
      </div>
    </div>
  );
}

export default function SetupWizard({ initial, years }: { initial: SetupAnswers; years: number[] }) {
  const router = useRouter();
  const [a, setA] = useState<SetupAnswers>(initial);
  const [step, setStep] = useState(0);
  const [states, setStates] = useState<string[]>([...new Set(initial.interests.map((p) => p.state))]);
  const [species, setSpecies] = useState<string[]>([...new Set(initial.interests.map((p) => p.species))]);
  const [review, setReview] = useState<{ suggestions: Array<Suggestion & { keep: boolean }>; notes: string[]; points: SetupAnswers['points'] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SetupAnswers>(k: K, v: SetupAnswers[K]) => setA((x) => ({ ...x, [k]: v }));

  // Interests are every chosen state × chosen species that the state has.
  const interests: Pair[] = states.flatMap((st) => species.filter((sp) => speciesFor(st).includes(sp)).map((sp) => ({ state: st, species: sp })));
  const pointPairs = interests.filter((p) => !RANDOM_DRAW.includes(p.state));
  const ptsOf = (p: Pair) => a.points.find((x) => x.state === p.state && x.species === p.species)?.points;
  const setPts = (p: Pair, v: string) => {
    const rest = a.points.filter((x) => !(x.state === p.state && x.species === p.species));
    set('points', v === '' ? rest : [...rest, { ...p, points: Number(v) }]);
  };
  // Functional updates, so quick taps never work from a stale list.
  const toggle = (v: string, fn: (f: (l: string[]) => string[]) => void) => fn((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));

  const build = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/calendar/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, interests }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not build suggestions.');
      setReview({ suggestions: j.suggestions.map((s: Suggestion) => ({ ...s, keep: s.recommended })), notes: j.notes, points: j.points });
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
      router.push('/calendar');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(false);
    }
  };

  if (review) {
    const kept = review.suggestions.filter((s) => s.keep).length;
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
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
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
      <Link href="/calendar" className="text-zinc-500 text-[11px] font-black uppercase tracking-widest hover:text-white">← My Hunt Calendar</Link>
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
          <fieldset>
            <legend className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Weapon</legend>
            <div className="flex flex-wrap gap-2">
              {(['any', 'rifle', 'archery', 'muzzleloader'] as const).map((w) => <button key={w} type="button" aria-pressed={a.weapon === w} onClick={() => set('weapon', w)} className={chip(a.weapon === w)}>{w === 'any' ? 'Any' : w}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">How long will you wait for a tag?</legend>
            <div className="flex flex-wrap gap-2">
              {([['now', 'Hunt this season'], ['few', 'Within about 3 years'], ['long', 'I’ll build points 5+ years']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={a.wait === v} onClick={() => set('wait', v)} className={chip(a.wait === v)}>{l}</button>)}
            </div>
          </fieldset>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-6">
          <fieldset>
            <legend className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Species</legend>
            <div className="flex flex-wrap gap-2">{ALL_SPECIES.map((s) => <button key={s} type="button" aria-pressed={species.includes(s)} onClick={() => toggle(s, setSpecies)} className={chip(species.includes(s))}>{s}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">States you&apos;d hunt</legend>
            <div className="flex flex-wrap gap-2">{STATES.map((s) => <button key={s} type="button" aria-pressed={states.includes(s)} onClick={() => toggle(s, setStates)} className={chip(states.includes(s))}>{s}</button>)}</div>
          </fieldset>
          <fieldset>
            <legend className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Units</legend>
            <div className="flex flex-wrap gap-2">
              {([['new', 'Show me new units'], ['known', 'Stick near units I know'], ['either', 'Either']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={a.newUnits === v} onClick={() => set('newUnits', v)} className={chip(a.newUnits === v)}>{l}</button>)}
            </div>
          </fieldset>
          <p className="text-zinc-500 text-sm">{interests.length ? `${interests.length} state and species combination${interests.length === 1 ? '' : 's'} to look at.` : 'Pick at least one species and one state that has it.'}</p>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <p className="text-zinc-400 text-sm">Your current points. Leave blank if you have none or aren&apos;t sure — you can check on each state&apos;s licensing site later. Idaho, New Mexico and Alaska are random draws with no points.</p>
          {pointPairs.length === 0 && <p className="text-zinc-500 text-sm">Nothing to fill in — go back and pick states and species, or skip.</p>}
          <div className="grid sm:grid-cols-2 gap-2">
            {pointPairs.map((p) => (
              <label key={`${p.state}|${p.species}`} className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
                <span className="text-zinc-200">{p.state} {p.species}</span>
                <input inputMode="numeric" className={`${inputCls} w-20`} placeholder="0" value={ptsOf(p) ?? ''} onChange={(e) => setPts(p, e.target.value.replace(/[^\d]/g, ''))} />
              </label>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <p className="text-zinc-400 text-sm">Units you&apos;ve hunted or know well (optional). We use these to {a.newUnits === 'new' ? 'steer you to new ground' : a.newUnits === 'known' ? 'keep you near what you know' : 'mark what you know'}.</p>
          <PairRows rows={a.knownUnits} onChange={(r) => set('knownUnits', r.map((x) => ({ state: x.state, species: x.species, unit: x.unit ?? '' })))} withUnit unitRequired addLabel="Add unit" />
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <p className="text-zinc-400 text-sm">Someday hunts — the ones you&apos;d build points or save up for (e.g. Arizona elk, Alaska Dall sheep).</p>
          <PairRows rows={a.bucket} onChange={(r) => set('bucket', r)} withUnit addLabel="Add to bucket list" />
        </section>
      )}

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3 items-center">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="text-zinc-400 text-[11px] font-black uppercase tracking-widest">← Back</button>}
        {step < STEPS.length - 1
          ? <button type="button" onClick={() => setStep(step + 1)} className="bg-zinc-100 text-black px-6 py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px]">Next</button>
          : <button type="button" disabled={busy || (!interests.length && !a.bucket.length)} onClick={build} className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50">{busy ? 'Building…' : 'Build my calendar'}</button>}
        {step < STEPS.length - 1 && step > 1 && <button type="button" onClick={() => setStep(step + 1)} className="text-zinc-500 text-[11px] font-black uppercase tracking-widest">Skip</button>}
      </div>
    </main>
  );
}
