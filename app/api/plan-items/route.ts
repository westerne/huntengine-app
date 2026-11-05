import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanPlanItem, planRow } from '@/lib/planItems';

// GET  /api/plan-items → hunts on the plan whose application isn't started
// POST /api/plan-items → add a draw target, bucket-list hunt or OTC option
// Since migration 0007 these are saved_hunts rows with source 'plan'.

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('saved_hunts').select('*').eq('source', 'plan')
    .order('season_year', { nullsFirst: false }).order('position');
  if (error) return NextResponse.json({ error: 'Could not load your plan.' }, { status: 500 });
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
  const row = planRow(c.item, auth.viewer.userId!);
  const { data, error } = await supabase.from('saved_hunts').insert(row).select('*').single();
  if (error?.code === '23505') {
    // Already on the plan (or already being applied for) that year: hand back that record.
    let q = supabase.from('saved_hunts').select('*').eq('season_year', row.season_year!).eq('state', row.state).eq('species', row.species);
    q = row.hunt_code ? q.eq('hunt_code', row.hunt_code) : q.is('hunt_code', null).eq('unit', row.unit!);
    const { data: existing } = await q.maybeSingle();
    return NextResponse.json({ item: existing, alreadySaved: true });
  }
  if (error) return NextResponse.json({ error: 'Could not add that to your plan.' }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
