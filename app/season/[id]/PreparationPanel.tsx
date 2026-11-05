'use client';

// "Your Hunt Plan" for a hunt with a tag secured. The hunter's inputs stay in
// the form if generation fails; edits are per section and survive
// regeneration (a new version is offered, never forced).

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import TaskList from '../TaskList';
import { Button, Card, Caveat, Eyebrow } from '../../ui';
import { Loader } from '../../ui/client';
import { shortDate } from '@/lib/huntdata/apply';
import { mergedSections, PLAN_SECTIONS, type PlanInputs, type SectionKey } from '@/lib/plans';
import type { Task } from '@/lib/applications';
import type { SavedHunt } from '@/lib/hunts';

export type PlanRow = {
  id: string;
  version: number;
  inputs: PlanInputs;
  generated: { sections: Record<string, string>; gear: Array<{ item: string; why?: string }> };
  edited: Record<string, string>;
  is_current: boolean;
  created_at: string;
};

const linkBtn = { background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' } as const;

function SectionView({ title, text, edited, onSave, onRevert }: {
  title: string; text: string; edited: boolean;
  onSave: (t: string) => Promise<boolean>; onRevert: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  return (
    <li style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <h3 className="hq-h3">{title}</h3>
        <div className="hq-small" style={{ display: 'flex', gap: 12 }}>
          {edited && <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Your edit</span>}
          {!editing && <button type="button" className="hq-link" style={linkBtn} onClick={() => { setDraft(text); setEditing(true); }}>Edit</button>}
          {edited && !editing && <button type="button" className="hq-link" style={linkBtn} onClick={onRevert}>Use generated</button>}
        </div>
      </div>
      {editing ? (
        <div className="hq-stack" style={{ gap: 10 }}>
          <label className="hq-field"><span className="hq-sr">{title}</span>
            <textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} className="hq-input" /></label>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button size="sm" onClick={async () => { if (await onSave(draft)) setEditing(false); }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="hq-body hq-pre">{text}</p>
      )}
    </li>
  );
}

export default function PreparationPanel({
  hunt, plans: initialPlans, prepTasks, defaults, onHunt,
}: {
  hunt: SavedHunt & { hunt_start?: string | null; hunt_end?: string | null };
  plans: PlanRow[];
  prepTasks: Task[];
  defaults: Partial<Record<keyof PlanInputs, string>>;
  onHunt: (h: any) => void;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [tasks, setTasks] = useState(prepTasks);
  const current = plans.find((p) => p.is_current) ?? null;
  const newest = plans.reduce<PlanRow | null>((a, p) => (!a || p.version > a.version ? p : a), null);
  const pending = newest && current && newest.id !== current.id ? newest : null;

  const seed = current?.inputs ?? newest?.inputs;
  const [form, setForm] = useState<Record<string, string>>({
    hunt_start: hunt.hunt_start ?? seed?.hunt_start ?? '',
    hunt_end: hunt.hunt_end ?? seed?.hunt_end ?? '',
    days: String(seed?.days ?? defaults.days ?? ''),
    weapon: seed?.weapon ?? defaults.weapon ?? '',
    party_size: String(seed?.party_size ?? ''),
    camp_style: seed?.camp_style ?? defaults.camp_style ?? '',
    fitness: seed?.fitness ?? defaults.fitness ?? '',
    limitations: seed?.limitations ?? defaults.limitations ?? '',
    scouting: seed?.scouting ?? '',
    familiarity: seed?.familiarity ?? '',
    goals: seed?.goals ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(!current);
  const [viewing, setViewing] = useState<string | null>(null); // plan id being viewed (default current)
  const shown = plans.find((p) => p.id === viewing) ?? current ?? newest;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const generate = async () => {
    setBusy(true); setMsg(null); setFieldErrors({});
    try {
      const res = await fetch(`/api/hunts/${hunt.id}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { if (j.fields) setFieldErrors(j.fields); throw new Error(j.error || 'Could not generate the plan.'); }
      setPlans((ps) => [...ps.map((p) => (j.plan.is_current ? { ...p, is_current: false } : p)), j.plan]);
      setTasks(j.tasks); onHunt(j.hunt);
      setViewing(null); setShowForm(false);
      setMsg(j.pendingChoice
        ? { kind: 'info', text: `Version ${j.plan.version} is ready. Your current plan has your edits, so it wasn’t replaced — compare and choose below.` }
        : { kind: 'info', text: 'Your hunt plan is ready.' });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not generate the plan.' });
    } finally {
      setBusy(false);
    }
  };

  const patchPlan = async (planId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/hunts/${hunt.id}/plan/${planId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg({ kind: 'error', text: j.error || 'Could not save.' }); return false; }
    setPlans((ps) => ps.map((p) => (p.id === planId ? j.plan : body.makeCurrent && p.is_current ? { ...p, is_current: false } : p)));
    return true;
  };

  const merged = shown ? mergedSections(shown.generated.sections, shown.edited) : null;
  const err = (k: string) => fieldErrors[k] && <span role="alert" className="hq-err">{fieldErrors[k]}</span>;
  const select = (k: string, label: string, options: string[]) => (
    <label className="hq-field"><span className="hq-label">{label}</span>
      <select className="hq-input" value={form[k]} onChange={set(k)}><option value="">—</option>{options.map((w) => <option key={w}>{w}</option>)}</select></label>
  );

  return (
    <Card aria-labelledby="prep-h">
      <div className="hq-stack hq-stack--lg">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <Eyebrow>Tag in hand</Eyebrow>
            <h2 id="prep-h" className="hq-h2" style={{ marginTop: 2 }}>Your hunt plan</h2>
          </div>
          {hunt.hunt_start && <p className="hq-body" style={{ fontWeight: 700, color: 'var(--data)' }}>{shortDate(hunt.hunt_start)}{hunt.hunt_end ? ` – ${shortDate(hunt.hunt_end)}` : ''}</p>}
        </div>

        {busy ? (
          <Loader lines={['Reading the unit', 'Checking the season dates', 'Writing your plan']} />
        ) : showForm ? (
          <div className="hq-stack">
            <p className="hq-body">Tell us about this hunt. Everything is optional, but dates make the plan much more specific.</p>
            <div className="hq-fields">
              <label className="hq-field"><span className="hq-label">Start</span><input type="date" className="hq-input" value={form.hunt_start} onChange={set('hunt_start')} />{err('hunt_start')}</label>
              <label className="hq-field"><span className="hq-label">End</span><input type="date" className="hq-input" value={form.hunt_end} onChange={set('hunt_end')} />{err('hunt_end')}</label>
              <label className="hq-field"><span className="hq-label">Days hunting</span><input type="number" min={1} max={60} className="hq-input" value={form.days} onChange={set('days')} />{err('days')}</label>
              <label className="hq-field"><span className="hq-label">Party size</span><input type="number" min={1} max={20} className="hq-input" value={form.party_size} onChange={set('party_size')} />{err('party_size')}</label>
              {select('weapon', 'Weapon', ['Rifle', 'Archery', 'Muzzleloader'])}
              {select('camp_style', 'Camp', ['Hotel/Town Based', 'Base Camp/Truck', 'Backcountry'])}
              {select('fitness', 'Fitness', ['Moderate', 'High', 'Elite'])}
              {select('scouting', 'Scouting time', ['None', 'A day or two', 'Several days', 'I live nearby'])}
              <label className="hq-field hq-span"><span className="hq-label">Limitations</span><input className="hq-input" value={form.limitations} onChange={set('limitations')} placeholder="e.g. bad knee — avoid long steep pack-outs" /></label>
              <label className="hq-field hq-span"><span className="hq-label">How well you know the unit</span><input className="hq-input" value={form.familiarity} onChange={set('familiarity')} placeholder="e.g. never been; hunted the north end in 2022" /></label>
              <label className="hq-field hq-span"><span className="hq-label">Goals and constraints</span><textarea rows={3} className="hq-input" value={form.goals} onChange={set('goals')} placeholder="e.g. mature bull, but meat comes first; need to be home by the 10th" /></label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <Button onClick={generate}>{current ? 'Generate a new version' : 'Generate your hunt plan'}</Button>
              {current && <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>}
            </div>
            <p className="hq-small">Takes about 20 seconds. Plans are guidance from HuntQuarters&apos; AI using official draw and harvest data. Check land access, regulations and emergency contacts yourself — the plan never invents them.</p>
          </div>
        ) : (
          <div><Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>Update details or make a new version</Button></div>
        )}

        {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={msg.kind === 'error' ? 'hq-err' : 'hq-ok'}>{msg.text}</p>}

        {pending && (
          <Caveat tone="warn">
            Version {pending.version} is newer than the plan you&apos;re using (version {current!.version}, which has your edits).{' '}
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
              <button type="button" className="hq-link" style={linkBtn} onClick={() => setViewing(pending.id)}>View version {pending.version}</button>
              <button type="button" className="hq-link" style={linkBtn} onClick={() => setViewing(current!.id)}>View mine</button>
              <button type="button" className="hq-link" style={{ ...linkBtn, fontWeight: 700 }} onClick={() => patchPlan(pending.id, { makeCurrent: true })}>Use version {pending.version}</button>
            </span>
            <span style={{ display: 'block', marginTop: 6 }}>Switching keeps your edited version — you can switch back from the version list.</span>
          </Caveat>
        )}

        {shown && merged && (
          <div>
            {plans.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span className="hq-label">Versions</span>
                {[...plans].sort((a, b) => a.version - b.version).map((p) => (
                  <button key={p.id} type="button" className="hq-chip" onClick={() => setViewing(p.id)} aria-pressed={shown.id === p.id}>
                    v{p.version}{p.is_current ? ' · in use' : ''}
                  </button>
                ))}
                {!shown.is_current && <Button size="sm" onClick={() => patchPlan(shown.id, { makeCurrent: true })}>Use this version</Button>}
              </div>
            )}
            <ul className="hq-list">
              {PLAN_SECTIONS.map(({ key, title }) => (
                <SectionView
                  key={`${shown.id}-${key}`}
                  title={title}
                  text={merged[key as SectionKey].text}
                  edited={merged[key as SectionKey].edited}
                  onSave={(t) => patchPlan(shown.id, { section: key, text: t })}
                  onRevert={() => patchPlan(shown.id, { section: key, text: null })}
                />
              ))}
            </ul>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <p className="hq-h3" style={{ marginBottom: 4 }}>Gear checklist</p>
            <TaskList key={tasks.map((t) => t.id).join()} initial={tasks} showProgress />
          </div>
        )}
      </div>
    </Card>
  );
}
