import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/me → who's signed in, whether they're a member, and their saved
// preferences + points (used to prefill the planner).
export async function GET() {
  if (!accountsEnabled()) return NextResponse.json({ accounts: false });
  const viewer = await getViewer();
  if (!viewer.userId || !viewer.member) {
    return NextResponse.json({ accounts: true, signedIn: !!viewer.userId, member: false });
  }
  const supabase = await supabaseServer();
  const [{ data: profile }, { data: points }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', viewer.userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
  ]);
  return NextResponse.json({ accounts: true, signedIn: true, member: true, profile: profile ?? null, points: points ?? [] });
}
