'use client';

// Sign in / create account (email + password, Supabase Auth).

import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { accountsEnabled } from '@/lib/supabase/config';
import { AuthCard, Button } from '../ui';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  if (!accountsEnabled()) {
    return <AuthCard title="Accounts aren’t set up yet"><p className="hq-body" style={{ textAlign: 'center' }}>Check back soon.</p></AuthCard>;
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
        window.location.href = '/today';
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
    <AuthCard title={mode === 'signin' ? 'Sign in' : 'Create your account'} sub={mode === 'signin' ? 'Pick up your season where you left it.' : 'Then choose your membership.'}>
      <form onSubmit={submit} className="hq-stack" noValidate>
        <label className="hq-field"><span className="hq-label">Email</span>
          <input id="email" type="email" autoComplete="email" className="hq-input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="hq-field"><span className="hq-label">Password</span>
          <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="hq-input" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'hq-err' : 'hq-ok'}>{message.text}</p>}
        <Button type="submit" disabled={busy} block>{busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
      </form>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="hq-link hq-small" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}>
          {mode === 'signin' ? 'Create an account' : 'I already have an account'}
        </button>
        {mode === 'signin' && <button type="button" className="hq-link hq-small" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={forgot}>Forgot password?</button>}
      </div>
      <p className="hq-small" style={{ textAlign: 'center' }}><Link href="/" className="hq-link">Back to HuntQuarters</Link></p>
    </AuthCard>
  );
}
