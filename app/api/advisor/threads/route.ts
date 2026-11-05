import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// GET    /api/advisor/threads  → { threads: [{ id, title, updated_at }] }, newest first
// DELETE /api/advisor/threads  → delete every conversation (messages go with them)

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('advisor_threads').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: 'Could not load your conversations.' }, { status: 500 });
  return NextResponse.json({ threads: data ?? [] });
}

export async function DELETE() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('advisor_threads').delete().eq('user_id', auth.viewer.userId!);
  if (error) return NextResponse.json({ error: 'Could not delete your conversations.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
