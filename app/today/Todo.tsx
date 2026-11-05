'use client';

// To-do on Today: every open task — application checklists, point purchases,
// reminders, official harvest reports. Ticking saves immediately; on failure
// the box flips back and says so.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Button, Caveat, Card } from '../ui';
import { dueLabel, dueStatus } from '@/lib/applications';
import { shortDate } from '@/lib/huntdata/apply';

export type TodoTask = { id: string; title: string; due_on: string | null; kind: string; hunt_id: string | null; done_at: string | null; hunt: string | null };

const TONE: Record<string, string> = { overdue: 'var(--stop)', today: 'var(--fair)', soon: 'var(--fair)' };
const SHOWN = 6;

export default function Todo({ initial }: { initial: TodoTask[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggle = async (t: TodoTask) => {
    const done = !t.done_at;
    // Flip only this box back on failure — the list may have changed meanwhile.
    const mark = (at: string | null) => setTasks((xs) => xs.map((x) => (x.id === t.id ? { ...x, done_at: at } : x)));
    mark(done ? new Date().toISOString() : null);
    setError(null);
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
    if (!res.ok && res.status !== 404) { mark(t.done_at); setError('Couldn’t save that — try again.'); }
  };
  const remove = async (t: TodoTask) => {
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' });
    if (res.ok) setTasks((x) => x.filter((y) => y.id !== t.id));
    else setError('Couldn’t remove that.');
  };
  const add = async () => {
    if (!title.trim()) return setError('Give the reminder a title.');
    setError(null);
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'custom', title, due_on: due || null }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setError(j.error || 'Could not add it.');
    setTasks((x) => [...x, { ...j.task, hunt: null }]);
    setTitle(''); setDue(''); setAdding(false);
    router.refresh();
  };

  const shown = all ? tasks : tasks.slice(0, SHOWN);
  return (
    <section id="todo" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="hq-h2">To-do</h2>
        {!adding && <button type="button" className="hq-link" style={{ background: 'none', border: 0, cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center' }} onClick={() => setAdding(true)}><Plus size={14} aria-hidden="true" /> Reminder</button>}
      </div>
      <Card variant="flat" style={{ padding: '4px 18px' }}>
        {tasks.length === 0 && !adding && <p className="hq-small" style={{ padding: '12px 0' }}>Nothing on your list. Application checklists show up here when you start a hunt.</p>}
        <ul className="hq-list">
          {shown.map((t) => {
            const st = t.done_at ? 'none' : dueStatus(t.due_on);
            return (
              <li key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0' }}>
                <input type="checkbox" id={`t-${t.id}`} checked={!!t.done_at} onChange={() => toggle(t)}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--action)', flexShrink: 0 }} />
                <label htmlFor={`t-${t.id}`} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <span className="hq-row__title" style={t.done_at ? { textDecoration: 'line-through', color: 'var(--ink-muted)' } : undefined}>{t.title}</span>
                  <span className="hq-row__sub" style={{ display: 'block', color: TONE[st] }}>
                    {t.done_at ? 'Done' : t.due_on ? `${dueLabel(t.due_on)} · ${shortDate(t.due_on)}` : 'No date'}
                    {t.hunt ? ` · ${t.hunt}` : ''}
                  </span>
                </label>
                {t.hunt_id ? (
                  <Link href={`/season/${t.hunt_id}`} className="hq-link hq-small" style={{ flexShrink: 0, marginTop: 2 }}>Hunt</Link>
                ) : (
                  <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t.title}`} style={{ background: 'none', border: 0, color: 'var(--ink-muted)', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}><X size={16} /></button>
                )}
              </li>
            );
          })}
        </ul>
        {tasks.length > SHOWN && (
          <button type="button" className="hq-link hq-small" style={{ background: 'none', border: 0, cursor: 'pointer', padding: '0 0 12px' }} onClick={() => setAll((a) => !a)}>
            {all ? 'Show fewer' : `Show all ${tasks.length}`}
          </button>
        )}
        {adding && (
          <div className="hq-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0 16px', borderTop: tasks.length ? '1px solid var(--divider)' : undefined }}>
            <label className="hq-field"><span className="hq-label">Reminder</span>
              <input className="hq-input" autoFocus placeholder="e.g. Renew hunter ed card" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} /></label>
            <label className="hq-field" style={{ maxWidth: 200 }}><span className="hq-label">Due (optional)</span>
              <input className="hq-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button size="sm" onClick={add}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setError(null); }}>Cancel</Button>
            </div>
          </div>
        )}
        {error && <div style={{ paddingBottom: 12 }}><Caveat tone="stop">{error}</Caveat></div>}
      </Card>
    </section>
  );
}
