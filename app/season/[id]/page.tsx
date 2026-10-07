import { notFound, redirect } from 'next/navigation';
import HuntWorkspace from './HuntWorkspace';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import type { SavedHunt } from '@/lib/hunts';
import type { Application, Task } from '@/lib/applications';
import { officialInfoFor } from '@/lib/huntdata/applicationInfo';

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
  const [{ data: notes }, { data: application }, { data: tasks }] = await Promise.all([
    supabase.from('hunt_notes').select('id, body, created_at').eq('hunt_id', id).order('created_at'),
    supabase.from('applications').select('*').eq('hunt_id', id).maybeSingle(),
    supabase.from('tasks').select('*').eq('hunt_id', id).order('position'),
  ]);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <HuntWorkspace
        hunt={hunt as SavedHunt}
        notes={notes ?? []}
        application={(application as Application | null) ?? null}
        tasks={(tasks ?? []) as Task[]}
        official={officialInfoFor(hunt.state, hunt.species, hunt.season_year)}
      />
    </div>
  );
}
