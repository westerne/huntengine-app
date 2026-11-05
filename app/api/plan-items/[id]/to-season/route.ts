import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/plan-items/:id/to-season — start the application for a hunt on
// the plan. It's the same record (migration 0007); it just leaves the plan-
// only stage, so its own page and the application workflow take over.
// Doing it twice returns the same hunt.
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: item } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!item) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (item.source !== 'plan') return NextResponse.json({ hunt: item });
  if (!item.season_year) return NextResponse.json({ error: 'Give it a year first.' }, { status: 400 });
  const unit = item.unit ?? item.hunt_code;
  if (!unit) return NextResponse.json({ error: 'Add a unit or hunt code first.' }, { status: 400 });

  const { data: hunt, error } = await supabase.from('saved_hunts')
    .update({ unit, status: 'planned', source: 'manual' }).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not start the application.' }, { status: 500 });
  return NextResponse.json({ hunt });
}
