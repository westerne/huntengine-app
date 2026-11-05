'use client';

// Beta access screen. The code is stored in sessionStorage and sent as the
// x-beta-code header (see api.ts); the server is the only thing that checks it.

import { useState } from 'react';
import { Button, Card, Caveat, Lockup } from '../ui';

export default function BetaGate({ error, onEnter }: { error: string | null; onEnter: (code: string) => void }) {
  const [input, setInput] = useState('');
  const submit = () => { if (input.trim()) onEnter(input.trim()); };
  return (
    <div
      className="hq"
      style={{
        position: 'fixed', inset: 0, zIndex: 70, overflowY: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <Card className="hq-fade-up" style={{ width: '100%', maxWidth: 400 }}>
        <div className="hq-stack">
          <div style={{ display: 'flex', justifyContent: 'center' }}><Lockup size={28} tagline /></div>
          <div style={{ textAlign: 'center' }}>
            <h1 className="hq-h2">Beta access</h1>
            <p className="hq-small" style={{ marginTop: 4 }}>Western big game intelligence</p>
          </div>
          <label className="hq-field">
            <span className="hq-label">Beta access code</span>
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="Enter your code"
              aria-label="Beta access code"
              className="hq-input"
            />
          </label>
          <Button type="button" onClick={submit} block>Enter</Button>
          {error && <Caveat tone="stop">{error}</Caveat>}
        </div>
      </Card>
    </div>
  );
}
