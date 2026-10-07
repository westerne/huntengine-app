import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Email-link landing (account confirmation, password reset): exchanges the
// one-time code for a session, then continues to ?next= (same-site paths only).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') || '/season';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/season';
  if (code) {
    const supabase = await supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
