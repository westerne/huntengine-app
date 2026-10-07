import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanPlanPatch } from '@/lib/planItems';

// PATCH  /api/plan-items/:id → move to another year, change type, notes
// DELETE /api/plan-items/:id → remove from the calendar (a linked My Season hunt stays)
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
  const { data } = await supabase.from('plan_items').update(c.patch).eq('id', id).select('*').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('plan_items').delete().eq('id', id).select('id').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
