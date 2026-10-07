import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/plan-items/:id/to-season — a calendar hunt whose year has come
// becomes a hunt in My Season (status Planned), where the application
// workflow takes over. Doing it twice returns the same hunt.
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: item } = await supabase.from('plan_items').select('*').eq('id', id).maybeSingle();
  if (!item) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!item.target_year) return NextResponse.json({ error: 'Give it a year first.' }, { status: 400 });
  const unit = item.unit ?? item.hunt_code;
  if (!unit) return NextResponse.json({ error: 'Add a unit or hunt code first.' }, { status: 400 });

  const row = {
    user_id: auth.viewer.userId, season_year: item.target_year, state: item.state, species: item.species,
    unit, hunt_code: item.hunt_code, label: item.label, status: 'planned', source: 'manual',
  };
  let hunt;
  const { data, error } = await supabase.from('saved_hunts').insert(row).select('*').single();
  if (error?.code === '23505') {
    let q = supabase.from('saved_hunts').select('*').eq('season_year', row.season_year).eq('state', row.state).eq('species', row.species);
    q = row.hunt_code ? q.eq('hunt_code', row.hunt_code) : q.is('hunt_code', null).eq('unit', unit);
    hunt = (await q.maybeSingle()).data;
  } else if (error) {
    return NextResponse.json({ error: 'Could not add it to My Season.' }, { status: 500 });
  } else {
    hunt = data;
  }
  if (hunt) await supabase.from('plan_items').update({ saved_hunt_id: hunt.id }).eq('id', id);
  return NextResponse.json({ hunt });
}
