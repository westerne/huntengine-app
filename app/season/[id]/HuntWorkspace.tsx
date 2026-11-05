'use client';

// Hunt detail workspace: overview, status and draw result, the stage's panel
// (application -> preparation -> report), the hunter's own past lessons, the
// saved recommendation and notes.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import ApplicationPanel, { type OfficialInfo } from './ApplicationPanel';
import PreparationPanel, { type PlanRow } from './PreparationPanel';
import ReportPanel, { type Photo } from './ReportPanel';
import { Button, ButtonLink, Card, Eyebrow, Tier } from '../../ui';
import type { HuntReport } from '@/lib/reports';
import type { HarvestReportingInfo } from '@/lib/huntdata/harvestReporting';
import type { PlanInputs } from '@/lib/plans';
import type { Application, Task } from '@/lib/applications';
import { huntTitle, labelText } from '@/lib/huntName';
import { STAGE, stageOfSaved } from '@/lib/myHunts';
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
  const stage = stageOfSaved({ ...hunt, hunt_reports: report ? { completed_at: report.completed_at, harvested: report.harvested } : null, applications: application });

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
    <main className="hq-stack hq-stack--lg" style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 40px' }}>
      <Link href="/plan" className="hq-link hq-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}><ArrowLeft size={14} aria-hidden="true" /> Your plan</Link>

      {/* Overview */}
      <Card className="hq-fade-up" aria-labelledby="hunt-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <Eyebrow>{hunt.season_year} season</Eyebrow>
          <Tier tier={STAGE[stage].tier}>{STAGE[stage].label}{hunt.application_result === 'alternate' ? ' · Alternate' : ''}</Tier>
        </div>
        <h1 id="hunt-title" className="hq-h1" style={{ marginTop: 6 }}>{hunt.state} {hunt.species.toLowerCase()} · {huntTitle(hunt.unit, hunt.hunt_code)}</h1>
        {hunt.label && <p className="hq-body" style={{ marginTop: 4, color: 'var(--ink-soft)' }}>{labelText(hunt.label)}</p>}
        <p className="hq-h3" style={{ marginTop: 14 }}>Next: {action.label}</p>
        {['tag_secured', 'preparing', 'completed'].includes(hunt.status) && (
          <div style={{ marginTop: 14 }}><ButtonLink href={`/season/${hunt.id}/print`} variant="secondary" size="sm"><Printer size={15} aria-hidden="true" /> Print hunt packet</ButtonLink></div>
        )}
      </Card>

      {/* The hunter's own lessons from past hunts — shown while deciding and preparing */}
      {pastLessons.length > 0 && !['completed', 'archived'].includes(hunt.status) && (
        <Card variant="flat" aria-labelledby="lessons-h">
          <h2 id="lessons-h" className="hq-h3">From your past {hunt.state} {hunt.species.toLowerCase()} hunts</h2>
          <ul className="hq-stack" style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, gap: 14 }}>
            {pastLessons.slice(0, 3).map((l) => (
              <li key={l.hunt_id} className="hq-quote hq-quote--brand">
                <Link href={`/season/${l.hunt_id}`} className="hq-link" style={{ fontWeight: 700 }}>
                  {l.saved_hunts.season_year} · {/^[0-9][0-9A-Z]{0,4}$/i.test(l.saved_hunts.unit) ? `Unit ${l.saved_hunts.unit}` : l.saved_hunts.unit} · {l.harvested ? 'Harvested' : 'No harvest'}{l.days_hunted != null ? ` · ${l.days_hunted} days` : ''}
                </Link>
                {l.change_next && <p className="hq-body" style={{ marginTop: 4 }}><strong>Change next time:</strong> {l.change_next}</p>}
                {l.worked && <p className="hq-small" style={{ marginTop: 4 }}><strong>Worked:</strong> {l.worked}</p>}
                {l.access_issues && <p className="hq-small" style={{ marginTop: 4 }}><strong>Access:</strong> {l.access_issues}</p>}
              </li>
            ))}
          </ul>
          <p className="hq-small" style={{ marginTop: 12 }}>Your hunt plan uses these notes too.</p>
        </Card>
      )}

      {/* Status */}
      <Card aria-labelledby="status-h">
        <div className="hq-stack">
          <h2 id="status-h" className="hq-h3">Status</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* "Applied" comes only from "I submitted my application" below. */}
            {STATUSES.filter((s) => s !== hunt.status && s !== 'applied' && canMove(hunt.status, s)).map((s) => (
              <Button key={s} size="sm" variant={s === 'archived' ? 'ghost' : 'secondary'} disabled={busy} onClick={() => patch({ status: s })}>Mark {STATUS_LABEL[s].toLowerCase()}</Button>
            ))}
          </div>
          {hunt.status === 'applied' && (
            <div>
              <p className="hq-label" style={{ marginBottom: 8 }}>Draw result <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>— you record this; the app doesn&apos;t check with the state</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {RESULTS.map((r) => (
                  <button key={r} type="button" className="hq-chip" disabled={busy} aria-pressed={hunt.application_result === r} onClick={() => patch({ application_result: r })}>{RESULT_LABEL[r]}</button>
                ))}
              </div>
              {hunt.application_result === 'unsuccessful' && (
                <p className="hq-body" style={{ marginTop: 10 }}>This hunt stays in your past seasons. <Link href="/find" className="hq-link">Find another hunt</Link></p>
              )}
            </div>
          )}
          {error && <p role="alert" className="hq-err">{error}</p>}
        </div>
      </Card>

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
        <Card variant="flat" aria-labelledby="rec-h">
          <div className="hq-stack" style={{ gap: 10 }}>
            <h2 id="rec-h" className="hq-h3">Why we recommended it <span className="hq-small" style={{ fontWeight: 400 }}>· saved {new Date(hunt.created_at).toLocaleDateString()}</span></h2>
            {rec.currentOdds && <p className="hq-body" style={{ fontWeight: 700, color: 'var(--data)' }}>{rec.currentOdds}</p>}
            {rec.season && <p className="hq-small">{rec.season}</p>}
            {rec.whyItFits && <p className="hq-body">{rec.whyItFits}</p>}
            {rec.tradeoffs && <p className="hq-small hq-quote">{rec.tradeoffs}</p>}
            <p className="hq-small">Odds are from the last published draw, not a forecast.</p>
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card aria-labelledby="notes-h">
        <div className="hq-stack">
          <h2 id="notes-h" className="hq-h3">Notes</h2>
          {notes.length === 0 && <p className="hq-small">No notes yet. Notes are private to you.</p>}
          {notes.length > 0 && (
            <ul className="hq-stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 12 }}>
              {notes.map((n) => (
                <li key={n.id} className="hq-quote">
                  <p className="hq-body hq-pre">{n.body}</p>
                  <p className="hq-small" style={{ marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString()}
                    <button type="button" onClick={() => deleteNote(n.id)} style={{ marginLeft: 12, background: 'none', border: 0, padding: 0, color: 'var(--ink-muted)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>Delete</button>
                  </p>
                </li>
              ))}
            </ul>
          )}
          <label className="hq-field"><span className="hq-sr">Add a note</span>
            <textarea className="hq-input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note…" /></label>
          <div><Button onClick={addNote} disabled={busy || !draft.trim()}>Save note</Button></div>
        </div>
      </Card>
    </main>
  );
}
