import { notFound, redirect } from 'next/navigation';
import AppNav from '../../components/AppNav';
import HuntWorkspace from './HuntWorkspace';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import type { SavedHunt } from '@/lib/hunts';

// One saved hunt. Row-level security returns nothing for another member's
// hunt, so it 404s exactly like a hunt that doesn't exist.
export default async function HuntPage({ params }: { params: Promise<{ id: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) notFound();
  const { data: notes } = await supabase.from('hunt_notes').select('id, body, created_at').eq('hunt_id', id).order('created_at');

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <AppNav current="season" />
      <HuntWorkspace hunt={hunt as SavedHunt} notes={notes ?? []} />
    </div>
  );
}
