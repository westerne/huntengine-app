import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppNav from '../components/AppNav';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { nextAction, RESULT_LABEL, STATUS_LABEL, type SavedHunt } from '@/lib/hunts';

// Per-request: depends on the signed-in user.
export const dynamic = 'force-dynamic';

// My Season — the member's home. Hunts are grouped by what they need next,
// most urgent first; every card shows one next action.

const GROUPS: Array<{ title: string; empty?: string; match: (h: SavedHunt) => boolean }> = [
  { title: 'Decide and apply', match: (h) => h.status === 'considering' || h.status === 'planned' },
  { title: 'Waiting on draw results', match: (h) => h.status === 'applied' && h.application_result !== 'unsuccessful' },
  { title: 'Tags and hunt prep', match: (h) => h.status === 'tag_secured' || h.status === 'preparing' },
  { title: 'Did not draw', match: (h) => h.status === 'applied' && h.application_result === 'unsuccessful' },
  { title: 'Completed', match: (h) => h.status === 'completed' },
];

function HuntCard({ h }: { h: SavedHunt }) {
  const action = nextAction(h);
  const odds = (h.recommendation as { currentOdds?: string } | null)?.currentOdds;
  return (
    <Link href={`/season/${h.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-amber-700 transition-colors">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-white font-black uppercase italic">
          {h.state} {h.species} · {/^[0-9][0-9A-Z]{0,4}$/i.test(h.unit) ? `Unit ${h.unit}` : h.unit}{h.hunt_code ? ` · Hunt ${h.hunt_code}` : ''}
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {STATUS_LABEL[h.status]}{h.application_result && h.application_result !== 'pending' ? ` · ${RESULT_LABEL[h.application_result]}` : ''}
        </span>
      </div>
      {h.label && <p className="text-zinc-500 text-xs mt-1">{h.label}</p>}
      {odds && <p className="text-green-400 text-sm font-bold mt-2">{odds}</p>}
      <p className="text-amber-500 text-[11px] font-black uppercase tracking-widest mt-3">Next: {action.label} →</p>
    </Link>
  );
}

export default async function SeasonPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  const { welcome } = await searchParams;

  const supabase = await supabaseServer();
  const { data } = await supabase.from('saved_hunts').select('*').neq('status', 'archived').order('updated_at', { ascending: false });
  const hunts = (data ?? []) as SavedHunt[];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <AppNav current="season" />
      <main className="max-w-4xl mx-auto px-4 py-10">
        {welcome && <p role="status" className="mb-6 bg-green-950/60 border border-green-800 text-green-200 rounded-xl px-4 py-3 text-sm">Welcome to HuntQuarters. Your membership is active.</p>}
        <h1 className="text-3xl font-black italic uppercase mb-8">My Season</h1>

        {hunts.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <p className="text-zinc-200 font-bold mb-2">Nothing saved yet.</p>
            <p className="text-zinc-400 text-sm mb-6">Find hunts that fit your points and goals, or set up a hunt you&apos;ve already drawn.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/planner?start=find" className="flex-1 text-center bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Find a Hunt</Link>
              <Link href="/planner?start=tag" className="flex-1 text-center border-2 border-zinc-700 text-white py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">I Already Have a Tag</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {GROUPS.map((g) => {
              const list = hunts.filter(g.match);
              if (!list.length) return null;
              return (
                <section key={g.title} aria-labelledby={`g-${g.title}`}>
                  <h2 id={`g-${g.title}`} className="text-[11px] uppercase text-zinc-400 font-black tracking-widest mb-3">{g.title} ({list.length})</h2>
                  <div className="space-y-3">{list.map((h) => <HuntCard key={h.id} h={h} />)}</div>
                </section>
              );
            })}
            <div className="flex gap-3 pt-4">
              <Link href="/planner?start=find" className="text-amber-500 text-[11px] font-black uppercase tracking-widest hover:text-amber-400">+ Find another hunt</Link>
              <Link href="/planner?start=tag" className="text-zinc-400 text-[11px] font-black uppercase tracking-widest hover:text-white">+ Add a tag I have</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
