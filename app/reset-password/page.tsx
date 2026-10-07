'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Reached from the password-reset email (via /auth/callback, which signs the
// user in with the one-time link).
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setMessage({ kind: 'error', text: 'Password must be at least 8 characters.' });
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) return setMessage({ kind: 'error', text: 'That reset link has expired. Request a new one from the sign-in page.' });
    setMessage({ kind: 'info', text: 'Password updated. Taking you to your season…' });
    setTimeout(() => { window.location.href = '/season'; }, 1200);
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
        <h1 className="text-amber-500 font-black uppercase tracking-widest text-xl text-center mb-6">Choose a new password</h1>
        <label htmlFor="pw" className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">New password</label>
        <input id="pw" type="password" autoComplete="new-password" className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-100 font-bold outline-none focus:border-amber-500" value={password} onChange={(e) => setPassword(e.target.value)} />
        {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>}
        <button type="submit" className="w-full bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Save password</button>
      </form>
    </main>
  );
}
