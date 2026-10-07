'use client';

// "Your Hunt Plan" for a hunt with a tag secured. The hunter's inputs stay in
// the form if generation fails; edits are per section and survive
// regeneration (a new version is offered, never forced).

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import TaskList from '../TaskList';
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

const inputCls = 'w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-100 text-sm outline-none focus:border-amber-500';
const label = 'block text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2';

function SectionView({ title, text, edited, onSave, onRevert }: {
  title: string; text: string; edited: boolean;
  onSave: (t: string) => Promise<boolean>; onRevert: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  return (
    <div className="border-b border-zinc-800 pb-5 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="font-black uppercase text-amber-500 text-xs tracking-[0.15em]">{title}</h3>
        <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest">
          {edited && <span className="text-blue-400">Your edit</span>}
          {!editing && <button type="button" onClick={() => { setDraft(text); setEditing(true); }} className="text-zinc-400 hover:text-white">Edit</button>}
          {edited && !editing && <button type="button" onClick={onRevert} className="text-zinc-500 hover:text-white">Use generated</button>}
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <label className="sr-only" htmlFor={`sec-${title}`}>{title}</label>
          <textarea id={`sec-${title}`} rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
          <div className="flex gap-3">
            <button type="button" onClick={async () => { if (await onSave(draft)) setEditing(false); }} className="bg-zinc-100 text-black px-4 py-2 font-black rounded-lg hover:bg-amber-500 uppercase tracking-widest text-[10px]">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
    </div>
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
  const err = (k: string) => fieldErrors[k] && <p role="alert" className="text-red-400 text-xs mt-1">{fieldErrors[k]}</p>;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6" aria-labelledby="prep-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="prep-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Your Hunt Plan</h2>
        {hunt.hunt_start && <p className="text-zinc-300 text-sm font-bold">{hunt.hunt_start}{hunt.hunt_end ? ` → ${hunt.hunt_end}` : ''}</p>}
      </div>

      {showForm ? (
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">Tell us about this hunt. Everything is optional, but dates make the plan much more specific.</p>
          <div className="grid sm:grid-cols-4 gap-3">
            <div><label htmlFor="hs" className={label}>Start</label><input id="hs" type="date" className={inputCls} value={form.hunt_start} onChange={set('hunt_start')} />{err('hunt_start')}</div>
            <div><label htmlFor="he" className={label}>End</label><input id="he" type="date" className={inputCls} value={form.hunt_end} onChange={set('hunt_end')} />{err('hunt_end')}</div>
            <div><label htmlFor="dd" className={label}>Days hunting</label><input id="dd" type="number" min={1} max={60} className={inputCls} value={form.days} onChange={set('days')} />{err('days')}</div>
            <div><label htmlFor="ps" className={label}>Party size</label><input id="ps" type="number" min={1} max={20} className={inputCls} value={form.party_size} onChange={set('party_size')} />{err('party_size')}</div>
            <div><label htmlFor="wp" className={label}>Weapon</label>
              <select id="wp" className={inputCls} value={form.weapon} onChange={set('weapon')}>
                <option value="">—</option>{['Rifle', 'Archery', 'Muzzleloader'].map((w) => <option key={w}>{w}</option>)}
              </select></div>
            <div><label htmlFor="cs" className={label}>Camp</label>
              <select id="cs" className={inputCls} value={form.camp_style} onChange={set('camp_style')}>
                <option value="">—</option>{['Hotel/Town Based', 'Base Camp/Truck', 'Backcountry'].map((w) => <option key={w}>{w}</option>)}
              </select></div>
            <div><label htmlFor="ft" className={label}>Fitness</label>
              <select id="ft" className={inputCls} value={form.fitness} onChange={set('fitness')}>
                <option value="">—</option>{['Moderate', 'High', 'Elite'].map((w) => <option key={w}>{w}</option>)}
              </select></div>
            <div><label htmlFor="sc" className={label}>Scouting time</label>
              <select id="sc" className={inputCls} value={form.scouting} onChange={set('scouting')}>
                <option value="">—</option>{['None', 'A day or two', 'Several days', 'I live nearby'].map((w) => <option key={w}>{w}</option>)}
              </select></div>
          </div>
          <div><label htmlFor="lm" className={label}>Limitations</label><input id="lm" className={inputCls} value={form.limitations} onChange={set('limitations')} placeholder="e.g. bad knee — avoid long steep pack-outs" /></div>
          <div><label htmlFor="fm" className={label}>How well you know the unit</label><input id="fm" className={inputCls} value={form.familiarity} onChange={set('familiarity')} placeholder="e.g. never been; hunted the north end in 2022" /></div>
          <div><label htmlFor="gl" className={label}>Goals and constraints</label><textarea id="gl" rows={3} className={inputCls} value={form.goals} onChange={set('goals')} placeholder="e.g. mature bull, but meat comes first; need to be home by the 10th" /></div>
          <div className="flex flex-wrap gap-3 items-center">
            <button type="button" onClick={generate} disabled={busy} className="bg-amber-600 text-white px-6 py-3 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px] disabled:opacity-50">
              {busy ? 'Building your plan… (about 20 seconds)' : current ? 'Generate a new version' : 'Generate your hunt plan'}
            </button>
            {current && !busy && <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cancel</button>}
          </div>
          <p className="text-zinc-600 text-xs">Plans are guidance from HuntQuarters&apos; AI using official draw and harvest data. Check land access, regulations and emergency contacts yourself — the plan never invents them.</p>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} className="text-amber-500 text-[11px] font-black uppercase tracking-widest hover:text-amber-400">Update details / generate a new version</button>
      )}

      {msg && <p role={msg.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${msg.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>}

      {pending && (
        <div className="bg-blue-950/40 border border-blue-800 rounded-xl p-4 text-sm text-blue-100 space-y-2">
          <p>Version {pending.version} is newer than the plan you&apos;re using (version {current!.version}, which has your edits).</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setViewing(pending.id)} className="underline">View version {pending.version}</button>
            <button type="button" onClick={() => setViewing(current!.id)} className="underline">View mine</button>
            <button type="button" onClick={() => patchPlan(pending.id, { makeCurrent: true })} className="font-black underline">Use version {pending.version}</button>
          </div>
          <p className="text-blue-300/70 text-xs">Switching keeps your edited version — you can switch back from the version list.</p>
        </div>
      )}

      {shown && merged && (
        <div className="space-y-5">
          {plans.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <span className="text-zinc-500">Versions:</span>
              {[...plans].sort((a, b) => a.version - b.version).map((p) => (
                <button key={p.id} type="button" onClick={() => setViewing(p.id)} aria-pressed={shown.id === p.id}
                  className={`px-2 py-1 rounded border ${shown.id === p.id ? 'border-amber-600 text-amber-400' : 'border-zinc-700 text-zinc-400'}`}>
                  v{p.version}{p.is_current ? ' · in use' : ''}
                </button>
              ))}
              {!shown.is_current && <button type="button" onClick={() => patchPlan(shown.id, { makeCurrent: true })} className="text-amber-500 underline ml-2">Use this version</button>}
            </div>
          )}
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
        </div>
      )}

      {tasks.length > 0 && (
        <div>
          <span className={label}>Gear checklist</span>
          <TaskList key={tasks.map((t) => t.id).join()} initial={tasks} showProgress />
        </div>
      )}
    </section>
  );
}
