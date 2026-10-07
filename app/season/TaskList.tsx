'use client';

// Checklist / reminder list with real checkboxes. Ticking saves immediately;
// on failure the box flips back and the error is shown.

import { useState } from 'react';
import Link from 'next/link';
import { dueLabel, dueStatus, progress, type Task } from '@/lib/applications';

const DUE_CLS: Record<string, string> = {
  overdue: 'text-red-400',
  today: 'text-amber-400',
  soon: 'text-amber-300',
  later: 'text-zinc-500',
  none: 'text-zinc-600',
};

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
    const optimistic = tasks.map((x) => x.id === t.id ? { ...x, done_at: done ? new Date().toISOString() : null } : x);
    update(optimistic);
    setError(null);
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }) });
    if (!res.ok) { update(tasks); setError('Couldn’t save that — try again.'); }
  };

  const remove = async (t: Task) => {
    const res = await fetch(`/api/tasks/${t.id}`, { method: 'DELETE' });
    if (res.ok) update(tasks.filter((x) => x.id !== t.id));
    else setError('Couldn’t remove that task.');
  };

  if (!tasks.length) return emptyText ? <p className="text-zinc-500 text-sm">{emptyText}</p> : null;
  const p = progress(tasks);

  return (
    <div className="space-y-2">
      {showProgress && <p className="text-[11px] text-zinc-400 font-bold">{p.done} of {p.total} done</p>}
      <ul className="space-y-2">
        {tasks.map((t) => {
          const status = t.done_at ? 'none' : dueStatus(t.due_on);
          return (
            <li key={t.id} className="flex items-start gap-3 bg-black/40 border border-zinc-800 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                id={`t-${t.id}`}
                checked={!!t.done_at}
                onChange={() => toggle(t)}
                className="mt-1 h-4 w-4 accent-amber-600 shrink-0"
              />
              <label htmlFor={`t-${t.id}`} className="flex-1 min-w-0 cursor-pointer">
                <span className={`block text-sm ${t.done_at ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{t.title}</span>
                <span className={`text-[11px] font-bold ${DUE_CLS[status]}`}>
                  {t.done_at ? 'Done' : t.due_on ? `${dueLabel(t.due_on)} · ${t.due_on}` : 'No date'}
                  {t.kind === 'point' && ' · Point-building'}
                </span>
              </label>
              {showHuntLinks && t.hunt_id && (
                <Link href={`/season/${t.hunt_id}`} className="text-amber-500 text-[10px] font-black uppercase tracking-widest shrink-0 mt-1">Hunt →</Link>
              )}
              {(t.kind === 'custom' || t.kind === 'point') && (
                <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t.title}`} className="text-zinc-600 hover:text-red-400 text-xs shrink-0 mt-1">✕</button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
