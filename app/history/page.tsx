import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { RESULT_LABEL, STATUS_LABEL, type SavedHunt } from '@/lib/hunts';
import type { HuntReport } from '@/lib/reports';
import { huntTitle } from '@/lib/huntName';

export const dynamic = 'force-dynamic';

// My History — every hunt and application the member has recorded, kept
// forever: finished hunts with their reports, and every draw result,
// including the ones they didn't draw.

type Row = SavedHunt & {
  applications: { decision: string; submitted_at: string | null } | Array<{ decision: string; submitted_at: string | null }> | null;
  hunt_reports: HuntReport | HuntReport[] | null;
};
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const title = (h: SavedHunt) => `${h.state} ${h.species} · ${huntTitle(h.unit, h.hunt_code)}`;

const RESULT_CLS: Record<string, string> = {
  successful: 'text-green-400', unsuccessful: 'text-zinc-400', alternate: 'text-amber-300', withdrawn: 'text-zinc-500', pending: 'text-amber-400',
};

export default async function HistoryPage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('saved_hunts')
    .select('*, applications(decision, submitted_at), hunt_reports(*)')
    .order('season_year', { ascending: false }).order('updated_at', { ascending: false });
  const rows = (data ?? []) as Row[];

  const hunted = rows.filter((h) => h.status === 'completed' || (h.status === 'archived' && one(h.hunt_reports)?.completed_at));
  const applied = rows.filter((h) => h.application_result || one(h.applications)?.submitted_at);
  const harvested = hunted.filter((h) => one(h.hunt_reports)?.harvested).length;
  const drew = applied.filter((h) => h.application_result === 'successful').length;
  const decided = applied.filter((h) => h.application_result && h.application_result !== 'pending' && h.application_result !== 'withdrawn').length;
  const years = [...new Set(applied.map((h) => h.season_year))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-black italic uppercase">My History</h1>
          <p className="text-zinc-500 text-sm mt-2">Your hunts, reports and draw results — private to you. Results are what you recorded; the app doesn&apos;t check with the states.</p>
        </div>

        {error ? (
          <p role="alert" className="bg-red-950/50 border border-red-900 text-red-200 rounded-xl px-4 py-3 text-sm">Your history couldn&apos;t be loaded just now. Nothing is lost — try again in a minute.</p>
        ) : rows.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <p className="text-zinc-200 font-bold mb-2">Nothing here yet.</p>
            <p className="text-zinc-400 text-sm">Hunts you finish and applications you record in <Link href="/season" className="text-amber-500 underline">My Season</Link> show up here.</p>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Hunts reported', hunted.length],
                ['Harvested', harvested],
                ['Applications', applied.length],
                ['Drew', decided ? `${drew} of ${decided}` : drew],
              ].map(([k, v]) => (
                <div key={k as string} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{k}</dt>
                  <dd className="text-2xl font-black text-white mt-1">{v}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="hunts-h">
              <h2 id="hunts-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest mb-3">Hunts ({hunted.length})</h2>
              {hunted.length === 0 ? (
                <p className="text-zinc-500 text-sm">No finished hunts yet. After a hunt, write your report from the hunt&apos;s page.</p>
              ) : (
                <div className="space-y-3">
                  {hunted.map((h) => {
                    const r = one(h.hunt_reports);
                    return (
                      <Link key={h.id} href={`/season/${h.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-amber-700">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-white font-black uppercase italic">{h.season_year} · {title(h)}</p>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${r?.harvested ? 'text-green-400' : 'text-zinc-400'}`}>
                            {r?.completed_at ? (r.harvested ? 'Harvested' : 'No harvest') : 'Report not finished'}
                          </span>
                        </div>
                        {r?.completed_at ? (
                          <>
                            <p className="text-zinc-400 text-xs mt-1">
                              {[r.days_hunted != null && `${r.days_hunted} days`, r.pressure && `${r.pressure} pressure`, r.animal, r.photos?.length ? `${r.photos.length} photo${r.photos.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                            </p>
                            {r.change_next && <p className="text-zinc-300 text-sm mt-2"><span className="text-amber-500 font-bold">Next time:</span> {r.change_next}</p>}
                          </>
                        ) : (
                          <p className="text-amber-500 text-[11px] font-black uppercase tracking-widest mt-3">Write your hunt report →</p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section aria-labelledby="apps-h">
              <h2 id="apps-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest mb-3">Applications and draw results ({applied.length})</h2>
              {applied.length === 0 ? (
                <p className="text-zinc-500 text-sm">No applications recorded yet.</p>
              ) : (
                <div className="space-y-6">
                  {years.map((y) => (
                    <div key={y}>
                      <h3 className="text-amber-500 font-black text-sm mb-2">{y}</h3>
                      <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl bg-zinc-900">
                        {applied.filter((h) => h.season_year === y).map((h) => (
                          <li key={h.id}>
                            <Link href={`/season/${h.id}`} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 hover:bg-zinc-800/60">
                              <span className="text-zinc-200 text-sm font-bold">{title(h)}</span>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${RESULT_CLS[h.application_result ?? 'pending']}`}>
                                {RESULT_LABEL[h.application_result ?? 'pending']}{h.status === 'archived' ? ` · ${STATUS_LABEL.archived}` : ''}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
