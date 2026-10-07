'use client';

// Hunt detail workspace: overview (the saved recommendation), status and draw
// result, and notes. Application checklists, prep plans and reports come in
// later milestones; nothing here pretends they exist.

import { useState } from 'react';
import Link from 'next/link';
import {
  canMove, nextAction, RESULT_LABEL, RESULTS, STATUS_LABEL, STATUSES,
  type ApplicationResult, type HuntStatus, type SavedHunt,
} from '@/lib/hunts';

type Note = { id: string; body: string; created_at: string };
type Rec = { currentOdds?: string; tier?: string; whyItFits?: string; tradeoffs?: string; season?: string } | null;

export default function HuntWorkspace({ hunt: initial, notes: initialNotes }: { hunt: SavedHunt; notes: Note[] }) {
  const [hunt, setHunt] = useState(initial);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = hunt.recommendation as Rec;
  const action = nextAction(hunt);

  const patch = async (body: { status?: HuntStatus; application_result?: ApplicationResult | null }) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/hunts/${hunt.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not update.');
      setHunt(j.hunt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    const text = draft.trim();
    if (!text) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/hunts/${hunt.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not save the note.');
      setNotes((n) => [...n, j.note]);
      setDraft('');
    } catch (e) {
      // Keep the draft so nothing typed is lost.
      setError(e instanceof Error ? e.message : 'Could not save the note.');
    } finally {
      setBusy(false);
    }
  };

  const unitText = /^[0-9][0-9A-Z]{0,4}$/i.test(hunt.unit) ? `Unit ${hunt.unit}` : hunt.unit;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <Link href="/season" className="text-zinc-500 text-[11px] font-black uppercase tracking-widest hover:text-white">← My Season</Link>

      {/* Overview */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6" aria-labelledby="hunt-title">
        <p className="text-[10px] uppercase text-amber-500 font-black tracking-widest mb-2">{hunt.season_year} season · {STATUS_LABEL[hunt.status]}{hunt.application_result ? ` · ${RESULT_LABEL[hunt.application_result]}` : ''}</p>
        <h1 id="hunt-title" className="text-2xl font-black italic uppercase">{hunt.state} {hunt.species} · {unitText}{hunt.hunt_code ? ` · Hunt ${hunt.hunt_code}` : ''}</h1>
        {hunt.label && <p className="text-zinc-400 text-sm mt-1">{hunt.label}</p>}
        <p className="mt-4 text-amber-400 text-sm font-bold">Next: {action.label}</p>
      </section>

      {/* Status */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" aria-labelledby="status-h">
        <h2 id="status-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.filter((s) => s !== hunt.status && canMove(hunt.status, s)).map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => patch({ status: s })}
              className="px-4 py-2 rounded-full border border-zinc-700 text-[11px] font-black uppercase tracking-widest text-zinc-300 hover:border-amber-600 hover:text-white disabled:opacity-50">
              Mark {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {hunt.status === 'applied' && (
          <div>
            <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mb-2">Draw result (you record this — the app doesn&apos;t check with the state)</p>
            <div className="flex flex-wrap gap-2">
              {RESULTS.map((r) => (
                <button key={r} type="button" disabled={busy} aria-pressed={hunt.application_result === r} onClick={() => patch({ application_result: r })}
                  className={`px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest disabled:opacity-50 ${hunt.application_result === r ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-300 hover:border-amber-600'}`}>
                  {RESULT_LABEL[r]}
                </button>
              ))}
            </div>
            {hunt.application_result === 'unsuccessful' && (
              <p className="text-zinc-400 text-sm mt-3">This hunt stays in your history. <Link href="/planner?start=find" className="text-amber-500 underline">Find another hunt</Link></p>
            )}
          </div>
        )}
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      </section>

      {/* Saved recommendation (a snapshot from when it was saved) */}
      {rec && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3" aria-labelledby="rec-h">
          <h2 id="rec-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Why we recommended it <span className="text-zinc-600 normal-case font-bold tracking-normal">· saved {new Date(hunt.created_at).toLocaleDateString()}</span></h2>
          {rec.currentOdds && <p className="text-green-400 font-bold">{rec.currentOdds}</p>}
          {rec.season && <p className="text-zinc-400 text-sm">{rec.season}</p>}
          {rec.whyItFits && <p className="text-zinc-300 text-sm leading-relaxed">{rec.whyItFits}</p>}
          {rec.tradeoffs && <p className="text-zinc-500 text-xs italic border-l-2 border-zinc-700 pl-3">{rec.tradeoffs}</p>}
          <p className="text-zinc-600 text-xs">Odds are from the last published draw, not a forecast.</p>
        </section>
      )}

      {/* Notes */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" aria-labelledby="notes-h">
        <h2 id="notes-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Notes</h2>
        {notes.length === 0 && <p className="text-zinc-500 text-sm">No notes yet. Notes are private to you.</p>}
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-zinc-700 pl-3">
              <p className="text-zinc-200 text-sm whitespace-pre-wrap">{n.body}</p>
              <p className="text-zinc-600 text-[11px] mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
        <label htmlFor="note" className="sr-only">Add a note</label>
        <textarea id="note" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note…"
          className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-200 text-sm outline-none focus:border-amber-500" />
        <button type="button" onClick={addNote} disabled={busy || !draft.trim()} className="bg-zinc-100 text-black px-6 py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px] disabled:opacity-50">Save note</button>
      </section>
    </main>
  );
}
