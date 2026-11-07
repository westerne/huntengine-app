'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { AuthCard, Button } from '../ui';

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
    setTimeout(() => { window.location.href = '/today'; }, 1200);
  };

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} className="hq-stack" noValidate>
        <label className="hq-field"><span className="hq-label">New password</span>
          <input id="pw" type="password" autoComplete="new-password" className="hq-input" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'hq-err' : 'hq-ok'}>{message.text}</p>}
        <Button type="submit" block>Save password</Button>
      </form>
    </AuthCard>
  );
}
