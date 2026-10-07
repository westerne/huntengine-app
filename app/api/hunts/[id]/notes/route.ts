import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/hunts/:id/notes → add a note to one of the member's hunts.
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!text) return NextResponse.json({ error: 'Note is empty.' }, { status: 400 });
  if (text.length > 10000) return NextResponse.json({ error: 'Note is too long.' }, { status: 400 });

  const supabase = await supabaseServer();
  // RLS also checks the hunt belongs to this user.
  const { data, error } = await supabase
    .from('hunt_notes')
    .insert({ hunt_id: id, user_id: auth.viewer.userId, body: text })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Could not save the note.' }, { status: error.code === '42501' ? 404 : 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
