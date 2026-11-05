import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanPlanPatch, planPatchRow } from '@/lib/planItems';

// PATCH  /api/plan-items/:id → move to another year, change type, notes
// DELETE /api/plan-items/:id → take it off the plan
// Only hunts still on the plan (source 'plan'); once the application is
// started the hunt's own page manages it, and deleting it here would take
// its application, tasks and notes with it.
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const c = cleanPlanPatch(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('saved_hunts').update(planPatchRow(c.patch)).eq('id', id).eq('source', 'plan').select('*').maybeSingle();
  if (error?.code === '23505') return NextResponse.json({ error: 'That hunt is already on your plan for that year.' }, { status: 409 });
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('saved_hunts').delete().eq('id', id).eq('source', 'plan').select('id').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
