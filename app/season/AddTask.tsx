'use client';

// Add a reminder or a point-building task (not tied to a saved hunt).

import { useState } from 'react';
import { ALL_SPECIES, STATES } from '../planner/constants';

export default function AddTask({ seasonYear }: { seasonYear: number }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'point' | 'custom'>('point');
  const [state, setState] = useState('CO');
  const [species, setSpecies] = useState('Elk');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inputCls = 'bg-black border border-zinc-800 p-2 rounded-lg text-zinc-200 text-sm outline-none focus:border-amber-500';

  const submit = async () => {
    setError(null);
    const body = kind === 'point'
      ? { kind, state, species, season_year: seasonYear, title: `Buy a ${state} ${species.toLowerCase()} point for ${seasonYear}`, due_on: due || null }
      : { kind, title, due_on: due || null };
    if (kind === 'custom' && !title.trim()) return setError('Give the reminder a title.');
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || 'Could not add it.');
    window.location.reload();
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white">+ Add a reminder or point task</button>;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex gap-2" role="group" aria-label="Task type">
        {(['point', 'custom'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
            className={`px-3 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${kind === k ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-400'}`}>
            {k === 'point' ? 'Buy a point' : 'Reminder'}
          </button>
        ))}
      </div>
      {kind === 'point' ? (
        <div className="flex flex-wrap gap-2">
          <select aria-label="State" className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
          <select aria-label="Species" className={inputCls} value={species} onChange={(e) => setSpecies(e.target.value)}>{ALL_SPECIES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      ) : (
        <input aria-label="Reminder" className={`${inputCls} w-full`} placeholder="e.g. Renew hunter ed card" value={title} onChange={(e) => setTitle(e.target.value)} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="due" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Due</label>
        <input id="due" type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
        <span className="text-zinc-600 text-xs">Check the state&apos;s deadline — we don&apos;t guess it.</span>
      </div>
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={submit} className="bg-zinc-100 text-black px-5 py-2 font-black rounded-lg hover:bg-amber-500 uppercase tracking-widest text-[10px]">Add</button>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cancel</button>
      </div>
    </div>
  );
}
