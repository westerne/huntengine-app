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
import { Button } from '../ui';

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
      <span className="hq-ok" style={{ fontSize: 13 }}>
        On your calendar{target.year ? ` for ${target.year}` : ''} ·{' '}
        <Link href="/plan" className="hq-link">Open it</Link>
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Button type="button" variant="secondary" size="sm" onClick={add} disabled={state === 'saving'}>
        {state === 'saving' ? 'Adding…' : `+ Add to ${target.year ? target.year : 'my calendar'}`}
      </Button>
      {state === 'error' && <span role="alert" className="hq-err">{message}</span>}
    </span>
  );
}
