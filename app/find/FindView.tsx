'use client';

// Find a Hunt, step 1 and 2: pick a state and species, then see what your
// points actually buy — before being asked anything else.
//
// The reality panel costs nothing (no model call), so it loads as soon as the
// pair is chosen. Questions that narrow the list come after, and only where
// they'd change it.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATES, speciesFor } from '../planner/constants';

const inputCls = 'bg-black border border-zinc-800 p-3 rounded-xl text-zinc-200 outline-none focus:border-amber-500';

type Hunt = {
  unit: string;
  huntCode: string | null;
  label: string | null;
  odds: number | null;
  hunterSuccess: number | null;
  pointsNeeded: number | null;
};

type Reality = {
  points: number;
  considered: number;
  basis: 'your-points' | 'points-to-draw' | 'published-rate' | 'none';
  reachable: Hunt[];
  antlerless: Hunt[];
  best: Hunt | null;
  bestAntlerless: Hunt | null;
  soon: Array<Hunt & { pointsNeeded: number; yearsAway: number; year: number; farOff: boolean }>;
  headline: string;
  caveat: string;
  residency: 'resident' | 'nonresident';
  state: string;
  species: string;
};

const pctText = (n: number) => (n >= 10 ? `${Math.round(n)}%` : `${n.toFixed(1)}%`);

function HuntRow({ h, showOdds }: { h: Hunt; showOdds: boolean }) {
  return (
    <li className="flex items-start justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
      <span className="min-w-0">
        <span className="block text-white font-black uppercase italic text-sm">
          {h.unit}{h.huntCode && h.huntCode !== h.unit ? ` · ${h.huntCode}` : ''}
        </span>
        {h.label && <span className="block text-zinc-500 text-xs mt-0.5">{h.label}</span>}
      </span>
      <span className="text-right shrink-0">
        {showOdds && h.odds != null && (
          <span className="block text-amber-500 font-black text-sm">{pctText(h.odds)}</span>
        )}
        {h.pointsNeeded != null && (
          <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">
            {h.pointsNeeded} pt{h.pointsNeeded === 1 ? '' : 's'} drew
          </span>
        )}
        {h.hunterSuccess != null && (
          <span className="block text-zinc-400 text-[10px] uppercase tracking-widest">{h.hunterSuccess}% success</span>
        )}
      </span>
    </li>
  );
}

export default function FindView({ initialState, initialSpecies }: { initialState: string; initialSpecies: string }) {
  const [state, setState] = useState(initialState);
  const [species, setSpecies] = useState(initialSpecies);
  const [reality, setReality] = useState<Reality | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCow, setShowCow] = useState(false);

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
    return () => { live = false; };
  }, [state, species]);

  const answered = !!reality && reality.state === state && reality.species === species;
  const busy = !answered && !error;

  const onState = (next: string) => {
    setState(next);
    if (!speciesFor(next).includes(species)) setSpecies(speciesFor(next)[0]);
  };

  const showOdds = reality?.basis === 'your-points';

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black italic uppercase">Find a hunt</h1>
        <p className="text-zinc-400 text-sm mt-2">
          Pick a state and species. We&apos;ll tell you what your points buy there before asking anything else.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">State</span>
          <select aria-label="State" className={inputCls} value={state} onChange={(e) => onState(e.target.value)}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Species</span>
          <select aria-label="Species" className={inputCls} value={species} onChange={(e) => setSpecies(e.target.value)}>
            {speciesFor(state).map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {busy && <p className="text-zinc-500 text-sm">Reading the draw data…</p>}
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      {reality && answered && (
        <section aria-labelledby="reality-h" className="space-y-5">
          <h2 id="reality-h" className="sr-only">What your points buy</h2>

          <div className="border border-zinc-800 rounded-2xl p-5 space-y-3">
            <p className="text-zinc-100 leading-relaxed">{reality.headline}</p>
            <p className="text-zinc-600 text-xs">{reality.caveat}</p>
            <p className="text-zinc-600 text-xs">
              {reality.residency === 'resident' ? 'Resident' : 'Non-resident'} odds, from your profile.{' '}
              <Link href="/profile" className="text-amber-600 hover:text-amber-500">Change your points or home state</Link>
            </p>
          </div>

          {reality.reachable.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Within reach ({reality.reachable.length})
              </h3>
              <ul className="space-y-2">
                {reality.reachable.slice(0, 8).map((h) => (
                  <HuntRow key={`${h.unit}|${h.huntCode}`} h={h} showOdds={!!showOdds} />
                ))}
              </ul>
            </div>
          )}

          {reality.soon.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Worth building toward
              </h3>
              <ul className="space-y-2">
                {reality.soon.filter((h) => !h.farOff).slice(0, 4).map((h) => (
                  <li key={`${h.unit}|${h.huntCode}`} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                    <span className="block text-white font-black uppercase italic text-sm">
                      {h.unit}{h.huntCode && h.huntCode !== h.unit ? ` · ${h.huntCode}` : ''}
                    </span>
                    <span className="block text-zinc-400 text-xs mt-1">
                      Took {h.pointsNeeded} points — you&apos;d have that in {h.year}
                      {h.hunterSuccess != null ? `, and ${h.hunterSuccess}% of hunters filled` : ''}.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reality.antlerless.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCow((v) => !v)}
                className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-500"
              >
                {showCow ? 'Hide' : 'Show'} antlerless tags ({reality.antlerless.length})
              </button>
              {showCow && (
                <ul className="space-y-2">
                  {reality.antlerless.slice(0, 8).map((h) => (
                    <HuntRow key={`${h.unit}|${h.huntCode}`} h={h} showOdds={!!showOdds} />
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/planner?start=find&state=${state}&species=${encodeURIComponent(species)}`}
              className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500"
            >
              Look at these units
            </Link>
            <Link
              href="/calendar"
              className="border border-zinc-700 text-zinc-200 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-800"
            >
              Plan another year instead
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
