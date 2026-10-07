'use client';

// My Hunt Calendar: this year's plan first, then the next years, the bucket
// list and OTC options that aren't placed yet, and the points ledger.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KIND_LABEL, PLAN_KINDS, type Outlook, type PlanItem, type PlanKind, type YearFlag } from '@/lib/calendar';
import { huntTitle } from '@/lib/huntName';
import { STATES, speciesFor } from '../planner/constants';

export type CalItem = PlanItem & { outlook: Outlook; huntLabel: string | null; residency: 'resident' | 'nonresident'; compareKey: string | null };
export type LedgerRow = {
  state: string; species: string; current: number | null; usesPoints: boolean; live: boolean;
  byYear: Record<number, number> | null;
};

const inputCls = 'bg-black border border-zinc-800 p-2 rounded-lg text-zinc-200 text-sm outline-none focus:border-amber-500';
const KIND_CLS: Record<PlanKind, string> = {
  target: 'bg-green-950 text-green-300 border-green-800',
  bucket: 'bg-purple-950 text-purple-300 border-purple-800',
  otc: 'bg-blue-950 text-blue-300 border-blue-800',
};

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Something went wrong — try again.');
  return j;
}

function OutlookLine({ o }: { o: Outlook }) {
  const cls = o.kind === 'closed' ? 'text-red-400' : o.kind === 'otc' ? 'text-blue-300' : o.kind === 'none' ? 'text-zinc-500' : 'text-zinc-300';
  return <p className={`text-xs mt-1 ${cls}`}>{o.text}</p>;
}

function ItemCard({ item, years, thisYear, onError, picked, onPick }: { item: CalItem; years: number[]; thisYear: number; onError: (e: string) => void; picked: boolean; onPick: (k: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); router.refresh(); } catch (e) { onError(e instanceof Error ? e.message : 'Something went wrong.'); } finally { setBusy(false); }
  };
  const title = item.unit || item.hunt_code ? huntTitle(item.unit ?? item.hunt_code!, item.unit ? item.hunt_code : null) : 'Unit not chosen yet';

  return (
    <li className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`inline-block text-[9px] font-black uppercase tracking-widest border rounded-full px-2 py-0.5 mb-1 ${KIND_CLS[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
          <p className="text-white font-black uppercase italic text-sm">{item.state} {item.species} · {title}</p>
          {(item.label || item.huntLabel) && <p className="text-zinc-500 text-xs">{item.label || item.huntLabel}</p>}
          <OutlookLine o={item.outlook} />
          {item.notes && <p className="text-zinc-400 text-xs mt-1 italic">{item.notes}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`y-${item.id}`}>Year</label>
          <select id={`y-${item.id}`} disabled={busy} value={item.target_year ?? ''} className={`${inputCls} text-xs py-1`}
            onChange={(e) => act(() => send(`/api/plan-items/${item.id}`, 'PATCH', { target_year: e.target.value || null }))}>
            <option value="">No year</option>
            {[...new Set([...years, ...(item.target_year ? [item.target_year] : [])])].sort().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {item.target_year === thisYear && (item.unit || item.hunt_code) && (
            item.saved_hunt_id
              ? <Link href={`/season/${item.saved_hunt_id}`} className="text-amber-500 text-[10px] font-black uppercase tracking-widest hover:text-amber-400">In My Season →</Link>
              : <button type="button" disabled={busy} onClick={() => act(() => send(`/api/plan-items/${item.id}/to-season`, 'POST'))}
                  className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50">Add to My Season</button>
          )}
          {item.compareKey && (
            <label className="flex items-center gap-1 text-zinc-400 text-[10px] font-black uppercase tracking-widest cursor-pointer">
              <input type="checkbox" checked={picked} onChange={() => onPick(item.compareKey!)} className="accent-amber-600" />Compare
            </label>
          )}
          <button type="button" disabled={busy} aria-label={`Remove ${item.state} ${item.species}`}
            onClick={() => window.confirm('Remove this from your calendar?') && act(() => send(`/api/plan-items/${item.id}`, 'DELETE'))}
            className="text-zinc-600 hover:text-red-400 text-[10px] font-black uppercase tracking-widest">Remove</button>
        </div>
      </div>
    </li>
  );
}

function AddItem({ years, onDone }: { years: number[]; onDone: () => void }) {
  const [f, setF] = useState({ kind: 'target' as PlanKind, state: 'CO', species: 'Elk', unit: '', hunt_code: '', target_year: String(years[0]), notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const speciesList = speciesFor(f.state);
  const submit = async () => {
    setBusy(true); setError(null);
    try { await send('/api/plan-items', 'POST', { ...f, target_year: f.target_year || null }); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not add it.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
        {PLAN_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={f.kind === k} onClick={() => set('kind', k)}
            className={`px-3 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${f.kind === k ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-400'}`}>{KIND_LABEL[k]}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <select aria-label="State" className={inputCls} value={f.state} onChange={(e) => setF((x) => ({ ...x, state: e.target.value, species: speciesFor(e.target.value).includes(x.species) ? x.species : speciesFor(e.target.value)[0] }))}>
          {STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Species" className={inputCls} value={f.species} onChange={(e) => set('species', e.target.value)}>
          {speciesList.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Year" className={inputCls} value={f.target_year} onChange={(e) => set('target_year', e.target.value)}>
          <option value="">No year yet</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <input aria-label="Unit" placeholder="Unit (e.g. 61)" className={inputCls} value={f.unit} onChange={(e) => set('unit', e.target.value)} />
        <input aria-label="Hunt code" placeholder="Hunt code (optional)" className={inputCls} value={f.hunt_code} onChange={(e) => set('hunt_code', e.target.value)} />
        <input aria-label="Notes" placeholder="Notes" className={`${inputCls} col-span-2 sm:col-span-1`} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={submit} className="bg-zinc-100 text-black px-5 py-2 font-black rounded-lg hover:bg-amber-500 uppercase tracking-widest text-[10px] disabled:opacity-50">Add to calendar</button>
        <button type="button" onClick={onDone} className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cancel</button>
      </div>
      <p className="text-zinc-600 text-xs">A hunt code gives exact draw odds. With only a unit, odds show when that unit has just one hunt.</p>
    </div>
  );
}

function Ledger({ rows, years }: { rows: LedgerRow[]; years: number[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState({ state: 'CO', species: 'Elk', points: '' });
  const [error, setError] = useState<string | null>(null);
  const save = async (list: Array<{ state: string; species: string; points: string }>) => {
    setError(null);
    try { await send('/api/points', 'PUT', { points: list.map((r) => ({ ...r, points: Number(r.points) })) }); setEdit({}); setAdding((a) => ({ ...a, points: '' })); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
  };
  return (
    <section aria-labelledby="ledger-h" className="space-y-3">
      <h2 id="ledger-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Points ledger</h2>
      <p className="text-zinc-500 text-xs">Projected points assume you apply or buy a point every year; a planned draw target resets them the year after. Random draws (ID, NM, AK) have no points.</p>
      <div className="overflow-x-auto border border-zinc-800 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-[10px] uppercase tracking-widest text-zinc-500">
            <tr><th className="text-left p-2">State · species</th><th className="text-left p-2">Now</th>{years.map((y) => <th key={y} className="p-2">{y}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={years.length + 2} className="p-3 text-zinc-500">No points on file yet — add them below or import your spreadsheet.</td></tr>}
            {rows.map((r) => {
              const k = `${r.state}|${r.species}`;
              return (
                <tr key={k} className="border-t border-zinc-800">
                  <td className="p-2 font-bold text-zinc-200 whitespace-nowrap">{r.state} {r.species}</td>
                  <td className="p-2">
                    {r.usesPoints ? (
                      <input aria-label={`${r.state} ${r.species} points`} inputMode="numeric" className={`${inputCls} w-16 py-1`}
                        value={edit[k] ?? (r.current ?? '')} placeholder="?"
                        onChange={(e) => setEdit((x) => ({ ...x, [k]: e.target.value }))}
                        onBlur={() => edit[k] != null && edit[k] !== '' && save([{ state: r.state, species: r.species, points: edit[k] }])} />
                    ) : <span className="text-zinc-600 text-xs">no points</span>}
                  </td>
                  {years.map((y) => <td key={y} className="p-2 text-center text-zinc-300">{r.byYear ? r.byYear[y] : '—'}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="State" className={inputCls} value={adding.state} onChange={(e) => setAdding((a) => ({ ...a, state: e.target.value, species: speciesFor(e.target.value)[0] }))}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
        <select aria-label="Species" className={inputCls} value={adding.species} onChange={(e) => setAdding((a) => ({ ...a, species: e.target.value }))}>{speciesFor(adding.state).map((s) => <option key={s}>{s}</option>)}</select>
        <input aria-label="Points" inputMode="numeric" placeholder="Points" className={`${inputCls} w-24`} value={adding.points} onChange={(e) => setAdding((a) => ({ ...a, points: e.target.value }))} />
        <button type="button" disabled={adding.points === ''} onClick={() => save([adding])} className="text-amber-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">+ Add points</button>
      </div>
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
    </section>
  );
}

export default function CalendarView({ years, items, ledger, flags, homeState, homeKnown, loadError }: {
  years: number[]; items: CalItem[]; ledger: LedgerRow[]; flags: YearFlag[]; homeState: string | null; homeKnown: boolean; loadError: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const onPick = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k].slice(-4)));
  const thisYear = years[0];
  const inWindow = (i: CalItem) => i.target_year != null && years.includes(i.target_year);
  const unplaced = items.filter((i) => !inWindow(i));

  // This year's decision line, per points-ledger pair with nothing planned.
  const planned = new Set(items.filter((i) => i.target_year === thisYear).map((i) => `${i.state}|${i.species}`));
  const pointOnly = ledger.filter((r) => r.usesPoints && r.live && !planned.has(`${r.state}|${r.species}`));

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black italic uppercase">My Hunt Calendar</h1>
          <p className="text-zinc-500 text-sm mt-1">Your next {years.length} seasons: draw targets, bucket-list hunts, OTC options and points.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/calendar/setup" className="border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">{items.length ? 'Get suggestions' : 'Start planning'}</Link>
          <Link href="/calendar/import" className="border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800">Import spreadsheet</Link>
          <button type="button" onClick={() => setAdding(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500">+ Add a hunt</button>
        </div>
      </div>

      {loadError && <p role="alert" className="bg-red-950/50 border border-red-900 text-red-200 rounded-xl px-4 py-3 text-sm">Your calendar couldn&apos;t be loaded just now. Nothing is lost — try again in a minute.</p>}
      {!homeState && !homeKnown && <p className="bg-amber-950/40 border border-amber-900 text-amber-200 rounded-xl px-4 py-3 text-sm">Set your home state in <Link href="/profile" className="underline">My Profile</Link> — odds below assume you&apos;re a non-resident everywhere.</p>}
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      {adding && <AddItem years={years} onDone={() => { setAdding(false); router.refresh(); }} />}

      {items.length === 0 && ledger.length === 0 && !loadError ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-3">
          <p className="text-zinc-200 font-bold">Let&apos;s build your next {years.length} seasons.</p>
          <p className="text-zinc-400 text-sm">Answer a few quick questions — what you hunt, where, your points, your bucket list — and we&apos;ll suggest hunts year by year from real draw results. You choose what stays.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/calendar/setup" className="inline-block bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500">Start planning</Link>
            <Link href="/calendar/import" className="text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white">Already track this in a spreadsheet? Import it</Link>
          </div>
        </div>
      ) : (
        <>
          {/* This year first: what to do now */}
          <section aria-labelledby="now-h" className="bg-zinc-900 border border-amber-900/60 rounded-2xl p-6 space-y-3">
            <h2 id="now-h" className="text-[11px] uppercase text-amber-500 font-black tracking-widest">{thisYear}: what to do this application season</h2>
            {items.filter((i) => i.target_year === thisYear).length === 0 && pointOnly.length === 0
              ? <p className="text-zinc-400 text-sm">Nothing planned for {thisYear} yet.</p>
              : (
                <ul className="text-sm text-zinc-300 space-y-1 list-disc pl-5">
                  {items.filter((i) => i.target_year === thisYear).map((i) => (
                    <li key={i.id}>{i.kind === 'otc' ? 'Buy an OTC tag' : 'Apply'}: {i.state} {i.species}{i.unit || i.hunt_code ? ` · ${huntTitle(i.unit ?? i.hunt_code!, i.unit ? i.hunt_code : null)}` : ''}{i.saved_hunt_id ? ' (in My Season)' : ''}</li>
                  ))}
                  {pointOnly.length > 0 && <li>Keep building points (buy a point or apply) — nothing planned there in {thisYear}: {pointOnly.map((r) => `${r.state} ${r.species.toLowerCase()}`).join(', ')}.</li>}
                </ul>
              )}
            <p className="text-zinc-600 text-xs">&quot;Add to My Season&quot; on a {thisYear} hunt starts its application checklist and deadline reminders.</p>
          </section>

          {years.map((y) => {
            const list = items.filter((i) => i.target_year === y);
            const f = flags.filter((x) => x.year === y);
            return (
              <section key={y} aria-labelledby={`y-${y}`} className="space-y-3">
                <h2 id={`y-${y}`} className="text-xl font-black italic text-white">{y}{y === thisYear ? <span className="text-amber-500 text-xs not-italic ml-2 uppercase tracking-widest">this season</span> : null}</h2>
                {f.map((x, i) => <p key={i} className={`text-xs ${x.level === 'warn' ? 'text-amber-300' : 'text-zinc-500'}`}>{x.level === 'warn' ? '⚠ ' : ''}{x.text}</p>)}
                {list.length > 0 && <ul className="space-y-2">{list.map((i) => <ItemCard key={i.id} item={i} years={years} thisYear={thisYear} onError={setError} picked={!!i.compareKey && picked.includes(i.compareKey)} onPick={onPick} />)}</ul>}
              </section>
            );
          })}

          {unplaced.length > 0 && (
            <section aria-labelledby="unplaced-h" className="space-y-3">
              <h2 id="unplaced-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Not on a year yet</h2>
              <p className="text-zinc-500 text-xs">Bucket-list hunts and OTC options to fit in. Pick a year to place one.</p>
              <ul className="space-y-2">{unplaced.map((i) => <ItemCard key={i.id} item={i} years={years} thisYear={thisYear} onError={setError} picked={!!i.compareKey && picked.includes(i.compareKey)} onPick={onPick} />)}</ul>
            </section>
          )}
        </>
      )}

      {picked.length > 0 && (
        <div className="sticky bottom-4 z-30 flex justify-center">
          <Link href={`/compare?h=${picked.map(encodeURIComponent).join(',')}`}
            className={`px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl ${picked.length > 1 ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-zinc-800 text-zinc-400 pointer-events-none'}`}>
            {picked.length > 1 ? `Compare ${picked.length} hunts →` : 'Pick one more to compare'}
          </Link>
        </div>
      )}

      <Ledger rows={ledger} years={years} />
      <p className="text-zinc-600 text-xs">Odds are from each state&apos;s last published draw, not a forecast. Points and draw rules can change; confirm with the agency before you apply.</p>
    </main>
  );
}
