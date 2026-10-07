import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanPlanItem } from '@/lib/planItems';

// GET  /api/plan-items → the member's calendar items
// POST /api/plan-items → add a draw target, bucket-list hunt or OTC option

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('plan_items').select('*').order('target_year', { nullsFirst: false }).order('position');
  if (error) return NextResponse.json({ error: 'Could not load your calendar.' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const c = cleanPlanItem(body);
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('plan_items').insert({ ...c.item, user_id: auth.viewer.userId }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not add that to your calendar.' }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
