'use client';

// Application section of a saved hunt. Facts we don't verify (fees, the
// hunter's deadline) are labelled as theirs; agency-published deadlines show
// their source. Opening the official site never marks anything submitted.

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import TaskList from '../TaskList';
import { Button, Card, Caveat, Eyebrow } from '../../ui';
import { shortDate } from '@/lib/huntdata/apply';
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
    <Card aria-labelledby="app-h">
      <div className="hq-stack hq-stack--lg">
        <div>
          <Eyebrow>{hunt.season_year} draw</Eyebrow>
          <h2 id="app-h" className="hq-h2" style={{ marginTop: 2 }}>Application</h2>
        </div>

        {/* Decision */}
        <div>
          <p className="hq-label" style={{ marginBottom: 8 }}>Your plan for this hunt</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Decision">
            {DECISIONS.map((d) => (
              <button key={d} type="button" className="hq-chip" disabled={busy || submitted} aria-pressed={decision === d} onClick={() => save({ decision: d })}>
                {DECISION_LABEL[d]}
              </button>
            ))}
          </div>
          <p className="hq-small" style={{ marginTop: 8 }}>{decision ? DECISION_HELP[decision] : 'Pick one to get the next steps.'}</p>
          {decision === 'build_points' && <p className="hq-body" style={{ marginTop: 6 }}>A point-building task was added to your <Link href="/today#todo" className="hq-link">to-do list</Link>.</p>}
        </div>

        {/* Official links + prerequisites */}
        {(official.applyUrl || official.datesPageUrl || official.prerequisites.length > 0) && (
          <div className="hq-stack" style={{ gap: 10 }}>
            {(official.applyUrl || official.datesPageUrl) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                {official.applyUrl && <a href={official.applyUrl} target="_blank" rel="noopener noreferrer" className="hq-btn hq-btn--secondary hq-btn--sm">Official {hunt.state} application site <ExternalLink size={14} aria-hidden="true" /></a>}
                {official.datesPageUrl && <a href={official.datesPageUrl} target="_blank" rel="noopener noreferrer" className="hq-link hq-small">Official draw dates</a>}
              </div>
            )}
            {official.applyUrl && <p className="hq-small">Opening it doesn&apos;t mark anything as applied.</p>}
            {official.prerequisites.length > 0 && (
              <div className="hq-inset">
                <p className="hq-label" style={{ marginBottom: 6 }}>Before you apply</p>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {official.prerequisites.map((p, i) => (
                    <li key={i} className="hq-small" style={{ color: 'var(--ink-soft)' }}>{p.text} <a href={p.source} target="_blank" rel="noopener noreferrer" className="hq-link">Source</a></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fees as the agency posts them */}
        {official.fees.length > 0 && (
          <details>
            <summary className="hq-label" style={{ cursor: 'pointer' }}>Fees ({official.fees.length})</summary>
            <ul className="hq-list" style={{ marginTop: 6 }}>
              {official.fees.map((f, i) => (
                <li key={i} className="hq-small" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0' }}>
                  <span>{f.label}{f.residency && f.residency !== 'both' ? ` · ${f.residency === 'resident' ? 'resident' : 'non-resident'}` : ''}</span>
                  <span style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--data)' }}>{money(f.amount)}</strong>{f.year ? ` (${f.year})` : ''} <a href={f.source} target="_blank" rel="noopener noreferrer" className="hq-link">Source</a></span>
                </li>
              ))}
            </ul>
            <p className="hq-small" style={{ marginTop: 6 }}>As posted by the agency{official.checkedOn ? `, checked ${official.checkedOn}` : ''}. Confirm before you pay.</p>
          </details>
        )}

        {decision === 'apply' && (
          <>
            {/* Deadline */}
            <div className="hq-stack" style={{ gap: 8 }}>
              <div className="hq-fields">
                <label className="hq-field"><span className="hq-label">Application deadline</span>
                  <input type="date" className="hq-input" disabled={busy || submitted} value={app.deadline_on ?? ''}
                    onChange={(e) => save({ deadline_on: e.target.value || null, deadline_time: null, deadline_tz: null })} /></label>
              </div>
              <p className="hq-small">
                {app.deadline_on
                  ? `${dueLabel(app.deadline_on)}${app.deadline_time ? ` · ${app.deadline_time.slice(0, 5)}` : ''}${app.deadline_tz ? ` ${app.deadline_tz.replace('America/', '').replace('_', ' ')} time` : ''} · ${app.deadline_source === 'agency' ? 'from the agency' : 'entered by you'}`
                  : 'Not set'}
              </p>
              {official.deadline ? (
                app.deadline_source !== 'agency' && (
                  <div className="hq-inset" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="hq-body">{hunt.state} has published: <strong>{official.deadline.group}</strong> — {shortDate(official.deadline.date.slice(0, 10))}{official.deadline.time ? ` ${official.deadline.time.slice(0, 5)}` : ''}. <a href={official.deadline.source} target="_blank" rel="noopener noreferrer" className="hq-link hq-small">Source</a></span>
                    <Button size="sm" onClick={useAgencyDeadline}>Use this date</Button>
                  </div>
                )
              ) : official.reference ? (
                <Caveat>
                  {official.reference.kind === 'expected'
                    ? <>Expected around <strong>{shortDate(official.reference.date)}</strong>{official.reference.time ? ` ${official.reference.time}` : ''} ({official.reference.group}) — calculated from {hunt.state}&apos;s rules, not yet posted. </>
                    : <>{hunt.state} hasn&apos;t posted its {hunt.season_year} deadline yet. Last year ({official.reference.year}): <strong>{shortDate(official.reference.date)}</strong>{official.reference.time ? ` ${official.reference.time}` : ''} ({official.reference.group}). </>}
                  Enter the date when the state posts it. <a href={official.reference.source} target="_blank" rel="noopener noreferrer" className="hq-link">Source</a>
                </Caveat>
              ) : (
                <p className="hq-small">{hunt.state} hasn&apos;t published its {hunt.season_year} deadline in our records yet. Enter it when the state posts it.</p>
              )}
            </div>

            {/* Choices + their notes */}
            <div className="hq-fields">
              <label className="hq-field"><span className="hq-label">This hunt is my</span>
                <select className="hq-input" disabled={busy || submitted} value={app.choice_rank ?? ''} onChange={(e) => save({ choice_rank: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— choice</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} choice</option>)}
                </select></label>
              <label className="hq-field hq-span"><span className="hq-label">My other choices</span>
                <input className="hq-input" disabled={busy || submitted} defaultValue={app.other_choices ?? ''} placeholder="e.g. 2nd: hunt 3019" onBlur={(e) => e.target.value !== (app.other_choices ?? '') && save({ other_choices: e.target.value })} /></label>
              <label className="hq-field hq-span"><span className="hq-label">Fees — your note (not a verified fee)</span>
                <input className="hq-input" disabled={busy} defaultValue={app.fee_note ?? ''} placeholder="e.g. $15 app fee + license; tag $700 if drawn" onBlur={(e) => e.target.value !== (app.fee_note ?? '') && save({ fee_note: e.target.value })} /></label>
            </div>

            {/* Checklist */}
            <div>
              <p className="hq-h3" style={{ marginBottom: 4 }}>Checklist</p>
              <TaskList key={tasks.map((t) => t.id + (t.done_at ?? '')).join()} initial={tasks.filter((t) => t.kind === 'application')} showProgress onChange={(next) => setTasks((all) => [...all.filter((t) => t.kind !== 'application'), ...next])} />
            </div>

            {/* Submit — explicit */}
            {submitted ? (
              <p className="hq-ok">
                You marked this submitted on {new Date(app.submitted_at!).toLocaleDateString()}{app.confirmation_number ? ` · Confirmation ${app.confirmation_number}` : ''}.
              </p>
            ) : canSubmit && (
              <div className="hq-fields" style={{ borderTop: '1px solid var(--divider)', paddingTop: 18, alignItems: 'end' }}>
                <label className="hq-field"><span className="hq-label">Confirmation number (optional)</span>
                  <input className="hq-input" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
                <Button disabled={busy} onClick={submit}>I submitted my application</Button>
              </div>
            )}
          </>
        )}

        {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={msg.kind === 'error' ? 'hq-err' : 'hq-ok'}>{msg.text}</p>}
      </div>
    </Card>
  );
}
