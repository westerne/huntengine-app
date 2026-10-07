import { NextResponse } from 'next/server';
import { normalizeSpecies } from '@/lib/species';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// GET  /api/tasks → the member's open tasks plus anything finished in the last 30 days
// POST /api/tasks → add a task (custom reminder or point-building task)

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await supabase.from('tasks').select('*')
    .or(`done_at.is.null,done_at.gte.${since}`)
    .order('due_on', { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: 'Could not load tasks.' }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 300) : '';
  if (!title) return NextResponse.json({ error: 'Give the task a title.' }, { status: 400 });
  const due = typeof body.due_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_on) ? body.due_on : null;
  const kind = ['point', 'custom', 'prep', 'application'].includes(body.kind) ? body.kind : 'custom';

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('tasks').insert({
    user_id: auth.viewer.userId,
    hunt_id: typeof body.hunt_id === 'string' ? body.hunt_id : null,   // RLS checks it's theirs
    kind, title, due_on: due,
    state: typeof body.state === 'string' ? body.state.slice(0, 4).toUpperCase() : null,
    species: typeof body.species === 'string' ? normalizeSpecies(body.species.slice(0, 40)) : null,
    season_year: Number.isInteger(body.season_year) ? body.season_year : null,
    position: Number.isInteger(body.position) ? body.position : 100,
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not add the task.' }, { status: error.code === '42501' ? 404 : 500 });
  return NextResponse.json({ task: data }, { status: 201 });
}
