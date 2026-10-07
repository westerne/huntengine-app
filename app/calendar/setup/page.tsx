import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { currentSeasonYear } from '@/lib/hunts';
import { calendarYears } from '@/lib/calendar';
import type { SetupAnswers } from '@/lib/suggest';
import SetupWizard from './SetupWizard';

export const dynamic = 'force-dynamic';

// Guided setup for My Hunt Calendar — the main way in for hunters without a
// spreadsheet. Prefilled from earlier answers and the profile.
export default async function SetupPage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const supabase = await supabaseServer();
  const [{ data: profile }, { data: points }] = await Promise.all([
    supabase.from('profiles').select('home_state, planning').eq('user_id', viewer.userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
  ]);
  const prior = (profile?.planning ?? null) as Partial<SetupAnswers> | null;
  const initial: SetupAnswers = {
    homeState: profile?.home_state ?? prior?.homeState ?? null,
    weapon: prior?.weapon ?? 'any',
    wait: prior?.wait ?? 'few',
    newUnits: prior?.newUnits ?? 'either',
    interests: prior?.interests ?? [],
    points: (points ?? []).map((p) => ({ state: p.state, species: p.species, points: Number(p.points) })),
    knownUnits: prior?.knownUnits ?? [],
    bucket: prior?.bucket ?? [],
  };
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <SetupWizard initial={initial} years={calendarYears(currentSeasonYear())} />
    </div>
  );
}
