'use client';

// Hunt detail workspace: overview, status and draw result, the stage's panel
// (application -> preparation -> report), the hunter's own past lessons, the
// saved recommendation and notes.

import { useState } from 'react';
import Link from 'next/link';
import ApplicationPanel, { type OfficialInfo } from './ApplicationPanel';
import PreparationPanel, { type PlanRow } from './PreparationPanel';
import ReportPanel, { type Photo } from './ReportPanel';
import type { HuntReport } from '@/lib/reports';
import type { HarvestReportingInfo } from '@/lib/huntdata/harvestReporting';
import type { PlanInputs } from '@/lib/plans';
import type { Application, Task } from '@/lib/applications';
import { huntTitle } from '@/lib/huntName';
import {
  canMove, nextAction, RESULT_LABEL, RESULTS, STATUS_LABEL, STATUSES,
  type ApplicationResult, type HuntStatus, type SavedHunt,
} from '@/lib/hunts';

type Note = { id: string; body: string; created_at: string };
type Rec = { currentOdds?: string; tier?: string; whyItFits?: string; tradeoffs?: string; season?: string } | null;
export type PastLesson = {
  hunt_id: string;
  harvested: boolean | null; days_hunted: number | null; pressure: string | null;
  worked: string | null; didnt_work: string | null; change_next: string | null; access_issues: string | null;
  saved_hunts: { season_year: number; state: string; species: string; unit: string; hunt_code: string | null };
};

export default function HuntWorkspace({
  hunt: initial, notes: initialNotes, application, tasks, official, plans, prepDefaults,
  report, photos, userId, harvest, agencyName, agencyUrl, pastLessons,
}: {
  hunt: SavedHunt;
  notes: Note[];
  application: Application | null;
  tasks: Task[];
  official: OfficialInfo;
  plans: PlanRow[];
  prepDefaults: Partial<Record<keyof PlanInputs, string>>;
  report: HuntReport | null;
  photos: Photo[];
  userId: string;
  harvest: HarvestReportingInfo;
  agencyName: string;
  agencyUrl: string | null;
  pastLessons: PastLesson[];
}) {
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

  const deleteNote = async (noteId: string) => {
    if (!window.confirm('Delete this note?')) return;
    const res = await fetch(`/api/hunts/${hunt.id}/notes/${noteId}`, { method: 'DELETE' });
    if (res.ok) setNotes((n) => n.filter((x) => x.id !== noteId));
    else setError('Could not delete the note.');
  };


  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <Link href="/season" className="text-zinc-500 text-[11px] font-black uppercase tracking-widest hover:text-white">← My Season</Link>

      {/* Overview */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6" aria-labelledby="hunt-title">
        <p className="text-[10px] uppercase text-amber-500 font-black tracking-widest mb-2">{hunt.season_year} season · {STATUS_LABEL[hunt.status]}{hunt.application_result ? ` · ${RESULT_LABEL[hunt.application_result]}` : ''}</p>
        <h1 id="hunt-title" className="text-2xl font-black italic uppercase">{hunt.state} {hunt.species} · {huntTitle(hunt.unit, hunt.hunt_code)}</h1>
        {hunt.label && <p className="text-zinc-400 text-sm mt-1">{hunt.label}</p>}
        <p className="mt-4 text-amber-400 text-sm font-bold">Next: {action.label}</p>
        {['tag_secured', 'preparing', 'completed'].includes(hunt.status) && (
          <Link href={`/season/${hunt.id}/print`} className="inline-block mt-4 text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white">Print hunt packet →</Link>
        )}
      </section>

      {/* The hunter's own lessons from past hunts — shown while deciding and preparing */}
      {pastLessons.length > 0 && !['completed', 'archived'].includes(hunt.status) && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3" aria-labelledby="lessons-h">
          <h2 id="lessons-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">From your past {hunt.state} {hunt.species.toLowerCase()} hunts</h2>
          <ul className="space-y-3">
            {pastLessons.slice(0, 3).map((l) => (
              <li key={l.hunt_id} className="border-l-2 border-amber-700 pl-3 text-sm">
                <Link href={`/season/${l.hunt_id}`} className="text-white font-bold hover:text-amber-400">
                  {l.saved_hunts.season_year} · {/^[0-9][0-9A-Z]{0,4}$/i.test(l.saved_hunts.unit) ? `Unit ${l.saved_hunts.unit}` : l.saved_hunts.unit} · {l.harvested ? 'Harvested' : 'No harvest'}{l.days_hunted != null ? ` · ${l.days_hunted} days` : ''}
                </Link>
                {l.change_next && <p className="text-zinc-300 mt-1"><span className="text-amber-500 font-bold">Change next time:</span> {l.change_next}</p>}
                {l.worked && <p className="text-zinc-400 mt-1"><span className="font-bold">Worked:</span> {l.worked}</p>}
                {l.access_issues && <p className="text-zinc-400 mt-1"><span className="font-bold">Access:</span> {l.access_issues}</p>}
              </li>
            ))}
          </ul>
          <p className="text-zinc-600 text-xs">Your hunt plan uses these notes too.</p>
        </section>
      )}

      {/* Status */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" aria-labelledby="status-h">
        <h2 id="status-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Status</h2>
        <div className="flex flex-wrap gap-2">
          {/* "Applied" comes only from "I submitted my application" below. */}
          {STATUSES.filter((s) => s !== hunt.status && s !== 'applied' && canMove(hunt.status, s)).map((s) => (
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

      {/* Application (before the hunt is drawn or settled) */}
      {['considering', 'planned', 'applied'].includes(hunt.status) && (
        <ApplicationPanel hunt={hunt} application={application} tasks={tasks} official={official} onHunt={setHunt} />
      )}

      {/* Preparation, once the tag is in hand */}
      {['tag_secured', 'preparing'].includes(hunt.status) && (
        <PreparationPanel
          hunt={hunt}
          plans={plans}
          prepTasks={tasks.filter((t) => t.kind === 'prep')}
          defaults={prepDefaults}
          onHunt={setHunt}
        />
      )}

      {/* Report: offered once the tag is in hand, the main panel once the hunt is over */}
      {(['tag_secured', 'preparing', 'completed'].includes(hunt.status) || (hunt.status === 'archived' && report)) && (
        <ReportPanel
          hunt={hunt}
          report={report}
          photos={photos}
          userId={userId}
          harvest={harvest}
          harvestTasks={tasks.filter((t) => t.kind === 'harvest_report')}
          agencyName={agencyName}
          agencyUrl={agencyUrl}
          onHunt={setHunt}
        />
      )}

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
              <p className="text-zinc-600 text-[11px] mt-1">
                {new Date(n.created_at).toLocaleString()}
                <button type="button" onClick={() => deleteNote(n.id)} className="ml-3 text-zinc-600 hover:text-red-400 underline">Delete</button>
              </p>
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
