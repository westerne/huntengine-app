import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanPoints } from '@/lib/points';

// PUT /api/points — set point balances for the given state/species pairs;
// others are left alone. { points: [{ state, species, points }] }
export async function PUT(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.points)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const rows = cleanPoints(body.points, auth.viewer.userId!);
  if ('error' in rows) return NextResponse.json({ error: rows.error }, { status: 400 });
  const supabase = await supabaseServer();
  if (rows.list.length) {
    const { error } = await supabase.from('hunter_points').upsert(rows.list, { onConflict: 'user_id,state,species' });
    if (error) return NextResponse.json({ error: 'Could not save your points.' }, { status: 500 });
  }
  const { data } = await supabase.from('hunter_points').select('state, species, points, as_of_year');
  return NextResponse.json({ points: data ?? [] });
}
