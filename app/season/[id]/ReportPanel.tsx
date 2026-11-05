'use client';

// "Your hunt report" — the hunter's private record of how it went. Drafts can
// be saved any time; finishing moves the hunt to Completed. The official
// state harvest report is shown separately and is never marked done by this.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { ExternalLink, ImagePlus } from 'lucide-react';
import TaskList from '../TaskList';
import { Button, Card, Eyebrow } from '../../ui';
import { shortDate } from '@/lib/huntdata/apply';
import { supabaseBrowser } from '@/lib/supabase/client';
import { daysBetween, FIELD_LABEL, PRESSURE, type HuntReport, type TextField } from '@/lib/reports';
import type { HarvestReportingInfo } from '@/lib/huntdata/harvestReporting';
import type { Task } from '@/lib/applications';
import type { SavedHunt } from '@/lib/hunts';

export type Photo = { path: string; url: string | null };

const LONG_FIELDS: TextField[] = ['sightings', 'access_issues', 'conditions', 'worked', 'didnt_work', 'change_next'];
const HINT: Partial<Record<TextField, string>> = {
  animal: 'e.g. 5x5 bull, mature buck',
  measurements: 'Your own numbers — score, weight, spread',
  sightings: 'What and how many, by day if you like',
  access_issues: 'Locked gates, closed roads, private land',
  conditions: 'Weather, moon, snow, water',
};

export function OfficialHarvestCard({ state, species, info, agencyName, agencyUrl, tasks }: {
  state: string; species: string; info: HarvestReportingInfo; agencyName: string; agencyUrl: string | null; tasks: Task[];
}) {
  return (
    <div className="hq-inset hq-stack" style={{ gap: 12 }}>
      <div>
        <Eyebrow>Separate from this app</Eyebrow>
        <p className="hq-h3" style={{ marginTop: 2 }}>Official {state} harvest report</p>
      </div>
      {info.required === 'unknown' ? (
        <p className="hq-body">We haven&apos;t verified {state}&apos;s harvest-report rule for {species.toLowerCase()}. Check the current regulations{agencyUrl ? <> on the <a href={agencyUrl} target="_blank" rel="noopener noreferrer" className="hq-link">{agencyName} site</a></> : ''}.</p>
      ) : (
        <>
          {info.summary && <p className="hq-body">{info.summary}</p>}
          <ul className="hq-stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 10 }}>
            {info.rules.map((r, i) => (
              <li key={i} className="hq-quote hq-quote--brand hq-body">
                <strong>{r.type === 'mandatory_check' ? 'Required check-in' : r.type === 'survey' ? 'Survey' : 'Required report'}:</strong> {r.applies}
                {r.deadline && <span className="hq-small" style={{ display: 'block', marginTop: 4, color: 'var(--fair)', fontWeight: 700 }}>Deadline: {r.deadline}</span>}
                {r.consequence && <span className="hq-small" style={{ display: 'block', marginTop: 4 }}>If missed: {r.consequence}</span>}
                <a href={r.source} target="_blank" rel="noopener noreferrer" className="hq-link hq-small" style={{ display: 'inline-block', marginTop: 4 }}>Source</a>
              </li>
            ))}
          </ul>
        </>
      )}
      {info.reportUrl && (
        <div><a href={info.reportUrl} target="_blank" rel="noopener noreferrer" className="hq-btn hq-btn--secondary hq-btn--sm">Report on the official site <ExternalLink size={14} aria-hidden="true" /></a></div>
      )}
      {tasks.length > 0 && <TaskList initial={tasks} />}
      <p className="hq-small">Finishing your report here does not report your harvest to the state. Rules can change — confirm in this year&apos;s regulations{info.checkedOn ? ` (we checked ${info.checkedOn})` : ''}.</p>
    </div>
  );
}

export default function ReportPanel({
  hunt, report: initial, photos: initialPhotos, userId, harvest, harvestTasks: initialTasks, agencyName, agencyUrl, onHunt,
}: {
  hunt: SavedHunt & { hunt_start?: string | null; hunt_end?: string | null };
  report: HuntReport | null;
  photos: Photo[];
  userId: string;
  harvest: HarvestReportingInfo;
  harvestTasks: Task[];
  agencyName: string;
  agencyUrl: string | null;
  onHunt: (h: any) => void;
}) {
  const [report, setReport] = useState(initial);
  const [photos, setPhotos] = useState(initialPhotos);
  const [harvestTasks, setHarvestTasks] = useState(initialTasks);
  const before = hunt.status === 'tag_secured' || hunt.status === 'preparing';
  const [open, setOpen] = useState(!before || !!initial);
  const [editing, setEditing] = useState(!initial?.completed_at);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const r = initial as any;
    const f: Record<string, string> = {
      started_on: r?.started_on ?? hunt.hunt_start ?? '',
      ended_on: r?.ended_on ?? hunt.hunt_end ?? '',
      days_hunted: r?.days_hunted != null ? String(r.days_hunted) : '',
      harvested: r?.harvested === true ? 'yes' : r?.harvested === false ? 'no' : '',
      pressure: r?.pressure ?? '',
    };
    for (const k of Object.keys(FIELD_LABEL)) f[k] = r?.[k] ?? '';
    return f;
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const suggestedDays = daysBetween(form.started_on || null, form.ended_on || null);

  const save = async (complete: boolean, photoList = photos) => {
    setBusy(true); setError(null); setSaved(null); setFieldErrors({});
    try {
      const res = await fetch(`/api/hunts/${hunt.id}/report`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photos: photoList.map((p) => p.path), complete }),
      });
      const j = await res.json();
      if (!res.ok) { setFieldErrors(j.fields ?? {}); throw new Error(j.error || 'Could not save.'); }
      setReport(j.report);
      setHarvestTasks(j.harvestTasks ?? []);
      onHunt(j.hunt);
      if (complete) { setEditing(false); setSaved('Report finished. It’s in your past seasons on Plan.'); }
      else setSaved('Draft saved.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setError(null);
    const sb = supabaseBrowser();
    const added: Photo[] = [];
    for (const file of Array.from(files).slice(0, 12 - photos.length)) {
      if (file.size > 8 * 1024 * 1024) { setError(`${file.name} is over 8 MB.`); continue; }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${userId}/${hunt.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage.from('report-photos').upload(path, file, { contentType: file.type });
      if (upErr) { setError(`Couldn’t upload ${file.name}.`); continue; }
      const { data } = await sb.storage.from('report-photos').createSignedUrl(path, 3600);
      added.push({ path, url: data?.signedUrl ?? null });
    }
    setBusy(false);
    if (added.length) {
      const next = [...photos, ...added];
      setPhotos(next);
      await save(!!report?.completed_at, next);
    }
  };

  const removePhoto = async (path: string) => {
    if (!window.confirm('Remove this photo? It will be deleted.')) return;
    const next = photos.filter((p) => p.path !== path);
    if (await save(!!report?.completed_at, next)) setPhotos(next);
  };

  const official = (
    <OfficialHarvestCard state={hunt.state} species={hunt.species} info={harvest} agencyName={agencyName} agencyUrl={agencyUrl} tasks={harvestTasks} />
  );
  const fieldErr = (k: string) => fieldErrors[k] && <span className="hq-err">{fieldErrors[k]}</span>;

  if (!open) {
    return (
      <Card aria-labelledby="report-h" id="report">
        <div className="hq-stack">
          <h2 id="report-h" className="hq-h2">After your hunt</h2>
          <p className="hq-body">When you&apos;re back, write a short report: what you saw, what worked, what you&apos;d change. It&apos;s private, and your next plan will use it.</p>
          <div><Button onClick={() => setOpen(true)}>Write your hunt report</Button></div>
          {official}
        </div>
      </Card>
    );
  }

  const r = report as any;
  return (
    <Card aria-labelledby="report-h" id="report">
      <div className="hq-stack hq-stack--lg">
        <div>
          <h2 id="report-h" className="hq-h2">Your hunt report</h2>
          <p className="hq-small" style={{ marginTop: 2 }}>Private to you — no one else can see it, including your photos.</p>
        </div>

        {!editing && r ? (
          <div className="hq-stack" style={{ gap: 12 }}>
            <p className="hq-h3">
              {r.harvested ? 'Harvested' : 'No harvest'}
              {r.days_hunted != null ? ` · ${r.days_hunted} day${r.days_hunted === 1 ? '' : 's'} hunted` : ''}
              {r.started_on ? ` · ${shortDate(r.started_on)}${r.ended_on ? ` – ${shortDate(r.ended_on)}` : ''}` : ''}
              {r.pressure ? ` · ${r.pressure} pressure` : ''}
            </p>
            {(Object.keys(FIELD_LABEL) as TextField[]).filter((k) => r[k]).map((k) => (
              <div key={k}>
                <p className="hq-label">{FIELD_LABEL[k].replace(' (optional)', '')}</p>
                <p className="hq-body hq-pre">{r[k]}</p>
              </div>
            ))}
            <div><Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit report</Button></div>
          </div>
        ) : (
          <form className="hq-stack hq-stack--lg" onSubmit={(e) => { e.preventDefault(); save(true); }}>
            <div className="hq-fields">
              <label className="hq-field"><span className="hq-label">First day</span>
                <input type="date" value={form.started_on} onChange={(e) => set('started_on', e.target.value)} className="hq-input" aria-invalid={!!fieldErrors.started_on} />{fieldErr('started_on')}</label>
              <label className="hq-field"><span className="hq-label">Last day</span>
                <input type="date" value={form.ended_on} onChange={(e) => set('ended_on', e.target.value)} className="hq-input" aria-invalid={!!fieldErrors.ended_on} />{fieldErr('ended_on')}</label>
              <label className="hq-field"><span className="hq-label">Days you hunted</span>
                <input type="number" min={0} max={120} inputMode="numeric" value={form.days_hunted} placeholder={suggestedDays != null ? String(suggestedDays) : ''} onChange={(e) => set('days_hunted', e.target.value)} className="hq-input" aria-invalid={!!fieldErrors.days_hunted} />{fieldErr('days_hunted')}</label>
            </div>

            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="hq-label" style={{ marginBottom: 8 }}>Did you harvest?</legend>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="hq-chip" aria-pressed={form.harvested === 'yes'} onClick={() => set('harvested', 'yes')}>Yes</button>
                <button type="button" className="hq-chip" aria-pressed={form.harvested === 'no'} onClick={() => set('harvested', 'no')}>No</button>
              </div>
              {fieldErr('harvested')}
            </fieldset>

            {form.harvested === 'yes' && (
              <div className="hq-fields">
                {(['animal', 'measurements'] as TextField[]).map((k) => (
                  <label key={k} className="hq-field"><span className="hq-label">{FIELD_LABEL[k]}</span>
                    <input value={form[k]} placeholder={HINT[k]} onChange={(e) => set(k, e.target.value)} className="hq-input" /></label>
                ))}
              </div>
            )}

            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="hq-label" style={{ marginBottom: 8 }}>Hunting pressure</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESSURE.map((p) => (
                  <button key={p} type="button" className="hq-chip" aria-pressed={form.pressure === p} onClick={() => set('pressure', form.pressure === p ? '' : p)}>{p}</button>
                ))}
              </div>
            </fieldset>

            {LONG_FIELDS.map((k) => (
              <label key={k} className="hq-field"><span className="hq-label">{FIELD_LABEL[k]}</span>
                <textarea rows={3} value={form[k]} placeholder={HINT[k]} onChange={(e) => set(k, e.target.value)} className="hq-input" /></label>
            ))}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <Button type="submit" disabled={busy}>Finish report</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => save(!!report?.completed_at)}>Save draft</Button>
              {report?.completed_at && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </form>
        )}

        {/* Photos — uploaded straight to private storage */}
        <div className="hq-stack" style={{ gap: 10 }}>
          <p className="hq-label">Photos (optional, private)</p>
          {photos.length > 0 && (
            <ul className="hq-photos">
              {photos.map((p) => (
                <li key={p.path} style={{ position: 'relative' }}>
                  {p.url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.url} alt="Your hunt photo" />
                    : <div className="hq-photo-ph">Photo</div>}
                  <button type="button" onClick={() => removePhoto(p.path)} className="hq-btn hq-btn--secondary hq-btn--sm" style={{ position: 'absolute', top: 4, right: 4, minHeight: 26, padding: '0 8px', fontSize: 11 }}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          {photos.length < 12 && (
            <div>
              <label className="hq-file">
                <ImagePlus size={16} aria-hidden="true" /> Add photos
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="hq-sr" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
              </label>
            </div>
          )}
          <p className="hq-small">Photos can carry GPS location in their data. They stay private to you here.</p>
        </div>

        {error && <p role="alert" className="hq-err">{error}</p>}
        {saved && <p role="status" className="hq-ok">{saved}</p>}

        {official}
      </div>
    </Card>
  );
}
