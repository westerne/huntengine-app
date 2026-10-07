import { notFound, redirect } from 'next/navigation';
import HuntWorkspace, { type PastLesson } from './HuntWorkspace';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import type { SavedHunt } from '@/lib/hunts';
import type { Application, Task } from '@/lib/applications';
import { officialInfoFor } from '@/lib/huntdata/applicationInfo';
import type { PlanRow } from './PreparationPanel';
import type { Photo } from './ReportPanel';
import type { HuntReport } from '@/lib/reports';
import { harvestReportingFor } from '@/lib/huntdata/harvestReporting';
import { STATE_INFO, toStateCode } from '@/lib/huntdata/registry';

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
  const [{ data: notes }, { data: application }, { data: tasks }, { data: plans }, { data: profile }, { data: report }, { data: pastRows }] = await Promise.all([
    supabase.from('hunt_notes').select('id, body, created_at').eq('hunt_id', id).order('created_at'),
    supabase.from('applications').select('*').eq('hunt_id', id).maybeSingle(),
    supabase.from('tasks').select('*').eq('hunt_id', id).order('position'),
    supabase.from('hunt_plans').select('*').eq('hunt_id', id).order('version'),
    supabase.from('profiles').select('fitness, access_notes, weapons, hunt_styles').eq('user_id', viewer.userId).maybeSingle(),
    supabase.from('hunt_reports').select('*').eq('hunt_id', id).maybeSingle(),
    // The hunter's finished reports for the same state and species — their own lessons.
    supabase.from('hunt_reports')
      .select('hunt_id, harvested, days_hunted, pressure, worked, didnt_work, change_next, access_issues, saved_hunts!inner(season_year, state, species, unit, hunt_code)')
      .not('completed_at', 'is', null).neq('hunt_id', id)
      .eq('saved_hunts.state', hunt.state).eq('saved_hunts.species', hunt.species),
  ]);
  // Private photos are shown through short-lived signed links.
  const paths: string[] = (report?.photos as string[] | undefined) ?? [];
  const { data: signed } = paths.length
    ? await supabase.storage.from('report-photos').createSignedUrls(paths, 3600)
    : { data: [] as Array<{ path: string | null; signedUrl: string }> };
  const photos: Photo[] = paths.map((p) => ({ path: p, url: signed?.find((s) => s.path === p)?.signedUrl ?? null }));
  const code = toStateCode(hunt.state);
  const agency = code ? STATE_INFO[code]?.agency : null;
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
        report={(report as HuntReport | null) ?? null}
        photos={photos}
        userId={viewer.userId}
        harvest={harvestReportingFor(hunt.state, hunt.species)}
        agencyName={agency?.name ?? `${hunt.state} wildlife agency`}
        agencyUrl={agency?.url ?? null}
        pastLessons={(pastRows ?? []) as unknown as PastLesson[]}
      />
    </div>
  );
}
