import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// GET    /api/advisor/threads/:id → { thread, messages } (owner-only by RLS)
// DELETE /api/advisor/threads/:id → delete it and its messages

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: thread }, { data: messages, error }] = await Promise.all([
    supabase.from('advisor_threads').select('id, title, updated_at').eq('id', id).maybeSingle(),
    supabase.from('advisor_messages').select('role, content, sources, actions').eq('thread_id', id).order('id'),
  ]);
  if (!thread) return NextResponse.json({ error: 'That conversation is gone.' }, { status: 404 });
  if (error) return NextResponse.json({ error: 'Could not load that conversation.' }, { status: 500 });
  return NextResponse.json({ thread, messages: messages ?? [] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('advisor_threads').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete that conversation.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
