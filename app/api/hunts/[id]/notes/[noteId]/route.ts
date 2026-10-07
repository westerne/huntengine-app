import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// DELETE /api/hunts/:id/notes/:noteId — remove one of the member's notes.
type Ctx = { params: Promise<{ id: string; noteId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id, noteId } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('hunt_notes').delete().eq('id', noteId).eq('hunt_id', id).select('id').maybeSingle();
  if (!data) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
