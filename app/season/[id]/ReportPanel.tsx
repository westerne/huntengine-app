'use client';

// "Your hunt report" — the hunter's private record of how it went. Drafts can
// be saved any time; finishing moves the hunt to Completed. The official
// state harvest report is shown separately and is never marked done by this.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import TaskList from '../TaskList';
import { supabaseBrowser } from '@/lib/supabase/client';
import { daysBetween, FIELD_LABEL, PRESSURE, type HuntReport, type TextField } from '@/lib/reports';
import type { HarvestReportingInfo } from '@/lib/huntdata/harvestReporting';
import type { Task } from '@/lib/applications';
import type { SavedHunt } from '@/lib/hunts';

export type Photo = { path: string; url: string | null };

const inputCls = 'w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-100 text-sm outline-none focus:border-amber-500';
const labelCls = 'block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2';
const pill = (on: boolean) =>
  `px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest ${on ? 'bg-amber-700 border-amber-600 text-white' : 'border-zinc-700 text-zinc-300 hover:border-amber-600'}`;

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
    <div className="border border-blue-900 bg-blue-950/30 rounded-xl p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Official {state} harvest report — separate from this app</p>
      {info.required === 'unknown' ? (
        <p className="text-zinc-300 text-sm">We haven&apos;t verified {state}&apos;s harvest-report rule for {species.toLowerCase()}. Check the current regulations{agencyUrl ? <> on the <a href={agencyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">{agencyName} site</a></> : ''}.</p>
      ) : (
        <>
          {info.summary && <p className="text-zinc-300 text-sm">{info.summary}</p>}
          <ul className="space-y-2">
            {info.rules.map((r, i) => (
              <li key={i} className="text-sm text-zinc-300 border-l-2 border-blue-800 pl-3">
                <span className="font-bold text-white">{r.type === 'mandatory_check' ? 'Required check-in' : r.type === 'survey' ? 'Survey' : 'Required report'}:</span> {r.applies}
                {r.deadline && <span className="block text-amber-300 text-xs font-bold mt-1">Deadline: {r.deadline}</span>}
                {r.consequence && <span className="block text-zinc-400 text-xs mt-1">If missed: {r.consequence}</span>}
                <a href={r.source} target="_blank" rel="noopener noreferrer" className="block text-zinc-500 text-[11px] underline mt-1">Source</a>
              </li>
            ))}
          </ul>
        </>
      )}
      {info.reportUrl && (
        <a href={info.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-700 text-white px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-blue-600">Report on the official site ↗</a>
      )}
      {tasks.length > 0 && <TaskList initial={tasks} />}
      <p className="text-zinc-500 text-xs">Finishing your report here does not report your harvest to the state. Rules can change — confirm in this year&apos;s regulations{info.checkedOn ? ` (we checked ${info.checkedOn})` : ''}.</p>
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
      if (complete) { setEditing(false); setSaved('Report finished. It’s in My History.'); }
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

  if (!open) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" aria-labelledby="report-h">
        <h2 id="report-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">After your hunt</h2>
        <p className="text-zinc-400 text-sm">When you&apos;re back, write a short report: what you saw, what worked, what you&apos;d change. It&apos;s private, and your next plan will use it.</p>
        <button type="button" onClick={() => setOpen(true)} className="bg-zinc-100 text-black px-6 py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px]">Write your hunt report</button>
        {official}
      </section>
    );
  }

  const r = report as any;
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5" aria-labelledby="report-h">
      <div>
        <h2 id="report-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Your hunt report</h2>
        <p className="text-zinc-500 text-xs mt-1">Private to you — no one else can see it, including your photos.</p>
      </div>

      {!editing && r ? (
        <div className="space-y-3">
          <p className="text-white font-bold">
            {r.harvested ? 'Harvested' : 'No harvest'}
            {r.days_hunted != null ? ` · ${r.days_hunted} day${r.days_hunted === 1 ? '' : 's'} hunted` : ''}
            {r.started_on ? ` · ${r.started_on}${r.ended_on ? ` → ${r.ended_on}` : ''}` : ''}
            {r.pressure ? ` · ${r.pressure} pressure` : ''}
          </p>
          {(Object.keys(FIELD_LABEL) as TextField[]).filter((k) => r[k]).map((k) => (
            <div key={k}>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{FIELD_LABEL[k].replace(' (optional)', '')}</p>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap">{r[k]}</p>
            </div>
          ))}
          <button type="button" onClick={() => setEditing(true)} className="text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white">Edit report</button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(true); }}>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="r-start" className={labelCls}>First day</label>
              <input id="r-start" type="date" value={form.started_on} onChange={(e) => set('started_on', e.target.value)} className={inputCls} aria-invalid={!!fieldErrors.started_on} />
              {fieldErrors.started_on && <p className="text-red-400 text-xs mt-1">{fieldErrors.started_on}</p>}
            </div>
            <div>
              <label htmlFor="r-end" className={labelCls}>Last day</label>
              <input id="r-end" type="date" value={form.ended_on} onChange={(e) => set('ended_on', e.target.value)} className={inputCls} aria-invalid={!!fieldErrors.ended_on} />
              {fieldErrors.ended_on && <p className="text-red-400 text-xs mt-1">{fieldErrors.ended_on}</p>}
            </div>
            <div>
              <label htmlFor="r-days" className={labelCls}>Days you hunted</label>
              <input id="r-days" type="number" min={0} max={120} inputMode="numeric" value={form.days_hunted} placeholder={suggestedDays != null ? String(suggestedDays) : ''} onChange={(e) => set('days_hunted', e.target.value)} className={inputCls} aria-invalid={!!fieldErrors.days_hunted} />
              {fieldErrors.days_hunted && <p className="text-red-400 text-xs mt-1">{fieldErrors.days_hunted}</p>}
            </div>
          </div>

          <fieldset>
            <legend className={labelCls}>Did you harvest?</legend>
            <div className="flex gap-2">
              <button type="button" aria-pressed={form.harvested === 'yes'} onClick={() => set('harvested', 'yes')} className={pill(form.harvested === 'yes')}>Yes</button>
              <button type="button" aria-pressed={form.harvested === 'no'} onClick={() => set('harvested', 'no')} className={pill(form.harvested === 'no')}>No</button>
            </div>
            {fieldErrors.harvested && <p className="text-red-400 text-xs mt-1">{fieldErrors.harvested}</p>}
          </fieldset>

          {form.harvested === 'yes' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {(['animal', 'measurements'] as TextField[]).map((k) => (
                <div key={k}>
                  <label htmlFor={`r-${k}`} className={labelCls}>{FIELD_LABEL[k]}</label>
                  <input id={`r-${k}`} value={form[k]} placeholder={HINT[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} />
                </div>
              ))}
            </div>
          )}

          <fieldset>
            <legend className={labelCls}>Hunting pressure</legend>
            <div className="flex flex-wrap gap-2">
              {PRESSURE.map((p) => (
                <button key={p} type="button" aria-pressed={form.pressure === p} onClick={() => set('pressure', form.pressure === p ? '' : p)} className={pill(form.pressure === p)}>{p}</button>
              ))}
            </div>
          </fieldset>

          {LONG_FIELDS.map((k) => (
            <div key={k}>
              <label htmlFor={`r-${k}`} className={labelCls}>{FIELD_LABEL[k]}</label>
              <textarea id={`r-${k}`} rows={3} value={form[k]} placeholder={HINT[k]} onChange={(e) => set(k, e.target.value)} className={inputCls} />
            </div>
          ))}

          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" disabled={busy} className="bg-amber-600 text-white px-6 py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px] disabled:opacity-50">Finish report</button>
            <button type="button" disabled={busy} onClick={() => save(!!report?.completed_at)} className="border border-zinc-700 text-zinc-200 px-6 py-3 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-[11px] disabled:opacity-50">Save draft</button>
            {report?.completed_at && <button type="button" onClick={() => setEditing(false)} className="text-zinc-500 text-[11px] font-black uppercase tracking-widest">Cancel</button>}
          </div>
        </form>
      )}

      {/* Photos — uploaded straight to private storage */}
      <div className="space-y-3">
        <p className={labelCls}>Photos (optional, private)</p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <li key={p.path} className="relative">
                {p.url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.url} alt="Your hunt photo" className="w-full aspect-square object-cover rounded-lg border border-zinc-800" />
                  : <div className="w-full aspect-square rounded-lg border border-zinc-800 grid place-items-center text-zinc-600 text-xs">Photo</div>}
                <button type="button" onClick={() => removePhoto(p.path)} className="absolute top-1 right-1 bg-black/80 text-zinc-300 hover:text-red-400 text-[10px] font-black uppercase px-2 py-1 rounded">Remove</button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < 12 && (
          <label className="inline-block border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-amber-600 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest cursor-pointer">
            Add photos
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple className="sr-only" disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          </label>
        )}
        <p className="text-zinc-600 text-xs">Photos can carry GPS location in their data. They stay private to you here.</p>
      </div>

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      {saved && <p role="status" className="text-green-400 text-sm">{saved}</p>}

      {official}
    </section>
  );
}
