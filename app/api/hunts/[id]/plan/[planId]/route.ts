import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { PLAN_SECTIONS } from '@/lib/plans';

// PATCH /api/hunts/:id/plan/:planId
//   { section, text }       → save the hunter's version of one section
//   { section, text: null } → go back to the generated text for that section
//   { makeCurrent: true }   → use this version (the previous one is kept)
type Ctx = { params: Promise<{ id: string; planId: string }> };
const KEYS = new Set<string>(PLAN_SECTIONS.map((s) => s.key));

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id, planId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: plan } = await supabase.from('hunt_plans').select('*').eq('id', planId).eq('hunt_id', id).maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  if (body.makeCurrent === true) {
    await supabase.from('hunt_plans').update({ is_current: false }).eq('hunt_id', id).eq('is_current', true);
    const { data } = await supabase.from('hunt_plans').update({ is_current: true }).eq('id', planId).select('*').single();
    return NextResponse.json({ plan: data });
  }

  if (typeof body.section !== 'string' || !KEYS.has(body.section)) return NextResponse.json({ error: 'Unknown section.' }, { status: 400 });
  const edited = { ...(plan.edited ?? {}) } as Record<string, string>;
  if (body.text === null) delete edited[body.section];
  else if (typeof body.text === 'string') edited[body.section] = body.text.slice(0, 10000);
  else return NextResponse.json({ error: 'Text is required.' }, { status: 400 });

  const { data, error } = await supabase.from('hunt_plans').update({ edited }).eq('id', planId).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not save your edit.' }, { status: 500 });
  return NextResponse.json({ plan: data });
}
