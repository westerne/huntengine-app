'use client';

// Checklist / reminder list with real checkboxes. Ticking saves immediately;
// on failure only that box flips back and the error is shown.

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { dueLabel, dueStatus, progress, type Task } from '@/lib/applications';
import { shortDate } from '@/lib/huntdata/apply';

const TONE: Record<string, string> = { overdue: 'var(--stop)', today: 'var(--fair)', soon: 'var(--fair)' };

export default function TaskList({
  initial, showHuntLinks = false, showProgress = false, emptyText, onChange,
}: {
  initial: Task[];
  showHuntLinks?: boolean;
  showProgress?: boolean;
  emptyText?: string;
  onChange?: (tasks: Task[]) => void;
}) {
  const [tasks, setTasks] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const update = (next: Task[]) => { setTasks(next); onChange?.(next); };

  const toggle = async (t: Task) => {
    const done = !t.done_at;
    const flip = (xs: Task[], at: string | null) => xs.map((x) => (x.id === t.id ? { ...x, done_at: at } : x));
    const next = flip(tasks, done ? new Date().toISOString() : null);
    update(next);
    setError(null);
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
    // Flip only this box back — other boxes may have changed meanwhile.
    if (!res.ok && res.status !== 404) { setTasks((xs) => { const back = flip(xs, t.done_at); onChange?.(back); return back; }); setError('Couldn’t save that — try again.'); }
  };

  const remove = async (t: Task) => {
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' });
    if (res.ok) update(tasks.filter((x) => x.id !== t.id));
    else setError('Couldn’t remove that task.');
  };

  if (!tasks.length) return emptyText ? <p className="hq-small">{emptyText}</p> : null;
  const p = progress(tasks);

  return (
    <div>
      {showProgress && <p className="hq-small" style={{ marginBottom: 4 }}>{p.done} of {p.total} done</p>}
      <ul className="hq-list">
        {tasks.map((t) => {
          const st = t.done_at ? 'none' : dueStatus(t.due_on);
          return (
            <li key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0' }}>
              <input type="checkbox" id={`t-${t.id}`} checked={!!t.done_at} onChange={() => toggle(t)}
                style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--action)', flexShrink: 0 }} />
              <label htmlFor={`t-${t.id}`} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <span className="hq-row__title" style={t.done_at ? { textDecoration: 'line-through', color: 'var(--ink-muted)' } : undefined}>{t.title}</span>
                <span className="hq-row__sub" style={{ display: 'block', color: TONE[st] }}>
                  {t.done_at ? 'Done' : t.due_on ? `${dueLabel(t.due_on)} · ${shortDate(t.due_on)}` : 'No date'}
                  {t.kind === 'point' && ' · Point-building'}
                </span>
              </label>
              {showHuntLinks && t.hunt_id && <Link href={`/season/${t.hunt_id}`} className="hq-link hq-small" style={{ flexShrink: 0, marginTop: 2 }}>Hunt</Link>}
              {(t.kind === 'custom' || t.kind === 'point') && (
                <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t.title}`} style={{ background: 'none', border: 0, color: 'var(--ink-muted)', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}><X size={16} /></button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="hq-err">{error}</p>}
    </div>
  );
}
