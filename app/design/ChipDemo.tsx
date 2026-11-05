'use client';

import { useState } from 'react';
import { Chip } from '../ui/client';

export default function ChipDemo() {
  const [on, setOn] = useState<string[]>(['Elk']);
  const toggle = (s: string) => setOn((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['Elk', 'Deer', 'Antelope', 'Moose', 'Sheep'].map((s) => <Chip key={s} pressed={on.includes(s)} onClick={() => toggle(s)}>{s}</Chip>)}
    </div>
  );
}
