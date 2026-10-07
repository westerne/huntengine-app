import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { applyChange } from '@/lib/hunts';
import { cleanPhotoPaths, missingToComplete, parseReport } from '@/lib/reports';
import { ensureHarvestTask } from '@/lib/harvestTask';

// PUT /api/hunts/:id/report — save the hunter's private post-hunt report.
// { complete: true } finishes it: the hunt moves to Completed and joins My
// History. This never files anything with the state — the official harvest
// report is a separate task (added once, when the hunt is completed).

type Ctx = { params: Promise<{ id: string }> };

const REPORTABLE = ['tag_secured', 'preparing', 'completed', 'archived'];

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) return NextResponse.json({ error: 'Hunt not found.' }, { status: 404 });
  if (!REPORTABLE.includes(hunt.status)) {
    return NextResponse.json({ error: 'Reports are for hunts you held a tag for.' }, { status: 409 });
  }

  const parsed = parseReport(body);
  if ('errors' in parsed) return NextResponse.json({ error: 'Check the highlighted fields.', fields: parsed.errors }, { status: 400 });
  const complete = body.complete === true;
  if (complete && missingToComplete(parsed.fields).length) {
    return NextResponse.json({ error: 'Say whether you harvested to finish the report.', fields: { harvested: 'Required to finish' } }, { status: 400 });
  }

  const userId = auth.viewer.userId!;
  const { data: existing } = await supabase.from('hunt_reports').select('photos, completed_at').eq('hunt_id', id).maybeSingle();
  const photos = cleanPhotoPaths(body.photos, userId, id);

  const { data: report, error } = await supabase.from('hunt_reports').upsert({
    hunt_id: id, user_id: userId, ...parsed.fields, photos,
    completed_at: existing?.completed_at ?? (complete ? new Date().toISOString() : null),
  }, { onConflict: 'hunt_id' }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not save your report. Nothing you typed is lost — try again.' }, { status: 500 });

  // Photos taken out of the report are deleted from storage too.
  const removed = ((existing?.photos ?? []) as string[]).filter((p) => !photos.includes(p));
  if (removed.length) await supabase.storage.from('report-photos').remove(removed);

  let updatedHunt = hunt;
  if (report.completed_at && (hunt.status === 'tag_secured' || hunt.status === 'preparing')) {
    const next = applyChange(hunt, { status: 'completed' });
    if (!('error' in next)) {
      const { data } = await supabase.from('saved_hunts').update(next).eq('id', id).select('*').single();
      if (data) updatedHunt = data;
    }
  }
  if (updatedHunt.status === 'completed') await ensureHarvestTask(supabase, updatedHunt, userId, report);

  const { data: tasks } = await supabase.from('tasks').select('*').eq('hunt_id', id).eq('kind', 'harvest_report');
  return NextResponse.json({ report, hunt: updatedHunt, harvestTasks: tasks ?? [] });
}
