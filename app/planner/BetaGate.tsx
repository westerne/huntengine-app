'use client';

// Beta access screen. The code is stored in sessionStorage and sent as the
// x-beta-code header (see api.ts); the server is the only thing that checks it.

import { useState } from 'react';

export default function BetaGate({ error, onEnter }: { error: string | null; onEnter: (code: string) => void }) {
  const [input, setInput] = useState('');
  const submit = () => { if (input.trim()) onEnter(input.trim()); };
  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-amber-500 font-black uppercase tracking-[0.25em] text-3xl mb-1">HuntQuarters</h1>
      <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-10">Western Big Game Intelligence — Beta</p>
      <input
        type="password"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder="ENTER BETA ACCESS CODE"
        aria-label="Beta access code"
        className="w-full max-w-xs bg-zinc-950 border border-amber-600/30 text-amber-400 text-center text-xs font-bold uppercase tracking-widest px-4 py-3 outline-none focus:border-amber-500"
      />
      <button
        type="button"
        onClick={submit}
        className="mt-4 w-full max-w-xs bg-amber-600 text-black font-black uppercase text-xs tracking-widest py-3 hover:bg-amber-500 transition-colors"
      >
        Enter
      </button>
      {error && (
        <p role="alert" className="mt-5 text-red-400 text-[11px] font-bold uppercase tracking-wide max-w-xs leading-snug">{error}</p>
      )}
    </div>
  );
}
