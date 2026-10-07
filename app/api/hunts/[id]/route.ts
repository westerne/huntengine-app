import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { applyChange, RESULTS, STATUSES } from '@/lib/hunts';
import { ensureHarvestTask } from '@/lib/harvestTask';

// GET   /api/hunts/:id  → one saved hunt with its notes
// PATCH /api/hunts/:id  → change status / draw result / label
// Row-level security makes another member's hunt look like "not found".

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) return NextResponse.json({ error: 'Hunt not found.' }, { status: 404 });
  const { data: notes } = await supabase.from('hunt_notes').select('*').eq('hunt_id', id).order('created_at', { ascending: true });
  return NextResponse.json({ hunt, notes: notes ?? [] });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('status, application_result').eq('id', id).maybeSingle();
  if (!hunt) return NextResponse.json({ error: 'Hunt not found.' }, { status: 404 });

  if (body.status !== undefined && !STATUSES.includes(body.status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  if (body.application_result != null && !RESULTS.includes(body.application_result)) return NextResponse.json({ error: 'Unknown result.' }, { status: 400 });

  const next = applyChange(hunt, { status: body.status, application_result: body.application_result });
  if ('error' in next) return NextResponse.json({ error: next.error }, { status: 409 });

  const patch: Record<string, unknown> = { ...next };
  if (typeof body.label === 'string') patch.label = body.label.trim().slice(0, 200) || null;

  const { data, error } = await supabase.from('saved_hunts').update(patch).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not update this hunt.' }, { status: 500 });
  // Hunt over: remind them about the state's own harvest report (once).
  if (data.status === 'completed') await ensureHarvestTask(supabase, data, auth.viewer.userId!, null);
  return NextResponse.json({ hunt: data });
}
