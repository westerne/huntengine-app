'use client';

// Sign in / create account (email + password, Supabase Auth).

import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { accountsEnabled } from '@/lib/supabase/config';

const inputCls = 'w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-100 font-bold outline-none focus:border-amber-500';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  if (!accountsEnabled()) {
    return <main className="min-h-screen bg-black text-zinc-300 flex items-center justify-center p-6"><p>Accounts aren&apos;t set up yet.</p></main>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage({ kind: 'error', text: 'Enter a valid email address.' });
    if (password.length < 8) return setMessage({ kind: 'error', text: 'Password must be at least 8 characters.' });
    setBusy(true);
    const supabase = supabaseBrowser();
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setMessage({ kind: 'error', text: 'Email or password is incorrect.' });
        window.location.href = '/season';
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/join` },
        });
        if (error) return setMessage({ kind: 'error', text: error.message });
        if (data.session) window.location.href = '/join';
        else setMessage({ kind: 'info', text: 'Check your email to confirm your account, then come back to sign in.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage({ kind: 'error', text: 'Enter your email above first.' });
    await supabaseBrowser().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setMessage({ kind: 'info', text: 'If that email has an account, a reset link is on its way.' });
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-amber-500 font-black uppercase tracking-[0.25em] text-2xl text-center mb-2">HuntQuarters</h1>
        <p className="text-zinc-500 text-xs text-center mb-8">{mode === 'signin' ? 'Sign in to your season.' : 'Create your account.'}</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Email</label>
            <input id="email" type="email" autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="block text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Password</label>
            <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {message && (
            <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>
          )}
          <button type="submit" disabled={busy} className="w-full bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs disabled:opacity-50">
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="mt-6 flex justify-between text-xs">
          <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }} className="text-zinc-400 hover:text-white underline">
            {mode === 'signin' ? 'Create an account' : 'I already have an account'}
          </button>
          {mode === 'signin' && <button type="button" onClick={forgot} className="text-zinc-500 hover:text-white underline">Forgot password?</button>}
        </div>
        <p className="mt-10 text-center text-[11px] text-zinc-600"><Link href="/" className="underline">Back to HuntQuarters</Link></p>
      </div>
    </main>
  );
}
