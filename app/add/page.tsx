import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { loadPlan } from '../plan/load';
import AddSheet, { type AddAction } from './AddSheet';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Add | HuntQuarters' };

// ＋: the quick things a hunter logs in seconds (docs/SPEC_ARCHITECTURE.md §3).
// ?do=result|tag|points|plan|report|note opens one directly.
export default async function AddPage({ searchParams }: { searchParams: Promise<{ do?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  const { do: open } = await searchParams;
  const plan = await loadPlan(await supabaseServer(), viewer.userId);
  const pick = (stages: string[]) => plan.hunts.filter((h) => h.savedId && stages.includes(h.stage))
    .map((h) => ({ id: h.savedId!, state: h.state, species: h.species, unit: h.unit, huntCode: h.huntCode, year: h.year, stage: h.stage }));
  return (
    <div className="hq" style={{ minHeight: '100vh' }}>
      <AddSheet
        open={(['result', 'tag', 'points', 'plan', 'report', 'note'] as const).find((a) => a === open) ?? null as AddAction | null}
        years={plan.years}
        thisYear={plan.thisYear}
        waiting={pick(['applied'])}
        reportable={pick(['drew', 'prepping', 'hunted'])}
        noteable={pick(['considering', 'planned', 'points', 'applied', 'drew', 'prepping', 'hunted'])}
        points={plan.points.filter((p) => p.usesPoints && p.live).map((p) => ({ state: p.state, species: p.species, current: p.current }))}
        loadError={plan.loadError}
      />
    </div>
  );
}
