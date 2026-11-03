'use client';

// "Put this one on my calendar" — the point where finding a hunt turns into a
// decision. Writes a plan item, which is the same thing the calendar and the
// compare screen read, so a hunt added here shows up everywhere else.
//
// The year matters: a hunt within reach goes on this season, and one he has to
// build points for goes on the year the data says he'd have them. Dropping the
// year would leave a wall of undated intentions, which is what a calendar is
// meant to fix.

import { useState } from 'react';
import Link from 'next/link';

export type PlanTarget = {
  state: string;            // state code
  species: string;          // canonical label
  unit: string;
  huntCode: string | null;
  label: string | null;
  year: number | null;
  otc?: boolean;
};

export default function AddToPlan({ target, note }: { target: PlanTarget; note?: string }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const add = async () => {
    setState('saving');
    try {
      const r = await fetch('/api/plan-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: target.otc ? 'otc' : 'target',
          state: target.state,
          species: target.species,
          unit: target.unit,
          hunt_code: target.huntCode,
          label: target.label,
          target_year: target.year,
          notes: note ?? null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMessage(j.error || 'Could not add that.'); setState('error'); return; }
      setState('done');
    } catch {
      setMessage('Could not add that.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
        On your calendar{target.year ? ` for ${target.year}` : ''} ·{' '}
        <Link href="/calendar" className="text-amber-600 hover:text-amber-500">Open it</Link>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={add}
        disabled={state === 'saving'}
        className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 disabled:opacity-50"
      >
        {state === 'saving' ? 'Adding…' : `+ Add to ${target.year ? target.year : 'my calendar'}`}
      </button>
      {state === 'error' && <span role="alert" className="text-red-400 text-[10px]">{message}</span>}
    </span>
  );
}
