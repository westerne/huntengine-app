import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { toStateCode } from '@/lib/huntdata/registry';
import { speciesFor } from '../planner/constants';
import FindView from './FindView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find | HuntQuarters' };

// Find a Hunt: what your points buy, before any questions. Opens on a state
// the hunter already holds points in, so the first thing they see is about
// them rather than a default.
export default async function FindPage({ searchParams }: { searchParams: Promise<{ state?: string; species?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const supabase = await supabaseServer();
  const { data: balances } = await supabase
    .from('hunter_points').select('state, species, points').order('points', { ascending: false });

  // A link can name the state and species (/find?state=NV&species=Elk).
  const asked = await searchParams;
  const top = (balances ?? [])[0];
  const state = (asked.state && toStateCode(asked.state)) || (top && toStateCode(top.state)) || 'CO';
  const want = asked.species ?? top?.species;
  const species = want && speciesFor(state).includes(want) ? want : speciesFor(state)[0];

  return (
    <div className="hq" style={{ minHeight: '100vh' }}>
      <FindView initialState={state} initialSpecies={species} />
    </div>
  );
}
