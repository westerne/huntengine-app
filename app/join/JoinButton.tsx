'use client';

import { useState } from 'react';

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
    <div>
      <button type="button" onClick={go} disabled={busy} className="w-full bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs disabled:opacity-50">
        {busy ? 'Opening checkout…' : 'Become a member'}
      </button>
      {error && <p role="alert" className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
