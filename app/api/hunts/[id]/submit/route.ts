import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { applyChange } from '@/lib/hunts';

// POST /api/hunts/:id/submit — the hunter says they submitted the application.
// This is the ONLY thing that marks a hunt Applied; opening the agency site
// never does. Optional confirmation number.
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const confirmation = typeof body?.confirmation_number === 'string' ? body.confirmation_number.trim().slice(0, 120) || null : null;

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) return NextResponse.json({ error: 'Hunt not found.' }, { status: 404 });

  const next = applyChange(hunt, { status: 'applied' });
  if ('error' in next) return NextResponse.json({ error: next.error }, { status: 409 });

  const now = new Date().toISOString();
  const { data: app, error: aErr } = await supabase.from('applications').upsert({
    hunt_id: id, user_id: auth.viewer.userId, submitted_at: now,
    ...(confirmation ? { confirmation_number: confirmation } : {}),
  }, { onConflict: 'hunt_id' }).select('*').single();
  if (aErr) return NextResponse.json({ error: 'Could not record the submission.' }, { status: 500 });

  const { data: updated } = await supabase.from('saved_hunts').update(next).eq('id', id).select('*').single();

  // Submitted → the pre-submission steps are done. Only "Record your
  // confirmation number" stays open, and only if none was given.
  let tick = supabase.from('tasks').update({ done_at: now })
    .eq('hunt_id', id).eq('kind', 'application').is('done_at', null);
  if (!confirmation) tick = tick.not('title', 'ilike', 'Record your confirmation%');
  await tick;

  const { data: tasks } = await supabase.from('tasks').select('*').eq('hunt_id', id).order('position');
  return NextResponse.json({ application: app, hunt: updated ?? hunt, tasks: tasks ?? [] });
}
