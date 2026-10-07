'use client';

// Compare view: the recommendation and its tradeoff first, then the full
// side-by-side table. Hunts are added by state → species → hunt.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { compareKey, MAX_COMPARE, type CompareColumn } from '@/lib/compare';
import { huntTitle } from '@/lib/huntName';
import { STATES, speciesFor } from '../planner/constants';

export type YourNotes = { planned: string[]; reports: string[] };

const inputCls = 'bg-black border border-zinc-800 p-2 rounded-lg text-zinc-200 text-sm outline-none focus:border-amber-500';

const ROWS: Array<{ label: string; get: (c: CompareColumn) => string }> = [
  { label: 'Odds this season', get: (c) => c.oddsNow },
  { label: 'How reliable', get: (c) => c.reliability },
  { label: 'Likely to draw by', get: (c) => (!c.openToYou ? '—' : c.outlook.kind === 'otc' ? 'No draw' : c.likelyBy ? String(c.likelyBy) : 'Not within 5 years') },
  { label: 'Chance within 5 years', get: (c) => (c.chanceBy5 == null ? '—' : c.chanceBy5 >= 99 ? 'Very likely' : `About ${Math.round(c.chanceBy5)}%`) },
  { label: 'Hunter success', get: (c) => c.hunterSuccess },
  { label: 'Public land', get: (c) => c.publicLand ?? 'Not available' },
  { label: 'Season', get: (c) => c.season ?? 'See the regulations' },
  { label: 'Weapon', get: (c) => c.weapon ?? 'See the regulations' },
  { label: 'Trophy', get: (c) => c.trophy },
  { label: 'Cost', get: (c) => c.cost },
];

function AddHunt({ keys }: { keys: string[] }) {
  const router = useRouter();
  const [state, setState] = useState('CO');
  const [species, setSpecies] = useState('Elk');
  const [options, setOptions] = useState<Array<{ code: string; unit: string; label: string | null; speciesKey: string }>>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    let live = true;
    fetch(`/api/huntdata/options?state=${state}&species=${encodeURIComponent(species)}`).then((r) => r.json()).then((j) => { if (live) setOptions(j.hunts ?? []); }).catch(() => setOptions([]));
    return () => { live = false; };
  }, [state, species]);
  const shown = options.filter((o) => !q || `${o.code} ${o.unit} ${o.label ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const add = (o: { code: string; speciesKey: string }) => router.push(`/compare?h=${[...keys, compareKey(state, o.speciesKey, o.code)].map(encodeURIComponent).join(',')}`);
  if (keys.length >= MAX_COMPARE) return <p className="text-zinc-500 text-xs">Up to {MAX_COMPARE} hunts — remove one to add another.</p>;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Add a hunt to compare</p>
      <div className="flex flex-wrap gap-2">
        <select aria-label="State" className={inputCls} value={state} onChange={(e) => { setState(e.target.value); setSpecies(speciesFor(e.target.value)[0]); }}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Species" className={inputCls} value={species} onChange={(e) => setSpecies(e.target.value)}>{speciesFor(state).map((s) => <option key={s}>{s}</option>)}</select>
        <input aria-label="Search hunts" placeholder="Unit, hunt code or name" className={`${inputCls} flex-1 min-w-[10rem]`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="max-h-56 overflow-y-auto divide-y divide-zinc-800 border border-zinc-800 rounded-lg">
        {shown.length === 0 && <li className="p-2 text-zinc-500 text-sm">No hunts match.</li>}
        {shown.map((o) => (
          <li key={o.code}>
            <button type="button" onClick={() => add(o)} className="w-full text-left p-2 text-sm hover:bg-zinc-800">
              <span className="text-zinc-200 font-bold">{huntTitle(o.unit, o.code)}</span>{o.label ? <span className="text-zinc-500"> — {o.label}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CompareView({ cols, pick, notes, missing, years, homeState }: {
  cols: CompareColumn[]; pick: { key: string; why: string; tradeoff: string | null } | null;
  notes: Record<string, YourNotes>; missing: string[]; years: number[]; homeState: string | null;
}) {
  const [added, setAdded] = useState<Record<string, string>>({});
  const [land, setLand] = useState<Record<string, string>>({});
  const keys = cols.map((c) => c.key);
  // Public land is sampled from BLM land status — slow the first time, so it
  // fills in after the table shows.
  useEffect(() => {
    let live = true;
    for (const c of cols) {
      fetch(`/api/huntdata/public-land?state=${c.state}&species=${encodeURIComponent(c.species)}&unit=${encodeURIComponent(c.unit)}`)
        .then((r) => r.json())
        .then((j) => { if (live) setLand((l) => ({ ...l, [c.key]: j.publicPct != null ? `About ${j.publicPct}% (BLM land-status sample)` : 'Not available' })); })
        .catch(() => { if (live) setLand((l) => ({ ...l, [c.key]: 'Not available' })); });
    }
    return () => { live = false; };
  }, [cols]);
  const without = (k: string) => `/compare?h=${keys.filter((x) => x !== k).map(encodeURIComponent).join(',')}`;

  const addToCalendar = async (c: CompareColumn) => {
    const otc = c.outlook.kind === 'otc';
    const year = otc ? null : c.likelyBy && years.includes(c.likelyBy) ? c.likelyBy : null;
    const res = await fetch('/api/plan-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: otc ? 'otc' : year ? 'target' : 'bucket', state: c.state, species: c.species, unit: c.unit, hunt_code: c.huntCode, label: c.label, target_year: year }),
    });
    setAdded((a) => ({ ...a, [c.key]: res.ok ? `Added${year ? ` for ${year}` : otc ? ' as an OTC option' : ' to your bucket list'}` : 'Could not add — try again' }));
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black italic uppercase">Compare hunts</h1>
        <p className="text-zinc-500 text-sm mt-1">Side by side, at your points{homeState ? ` (home state ${homeState})` : ' — set your home state in My Profile for resident odds'}. Numbers are last year&apos;s published results, not a forecast.</p>
      </div>

      {missing.length > 0 && <p className="text-amber-300 text-sm">Couldn&apos;t find {missing.join(', ')} in our data.</p>}

      {pick && cols.length > 1 && (
        <section aria-labelledby="pick-h" className="bg-zinc-900 border border-amber-900/60 rounded-2xl p-6 space-y-2">
          <h2 id="pick-h" className="text-[11px] uppercase text-amber-500 font-black tracking-widest">Our pick</h2>
          <p className="text-white font-bold">{pick.why}</p>
          {pick.tradeoff && <p className="text-zinc-400 text-sm">Tradeoff: {pick.tradeoff}</p>}
          {(() => {
            // Public land arrives after the table: flag a much more public alternative.
            const pct = (k: string) => { const m = (land[k] ?? '').match(/About (\d+)%/); return m ? Number(m[1]) : null; };
            const mine = pct(pick.key);
            const alt = cols.filter((c) => c.key !== pick.key && c.openToYou).map((c) => ({ c, p: pct(c.key) }))
              .filter((x) => x.p != null && mine != null && x.p >= mine + 25).sort((a, b) => b.p! - a.p!)[0];
            return alt ? <p className="text-zinc-400 text-sm">Public land: {alt.c.state} {alt.c.huntCode} is about {alt.p}% public vs about {mine}% for our pick — worth it if you hunt without private access.</p> : null;
          })()}
          <p className="text-zinc-600 text-xs">Weighs your chance of drawing within five years against hunter success. Trophy quality and cost aren&apos;t in our data yet.</p>
        </section>
      )}

      {cols.length === 0 ? (
        <p className="text-zinc-400">Pick hunts to compare below, or use &quot;Compare&quot; from your calendar or Find a Hunt.</p>
      ) : (
        <div className="overflow-x-auto border border-zinc-800 rounded-xl">
          <table className="w-full text-sm min-w-[36rem]">
            <thead>
              <tr className="bg-zinc-900 align-top">
                <th className="text-left p-3 w-36 text-[10px] uppercase tracking-widest text-zinc-500">Hunt</th>
                {cols.map((c) => (
                  <th key={c.key} className={`text-left p-3 ${pick?.key === c.key && cols.length > 1 ? 'bg-amber-950/40' : ''}`}>
                    <p className="text-white font-black uppercase italic">{c.state} {c.species}</p>
                    <p className="text-zinc-300 text-xs font-bold">{huntTitle(c.unit, c.huntCode)}</p>
                    {c.label && <p className="text-zinc-500 text-xs font-normal">{c.label}</p>}
                    {!c.openToYou && <p className="text-red-400 text-xs">Not open to you</p>}
                    {pick?.key === c.key && cols.length > 1 && <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">Our pick</p>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-t border-zinc-800 align-top">
                  <th className="text-left p-3 text-[10px] uppercase tracking-widest text-zinc-500 font-black">{r.label}</th>
                  {cols.map((c) => <td key={c.key} className="p-3 text-zinc-300">{r.label === 'Public land' ? (land[c.key] ?? 'Checking…') : r.get(c)}</td>)}
                </tr>
              ))}
              <tr className="border-t border-zinc-800 align-top">
                <th className="text-left p-3 text-[10px] uppercase tracking-widest text-zinc-500 font-black">Your notes</th>
                {cols.map((c) => {
                  const n = notes[c.key];
                  const lines = [...(n?.planned ?? []), ...(n?.reports ?? [])];
                  return <td key={c.key} className="p-3 text-zinc-400 text-xs">{lines.length ? lines.map((l, i) => <p key={i}>{l}</p>) : '—'}</td>;
                })}
              </tr>
              <tr className="border-t border-zinc-800">
                <th />
                {cols.map((c) => (
                  <td key={c.key} className="p-3 space-y-2">
                    {added[c.key]
                      ? <p className="text-green-400 text-xs">{added[c.key]} · <Link href="/calendar" className="underline">calendar</Link></p>
                      : c.openToYou && <button type="button" onClick={() => addToCalendar(c)} className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500">Add to calendar</button>}
                    <Link href={without(c.key)} className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white">Remove</Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <AddHunt keys={keys} />
    </main>
  );
}
