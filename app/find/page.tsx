import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { toStateCode } from '@/lib/huntdata/registry';
import { speciesFor } from '../planner/constants';
import FindView from './FindView';

export const dynamic = 'force-dynamic';

// Find a Hunt: what your points buy, before any questions. Opens on a state
// the hunter already holds points in, so the first thing they see is about
// them rather than a default.
export default async function FindPage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const supabase = await supabaseServer();
  const { data: balances } = await supabase
    .from('hunter_points').select('state, species, points').order('points', { ascending: false });

  const top = (balances ?? [])[0];
  const state = (top && toStateCode(top.state)) || 'CO';
  const species = top && speciesFor(state).includes(top.species) ? top.species : speciesFor(state)[0];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <FindView initialState={state} initialSpecies={species} />
    </div>
  );
}
