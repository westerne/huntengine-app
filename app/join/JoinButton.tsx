'use client';

import { useState } from 'react';
import { Button } from '../ui';

export default function JoinButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || 'Could not start checkout.');
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
      setBusy(false);
    }
  };
  return (
    <div className="hq-stack" style={{ gap: 8 }}>
      <Button type="button" onClick={go} disabled={busy} block>{busy ? 'Opening checkout…' : 'Become a member'}</Button>
      {error && <p role="alert" className="hq-err">{error}</p>}
    </div>
  );
}
