import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanPlanItem, planRow, sameHuntKey } from '@/lib/planItems';
import { cleanPoints } from '@/lib/points';

// POST /api/calendar/import — save what the hunter confirmed on the import
// screen: point balances (upserted per state/species) and calendar items.
export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const userId = auth.viewer.userId!;

  const pts = cleanPoints(Array.isArray(body.points) ? body.points : [], userId);
  if ('error' in pts) return NextResponse.json({ error: pts.error }, { status: 400 });
  const items = [];
  for (const raw of (Array.isArray(body.items) ? body.items : []).slice(0, 300)) {
    const c = cleanPlanItem(raw);
    if ('error' in c) return NextResponse.json({ error: `A row couldn't be imported: ${c.error}` }, { status: 400 });
    items.push(planRow(c.item, userId));
  }

  const supabase = await supabaseServer();
  if (pts.list.length) {
    const { error } = await supabase.from('hunter_points').upsert(pts.list, { onConflict: 'user_id,state,species' });
    if (error) return NextResponse.json({ error: 'Could not save your points. Nothing was imported.' }, { status: 500 });
  }
  // One record per hunt per year: skip rows already on the plan (or repeated in the sheet).
  let rows = items;
  if (items.length) {
    const { data: have } = await supabase.from('saved_hunts').select('season_year, state, species, unit, hunt_code');
    const seen = new Set((have ?? []).map(sameHuntKey).filter(Boolean));
    rows = items.filter((r) => {
      const k = sameHuntKey(r);
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  if (rows.length) {
    const { error } = await supabase.from('saved_hunts').insert(rows);
    if (error) return NextResponse.json({ error: 'Your points were saved, but the hunts could not be. Try the import again.' }, { status: 500 });
  }
  return NextResponse.json({ points: pts.list.length, items: rows.length, skipped: items.length - rows.length });
}
