import { notFound, redirect } from 'next/navigation';
import HuntWorkspace from './HuntWorkspace';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import type { SavedHunt } from '@/lib/hunts';
import type { Application, Task } from '@/lib/applications';
import { officialInfoFor } from '@/lib/huntdata/applicationInfo';
import type { PlanRow } from './PreparationPanel';

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
  const [{ data: notes }, { data: application }, { data: tasks }, { data: plans }, { data: profile }] = await Promise.all([
    supabase.from('hunt_notes').select('id, body, created_at').eq('hunt_id', id).order('created_at'),
    supabase.from('applications').select('*').eq('hunt_id', id).maybeSingle(),
    supabase.from('tasks').select('*').eq('hunt_id', id).order('position'),
    supabase.from('hunt_plans').select('*').eq('hunt_id', id).order('version'),
    supabase.from('profiles').select('fitness, access_notes, weapons, hunt_styles').eq('user_id', viewer.userId).maybeSingle(),
  ]);
  // Prefill the prep form from what we already know: the saved search, then the profile.
  const si = (hunt.search_inputs ?? {}) as { weapons?: string[] };
  const searchWeapon = (si.weapons ?? []).find((w) => w !== 'Any');
  const prepDefaults = {
    weapon: searchWeapon ?? profile?.weapons?.[0] ?? undefined,
    camp_style: profile?.hunt_styles?.[0] ?? undefined,
    fitness: profile?.fitness ?? undefined,
    limitations: profile?.access_notes ?? undefined,
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <HuntWorkspace
        hunt={hunt as SavedHunt}
        notes={notes ?? []}
        application={(application as Application | null) ?? null}
        tasks={(tasks ?? []) as Task[]}
        official={officialInfoFor(hunt.state, hunt.species, hunt.season_year)}
        plans={(plans ?? []) as PlanRow[]}
        prepDefaults={prepDefaults}
      />
    </div>
  );
}
