import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// PATCH  /api/tasks/:id → tick / untick, rename, change due date
// DELETE /api/tasks/:id → remove a task (RLS: only the member's own)
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (typeof body.done === 'boolean') patch.done_at = body.done ? new Date().toISOString() : null;
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 300);
  if (body.due_on === null || (typeof body.due_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_on))) patch.due_on = body.due_on;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data } = await supabase.from('tasks').update(patch).eq('id', id).select('*').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  return NextResponse.json({ task: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('tasks').delete().eq('id', id).select('id').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
