import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { DECISIONS, defaultChecklist, pointTaskTitle, type Decision } from '@/lib/applications';
import { applyChange } from '@/lib/hunts';

// PUT /api/hunts/:id/application — set the hunter's decision and application
// details. Side effects, each done once:
//   apply        → adds the application checklist (due on the deadline, if set)
//   build_points → adds a separate point-building task (not tied to this hunt)
//   pass         → archives the hunt (kept in history)
// Submitting is a separate, explicit action (…/submit).

type Ctx = { params: Promise<{ id: string }> };

const s = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) || null : v === null ? null : undefined);
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown) => typeof v === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v);

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) return NextResponse.json({ error: 'Hunt not found.' }, { status: 404 });
  const { data: existing } = await supabase.from('applications').select('*').eq('hunt_id', id).maybeSingle();

  if (body.decision !== undefined && !DECISIONS.includes(body.decision)) return NextResponse.json({ error: 'Unknown decision.' }, { status: 400 });
  if (body.deadline_on != null && !isDate(body.deadline_on)) return NextResponse.json({ error: 'Deadline must be a date.' }, { status: 400 });
  if (body.deadline_time != null && !isTime(body.deadline_time)) return NextResponse.json({ error: 'Deadline time must be HH:MM.' }, { status: 400 });

  const decision: Decision = body.decision ?? existing?.decision ?? 'apply';
  const row: Record<string, unknown> = { hunt_id: id, user_id: auth.viewer.userId, decision };
  for (const k of ['other_choices', 'fee_note', 'confirmation_number', 'notes', 'deadline_tz'] as const) {
    const v = s(body[k], k === 'notes' ? 5000 : 300);
    if (v !== undefined) row[k] = v;
  }
  if (body.deadline_on !== undefined) {
    row.deadline_on = body.deadline_on;
    // Who set the date: agency-published dates arrive with source 'agency'.
    row.deadline_source = body.deadline_on ? (body.deadline_source === 'agency' ? 'agency' : 'hunter') : null;
  }
  if (body.deadline_time !== undefined) row.deadline_time = body.deadline_time;
  if (body.choice_rank !== undefined) {
    const r = Number(body.choice_rank);
    row.choice_rank = body.choice_rank === null ? null : Number.isInteger(r) && r >= 1 && r <= 10 ? r : null;
  }

  const { data: app, error } = await supabase.from('applications').upsert(row, { onConflict: 'hunt_id' }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not save the application.' }, { status: 500 });

  const userId = auth.viewer.userId!;
  const deadline = (app.deadline_on as string | null) ?? null;

  if (decision === 'apply') {
    const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('hunt_id', id).eq('kind', 'application');
    if (!count) {
      await supabase.from('tasks').insert(defaultChecklist(hunt.state, hunt.species).map((t) => ({
        ...t, user_id: userId, hunt_id: id, kind: 'application', due_on: deadline,
        state: hunt.state, species: hunt.species, season_year: hunt.season_year,
      })));
    } else if (body.deadline_on !== undefined) {
      // Keep open checklist steps due on the (new) deadline.
      await supabase.from('tasks').update({ due_on: deadline }).eq('hunt_id', id).eq('kind', 'application').is('done_at', null);
    }
  }

  if (decision === 'build_points' && existing?.decision !== 'build_points') {
    const title = pointTaskTitle(hunt.state, hunt.species, hunt.season_year);
    const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('kind', 'point').eq('state', hunt.state).eq('species', hunt.species).eq('season_year', hunt.season_year);
    if (!count) {
      await supabase.from('tasks').insert({
        user_id: userId, hunt_id: null, kind: 'point', title, due_on: deadline,
        state: hunt.state, species: hunt.species, season_year: hunt.season_year,
      });
    }
  }

  let updatedHunt = hunt;
  if (decision === 'pass') {
    // Passing drops the open application steps; finished ones stay as history.
    await supabase.from('tasks').delete().eq('hunt_id', id).eq('kind', 'application').is('done_at', null);
  }
  if (decision === 'pass' && hunt.status !== 'archived') {
    const next = applyChange(hunt, { status: 'archived' });
    if (!('error' in next)) {
      const { data } = await supabase.from('saved_hunts').update(next).eq('id', id).select('*').single();
      if (data) updatedHunt = data;
    }
  } else if (decision === 'apply' && hunt.status === 'considering') {
    const { data } = await supabase.from('saved_hunts').update({ status: 'planned' }).eq('id', id).select('*').single();
    if (data) updatedHunt = data;
  }

  const { data: tasks } = await supabase.from('tasks').select('*').eq('hunt_id', id).order('position');
  return NextResponse.json({ application: app, hunt: updatedHunt, tasks: tasks ?? [] });
}
