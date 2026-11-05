'use client';

// Application section of a saved hunt. Facts we don't verify (fees, the
// hunter's deadline) are labelled as theirs; agency-published deadlines show
// their source. Opening the official site never marks anything submitted.

import { useState } from 'react';
import TaskList from '../TaskList';
import {
  DECISION_HELP, DECISION_LABEL, DECISIONS, dueLabel,
  type Application, type Decision, type Task,
} from '@/lib/applications';
import type { SavedHunt } from '@/lib/hunts';

export type OfficialInfo = {
  applyUrl: string | null;
  datesPageUrl: string | null;
  prerequisites: Array<{ text: string; source: string }>;
  // Agency-published deadline for this hunt's own season, when posted.
  deadline: { date: string; time: string | null; timezone: string | null; group: string; source: string } | null;
  // Otherwise: last year's date, or one calculated from the rules — reference only.
  reference: { kind: 'expected' | 'last_year'; date: string; time: string | null; timezone: string | null; group: string; year: number; source: string } | null;
  fees: Array<{ label: string; item: string; amount: number | null; year: number | null; residency: string | null; source: string }>;
  checkedOn: string | null;
};

const money = (n: number | null) => (n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);

const inputCls = 'w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-100 text-sm outline-none focus:border-amber-500';
const label = 'block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2';

export default function ApplicationPanel({
  hunt, application, tasks: initialTasks, official, onHunt,
}: {
  hunt: SavedHunt;
  application: Application | null;
  tasks: Task[];
  official: OfficialInfo;
  onHunt: (h: SavedHunt) => void;
}) {
  const [app, setApp] = useState<Partial<Application>>(application ?? {});
  const [tasks, setTasks] = useState(initialTasks);
  const [confirmation, setConfirmation] = useState(application?.confirmation_number ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const decision = (app.decision ?? null) as Decision | null;

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/hunts/${hunt.id}/application`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not save.');
      setApp(j.application); setTasks(j.tasks); onHunt(j.hunt);
      return true;
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const useAgencyDeadline = () => official.deadline && save({
    deadline_on: official.deadline.date.slice(0, 10),
    deadline_time: official.deadline.time,
    deadline_tz: official.deadline.timezone,
    deadline_source: 'agency',
  });

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/hunts/${hunt.id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation_number: confirmation }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not record the submission.');
      setApp(j.application); setTasks(j.tasks); onHunt(j.hunt);
      setMsg({ kind: 'info', text: 'Marked as applied. Record your draw result above when the state posts it.' });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not record the submission.' });
    } finally {
      setBusy(false);
    }
  };

  const submitted = !!app.submitted_at;
  const canSubmit = ['considering', 'planned'].includes(hunt.status) && decision === 'apply';

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6" aria-labelledby="app-h">
      <h2 id="app-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Application · {hunt.season_year} draw</h2>

      {/* Decision */}
      <div>
        <span className={label}>Your plan for this hunt</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Decision">
          {DECISIONS.map((d) => (
            <button key={d} type="button" disabled={busy || submitted} aria-pressed={decision === d}
              onClick={() => save({ decision: d })}
              className={`px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest disabled:opacity-50 ${decision === d ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-300 hover:border-amber-600'}`}>
              {DECISION_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="text-zinc-500 text-xs mt-2">{decision ? DECISION_HELP[decision] : 'Pick one to get the next steps.'}</p>
        {decision === 'build_points' && <p className="text-zinc-400 text-sm mt-2">A point-building task was added to Next up on My Season.</p>}
      </div>

      {/* Official links + prerequisites */}
      {(official.applyUrl || official.datesPageUrl || official.prerequisites.length > 0) && (
        <div className="space-y-2 text-sm">
          {official.applyUrl && (
            <p><a href={official.applyUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500 underline font-bold">Open the official {hunt.state} application site ↗</a>
              <span className="text-zinc-600 text-xs"> — opening it doesn&apos;t mark anything as applied.</span></p>
          )}
          {official.datesPageUrl && <p><a href={official.datesPageUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline">Official draw dates ↗</a></p>}
          {official.prerequisites.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mb-1">Before you apply</p>
              <ul className="list-disc pl-5 space-y-1">
                {official.prerequisites.map((p, i) => (
                  <li key={i} className="text-zinc-300 text-xs">{p.text} <a href={p.source} target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline">Source</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Fees as the agency posts them */}
      {official.fees.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-300 font-bold">Fees ({official.fees.length})</summary>
          <ul className="mt-2 space-y-1">
            {official.fees.map((f, i) => (
              <li key={i} className="flex justify-between gap-3 text-xs text-zinc-400 border-b border-zinc-800 pb-1">
                <span>{f.label}{f.residency && f.residency !== 'both' ? ` · ${f.residency === 'resident' ? 'resident' : 'non-resident'}` : ''}</span>
                <span className="whitespace-nowrap"><span className="text-zinc-200 font-bold">{money(f.amount)}</span>{f.year ? ` (${f.year})` : ''} <a href={f.source} target="_blank" rel="noopener noreferrer" className="underline">Source</a></span>
              </li>
            ))}
          </ul>
          <p className="text-zinc-600 text-xs mt-2">As posted by the agency{official.checkedOn ? `, checked ${official.checkedOn}` : ''}. Confirm before you pay.</p>
        </details>
      )}

      {decision === 'apply' && (
        <>
          {/* Deadline */}
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label htmlFor="dl" className={label}>Application deadline</label>
              <input id="dl" type="date" className={inputCls} disabled={busy || submitted} value={app.deadline_on ?? ''}
                onChange={(e) => save({ deadline_on: e.target.value || null, deadline_time: null, deadline_tz: null })} />
            </div>
            <p className="text-xs text-zinc-500 pb-3">
              {app.deadline_on
                ? `${dueLabel(app.deadline_on)}${app.deadline_time ? ` · ${app.deadline_time.slice(0, 5)}` : ''}${app.deadline_tz ? ` ${app.deadline_tz.replace('America/', '').replace('_', ' ')} time` : ''} · ${app.deadline_source === 'agency' ? 'from the agency' : 'entered by you'}`
                : 'Not set'}
            </p>
          </div>
          {official.deadline ? (
            app.deadline_source !== 'agency' && (
              <p className="text-sm text-zinc-300">
                {hunt.state} has published: <strong>{official.deadline.group}</strong> — {official.deadline.date.slice(0, 10)}{official.deadline.time ? ` ${official.deadline.time.slice(0, 5)}` : ''}.{' '}
                <button type="button" onClick={useAgencyDeadline} className="text-amber-500 underline">Use this date</button>{' '}
                <a href={official.deadline.source} target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline text-xs">Source</a>
              </p>
            )
          ) : official.reference ? (
            <p className="text-xs text-zinc-400">
              {official.reference.kind === 'expected'
                ? <>Expected around <strong>{official.reference.date}</strong>{official.reference.time ? ` ${official.reference.time}` : ''} ({official.reference.group}) — calculated from {hunt.state}&apos;s rules, not yet posted. </>
                : <>{hunt.state} hasn&apos;t posted its {hunt.season_year} deadline yet. Last year ({official.reference.year}): <strong>{official.reference.date}</strong>{official.reference.time ? ` ${official.reference.time}` : ''} ({official.reference.group}). </>}
              Enter the date when the state posts it. <a href={official.reference.source} target="_blank" rel="noopener noreferrer" className="text-zinc-500 underline">Source</a>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">{hunt.state} hasn&apos;t published its {hunt.season_year} deadline in our records yet. Enter it when the state posts it.</p>
          )}

          {/* Choices + their notes */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="rank" className={label}>This hunt is my</label>
              <select id="rank" className={inputCls} disabled={busy || submitted} value={app.choice_rank ?? ''} onChange={(e) => save({ choice_rank: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— choice</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} choice</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="oc" className={label}>My other choices</label>
              <input id="oc" className={inputCls} disabled={busy || submitted} defaultValue={app.other_choices ?? ''} placeholder="e.g. 2nd: hunt 3019" onBlur={(e) => e.target.value !== (app.other_choices ?? '') && save({ other_choices: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="fee" className={label}>Fees — your note (not a verified fee)</label>
              <input id="fee" className={inputCls} disabled={busy} defaultValue={app.fee_note ?? ''} placeholder="e.g. $15 app fee + license; tag $700 if drawn" onBlur={(e) => e.target.value !== (app.fee_note ?? '') && save({ fee_note: e.target.value })} />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <span className={label}>Checklist</span>
            <TaskList key={tasks.map((t) => t.id + (t.done_at ?? '')).join()} initial={tasks.filter((t) => t.kind === 'application')} showProgress onChange={(next) => setTasks((all) => [...all.filter((t) => t.kind !== 'application'), ...next])} />
          </div>

          {/* Submit — explicit */}
          {submitted ? (
            <p className="text-green-400 text-sm font-bold">
              ✓ You marked this submitted on {new Date(app.submitted_at!).toLocaleDateString()}{app.confirmation_number ? ` · Confirmation ${app.confirmation_number}` : ''}.
            </p>
          ) : canSubmit && (
            <div className="border-t border-zinc-800 pt-5 grid sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label htmlFor="conf" className={label}>Confirmation number (optional)</label>
                <input id="conf" className={inputCls} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </div>
              <button type="button" disabled={busy} onClick={submit} className="bg-amber-600 text-white py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px] disabled:opacity-50">
                I submitted my application
              </button>
            </div>
          )}
        </>
      )}

      {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${msg.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>}
    </section>
  );
}
