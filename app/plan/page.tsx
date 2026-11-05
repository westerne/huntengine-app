import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { loadPlan } from './load';
import PlanView from './PlanView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plan | HuntQuarters' };

// Plan: the hunter's timeline — this season, years ahead, someday, past
// seasons — and points (docs/SPEC_ARCHITECTURE.md §4).
export default async function PlanPage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  const data = await loadPlan(await supabaseServer(), viewer.userId);
  return (
    <div className="hq" style={{ minHeight: '100vh' }}>
      <PlanView {...data} />
    </div>
  );
}
