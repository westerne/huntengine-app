'use client';

// Permanent hunter preferences + point balances. Everything is optional.
// Season-specific answers (dates, this year's goals) stay on each search.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { FITNESS_LEVELS, SPECIES, STATES, STYLE_OPTIONS, EXPERIENCE_OPTIONS } from '../planner/constants';

type PointRow = { state: string; species: string; points: number; as_of_year: number; verified_on: string | null };

const inputCls = 'w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-100 text-sm outline-none focus:border-amber-500';
const label = 'block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2';

function Chips({ options, value, onChange, name }: { options: string[]; value: string[]; onChange: (v: string[]) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`px-3 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${on ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-400'}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileForm({ email, profile, points: initialPoints }: { email: string | null; profile: any; points: PointRow[] }) {
  const [p, setP] = useState({
    display_name: profile.display_name ?? '',
    home_state: profile.home_state ?? '',
    species_interests: profile.species_interests ?? [],
    weapons: profile.weapons ?? [],
    hunt_styles: profile.hunt_styles ?? [],
    fitness: profile.fitness ?? '',
    experience: profile.experience ?? '',
    grizzly_ok: profile.grizzly_ok ?? null,
    access_notes: profile.access_notes ?? '',
    typical_budget: profile.typical_budget ?? '',
  });
  const [points, setPoints] = useState<PointRow[]>(initialPoints);
  const [status, setStatus] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const year = new Date().getFullYear();

  const save = async () => {
    setBusy(true); setStatus(null);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: p, points }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not save.');
      setStatus({ kind: 'info', text: 'Saved.' });
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const manageBilling = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.url) window.location.href = j.url;
    else setStatus({ kind: 'error', text: j.error || 'Could not open billing.' });
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-3xl font-black italic uppercase">My Profile</h1>
      <p className="text-zinc-400 text-sm -mt-4">Saved preferences fill in your searches. Everything is optional and you can change it per search.</p>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 grid sm:grid-cols-2 gap-5">
        <div><label htmlFor="dn" className={label}>Name</label><input id="dn" className={inputCls} value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></div>
        <div>
          <label htmlFor="hs" className={label}>Home state (residency)</label>
          <input id="hs" className={inputCls} maxLength={2} placeholder="e.g. WY" value={p.home_state} onChange={(e) => setP({ ...p, home_state: e.target.value.toUpperCase() })} />
        </div>
        <div className="sm:col-span-2"><span className={label}>Species you hunt</span><Chips name="Species" options={SPECIES} value={p.species_interests} onChange={(v) => setP({ ...p, species_interests: v })} /></div>
        <div className="sm:col-span-2"><span className={label}>Weapons</span><Chips name="Weapons" options={['Rifle', 'Archery', 'Muzzleloader']} value={p.weapons} onChange={(v) => setP({ ...p, weapons: v })} /></div>
        <div className="sm:col-span-2"><span className={label}>Hunt styles</span><Chips name="Hunt styles" options={STYLE_OPTIONS} value={p.hunt_styles} onChange={(v) => setP({ ...p, hunt_styles: v })} /></div>
        <div>
          <label htmlFor="fit" className={label}>Fitness</label>
          <select id="fit" className={inputCls} value={p.fitness} onChange={(e) => setP({ ...p, fitness: e.target.value })}>
            <option value="">—</option>{FITNESS_LEVELS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="exp" className={label}>Experience</label>
          <select id="exp" className={inputCls} value={p.experience} onChange={(e) => setP({ ...p, experience: e.target.value })}>
            <option value="">—</option>{EXPERIENCE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="griz" className={label}>Grizzly country</label>
          <select id="griz" className={inputCls} value={p.grizzly_ok === null ? '' : p.grizzly_ok ? 'yes' : 'no'} onChange={(e) => setP({ ...p, grizzly_ok: e.target.value === '' ? null : e.target.value === 'yes' })}>
            <option value="">No preference</option><option value="yes">Comfortable</option><option value="no">Avoid</option>
          </select>
        </div>
        <div><label htmlFor="bud" className={label}>Typical budget</label><input id="bud" className={inputCls} placeholder="e.g. $3,000 per hunt" value={p.typical_budget} onChange={(e) => setP({ ...p, typical_budget: e.target.value })} /></div>
        <div className="sm:col-span-2"><label htmlFor="acc" className={label}>Access limitations</label><textarea id="acc" rows={2} className={inputCls} placeholder="e.g. bad knee — no steep pack-outs" value={p.access_notes} onChange={(e) => setP({ ...p, access_notes: e.target.value })} /></div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" aria-labelledby="pts-h">
        <h2 id="pts-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">My Points</h2>
        <p className="text-zinc-500 text-xs">Enter balances as your state account shows them. HuntQuarters doesn&apos;t check them with the state — note when you last verified.</p>
        {points.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
            <select aria-label="State" className={inputCls} value={r.state} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, state: e.target.value } : x))}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            <select aria-label="Species" className={`${inputCls} sm:col-span-2`} value={r.species} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, species: e.target.value } : x))}>{SPECIES.map((s) => <option key={s}>{s}</option>)}</select>
            <input aria-label="Points" type="number" min={0} step="any" className={inputCls} value={r.points} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, points: Math.max(0, Number(e.target.value) || 0) } : x))} />
            <input aria-label="Last verified" type="date" className={inputCls} value={r.verified_on ?? ''} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, verified_on: e.target.value || null } : x))} />
            <button type="button" onClick={() => setPoints(points.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400 text-xs font-black uppercase">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setPoints([...points, { state: p.home_state && STATES.includes(p.home_state) ? p.home_state : 'WY', species: 'Elk', points: 0, as_of_year: year, verified_on: null }])}
          className="text-amber-500 text-[11px] font-black uppercase tracking-widest hover:text-amber-400">+ Add a point balance</button>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={busy} className="bg-amber-600 text-white px-8 py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs disabled:opacity-50">{busy ? 'Saving…' : 'Save profile'}</button>
        {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${status.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}>{status.text}</p>}
      </div>

      <section className="border-t border-zinc-900 pt-6 text-sm text-zinc-500 flex flex-wrap items-center gap-4">
        <span>Signed in as {email}</span>
        <button type="button" onClick={manageBilling} className="text-zinc-300 underline hover:text-white">Manage membership & billing</button>
      </section>
    </main>
  );
}
